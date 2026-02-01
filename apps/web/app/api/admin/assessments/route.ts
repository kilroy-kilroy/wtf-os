import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

/**
 * Admin API: Assessment Intelligence
 *
 * Returns aggregate assessment data for content creation:
 * - Benchmark averages across all agencies
 * - Distribution of scores by zone
 * - Most common problems, bottlenecks, and patterns
 * - Follow-up insights aggregated across agencies
 * - Individual assessment details (with optional filter)
 *
 * Usage:
 *   GET /api/admin/assessments                     — aggregate intelligence
 *   GET /api/admin/assessments?detail=true         — include individual assessments
 *   GET /api/admin/assessments?segment=growth      — filter by segment
 *   GET /api/admin/assessments?id=<uuid>           — single assessment detail
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const includeDetail = searchParams.get('detail') === 'true';
    const segmentFilter = searchParams.get('segment');
    const limit = parseInt(searchParams.get('limit') || '500');

    // Single assessment lookup
    if (singleId) {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', singleId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }

      return NextResponse.json({ assessment: sanitizeAssessment(data) });
    }

    // Fetch all completed assessments
    let query = supabase
      .from('assessments')
      .select('id, user_id, intake_data, scores, enrichment_data, overall_score, status, created_at, completed_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: assessments, error } = await query;

    if (error) {
      console.error('Error fetching assessments:', error);
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({
        aggregate: null,
        message: 'No completed assessments found',
        count: 0,
      });
    }

    // Filter by segment if requested
    let filtered = assessments;
    if (segmentFilter) {
      filtered = assessments.filter((a: any) => {
        const seg = a.scores?.segmentLabel?.toLowerCase() || '';
        return seg.includes(segmentFilter.toLowerCase());
      });
    }

    // Build aggregate intelligence
    const aggregate = buildAggregateIntelligence(filtered);

    const response: any = {
      aggregate,
      count: filtered.length,
      generatedAt: new Date().toISOString(),
    };

    if (includeDetail) {
      response.assessments = filtered.map(sanitizeAssessment);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// AGGREGATE INTELLIGENCE BUILDER
// ============================================

function buildAggregateIntelligence(assessments: any[]) {
  const n = assessments.length;
  if (n === 0) return null;

  // Extract structured data
  const zoneScores: Record<string, number[]> = {
    revenueQuality: [],
    profitability: [],
    growthVsChurn: [],
    leadEngine: [],
    founderLoad: [],
    systemsReadiness: [],
    contentPositioning: [],
    teamVisibility: [],
  };

  const overallScores: number[] = [];
  const segments: Record<string, number> = {};
  const realityCheckCounts: Record<string, number> = {};
  const bottleneckCounts: Record<string, number> = {};
  const growthLeverCounts: Record<string, number> = {};
  const followUpInsightCounts: Record<string, number> = {};

  // Revenue data for benchmarks
  const revenues: number[] = [];
  const teamSizes: number[] = [];
  const founderHours: number[] = [];
  const referralPcts: number[] = [];
  const delegationScores: number[] = [];
  const ltvRatios: number[] = [];

  // Churn patterns
  const churnReasons: Record<string, number> = {};
  const pricingStates: Record<string, number> = {};
  const concentrationLevels: Record<string, number> = {};

  for (const a of assessments) {
    const scores = a.scores as any;
    const intake = a.intake_data as any;
    if (!scores?.wtfZones) continue;

    // Zone scores
    for (const zone of Object.keys(zoneScores)) {
      if (scores.wtfZones[zone]?.score !== undefined) {
        zoneScores[zone].push(scores.wtfZones[zone].score);
      }
    }

    // Overall
    if (scores.overall) overallScores.push(scores.overall);

    // Segments
    const seg = scores.segmentLabel || 'unknown';
    segments[seg] = (segments[seg] || 0) + 1;

    // Reality checks
    if (scores.realityChecks) {
      for (const check of scores.realityChecks) {
        const key = `${check.type}:${check.id}`;
        realityCheckCounts[key] = (realityCheckCounts[key] || 0) + 1;
      }
    }

    // Bottlenecks
    if (scores.founderOS?.bottleneckAreas) {
      for (const area of scores.founderOS.bottleneckAreas) {
        bottleneckCounts[area] = (bottleneckCounts[area] || 0) + 1;
      }
    }

    // Growth levers
    if (scores.growthLevers) {
      for (const lever of scores.growthLevers) {
        const key = `${lever.impact}:${lever.name}`;
        growthLeverCounts[key] = (growthLeverCounts[key] || 0) + 1;
      }
    }

    // Follow-up insights (from agencies that completed follow-up)
    if (scores.followUpInsights) {
      for (const insight of scores.followUpInsights) {
        const key = `${insight.severity}:${insight.id}`;
        followUpInsightCounts[key] = (followUpInsightCounts[key] || 0) + 1;
      }
    }

    // Follow-up answers (aggregate patterns)
    if (scores.followUpAnswers) {
      const ans = scores.followUpAnswers;
      if (ans.primaryChurnReason) churnReasons[ans.primaryChurnReason] = (churnReasons[ans.primaryChurnReason] || 0) + 1;
      if (ans.lastPriceIncrease) pricingStates[ans.lastPriceIncrease] = (pricingStates[ans.lastPriceIncrease] || 0) + 1;
      if (ans.top3ClientRevenuePct) concentrationLevels[ans.top3ClientRevenuePct] = (concentrationLevels[ans.top3ClientRevenuePct] || 0) + 1;
    }

    // Numeric intake data
    const rev = intake.lastYearRevenue || intake.annualRevenue;
    if (rev) revenues.push(Number(rev));
    if (intake.teamSize) teamSizes.push(Number(intake.teamSize));
    if (intake.founderWeeklyHours) founderHours.push(Number(intake.founderWeeklyHours));
    if (intake.referralPercent) referralPcts.push(Number(intake.referralPercent));
    if (scores.founderOS?.delegationScore) delegationScores.push(scores.founderOS.delegationScore);
    if (scores.ltvMetrics?.ltvCacRatio) ltvRatios.push(scores.ltvMetrics.ltvCacRatio);
  }

  return {
    sampleSize: n,

    // Benchmark averages
    benchmarks: {
      overallScore: avg(overallScores),
      zones: Object.fromEntries(
        Object.entries(zoneScores).map(([zone, scores]) => [zone, {
          avg: avg(scores),
          median: median(scores),
          p25: percentile(scores, 25),
          p75: percentile(scores, 75),
          distribution: distribution5(scores),
        }])
      ),
      revenue: { avg: avg(revenues), median: median(revenues), min: Math.min(...revenues), max: Math.max(...revenues) },
      teamSize: { avg: avg(teamSizes), median: median(teamSizes) },
      founderWeeklyHours: { avg: avg(founderHours), median: median(founderHours) },
      referralDependency: { avg: avg(referralPcts), median: median(referralPcts) },
      delegationScore: { avg: avg(delegationScores), median: median(delegationScores) },
      ltvCacRatio: { avg: avg(ltvRatios), median: median(ltvRatios) },
    },

    // Segment breakdown
    segments,

    // Most common problems (sorted by frequency)
    topRealityChecks: topN(realityCheckCounts, 10),
    topBottlenecks: topN(bottleneckCounts, 10),
    topGrowthLevers: topN(growthLeverCounts, 10),
    topFollowUpInsights: topN(followUpInsightCounts, 10),

    // Follow-up answer patterns
    patterns: {
      churnReasons: Object.keys(churnReasons).length > 0 ? churnReasons : null,
      pricingStates: Object.keys(pricingStates).length > 0 ? pricingStates : null,
      concentrationLevels: Object.keys(concentrationLevels).length > 0 ? concentrationLevels : null,
    },

    // Content-ready insights (pre-computed narratives)
    contentInsights: generateContentInsights(zoneScores, overallScores, referralPcts, founderHours, delegationScores, n),
  };
}

// ============================================
// CONTENT-READY INSIGHTS
// ============================================

function generateContentInsights(
  zoneScores: Record<string, number[]>,
  overallScores: number[],
  referralPcts: number[],
  founderHours: number[],
  delegationScores: number[],
  n: number
): string[] {
  const insights: string[] = [];

  // Zone-based insights
  const weakestZone = Object.entries(zoneScores)
    .map(([zone, scores]) => ({ zone, avg: avg(scores) }))
    .sort((a, b) => a.avg - b.avg)[0];

  if (weakestZone) {
    insights.push(
      `Across ${n} agencies assessed, ${formatZoneName(weakestZone.zone)} is the weakest area with an average score of ${weakestZone.avg.toFixed(1)}/5.`
    );
  }

  // Referral dependency
  const highRefPct = referralPcts.filter(p => p >= 60).length;
  if (highRefPct > 0) {
    insights.push(
      `${Math.round((highRefPct / n) * 100)}% of agencies get 60%+ of leads from referrals — a single-point-of-failure most don't realize they have.`
    );
  }

  // Founder hours
  const over50 = founderHours.filter(h => h >= 50).length;
  if (over50 > 0) {
    insights.push(
      `${Math.round((over50 / n) * 100)}% of agency founders work 50+ hours/week. The average is ${avg(founderHours).toFixed(0)} hours.`
    );
  }

  // Delegation
  const lowDelegation = delegationScores.filter(d => d < 2.5).length;
  if (lowDelegation > 0) {
    insights.push(
      `${Math.round((lowDelegation / n) * 100)}% of founders score below 2.5/5 on delegation — they're still doing most of the work themselves.`
    );
  }

  // Overall score distribution
  const critical = overallScores.filter(s => s < 2.5).length;
  const strong = overallScores.filter(s => s >= 4).length;
  insights.push(
    `Score distribution: ${Math.round((critical / n) * 100)}% critical, ${Math.round((strong / n) * 100)}% strong. Most agencies land in the 2.5-3.5 range.`
  );

  return insights;
}

// ============================================
// HELPERS
// ============================================

function sanitizeAssessment(a: any) {
  return {
    id: a.id,
    agencyName: a.intake_data?.agencyName,
    segment: a.scores?.segmentLabel,
    overallScore: a.overall_score,
    zones: a.scores?.wtfZones ? Object.fromEntries(
      Object.entries(a.scores.wtfZones).map(([k, v]: [string, any]) => [k, v.score])
    ) : null,
    founderOS: a.scores?.founderOS ? {
      delegationScore: a.scores.founderOS.delegationScore,
      burnoutRisk: a.scores.founderOS.burnoutRisk,
      bottleneckAreas: a.scores.founderOS.bottleneckAreas,
    } : null,
    ltvMetrics: a.scores?.ltvMetrics || null,
    realityChecks: a.scores?.realityChecks?.map((c: any) => ({ id: c.id, type: c.type, title: c.title })) || [],
    followUpInsights: a.scores?.followUpInsights || null,
    revelations: a.scores?.revelations ? {
      founderTax: a.scores.revelations.founderTax?.totalFounderTax,
      pipelineDisruptionRisk: a.scores.revelations.pipelineProbability?.probabilityOfMajorDisruption,
      authorityScore: a.scores.revelations.authorityGap?.overallAuthorityScore,
      positioningCollision: a.scores.revelations.positioningCollision?.collisionScore,
      valuationGap: a.scores.revelations.trajectoryFork?.gap?.valuationDifference,
    } : null,
    intake: {
      revenue: a.intake_data?.lastYearRevenue || a.intake_data?.annualRevenue,
      teamSize: a.intake_data?.teamSize,
      founderHours: a.intake_data?.founderWeeklyHours,
      referralPct: a.intake_data?.referralPercent,
      currentClients: a.intake_data?.currentClients || a.intake_data?.clientCount,
      coreOffer: a.intake_data?.coreOffer,
      differentiator: a.intake_data?.differentiator,
    },
    createdAt: a.created_at,
    completedAt: a.completed_at,
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const frac = index - lower;
  if (lower + 1 < sorted.length) {
    return Math.round((sorted[lower] + frac * (sorted[lower + 1] - sorted[lower])) * 100) / 100;
  }
  return sorted[lower];
}

function distribution5(arr: number[]): Record<string, number> {
  const d: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const v of arr) d[String(Math.min(5, Math.max(1, Math.round(v))))]++;
  return d;
}

function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number; pct: number }> {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

function formatZoneName(zone: string): string {
  const names: Record<string, string> = {
    revenueQuality: 'Revenue Quality',
    profitability: 'Profitability',
    growthVsChurn: 'Growth vs Churn',
    leadEngine: 'Lead Engine',
    founderLoad: 'Founder Load',
    systemsReadiness: 'Systems Readiness',
    contentPositioning: 'Content & Positioning',
    teamVisibility: 'Team Visibility',
  };
  return names[zone] || zone;
}
