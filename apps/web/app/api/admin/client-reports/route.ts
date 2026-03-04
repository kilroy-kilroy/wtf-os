import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

// Free email providers — users with these domains won't be auto-grouped
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
  const name = domain.replace(/\.(com|net|org|io|co|agency|digital|media|studio|group|consulting|marketing)$/i, '');
  return name
    .split(/[-_.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Admin Client Reports API
 *
 * Returns agencies, users, and all reports for the admin reports page.
 * Now includes domain-inferred agencies for unassigned users.
 * Auth: ADMIN_API_KEY bearer token
 *
 * GET /api/admin/client-reports
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Fetch all data in parallel
    const [
      agenciesResult,
      usersResult,
      assignmentsResult,
      callLabResult,
      discoveryResult,
      assessmentsResult,
      visibilityResult,
    ] = await Promise.all([
      (supabase as any)
        .from('agencies')
        .select('id, name, url')
        .order('name'),
      (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('user_agency_assignments')
        .select('user_id, agency_id, role'),
      (supabase as any)
        .from('call_lab_reports')
        .select('id, user_id, buyer_name, company_name, overall_score, tier, call_type, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      (supabase as any)
        .from('discovery_briefs')
        .select('id, user_id, agency_id, lead_email, lead_name, target_company, contact_name, contact_title, version, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      (supabase as any)
        .from('assessments')
        .select('id, user_id, agency_id, assessment_type, overall_score, intake_data, status, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1000),
      (supabase as any)
        .from('visibility_lab_reports')
        .select('id, user_id, email, brand_name, visibility_score, vvv_clarity_score, brand_archetype_name, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    const agencies = agenciesResult.data || [];
    const users = usersResult.data || [];
    const assignments = assignmentsResult.data || [];
    const callLabReports = callLabResult.data || [];
    const discoveryBriefs = discoveryResult.data || [];
    const assessments = assessmentsResult.data || [];
    const visibilityReports = visibilityResult.data || [];

    // Build lookup maps
    const userMap = new Map<string, any>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const agencyMap = new Map<string, any>();
    for (const a of agencies) {
      agencyMap.set(a.id, a);
    }

    // User → agencies and Agency → users (explicit assignments)
    const userAgencies = new Map<string, Array<{ id: string; name: string; role: string }>>();
    const agencyUsers = new Map<string, Array<{ id: string; name: string; email: string; role: string }>>();

    for (const a of assignments) {
      const user = userMap.get(a.user_id);
      const agency = agencyMap.get(a.agency_id);
      if (!user || !agency) continue;

      if (!userAgencies.has(a.user_id)) userAgencies.set(a.user_id, []);
      userAgencies.get(a.user_id)!.push({ id: agency.id, name: agency.name, role: a.role });

      if (!agencyUsers.has(a.agency_id)) agencyUsers.set(a.agency_id, []);
      agencyUsers.get(a.agency_id)!.push({
        id: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        email: user.email,
        role: a.role,
      });
    }

    // Count reports per user
    const userReportCounts = new Map<string, Record<string, number>>();
    const initCounts = () => ({
      callLabLite: 0,
      callLabPro: 0,
      discoveryLite: 0,
      discoveryPro: 0,
      assessments: 0,
      visibilityLab: 0,
    });

    for (const r of callLabReports) {
      if (!r.user_id) continue;
      if (!userReportCounts.has(r.user_id)) userReportCounts.set(r.user_id, initCounts());
      const counts = userReportCounts.get(r.user_id)!;
      if (r.tier === 'pro') counts.callLabPro++;
      else counts.callLabLite++;
    }

    for (const r of discoveryBriefs) {
      if (!r.user_id) continue;
      if (!userReportCounts.has(r.user_id)) userReportCounts.set(r.user_id, initCounts());
      const counts = userReportCounts.get(r.user_id)!;
      if (r.version === 'pro') counts.discoveryPro++;
      else counts.discoveryLite++;
    }

    for (const r of assessments) {
      if (!r.user_id) continue;
      if (!userReportCounts.has(r.user_id)) userReportCounts.set(r.user_id, initCounts());
      userReportCounts.get(r.user_id)!.assessments++;
    }

    for (const r of visibilityReports) {
      if (!r.user_id) continue;
      if (!userReportCounts.has(r.user_id)) userReportCounts.set(r.user_id, initCounts());
      userReportCounts.get(r.user_id)!.visibilityLab++;
    }

    // Helpers
    const getUserName = (userId: string | null) => {
      if (!userId) return 'Unknown';
      const user = userMap.get(userId);
      if (!user) return 'Unknown';
      return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
    };

    const getUserEmail = (userId: string | null) => {
      if (!userId) return '';
      return userMap.get(userId)?.email || '';
    };

    const getAgencyNameForUser = (userId: string | null) => {
      if (!userId) return null;
      // Check explicit assignment first
      const explicitAgencies = userAgencies.get(userId);
      if (explicitAgencies?.[0]?.name) return explicitAgencies[0].name;
      // Fall back to domain-based inference
      const email = getUserEmail(userId);
      if (email) {
        const domain = extractDomain(email);
        if (domain) return domainToAgencyName(domain);
      }
      return null;
    };

    // Build domain-inferred agencies for unassigned users
    const assignedUserIds = new Set(assignments.map((a: any) => a.user_id));
    const domainAgencies = new Map<string, {
      id: string;
      name: string;
      domain: string;
      url: string | null;
      users: Array<{ id: string; name: string; email: string; role: string }>;
      isInferred: boolean;
    }>();

    // Group unassigned users by email domain
    for (const u of users) {
      if (assignedUserIds.has(u.id)) continue;
      // Only include users who have reports or are otherwise active
      if (!userReportCounts.has(u.id)) continue;

      const domain = extractDomain(u.email);
      if (!domain) continue;

      if (!domainAgencies.has(domain)) {
        domainAgencies.set(domain, {
          id: `domain:${domain}`,
          name: domainToAgencyName(domain),
          domain,
          url: domain,
          users: [],
          isInferred: true,
        });
      }
      domainAgencies.get(domain)!.users.push({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
        email: u.email,
        role: 'member',
      });
    }

    // Only include domain agencies with 1+ users (they all have reports by filter above)
    const inferredAgencies = Array.from(domainAgencies.values()).filter((a) => a.users.length > 0);

    // Build response
    const response = {
      agencies: agencies.map((a: any) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        users: agencyUsers.get(a.id) || [],
        isInferred: false,
      })),

      // Add domain-inferred agencies
      inferredAgencies: inferredAgencies.map((a) => ({
        id: a.id,
        name: a.name,
        domain: a.domain,
        url: a.url,
        users: a.users,
        isInferred: true,
      })),

      users: users
        .filter((u: any) => userReportCounts.has(u.id) || userAgencies.has(u.id))
        .map((u: any) => {
          const domain = extractDomain(u.email);
          return {
            id: u.id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
            email: u.email,
            domain,
            agencies: userAgencies.get(u.id) || [],
            inferredAgency: domain && !userAgencies.has(u.id) ? domainToAgencyName(domain) : null,
            reportCounts: userReportCounts.get(u.id) || initCounts(),
          };
        }),

      reports: {
        callLab: callLabReports.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: getUserName(r.user_id),
          userEmail: getUserEmail(r.user_id),
          agencyName: getAgencyNameForUser(r.user_id),
          buyerName: r.buyer_name,
          companyName: r.company_name,
          overallScore: r.overall_score,
          tier: r.tier,
          callType: r.call_type,
          createdAt: r.created_at,
        })),
        discovery: discoveryBriefs.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_id ? getUserName(r.user_id) : (r.lead_name || r.lead_email || 'Unknown'),
          userEmail: r.user_id ? getUserEmail(r.user_id) : (r.lead_email || ''),
          agencyName: r.agency_id ? (agencyMap.get(r.agency_id)?.name || null) : getAgencyNameForUser(r.user_id),
          targetCompany: r.target_company,
          contactName: r.contact_name,
          contactTitle: r.contact_title,
          version: r.version,
          createdAt: r.created_at,
        })),
        assessments: assessments.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: getUserName(r.user_id),
          userEmail: getUserEmail(r.user_id),
          agencyName: r.intake_data?.agencyName || (r.agency_id ? agencyMap.get(r.agency_id)?.name : null) || getAgencyNameForUser(r.user_id),
          founderName: r.intake_data?.founderName || null,
          assessmentType: r.assessment_type,
          overallScore: r.overall_score,
          createdAt: r.created_at,
        })),
        visibility: visibilityReports.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_id ? getUserName(r.user_id) : (r.email || 'Unknown'),
          userEmail: r.user_id ? getUserEmail(r.user_id) : (r.email || ''),
          agencyName: getAgencyNameForUser(r.user_id),
          brandName: r.brand_name,
          visibilityScore: r.visibility_score,
          clarityScore: r.vvv_clarity_score,
          archetypeName: r.brand_archetype_name,
          createdAt: r.created_at,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Admin client reports error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
