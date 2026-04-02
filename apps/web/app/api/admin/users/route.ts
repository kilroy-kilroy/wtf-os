import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const [
      usersResult,
      enrollmentsResult,
      instantLeadsResult,
      callScoresResult,
      discoveryResult,
      visibilityResult,
      assessmentsResult,
      subscriptionsResult,
      orgsResult,
      assignmentsResult,
    ] = await Promise.all([
      (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name, full_name, call_lab_tier, discovery_lab_tier, visibility_lab_tier, subscription_tier, org_id, created_at')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('client_enrollments')
        .select('user_id, status'),
      (supabase as any)
        .from('instant_leads')
        .select('email'),
      (supabase as any)
        .from('call_scores')
        .select('user_id'),
      (supabase as any)
        .from('discovery_briefs')
        .select('user_id'),
      (supabase as any)
        .from('visibility_lab_reports')
        .select('user_id'),
      (supabase as any)
        .from('assessments')
        .select('user_id')
        .eq('status', 'completed'),
      (supabase as any)
        .from('subscriptions')
        .select('user_id, status'),
      (supabase as any)
        .from('orgs')
        .select('id, name, website'),
      (supabase as any)
        .from('user_agency_assignments')
        .select('user_id, agency_id'),
    ]);

    const users = usersResult.data || [];
    const enrollments = enrollmentsResult.data || [];
    const instantLeads = instantLeadsResult.data || [];
    const callScores = callScoresResult.data || [];
    const discoveryBriefs = discoveryResult.data || [];
    const visibilityReports = visibilityResult.data || [];
    const assessments = assessmentsResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const orgs = orgsResult.data || [];
    const assignments = assignmentsResult.data || [];

    // Build lookup sets/maps
    const clientUserIds = new Set(enrollments.map((e: any) => e.user_id));
    const leadEmails = new Set(instantLeads.map((l: any) => l.email));
    const orgMap = new Map<string, any>(orgs.map((o: any) => [o.id, o]));
    const userOrgMap = new Map<string, string>(assignments.map((a: any) => [a.user_id, a.agency_id]));
    const activeSubUserIds = new Set(
      subscriptions.filter((s: any) => s.status === 'active').map((s: any) => s.user_id)
    );

    // Count reports per user
    function countByUser(rows: any[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const r of rows) {
        if (!r.user_id) continue;
        map.set(r.user_id, (map.get(r.user_id) || 0) + 1);
      }
      return map;
    }

    const callLabCounts = countByUser(callScores);
    const discoveryCounts = countByUser(discoveryBriefs);
    const visibilityCounts = countByUser(visibilityReports);
    const assessmentCounts = countByUser(assessments);

    const result = users.map((u: any) => {
      const isClient = clientUserIds.has(u.id);
      const isLead = !isClient && leadEmails.has(u.email);

      let companyName: string | null = null;
      let companyUrl: string | null = null;

      if (u.org_id) {
        const org = orgMap.get(u.org_id);
        if (org) {
          companyName = org.name;
          companyUrl = org.website || null;
        }
      }

      if (!companyName) {
        const agencyId = userOrgMap.get(u.id);
        if (agencyId) {
          const org = orgMap.get(agencyId);
          if (org) {
            companyName = org.name;
            companyUrl = org.website || null;
          }
        }
      }

      const reportCounts = {
        call_lab: callLabCounts.get(u.id) || 0,
        discovery: discoveryCounts.get(u.id) || 0,
        visibility: visibilityCounts.get(u.id) || 0,
        assessment: assessmentCounts.get(u.id) || 0,
      };

      const productsUsed: string[] = [];
      if (reportCounts.call_lab > 0) productsUsed.push('call_lab');
      if (reportCounts.discovery > 0) productsUsed.push('discovery');
      if (reportCounts.visibility > 0) productsUsed.push('visibility');
      if (reportCounts.assessment > 0) productsUsed.push('assessment');

      const tiers = [u.call_lab_tier, u.discovery_lab_tier, u.visibility_lab_tier].filter(Boolean);
      const highestTier = tiers.includes('pro') ? 'pro' : tiers.length > 0 ? 'free' : 'lead';

      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
        type: isClient ? 'client' : isLead ? 'lead' : 'user',
        company_name: companyName,
        company_url: companyUrl,
        products_used: productsUsed,
        highest_tier: highestTier,
        has_active_subscription: activeSubUserIds.has(u.id),
        created_at: u.created_at,
        report_counts: reportCounts,
      };
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
