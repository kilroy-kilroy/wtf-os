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

// Lazy-load clients to avoid build-time errors
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getAnthropic = () => new Anthropic({
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

    const supabase = getSupabase();
    const anthropic = getAnthropic();

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, email, org_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch calls from both tables (call_scores has the actual data, call_lab_reports has richer Pro data)
    const [callScoresResult, callLabResult] = await Promise.all([
      supabase
        .from('call_scores')
        .select('id, user_id, overall_score, overall_grade, version, lite_scores, full_scores, framework_scores, diagnosis_summary, markdown_response, created_at')
        .eq('user_id', user_id)
        .gte('created_at', period_start)
        .lte('created_at', period_end + 'T23:59:59')
        .order('created_at', { ascending: true }),
      supabase
        .from('call_lab_reports')
        .select('*')
        .eq('user_id', user_id)
        .gte('created_at', period_start)
        .lte('created_at', period_end + 'T23:59:59')
        .order('created_at', { ascending: true }),
    ]);

    if (callScoresResult.error) {
      console.error('Error fetching call_scores:', callScoresResult.error);
    }
    if (callLabResult.error) {
      console.error('Error fetching call_lab_reports:', callLabResult.error);
    }

    const callScores = callScoresResult.data || [];
    const callLabReports = callLabResult.data || [];

    // Merge: prefer call_lab_reports (richer data), fill in from call_scores
    const seenIds = new Set<string>();
    const callData: CallData[] = [];

    // First, add call_lab_reports (have detailed dimension scores)
    for (const call of callLabReports) {
      seenIds.add(call.id);
      callData.push({
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
      });
    }

    // Then, add call_scores not already covered
    for (const cs of callScores) {
      if (seenIds.has(cs.id)) continue;

      // Extract scores from full_scores JSONB (Pro) or lite_scores JSONB (Lite)
      const fullScores = cs.full_scores as any || {};
      const liteScores = cs.lite_scores as any || {};
      const coreScores = fullScores.core || {};
      const overallFallback = cs.overall_score || 5;

      // Map call_scores dimensions to CallData scores
      // full_scores.core has: control_authority, discovery_depth, diagnostic_depth, value_articulation, objection_handling, commitment_close, human_first
      // lite_scores has: control_confidence, discovery_depth, relevance_narrative, objection_handling, next_steps_clarity
      const scores = {
        opening: coreScores.control_authority || liteScores.control_confidence || overallFallback,
        discovery: coreScores.discovery_depth || liteScores.discovery_depth || overallFallback,
        diagnostic: coreScores.diagnostic_depth || overallFallback,
        value_articulation: coreScores.value_articulation || liteScores.relevance_narrative || overallFallback,
        objection_navigation: coreScores.objection_handling || liteScores.objection_handling || overallFallback,
        commitment: coreScores.commitment_close || liteScores.next_steps_clarity || overallFallback,
        human_first: coreScores.human_first || overallFallback,
      };

      // Try to extract prospect name from markdown_response or diagnosis_summary
      let prospect = 'Unknown';
      if (cs.diagnosis_summary) {
        prospect = cs.diagnosis_summary.substring(0, 50);
      }

      callData.push({
        date: cs.created_at,
        prospect,
        duration_minutes: 30,
        outcome: 'unknown',
        scores,
        patterns_detected: [],
        key_moments: [],
      });
    }

    // Check if we have enough data
    if (callData.length === 0) {
      return NextResponse.json(
        { error: 'No calls found for the specified period' },
        { status: 400 }
      );
    }

    console.log(`[Coaching] Found ${callData.length} calls for ${user.email} (${callLabReports.length} from call_lab_reports, ${callScores.length} from call_scores)`);

    // Fetch previous reports for context (for monthly/quarterly)
    let previousReports: { type: ReportType; period: string; summary: string; one_thing?: string }[] = [];

    if (report_type === 'weekly') {
      // Get the previous weekly report for continuity
      const { data: prevWeekly } = await supabase
        .from('coaching_reports')
        .select('report_type, period_start, period_end, content')
        .eq('user_id', user_id)
        .eq('report_type', 'weekly')
        .lt('period_end', period_start)
        .order('period_end', { ascending: false })
        .limit(1);

      if (prevWeekly && prevWeekly.length > 0) {
        previousReports = prevWeekly.map(r => ({
          type: r.report_type as ReportType,
          period: `${r.period_start} to ${r.period_end}`,
          summary: r.content?.wrap_up || 'No summary available',
          one_thing: r.content?.the_one_thing?.behavior || undefined,
        }));
      }
    } else if (report_type === 'monthly') {
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
          one_thing: r.content?.the_one_thing?.behavior || undefined,
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
          one_thing: r.content?.the_one_thing?.behavior || undefined,
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
