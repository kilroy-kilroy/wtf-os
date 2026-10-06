import { getSubscriptionStatus } from '@/lib/subscription';
import { coachingCalls } from '@/lib/labs/coaching-data';
import { serviceAuthorized, requirePro, readLabJson, limitLab, labFailure, LabError } from '@/lib/labs/access';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runModel } from '@repo/utils';
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

interface GenerateCoachingRequest {
  user_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCoachingRequest = await readLabJson(request, 4000);
    if (!serviceAuthorized(request)) {
      const actor = await requirePro('call');
      if (body.user_id !== actor.id) throw new LabError(403, 'You can only generate your own coaching.');
      await limitLab(request, 'coaching', actor.id);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(body.period_end) || Date.parse(body.period_end) < Date.parse(body.period_start) || Date.parse(body.period_end) - Date.parse(body.period_start) > 100 * 86400000) throw new LabError(400, 'Invalid coaching period.');
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

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, email, org_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscription = await getSubscriptionStatus(supabase, user.id, user.email);
    if (!subscription.hasCallLabPro) throw new LabError(403, 'Call Lab Pro is required for coaching.');

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

    const callData = coachingCalls(callLabReports, callScores);

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
    const { content: responseText } = await runModel(
      'coaching-report',
      COACHING_SYSTEM_PROMPT,
      userPrompt,
    );

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
      overall_delta: null,
      trust_velocity_delta: null,
      baseline_status: "No comparable baseline calculated",
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
    const failure = labFailure(error); if (failure) return failure;
    console.error('Coaching generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
