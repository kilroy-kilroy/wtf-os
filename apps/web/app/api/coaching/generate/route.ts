import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import {
  COACHING_SYSTEM_PROMPT,
  buildCoachingUserPrompt,
  aggregateCallScores,
  type CallData,
  type ReportType,
} from '@repo/prompts/coaching/coaching-prompts';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface GenerateCoachingRequest {
  user_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCoachingRequest = await request.json();
    const { user_id, report_type, period_start, period_end } = body;

    // Validate inputs
    if (!user_id || !report_type || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, report_type, period_start, period_end' },
        { status: 400 }
      );
    }

    if (!['weekly', 'monthly', 'quarterly'].includes(report_type)) {
      return NextResponse.json(
        { error: 'Invalid report_type. Must be weekly, monthly, or quarterly' },
        { status: 400 }
      );
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, email, org_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch calls for the period
    const { data: calls, error: callsError } = await supabase
      .from('call_lab_reports')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', period_start)
      .lte('created_at', period_end)
      .order('created_at', { ascending: true });

    if (callsError) {
      console.error('Error fetching calls:', callsError);
      return NextResponse.json({ error: 'Failed to fetch call data' }, { status: 500 });
    }

    // Check if we have enough data
    if (!calls || calls.length === 0) {
      return NextResponse.json(
        { error: 'No calls found for the specified period' },
        { status: 400 }
      );
    }

    // Transform calls to CallData format
    const callData: CallData[] = calls.map(call => ({
      date: call.call_date || call.created_at,
      prospect: call.company_name || call.buyer_name || 'Unknown',
      duration_minutes: call.duration_minutes || 30,
      outcome: call.outcome || 'unknown',
      scores: {
        opening: call.opening_score || 5,
        discovery: call.discovery_score || 5,
        diagnostic: call.diagnostic_score || 5,
        value_articulation: call.value_score || 5,
        objection_navigation: call.objection_score || 5,
        commitment: call.commitment_score || 5,
        human_first: call.human_first_score || 5,
      },
      patterns_detected: call.patterns_detected || [],
      key_moments: call.key_moments?.map((m: { description: string }) => m.description) || [],
    }));

    // Fetch previous reports for context (for monthly/quarterly)
    let previousReports: { type: ReportType; period: string; summary: string }[] = [];

    if (report_type === 'monthly') {
      // Get weekly reports for context
      const { data: weeklyReports } = await supabase
        .from('coaching_reports')
        .select('report_type, period_start, period_end, content')
        .eq('user_id', user_id)
        .eq('report_type', 'weekly')
        .gte('period_start', period_start)
        .lte('period_end', period_end)
        .order('period_start', { ascending: true });

      if (weeklyReports) {
        previousReports = weeklyReports.map(r => ({
          type: r.report_type as ReportType,
          period: `${r.period_start} to ${r.period_end}`,
          summary: r.content?.wrap_up || 'No summary available',
        }));
      }
    } else if (report_type === 'quarterly') {
      // Get monthly reports for context
      const { data: monthlyReports } = await supabase
        .from('coaching_reports')
        .select('report_type, period_start, period_end, content')
        .eq('user_id', user_id)
        .eq('report_type', 'monthly')
        .gte('period_start', period_start)
        .lte('period_end', period_end)
        .order('period_start', { ascending: true });

      if (monthlyReports) {
        previousReports = monthlyReports.map(r => ({
          type: r.report_type as ReportType,
          period: `${r.period_start} to ${r.period_end}`,
          summary: r.content?.wrap_up || 'No summary available',
        }));
      }
    }

    // Build prompts
    const userPrompt = buildCoachingUserPrompt({
      review_type: report_type,
      rep_name: user.first_name || user.email?.split('@')[0] || 'Sales Rep',
      period_start,
      period_end,
      call_data: callData,
      previous_reports: previousReports.length > 0 ? previousReports : undefined,
    });

    // Generate coaching report with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: COACHING_SYSTEM_PROMPT,
    });

    // Extract content
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON from response
    let reportContent;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      // Create a fallback structure with the raw text
      reportContent = {
        wtf_trends: [],
        human_first_trendline: { overall_assessment: 'Analysis pending' },
        reinforcements: [],
        attack_list: [],
        emergent_patterns: [],
        wrap_up: responseText.slice(0, 500),
      };
    }

    // Calculate aggregate scores
    const scoresAggregate = aggregateCallScores(callData);

    // Calculate trends (compare to previous period if available)
    const trends = {
      overall_delta: 0,
      trust_velocity_delta: 0,
      patterns_trending_up: [] as string[],
      patterns_trending_down: [] as string[],
    };

    // Store the report
    const { data: coachingReport, error: insertError } = await supabase
      .from('coaching_reports')
      .insert({
        user_id,
        org_id: user.org_id,
        report_type,
        period_start,
        period_end,
        scores_aggregate: scoresAggregate,
        calls_analyzed: callData.length,
        trends,
        content: reportContent,
        email_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing coaching report:', insertError);
      return NextResponse.json({ error: 'Failed to store coaching report' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report_id: coachingReport.id,
      report: {
        id: coachingReport.id,
        report_type,
        period_start,
        period_end,
        calls_analyzed: callData.length,
        scores_aggregate: scoresAggregate,
        content: reportContent,
      },
    });
  } catch (error) {
    console.error('Coaching generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
