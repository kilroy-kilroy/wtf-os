import { getSupabaseServerClient } from "./supabase-server";
import { DashboardData, RecentCall, SkillTrend, PatternRadarData, ChartDataPoint, CoachingReport } from "./dashboard-types";
import { subDays } from "date-fns";

// Utility functions for real math
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const avg = (xs: (number | null | undefined)[]) => {
  const vals = xs.filter((x): x is number => typeof x === "number");
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const variance = (xs: (number | null | undefined)[]) => {
  const vals = xs.filter((x): x is number => typeof x === "number");
  if (vals.length < 2) return 0;
  const mean = avg(vals);
  const squaredDiffs = vals.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / vals.length;
};

const normalizeDelta = (x: number) => clamp(x / 10, -10, 10) * 10;

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = getSupabaseServerClient();

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30).toISOString();
  const sixtyDaysAgo = subDays(now, 60).toISOString();

  // last 60 days of calls for trend comparisons
  const { data: calls, error } = await supabase
    .from("call_lab_reports")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", sixtyDaysAgo)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching call_lab_reports", error);
    throw error;
  }

  // Recent calls for display
  const recentCalls: RecentCall[] =
    calls.slice(0, 5).map((c) => ({
      id: c.id,
      createdAt: c.created_at,
      buyerName: c.buyer_name,
      companyName: c.company_name,
      score: c.overall_score,
      primaryPattern: c.primary_pattern,
      improvementHighlight: c.improvement_highlight,
      trustVelocity: c.trust_velocity,
      agendaControl: c.agenda_control,
    })) ?? [];

  // Split periods: older 30 vs newer 30 for deltas
  const first30 = calls.filter(
    (c) =>
      new Date(c.created_at) >= new Date(sixtyDaysAgo) &&
      new Date(c.created_at) < new Date(thirtyDaysAgo)
  );
  const second30 = calls.filter(
    (c) => new Date(c.created_at) >= new Date(thirtyDaysAgo)
  );

  // ============================================
  // METRIC 1: Calls Analyzed (last 30 days)
  // ============================================
  const callsLast30 = second30.length;

  // ============================================
  // METRIC 2: Trust Velocity Delta
  // "How quickly the buyer relaxes and reveals meaningful info"
  // ============================================
  const trustOld = avg(first30.map((c) => c.trust_velocity));
  const trustNew = avg(second30.map((c) => c.trust_velocity));

  // Trend % change, fallback to avgNew if no prior data
  let trustVelocityDelta: number;
  if (trustOld === 0 || first30.length === 0) {
    trustVelocityDelta = trustNew;
  } else {
    trustVelocityDelta = ((trustNew - trustOld) / trustOld) * 100;
  }

  // ============================================
  // METRIC 3: Agenda Control Stability
  // "How consistently you control leverage moments"
  // Stability = 100 - (variance * 1.5), clamped 0-100
  // ============================================
  const agendaScores = calls.map((c) => c.agenda_control);
  const agendaVariance = variance(agendaScores);
  const agendaStability = clamp(100 - agendaVariance * 1.5, 0, 100);

  // ============================================
  // METRIC 4: Pattern Density
  // "Recurring friction that slows deals"
  // Scale 0-100 (0 = clean calls, 100 = everything breaks)
  // ============================================
  const patternDensity = avg(
    calls.map((c) => (typeof c.pattern_density === "number" ? c.pattern_density : 0))
  );

  // ============================================
  // METRIC 5: Skill Improvement Index ("Peloton Score")
  // Weighted composite reflecting behavioral improvement
  // ============================================
  const agendaOld = avg(first30.map((c) => c.agenda_control));
  const agendaNew = avg(second30.map((c) => c.agenda_control));
  const agendaStabilityDelta = agendaNew - agendaOld;

  const skillImprovementIndex = clamp(
    normalizeDelta(trustVelocityDelta) * 0.5 +
    normalizeDelta(agendaStabilityDelta) * 0.25 +
    (100 - patternDensity) * 0.25,
    0,
    100
  );

  // ============================================
  // PATTERN RADAR
  // ============================================
  const skills: SkillTrend[] = [
    {
      name: "Trust Velocity",
      current: trustNew || trustOld || 0,
      delta: trustVelocityDelta || 0,
    },
    {
      name: "Agenda Control",
      current: agendaStability || 0,
      delta: agendaStabilityDelta,
    },
    {
      name: "Red Flag Frequency",
      current: 100 - (patternDensity || 0),
      delta:
        (100 - avg(second30.map((c) => c.pattern_density || 0))) -
        (100 - avg(first30.map((c) => c.pattern_density || 0))),
    },
  ];

  const topStrengths = [...skills].sort((a, b) => b.current - a.current).slice(0, 3);
  const topWeaknesses = [...skills].sort((a, b) => a.current - b.current).slice(0, 3);
  const mostImprovedSkill =
    [...skills].sort((a, b) => b.delta - a.delta)[0]?.name ?? null;

  // Aggregate patterns across ALL calls to find most frequent friction
  const patternCounts: Record<string, number> = {};
  for (const call of calls) {
    const report = call.full_report as Record<string, any> | null;
    // Pro JSON: patterns array
    if (report?.patterns && Array.isArray(report.patterns)) {
      for (const p of report.patterns) {
        if (p.patternName) {
          patternCounts[p.patternName] = (patternCounts[p.patternName] || 0) + 1;
        }
      }
    }
    // Also count primary_pattern from the call record
    if (call.primary_pattern) {
      patternCounts[call.primary_pattern] = (patternCounts[call.primary_pattern] || 0) + 1;
    }
  }

  // Find the most frequent pattern
  const sortedPatterns = Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a);
  const mostFrequentMistake = sortedPatterns[0]?.[0] ?? null;

  const patternRadar: PatternRadarData = {
    topStrengths,
    topWeaknesses,
    mostFrequentMistake,
    mostImprovedSkill,
    skills,
  };

  // ============================================
  // QUICK INSIGHTS
  // ============================================
  const latest = calls[0] || null;
  const latestReport = (latest?.full_report as Record<string, any>) || null;

  // Extract the call snapshot (one-liner summary of the call)
  const extractCallSnapshot = () => {
    // Pro JSON: snapTake.tldr is the one-liner summary
    if (latestReport?.snapTake?.tldr) return latestReport.snapTake.tldr;
    // Old format
    if (latestReport?.narrativeCapture?.quotes?.[0]) return latestReport.narrativeCapture.quotes[0];
    return null;
  };

  // Extract the biggest missed move - the PATTERN NAME, not the analysis
  const extractMissedMove = () => {
    // Pro JSON: first pattern name (the behavioral pattern detected)
    if (latestReport?.patterns?.[0]?.patternName) {
      return latestReport.patterns[0].patternName;
    }
    // Old format
    if (latestReport?.rebuild?.tldr) return latestReport.rebuild.tldr;
    if (latestReport?.wtfMethod?.moves?.[0]) return latestReport.wtfMethod.moves[0];
    return null;
  };

  // Extract next call focus - brief action from nextSteps
  const extractNextAction = () => {
    // Pro JSON: first action from nextSteps
    if (latestReport?.nextSteps?.actions?.[0]) {
      return latestReport.nextSteps.actions[0];
    }
    // Old format
    if (latestReport?.wtfMethod?.nextMove) return latestReport.wtfMethod.nextMove;
    return null;
  };

  const quickInsights = {
    topQuote: extractCallSnapshot(),
    missedMove: extractMissedMove(),
    nextAction: extractNextAction(),
    skillToPractice:
      patternRadar.mostImprovedSkill ??
      patternRadar.topWeaknesses[0]?.name ??
      null,
  };

  // ============================================
  // FOLLOW-UP TASKS
  // ============================================
  const { data: followUps, error: followError } = await supabase
    .from("call_followups")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_at", { ascending: true });

  if (followError) {
    console.error("Error fetching followups", followError);
  }

  // ============================================
  // COACHING REPORTS
  // ============================================
  const { data: coachingReportsData, error: coachingError } = await supabase
    .from("coaching_reports")
    .select("id, report_type, period_start, period_end, scores_aggregate, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (coachingError) {
    console.error("Error fetching coaching reports", coachingError);
  }

  const coachingReports: CoachingReport[] = (coachingReportsData || []).map((r) => ({
    id: r.id,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end: r.period_end,
    scores_aggregate: r.scores_aggregate,
    created_at: r.created_at,
  }));

  // ============================================
  // CHART DATA (oldest → newest for line charts)
  // ============================================
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const trustVelocityTrend: ChartDataPoint[] = calls
    .map((c) => ({
      date: formatDate(c.created_at),
      value: c.trust_velocity ?? 0,
    }))
    .reverse();

  const agendaControlTrend: ChartDataPoint[] = calls
    .map((c) => ({
      date: formatDate(c.created_at),
      value: c.agenda_control ?? 0,
    }))
    .reverse();

  const patternDensityTrend: ChartDataPoint[] = calls
    .map((c) => ({
      date: formatDate(c.created_at),
      value: c.pattern_density ?? 0,
    }))
    .reverse();

  return {
    metrics: {
      callsLast30,
      trustVelocityDelta,
      agendaStability,
      patternDensity,
      skillImprovementIndex,
    },
    patternRadar,
    recentCalls,
    quickInsights,
    followUps:
      followUps?.map((f) => ({
        id: f.id,
        label: f.label,
        dueAt: f.due_at,
        completed: f.completed,
        callId: f.call_id,
      })) ?? [],
    charts: {
      trustVelocityTrend,
      agendaControlTrend,
      patternDensityTrend,
    },
    coachingReports,
    discoveryLab: {
      totalBriefs: 0,
      liteBriefs: 0,
      proBriefs: 0,
      companiesResearched: 0,
      prepToCallRate: null,
      prepAdvantage: null,
      recentBriefs: [],
    },
    proInsights: {
      oneThingTracker: [],
      avgProScores: [],
      totalProReports: 0,
    },
  };
}
