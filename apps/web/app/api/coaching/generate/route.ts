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
  agency_id?: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
}

// Helper to extract scores from call_scores record
interface CallScoreRecord {
  id: string;
  created_at: string;
  overall_score: number | null;
  lite_scores: {
    control_confidence?: number;
    discovery_depth?: number;
    relevance_narrative?: number;
    objection_handling?: number;
    next_steps_clarity?: number;
  } | null;
  full_scores: {
    core?: {
      control_authority?: number;
      discovery_depth?: number;
      diagnostic_insight?: number;
      value_articulation?: number;
      objection_navigation?: number;
      commitment_framing?: number;
    };
    eq?: {
      human_first?: number;
    };
  } | null;
  diagnosis_summary: string | null;
  ingestion_items?: {
    participants?: Array<{ name: string; role: string }>;
    transcript_metadata?: { duration_seconds?: number };
  };
}

function mapCallScoresToCallData(record: CallScoreRecord): CallData {
  // Get scores from full_scores if available, otherwise from lite_scores
  const fullCore = record.full_scores?.core;
  const liteScores = record.lite_scores;

  // Map scores (convert 1-5 lite to 1-10 scale, full is already 1-10)
  const opening = fullCore?.control_authority || (liteScores?.control_confidence ? liteScores.control_confidence * 2 : 5);
  const discovery = fullCore?.discovery_depth || (liteScores?.discovery_depth ? liteScores.discovery_depth * 2 : 5);
  const diagnostic = fullCore?.diagnostic_insight || 5;
  const value_articulation = fullCore?.value_articulation || (liteScores?.relevance_narrative ? liteScores.relevance_narrative * 2 : 5);
  const objection_navigation = fullCore?.objection_navigation || (liteScores?.objection_handling ? liteScores.objection_handling * 2 : 5);
  const commitment = fullCore?.commitment_framing || (liteScores?.next_steps_clarity ? liteScores.next_steps_clarity * 2 : 5);
  const human_first = record.full_scores?.eq?.human_first || 5;

  // Get prospect info from ingestion item if available
  const participants = record.ingestion_items?.participants || [];
  const prospect = participants.find(p => p.role === 'prospect')?.name || 'Unknown Prospect';
  const duration = record.ingestion_items?.transcript_metadata?.duration_seconds
    ? Math.round(record.ingestion_items.transcript_metadata.duration_seconds / 60)
    : 30;

  return {
    date: record.created_at,
    prospect,
    duration_minutes: duration,
    outcome: 'unknown', // call_scores doesn't track outcome
    scores: {
      opening,
      discovery,
      diagnostic,
      value_articulation,
      objection_navigation,
      commitment,
      human_first,
    },
    patterns_detected: [], // Would need to parse from diagnosis_summary
    key_moments: record.diagnosis_summary ? [record.diagnosis_summary.slice(0, 200)] : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCoachingRequest = await request.json();
    const { user_id, agency_id, report_type, period_start, period_end } = body;

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
      .select('id, first_name, email')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get agency_id from assignment if not provided
    let resolvedAgencyId = agency_id;
    if (!resolvedAgencyId) {
      const { data: assignment } = await supabase
        .from('user_agency_assignments')
        .select('agency_id')
        .eq('user_id', user_id)
        .single();
      resolvedAgencyId = assignment?.agency_id;
    }

    // Fetch call_scores for the period with related ingestion data
    const { data: calls, error: callsError } = await supabase
      .from('call_scores')
      .select(`
        id,
        created_at,
        overall_score,
        lite_scores,
        full_scores,
        diagnosis_summary,
        ingestion_items (
          participants,
          transcript_metadata
        )
      `)
      .eq('user_id', user_id)
      .gte('created_at', period_start)
      .lte('created_at', period_end + 'T23:59:59')
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
    const callData: CallData[] = calls.map(call => mapCallScoresToCallData(call as CallScoreRecord));

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
          summary: (r.content as { wrap_up?: string })?.wrap_up || 'No summary available',
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
          summary: (r.content as { wrap_up?: string })?.wrap_up || 'No summary available',
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
        agency_id: resolvedAgencyId,
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
