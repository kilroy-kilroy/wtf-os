import type { SupabaseClient } from '@supabase/supabase-js';
import { MACRO_PATTERNS, getPatternById, type MacroPattern } from '@/lib/macro-patterns';
import { countPatternsInMarkdown, topNegativePattern } from '@/lib/patterns';

export type Momentum = 'accelerating' | 'steady' | 'slowing' | 'stalled' | 'pre_launch';

export interface ClientTrajectory {
  userId: string;
  email: string;
  // Sparkline: average score per day over the last 30d. Null days = no call.
  sparkline: (number | null)[];
  callsLast14d: number;
  callsPrev14d: number;
  avgScoreLast14d: number | null;
  avgScoreTrend: number | null; // delta vs prior 14d, in 0-100 scale
  fridaySubmittedThisWeek: boolean;
  daysSinceLastLogin: number | null;
  daysSinceEnrollment: number;
  momentum: Momentum;
  workingOn: { pattern: MacroPattern; frequency: number } | null;
  nextAction: { label: string; href: string } | null;
}

export interface CrossClientPattern {
  pattern: MacroPattern;
  clientsAffected: number; // how many clients have it appear in recent calls
  totalOccurrences: number;
}

export interface CoachingIntelligence {
  trajectories: Map<string, ClientTrajectory>;
  crossClient: {
    activeClients: number;
    topNegativePatterns: CrossClientPattern[]; // top 3
    topPositivePatterns: CrossClientPattern[]; // top 2
  };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoStartOfDay(d: Date): Date {
  return new Date(d.toISOString().slice(0, 10) + 'T00:00:00Z');
}

export async function getCoachingIntelligence(
  supabase: SupabaseClient,
  enrollments: Array<{
    user_id: string;
    enrolled_at: string;
    email: string;
    last_login_at: string | null;
    has_five_minute_friday: boolean;
    friday_submitted_this_week: boolean;
  }>
): Promise<CoachingIntelligence> {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 14);
  const start28 = new Date(now);
  start28.setDate(start28.getDate() - 28);

  const userIds = enrollments.map((e) => e.user_id);
  const emails = enrollments.map((e) => e.email).filter(Boolean);

  // Fetch all call_scores for these users in last 30 days.
  // Coaching clients either own their analyses via user_id, OR have them
  // attached via tool_runs.lead_email (lead-magnet path). Gather both.
  const [byUserId, toolRunsByEmail] = await Promise.all([
    userIds.length
      ? supabase
          .from('call_scores')
          .select('id, user_id, overall_score, markdown_response, created_at')
          .in('user_id', userIds)
          .gte('created_at', start30.toISOString())
      : { data: [] as any[] },
    emails.length
      ? supabase
          .from('tool_runs')
          .select('lead_email, ingestion_item_id')
          .in('lead_email', emails)
          .not('ingestion_item_id', 'is', null)
          .gte('created_at', start30.toISOString())
      : { data: [] as any[] },
  ]);

  const ingestionIds = (toolRunsByEmail.data || [])
    .map((r: any) => r.ingestion_item_id)
    .filter(Boolean);
  const ingestionEmailMap = new Map<string, string>(
    (toolRunsByEmail.data || []).map((r: any) => [r.ingestion_item_id, r.lead_email])
  );

  let byEmail: any[] = [];
  if (ingestionIds.length) {
    const { data } = await supabase
      .from('call_scores')
      .select('id, user_id, overall_score, markdown_response, created_at, ingestion_item_id')
      .in('ingestion_item_id', ingestionIds);
    byEmail = data || [];
  }

  // Combine: build a per-client list of scores keyed by userId.
  type Score = {
    overall_score: number | null;
    markdown_response: string | null;
    created_at: string;
  };
  const scoresByUser = new Map<string, Score[]>();
  userIds.forEach((u) => scoresByUser.set(u, []));

  for (const s of byUserId.data || []) {
    if (!s.user_id) continue;
    const arr = scoresByUser.get(s.user_id);
    if (arr) arr.push(s);
  }
  for (const s of byEmail) {
    const leadEmail = ingestionEmailMap.get(s.ingestion_item_id);
    const enrollment = enrollments.find((e) => e.email === leadEmail);
    if (!enrollment) continue;
    const arr = scoresByUser.get(enrollment.user_id);
    if (arr && !arr.some((x: any) => x.created_at === s.created_at && x.markdown_response === s.markdown_response)) {
      arr.push(s);
    }
  }

  // Build trajectories per client.
  const trajectories = new Map<string, ClientTrajectory>();
  // Tally cross-client pattern stats.
  const crossClientCounts = new Map<string, { occurrences: number; clients: Set<string> }>();
  MACRO_PATTERNS.forEach((p) =>
    crossClientCounts.set(p.id, { occurrences: 0, clients: new Set() })
  );

  for (const enrollment of enrollments) {
    const scores = (scoresByUser.get(enrollment.user_id) || []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Sparkline: average score per day across the 30-day window.
    const dailyAverages = new Array<number | null>(30).fill(null);
    const dailyAccumulator: Record<number, number[]> = {};
    for (const s of scores) {
      const created = new Date(s.created_at);
      const daysAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 0 || daysAgo >= 30) continue;
      const idx = 29 - daysAgo; // oldest at index 0, newest at 29
      const overall = s.overall_score;
      if (overall == null) continue;
      if (!dailyAccumulator[idx]) dailyAccumulator[idx] = [];
      dailyAccumulator[idx].push(overall * 10); // normalize 0-10 → 0-100
    }
    for (const [idxStr, values] of Object.entries(dailyAccumulator)) {
      const idx = Number(idxStr);
      dailyAverages[idx] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    const scoresLast14 = scores.filter((s) => new Date(s.created_at) >= start14);
    const scoresPrev14 = scores.filter(
      (s) => new Date(s.created_at) >= start28 && new Date(s.created_at) < start14
    );
    const avgOf = (arr: Score[]) => {
      const vals = arr.map((s) => s.overall_score).filter((v): v is number => v != null);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) * 10 : null;
    };
    const avgLast = avgOf(scoresLast14);
    const avgPrev = avgOf(scoresPrev14);
    const trend = avgLast != null && avgPrev != null ? Math.round((avgLast - avgPrev) * 10) / 10 : null;

    const daysSinceLogin = enrollment.last_login_at
      ? Math.floor((now.getTime() - new Date(enrollment.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysSinceEnrollment = Math.floor(
      (now.getTime() - new Date(enrollment.enrolled_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Momentum classification.
    // Signals considered: login recency, call cadence trend, enrollment age.
    let momentum: Momentum;
    const neverLoggedIn = daysSinceLogin === null;
    const neverAnalyzed = scores.length === 0;

    if (neverLoggedIn && neverAnalyzed) {
      // Invited but never activated — distinguish recent invites from dormant.
      momentum = daysSinceEnrollment <= 14 ? 'pre_launch' : 'stalled';
    } else if (daysSinceLogin !== null && daysSinceLogin >= 14 && scoresLast14.length === 0) {
      momentum = 'stalled';
    } else if (
      scoresLast14.length > 0 &&
      scoresPrev14.length > 0 &&
      scoresLast14.length >= scoresPrev14.length * 1.5
    ) {
      momentum = 'accelerating';
    } else if (scoresLast14.length === 0 && scoresPrev14.length > 0) {
      momentum = 'slowing';
    } else if (scoresLast14.length > 0) {
      momentum = 'steady';
    } else {
      momentum = daysSinceEnrollment > 14 ? 'slowing' : 'pre_launch';
    }

    // Current working pattern: most frequent negative across last 30 days.
    const patternCounts = new Map<string, number>();
    MACRO_PATTERNS.forEach((p) => patternCounts.set(p.id, 0));
    for (const s of scores) {
      if (!s.markdown_response) continue;
      const c = countPatternsInMarkdown(s.markdown_response);
      c.forEach((n, id) => patternCounts.set(id, (patternCounts.get(id) || 0) + n));
    }
    const worst = topNegativePattern(patternCounts);
    const workingOn = worst
      ? { pattern: worst, frequency: patternCounts.get(worst.id) || 0 }
      : null;

    // Roll into cross-client tally.
    patternCounts.forEach((n, id) => {
      if (n > 0) {
        const agg = crossClientCounts.get(id)!;
        agg.occurrences += n;
        agg.clients.add(enrollment.user_id);
      }
    });

    // Next action: highest-leverage single thing Tim can do right now.
    let nextAction: { label: string; href: string } | null = null;
    if (enrollment.friday_submitted_this_week) {
      nextAction = { label: 'Respond to Friday', href: '/admin/five-minute-friday' };
    } else if (neverLoggedIn && daysSinceEnrollment > 14) {
      nextAction = { label: 'Resend invite — never activated', href: `/admin/clients` };
    } else if (momentum === 'stalled') {
      const silenceDays = daysSinceLogin ?? daysSinceEnrollment;
      nextAction = { label: `Re-engage — silent ${silenceDays}d`, href: `/admin/impersonate/${enrollment.user_id}` };
    } else if (scoresLast14.length === 0 && daysSinceEnrollment <= 14) {
      nextAction = { label: 'Welcome / first analysis', href: `/admin/impersonate/${enrollment.user_id}` };
    } else if (momentum === 'slowing') {
      nextAction = { label: 'Nudge — cadence slipping', href: `/admin/impersonate/${enrollment.user_id}` };
    } else if (workingOn) {
      nextAction = { label: `Coach: ${workingOn.pattern.name}`, href: `/admin/impersonate/${enrollment.user_id}` };
    }

    trajectories.set(enrollment.user_id, {
      userId: enrollment.user_id,
      email: enrollment.email,
      sparkline: dailyAverages,
      callsLast14d: scoresLast14.length,
      callsPrev14d: scoresPrev14.length,
      avgScoreLast14d: avgLast != null ? Math.round(avgLast) : null,
      avgScoreTrend: trend,
      fridaySubmittedThisWeek: enrollment.friday_submitted_this_week,
      daysSinceLastLogin: daysSinceLogin,
      daysSinceEnrollment,
      momentum,
      workingOn,
      nextAction,
    });
  }

  // Assemble cross-client output: rank negative patterns by clients-affected,
  // break ties by total occurrences.
  const rankPatterns = (polarity: 'negative' | 'positive'): CrossClientPattern[] => {
    const rows: CrossClientPattern[] = [];
    crossClientCounts.forEach((agg, id) => {
      const p = getPatternById(id);
      if (!p || p.polarity !== polarity || agg.clients.size === 0) return;
      rows.push({ pattern: p, clientsAffected: agg.clients.size, totalOccurrences: agg.occurrences });
    });
    rows.sort((a, b) => {
      if (b.clientsAffected !== a.clientsAffected) return b.clientsAffected - a.clientsAffected;
      return b.totalOccurrences - a.totalOccurrences;
    });
    return rows;
  };

  return {
    trajectories,
    crossClient: {
      activeClients: enrollments.length,
      topNegativePatterns: rankPatterns('negative').slice(0, 3),
      topPositivePatterns: rankPatterns('positive').slice(0, 2),
    },
  };
}
