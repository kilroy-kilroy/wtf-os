import { createClient } from '@/lib/supabase-auth-server';
import { redirect } from 'next/navigation';
import { getSubscriptionStatus } from '@/lib/subscription';
import { FreeDashboard } from '@/components/dashboard/FreeDashboard';
import { ProDashboard } from '@/components/dashboard/ProDashboard';
import type { ActivityRecord } from '@/components/dashboard/ActivityHistory';
import {
  MACRO_PATTERNS,
  extractPatternsFromMarkdown,
  mapToCanonicalPatterns,
  type CallScoreRow,
} from '@/lib/dashboard/patterns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email, call_lab_tier, discovery_lab_tier, visibility_lab_tier')
    .eq('id', user.id)
    .single();

  const userName = profile?.first_name || '';
  const userEmail = profile?.email || user.email || '';

  // Check subscription status
  const subscription = await getSubscriptionStatus(supabase, user.id, userEmail);
  const isPro = subscription.hasCallLabPro || subscription.hasDiscoveryLabPro || subscription.hasVisibilityLabPro;

  // Fetch recent activity for all tiers
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: toolRuns } = await supabase
    .from('tool_runs')
    .select('id, tool_type, lead_email, ingestion_item_id, created_at, result_summary')
    .or(`lead_email.eq.${userEmail},user_id.eq.${user.id}`)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  // Build activity records
  const records: ActivityRecord[] = (toolRuns || []).map((run) => {
    const toolType = run.tool_type?.includes('call_lab') ? 'call_lab'
      : run.tool_type?.includes('discovery') ? 'discovery_lab'
      : run.tool_type?.includes('visibility') ? 'visibility_lab'
      : 'assessment';
    const version = run.tool_type?.includes('pro') ? 'pro' : 'lab';
    const summary = run.result_summary as Record<string, unknown> | null;

    return {
      id: run.id,
      toolType: toolType as ActivityRecord['toolType'],
      toolLabel: run.tool_type || 'Unknown',
      version: version as ActivityRecord['version'],
      title: (summary?.title as string) || run.tool_type || 'Analysis',
      subtitle: (summary?.subtitle as string) || null,
      score: (summary?.score as number) || null,
      status: 'complete',
      createdAt: run.created_at,
      href: run.tool_type?.includes('call_lab')
        ? `/call-lab-pro/report/${run.ingestion_item_id || run.id}`
        : run.tool_type?.includes('discovery')
        ? `/discovery-lab/report/${run.id}`
        : `/dashboard`,
    };
  });

  // Free user dashboard
  if (!isPro) {
    return <FreeDashboard records={records} userName={userName} />;
  }

  // Pro user: fetch call scores for pattern analysis
  const { data: callScores } = await supabase
    .from('call_scores')
    .select(`
      id, overall_score, overall_grade, diagnosis_summary,
      markdown_response, version, created_at,
      ingestion_items (transcript_metadata, created_at)
    `)
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  const scores = (callScores || []) as unknown as CallScoreRow[];

  // Pattern analysis
  const allPatternCounts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => allPatternCounts.set(p.id, 0));
  scores.forEach((score) => {
    if (score.markdown_response) {
      const patterns = extractPatternsFromMarkdown(score.markdown_response);
      const counts = mapToCanonicalPatterns(patterns);
      counts.forEach((count, patternId) => {
        allPatternCounts.set(patternId, (allPatternCounts.get(patternId) || 0) + count);
      });
    }
  });

  const windowSize = Math.min(8, scores.length) || 1;

  // Find worst negative pattern for Next Call Focus
  const negativePatterns = MACRO_PATTERNS
    .filter((p) => p.polarity === 'negative' && (allPatternCounts.get(p.id) || 0) > 0)
    .sort((a, b) => (allPatternCounts.get(b.id) || 0) - (allPatternCounts.get(a.id) || 0));

  const focusPattern = negativePatterns[0] || null;

  // Top 3 patterns (positive + negative)
  const topPatterns = MACRO_PATTERNS
    .filter((p) => (allPatternCounts.get(p.id) || 0) > 0)
    .sort((a, b) => (allPatternCounts.get(b.id) || 0) - (allPatternCounts.get(a.id) || 0))
    .slice(0, 3)
    .map((p) => ({
      pattern: p,
      frequency: allPatternCounts.get(p.id) || 0,
      totalCalls: windowSize,
      isPositive: p.polarity === 'positive',
    }));

  // Score trend
  const validScores = scores.filter((s) => s.overall_score !== null);
  const avgScore = validScores.length > 0
    ? validScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / validScores.length
    : 0;

  const half = Math.floor(validScores.length / 2);
  let scoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (validScores.length >= 4) {
    const olderAvg = validScores.slice(half).reduce((s, c) => s + (c.overall_score || 0), 0) / (validScores.length - half);
    const newerAvg = validScores.slice(0, half).reduce((s, c) => s + (c.overall_score || 0), 0) / half;
    if (newerAvg > olderAvg + 0.3) scoreTrend = 'improving';
    else if (newerAvg < olderAvg - 0.3) scoreTrend = 'declining';
  }

  return (
    <ProDashboard
      userName={userName}
      focusPattern={focusPattern}
      focusWhyCostingDeals={focusPattern?.description || ''}
      focusCorrectiveMove={focusPattern?.correctiveMove || ''}
      records={records}
      callCount={scores.length}
      avgScore={avgScore}
      scoreTrend={scoreTrend}
      topPatterns={topPatterns}
      hasCallLabPro={subscription.hasCallLabPro}
      hasDiscoveryLabPro={subscription.hasDiscoveryLabPro}
      hasVisibilityLabPro={subscription.hasVisibilityLabPro}
    />
  );
}
