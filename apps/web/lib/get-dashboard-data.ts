import { getSupabaseServerClient } from "./supabase-server";
import { DashboardData, RecentCall, SkillTrend, PatternRadarData } from "./dashboard-types";
import { subDays } from "date-fns";

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

  // calls in last 30 days
  const callsLast30 = calls.filter(
    (c) => new Date(c.created_at) >= new Date(thirtyDaysAgo)
  );

  // split periods: older 30 vs newer 30 for deltas
  const first30 = calls.filter(
    (c) =>
      new Date(c.created_at) >= new Date(sixtyDaysAgo) &&
      new Date(c.created_at) < new Date(thirtyDaysAgo)
  );
  const second30 = callsLast30;

  const avg = (xs: (number | null | undefined)[]) => {
    const vals = xs.filter((x): x is number => typeof x === "number");
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const trustOld = avg(first30.map((c) => c.trust_velocity));
  const trustNew = avg(second30.map((c) => c.trust_velocity));
  const trustVelocityDelta = trustNew - trustOld;

  const agendaStability = avg(calls.map((c) => c.agenda_control));

  const patternDensity = avg(
    calls.map((c) => (typeof c.pattern_density === "number" ? c.pattern_density : 0))
  );

  const skillImprovementIndex =
    (trustVelocityDelta || 0) * 0.4 +
    (agendaStability || 0) * 0.3 +
    ((100 - patternDensity) || 0) * 0.3;

  // pattern radar rough calculation from trust_velocity, agenda_control and pattern_density
  const skills: SkillTrend[] = [
    {
      name: "Trust velocity",
      current: trustNew || trustOld || 0,
      delta: trustVelocityDelta || 0,
    },
    {
      name: "Agenda control",
      current: agendaStability || 0,
      delta:
        avg(second30.map((c) => c.agenda_control)) -
        avg(first30.map((c) => c.agenda_control)),
    },
    {
      name: "Pattern density (inverse)",
      current: 100 - (patternDensity || 0),
      delta:
        (100 -
          avg(second30.map((c) => c.pattern_density || 0))) -
        (100 - avg(first30.map((c) => c.pattern_density || 0))),
    },
  ];

  const topStrengths = [...skills].sort((a, b) => b.current - a.current).slice(0, 3);
  const topWeaknesses = [...skills].sort((a, b) => a.current - b.current).slice(0, 3);
  const mostImprovedSkill =
    [...skills].sort((a, b) => b.delta - a.delta)[0]?.name ?? null;

  const mostFrequentMistake =
    calls[0]?.full_report?.modelLayer?.crossTheme ??
    calls[0]?.primary_pattern ??
    null;

  const patternRadar: PatternRadarData = {
    topStrengths,
    topWeaknesses,
    mostFrequentMistake,
    mostImprovedSkill,
    skills,
  };

  // quick insights: pull from most recent report if present
  const latest = calls[0] || null;
  const latestReport = latest?.full_report || null;

  const quickInsights = {
    topQuote:
      latestReport?.narrativeCapture?.quotes?.[0] ??
      null,
    missedMove:
      latestReport?.rebuild?.tldr ??
      latestReport?.wtfMethod?.moves?.[0] ??
      null,
    skillToPractice:
      patternRadar.mostImprovedSkill ??
      patternRadar.topWeaknesses[0]?.name ??
      null,
  };

  // follow up tasks
  const { data: followUps, error: followError } = await supabase
    .from("call_followups")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_at", { ascending: true });

  if (followError) {
    console.error("Error fetching followups", followError);
  }

  return {
    metrics: {
      callsLast30: callsLast30.length,
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
  };
}
