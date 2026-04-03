import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// TYPES
// ============================================

export interface ActionItem {
  id: string;
  type: 'friday_response' | 'client_inactive' | 'new_analysis' | 'new_signup';
  priority: number;
  clientName: string;
  clientEmail: string;
  description: string;
  timestamp: string;
  actionUrl: string;
  actionLabel: string;
}

export interface ClientCard {
  userId: string;
  name: string;
  email: string;
  companyName: string | null;
  programName: string;
  programSlug: string;
  enrolledAt: string;
  lastActivity: { description: string; timestamp: string } | null;
  fridayStatus: 'submitted' | 'pending' | 'overdue' | 'not_required';
  fridayId: string | null;
  latestCallScoreId: string | null;
  coachingReportStatus: 'pending' | 'sent' | 'none';
  daysSinceLastLogin: number | null;
}

export interface PlatformPulse {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  coachingClients: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  callAnalysesThisWeek: number;
  discoveryReportsThisWeek: number;
}

export interface AdminDashboardData {
  actionItems: ActionItem[];
  clientCards: ClientCard[];
  pulse: PlatformPulse;
}

// ============================================
// DATA FETCHING
// ============================================

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const currentFriday = getWeekFriday(now);

  // Parallel data fetches — separate queries to avoid PostgREST join issues
  const [
    enrollmentsResult,
    programsResult,
    allUsersResult,
    fridaysResult,
    recentSignupsResult,
    weeklyToolRunsResult,
  ] = await Promise.all([
    supabase
      .from('client_enrollments')
      .select('id, user_id, program_id, enrolled_at, status')
      .eq('status', 'active'),

    supabase
      .from('client_programs')
      .select('id, name, slug, has_five_minute_friday, has_call_lab_pro'),

    (supabase as any)
      .from('users')
      .select('id, email, first_name, last_name, last_sign_in_at, created_at, call_lab_tier, discovery_lab_tier, visibility_lab_tier, subscription_tier, org_id'),

    supabase
      .from('five_minute_fridays')
      .select('id, user_id, week_of, submitted_at')
      .eq('week_of', currentFriday),

    supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false }),

    supabase
      .from('tool_runs')
      .select('id, tool_type')
      .gte('created_at', weekAgo.toISOString()),
  ]);

  const rawEnrollments = enrollmentsResult.data || [];
  const programs = programsResult.data || [];
  const allUsers = allUsersResult.data || [];
  const fridays = fridaysResult.data || [];
  const recentSignups = recentSignupsResult.data || [];
  const weeklyToolRuns = weeklyToolRunsResult.data || [];

  // Fetch orgs for company name resolution
  const orgIds = [...new Set(allUsers.filter((u: any) => u.org_id).map((u: any) => u.org_id))];
  let orgMap = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from('orgs')
      .select('id, name')
      .in('id', orgIds);
    orgMap = new Map((orgs || []).map((o) => [o.id, o.name]));
  }

  // Build lookup maps
  const userMap = new Map(allUsers.map((u: any) => [u.id, u]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  // Merge enrollments with user and program data
  const enrollments = rawEnrollments.map((e) => ({
    ...e,
    users: userMap.get(e.user_id) || null,
    client_programs: programMap.get(e.program_id) || null,
  }));

  // Unresponded Friday submissions
  const fridayIds = fridays.map((f) => f.id);
  let respondedFridayIds = new Set<string>();
  if (fridayIds.length > 0) {
    const { data: responses } = await supabase
      .from('five_minute_friday_responses')
      .select('friday_id')
      .in('friday_id', fridayIds);
    respondedFridayIds = new Set((responses || []).map((r) => r.friday_id));
  }

  // Build action items
  const actionItems: ActionItem[] = [];

  // Action: Unresponded Friday submissions
  for (const friday of fridays) {
    if (!respondedFridayIds.has(friday.id)) {
      const enrollment = enrollments.find((e) => e.user_id === friday.user_id);
      const user = enrollment?.users as any;
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown';

      actionItems.push({
        id: `friday-${friday.id}`,
        type: 'friday_response',
        priority: 1,
        clientName: name,
        clientEmail: user?.email || '',
        description: `Submitted Friday check-in`,
        timestamp: friday.submitted_at,
        actionUrl: `/admin/five-minute-friday`,
        actionLabel: 'Respond',
      });
    }
  }

  // Action: Clients inactive for 7+ days
  for (const enrollment of enrollments) {
    const user = enrollment.users as any;
    if (!user?.last_sign_in_at) continue;
    const daysSince = Math.floor(
      (now.getTime() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince >= 7) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
      actionItems.push({
        id: `inactive-${enrollment.id}`,
        type: 'client_inactive',
        priority: daysSince >= 14 ? 2 : 3,
        clientName: name,
        clientEmail: user.email,
        description: `No login for ${daysSince} days`,
        timestamp: user.last_sign_in_at,
        actionUrl: `/admin/clients`,
        actionLabel: 'View Profile',
      });
    }
  }

  // Action: New signups (informational)
  for (const signup of recentSignups.slice(0, 5)) {
    const name = [signup.first_name, signup.last_name].filter(Boolean).join(' ') || signup.email;
    const isClient = enrollments.some((e) => e.user_id === signup.id);
    if (!isClient) {
      actionItems.push({
        id: `signup-${signup.id}`,
        type: 'new_signup',
        priority: 10,
        clientName: name,
        clientEmail: signup.email,
        description: 'New signup',
        timestamp: signup.created_at,
        actionUrl: `/admin/clients`,
        actionLabel: 'View',
      });
    }
  }

  // Sort by priority, then by timestamp (most recent first)
  actionItems.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Build client cards
  const clientCards: ClientCard[] = enrollments.map((enrollment) => {
    const user = enrollment.users as any;
    const program = enrollment.client_programs as any;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown';

    const hasFriday = program?.has_five_minute_friday || false;
    const submission = fridays.find((f) => f.user_id === enrollment.user_id);
    let fridayStatus: ClientCard['fridayStatus'] = 'not_required';
    if (hasFriday) {
      if (submission) {
        fridayStatus = 'submitted';
      } else if (now.getDay() >= 5) {
        fridayStatus = 'overdue';
      } else {
        fridayStatus = 'pending';
      }
    }

    const daysSinceLastLogin = user?.last_sign_in_at
      ? Math.floor((now.getTime() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      userId: enrollment.user_id,
      name,
      email: user?.email || '',
      companyName: user?.org_id ? (orgMap.get(user.org_id) || null) : null,
      programName: program?.name || 'Unknown Program',
      programSlug: program?.slug || '',
      enrolledAt: enrollment.enrolled_at,
      lastActivity: user?.last_sign_in_at
        ? { description: 'Last login', timestamp: user.last_sign_in_at }
        : null,
      fridayStatus,
      fridayId: submission?.id || null,
      latestCallScoreId: null,
      coachingReportStatus: 'none' as const,
      daysSinceLastLogin,
    };
  });

  // Build platform pulse
  const proUsers = allUsers.filter(
    (u: any) => u.call_lab_tier === 'pro' || u.discovery_lab_tier === 'pro' || u.visibility_lab_tier === 'pro'
  ).length;
  const coachingClients = enrollments.length;
  const freeUsers = allUsers.length - proUsers - coachingClients;

  const monthSignups = allUsers.filter(
    (u: any) => new Date(u.created_at) >= monthAgo
  ).length;

  const callAnalyses = weeklyToolRuns.filter(
    (r) => r.tool_type === 'call_lab' || r.tool_type === 'call_lab_pro'
  ).length;
  const discoveryReports = weeklyToolRuns.filter(
    (r) => r.tool_type === 'discovery_lab' || r.tool_type === 'discovery_lab_pro'
  ).length;

  const pulse: PlatformPulse = {
    totalUsers: allUsers.length,
    freeUsers: Math.max(0, freeUsers),
    proUsers,
    coachingClients,
    signupsThisWeek: recentSignups.length,
    signupsThisMonth: monthSignups,
    callAnalysesThisWeek: callAnalyses,
    discoveryReportsThisWeek: discoveryReports,
  };

  return { actionItems, clientCards, pulse };
}

// ============================================
// HELPERS
// ============================================

function getWeekFriday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = 5 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
