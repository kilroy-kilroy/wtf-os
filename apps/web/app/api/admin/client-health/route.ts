import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Free email providers — users with these domains won't be grouped into agencies
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com',
  'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'mac.com', 'mail.com', 'protonmail.com', 'proton.me', 'zoho.com',
  'ymail.com', 'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
  'cox.net', 'charter.net', 'earthlink.net', 'juno.com', 'optonline.net',
  'frontier.com', 'windstream.net', 'roadrunner.com',
]);

function extractDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase().trim();
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function domainToAgencyName(domain: string): string {
  // Convert "acme-agency.com" → "Acme Agency"
  const name = domain.replace(/\.(com|net|org|io|co|agency|digital|media|studio|group|consulting|marketing)$/i, '');
  return name
    .split(/[-_.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  try {
    // Fetch all active enrollments with program and company info
    const { data: enrollments } = await supabase
      .from('client_enrollments')
      .select(`
        id, user_id, status, enrolled_at,
        program:client_programs(name, slug, has_five_minute_friday),
        company:client_companies(company_name)
      `)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ agencies: [], ungrouped: [], clients: [] });
    }

    // Get auth user data for last_sign_in_at, email, name
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map<string, { lastSignIn: string | null; email: string; name: string | null }>();
    for (const u of authData?.users || []) {
      authMap.set(u.id, {
        lastSignIn: u.last_sign_in_at || null,
        email: u.email || '',
        name: u.user_metadata?.full_name || null,
      });
    }

    // Get report counts per user for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const userIds = enrollments.map((e: any) => e.user_id).filter(Boolean);

    const [callLabResult, discoveryResult, visibilityResult] = await Promise.all([
      supabase
        .from('call_lab_reports')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabase
        .from('discovery_briefs')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabase
        .from('visibility_lab_reports')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
    ]);

    // Count reports per user
    const reportCounts = new Map<string, number>();
    for (const r of [...(callLabResult.data || []), ...(discoveryResult.data || []), ...(visibilityResult.data || [])]) {
      reportCounts.set(r.user_id, (reportCounts.get(r.user_id) || 0) + 1);
    }

    // Get Friday check-in counts per enrollment
    const enrollmentIds = enrollments.map((e: any) => e.id);
    const { data: fridays } = await supabase
      .from('five_minute_fridays')
      .select('enrollment_id, week_of')
      .in('enrollment_id', enrollmentIds);

    const fridayCounts = new Map<string, number>();
    for (const f of fridays || []) {
      fridayCounts.set(f.enrollment_id, (fridayCounts.get(f.enrollment_id) || 0) + 1);
    }

    // Get document counts per enrollment
    const { data: docCounts } = await supabase
      .from('client_documents')
      .select('enrollment_id')
      .in('enrollment_id', enrollmentIds);

    const documentCounts = new Map<string, number>();
    for (const d of docCounts || []) {
      documentCounts.set(d.enrollment_id, (documentCounts.get(d.enrollment_id) || 0) + 1);
    }

    // Also fetch explicit agency assignments for matching
    const { data: assignments } = await supabase
      .from('user_agency_assignments')
      .select('user_id, agency_id')
      .in('user_id', userIds);

    const { data: agenciesData } = await supabase
      .from('agencies')
      .select('id, name, url');

    const agencyNameMap = new Map<string, { id: string; name: string; url: string | null }>();
    for (const a of agenciesData || []) {
      agencyNameMap.set(a.id, { id: a.id, name: a.name, url: a.url });
    }

    const userToAgencyId = new Map<string, string>();
    for (const a of assignments || []) {
      userToAgencyId.set(a.user_id, a.agency_id);
    }

    // Build health data for each client
    const clients = enrollments.map((e: any) => {
      const auth = authMap.get(e.user_id);
      const lastSignIn = auth?.lastSignIn || null;
      const reportsThisMonth = reportCounts.get(e.user_id) || 0;
      const fridayCount = fridayCounts.get(e.id) || 0;
      const docCount = documentCounts.get(e.id) || 0;

      // Calculate expected Fridays since enrollment
      const enrolledDate = new Date(e.enrolled_at);
      const weeksSinceEnrollment = Math.max(1, Math.floor((now.getTime() - enrolledDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const hasFriday = (e.program as any)?.has_five_minute_friday || false;
      const expectedFridays = hasFriday ? weeksSinceEnrollment : 0;
      const missedFridays = Math.max(0, expectedFridays - fridayCount);

      // Days since last login
      const daysSinceLogin = lastSignIn
        ? Math.floor((now.getTime() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Health status
      let health: 'green' | 'yellow' | 'red' = 'green';
      if (daysSinceLogin === null) {
        health = 'red';
      } else if (daysSinceLogin >= 14 || missedFridays >= 2) {
        health = 'red';
      } else if (daysSinceLogin >= 7 || missedFridays >= 1) {
        health = 'yellow';
      }

      const email = auth?.email || '';
      const domain = extractDomain(email);

      // Determine agency: first check explicit assignment, then fall back to domain
      const explicitAgencyId = userToAgencyId.get(e.user_id);
      const explicitAgency = explicitAgencyId ? agencyNameMap.get(explicitAgencyId) : null;

      return {
        enrollmentId: e.id,
        userId: e.user_id,
        name: auth?.name || auth?.email || 'Unknown',
        email,
        domain,
        companyName: (e.company as any)?.company_name || null,
        programName: (e.program as any)?.name || 'Unknown',
        programSlug: (e.program as any)?.slug || '',
        enrolledAt: e.enrolled_at,
        lastSignIn,
        daysSinceLogin,
        reportsThisMonth,
        fridaySubmissions: fridayCount,
        expectedFridays,
        missedFridays,
        documentsShared: docCount,
        health,
        agencyId: explicitAgency?.id || null,
        agencyName: explicitAgency?.name || null,
      };
    });

    // Group clients into agencies by: explicit agency assignment OR email domain
    const agencyGroups = new Map<string, {
      key: string;
      agencyId: string | null;
      name: string;
      domain: string | null;
      users: typeof clients;
    }>();

    const ungrouped: typeof clients = [];

    for (const client of clients) {
      // Key priority: explicit agency > email domain > ungrouped
      let groupKey: string | null = null;
      let groupName: string | null = null;
      let groupAgencyId: string | null = null;
      let groupDomain: string | null = null;

      if (client.agencyId) {
        groupKey = `agency:${client.agencyId}`;
        groupName = client.agencyName || 'Unknown Agency';
        groupAgencyId = client.agencyId;
      } else if (client.domain) {
        groupKey = `domain:${client.domain}`;
        groupName = domainToAgencyName(client.domain);
        groupDomain = client.domain;
      }

      if (groupKey) {
        if (!agencyGroups.has(groupKey)) {
          agencyGroups.set(groupKey, {
            key: groupKey,
            agencyId: groupAgencyId,
            name: groupName!,
            domain: groupDomain,
            users: [],
          });
        }
        agencyGroups.get(groupKey)!.users.push(client);
      } else {
        ungrouped.push(client);
      }
    }

    // Build agency summaries
    const healthOrder = { red: 0, yellow: 1, green: 2 };
    const agencies = Array.from(agencyGroups.values()).map((group) => {
      // Worst health status in the group
      const worstHealth = group.users.reduce((worst, u) => {
        return healthOrder[u.health] < healthOrder[worst] ? u.health : worst;
      }, 'green' as 'green' | 'yellow' | 'red');

      // Aggregate metrics
      const totals = group.users.reduce(
        (acc, u) => ({
          reportsThisMonth: acc.reportsThisMonth + u.reportsThisMonth,
          fridaySubmissions: acc.fridaySubmissions + u.fridaySubmissions,
          expectedFridays: acc.expectedFridays + u.expectedFridays,
          documentsShared: acc.documentsShared + u.documentsShared,
        }),
        { reportsThisMonth: 0, fridaySubmissions: 0, expectedFridays: 0, documentsShared: 0 }
      );

      // Sort users within group: red first
      group.users.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

      return {
        key: group.key,
        agencyId: group.agencyId,
        name: group.name,
        domain: group.domain,
        health: worstHealth,
        userCount: group.users.length,
        totals,
        users: group.users,
      };
    });

    // Sort agencies: red first, then by user count descending
    agencies.sort((a, b) => {
      const healthDiff = healthOrder[a.health] - healthOrder[b.health];
      if (healthDiff !== 0) return healthDiff;
      return b.userCount - a.userCount;
    });

    // Sort ungrouped: red first
    ungrouped.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

    // Also return flat clients list for backwards compatibility
    const flatClients = [...clients].sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

    return NextResponse.json({ agencies, ungrouped, clients: flatClients });
  } catch (error: any) {
    console.error('[Client Health] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
