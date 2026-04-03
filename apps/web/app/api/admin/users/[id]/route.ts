import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'hey.com', 'live.com', 'me.com',
  'mac.com', 'msn.com', 'mail.com', 'zoho.com',
]);

function extractDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    // Get user record
    const { data: user, error: userError } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get auth metadata (last_sign_in_at)
    const { data: authData } = await supabase.auth.admin.getUserById(id);
    const lastSignIn = authData?.user?.last_sign_in_at || null;

    // Parallel queries for all related data
    const [
      enrollmentsResult,
      orgResult,
      callScoresResult,
      callLabReportsResult,
      discoveryResult,
      visibilityResult,
      assessmentsResult,
      coachingResult,
      fridaysResult,
      loopsEventsResult,
      subscriptionsResult,
    ] = await Promise.all([
      (supabase as any)
        .from('client_enrollments')
        .select(`
          id, user_id, status, onboarding_completed, leads_sales_calls, enrolled_at,
          program:client_programs(name, slug),
          company:client_companies(*)
        `)
        .eq('user_id', id),
      user.org_id
        ? (supabase as any).from('orgs').select('*').eq('id', user.org_id).single()
        : Promise.resolve({ data: null }),
      (supabase as any)
        .from('call_scores')
        .select('id, overall_score, overall_grade, version, diagnosis_summary, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('call_lab_reports')
        .select('id, buyer_name, company_name, overall_score, tier, call_type, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('discovery_briefs')
        .select('id, target_company, contact_name, contact_title, version, created_at')
        .or(`user_id.eq.${id},lead_email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('visibility_lab_reports')
        .select('id, brand_name, visibility_score, brand_archetype_name, created_at')
        .or(`user_id.eq.${id},email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('assessments')
        .select('id, assessment_type, overall_score, intake_data, status, created_at')
        .eq('user_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10),
      (supabase as any)
        .from('coaching_reports')
        .select('id, report_type, period_start, period_end, calls_analyzed, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      (supabase as any)
        .from('five_minute_fridays')
        .select('id, week_of, submitted_at')
        .eq('user_id', id)
        .order('week_of', { ascending: false })
        .limit(20),
      (supabase as any)
        .from('loops_events')
        .select('id, event_name, event_data, sent_at')
        .or(`user_id.eq.${id},user_email.eq.${user.email}`)
        .order('sent_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const enrollments = enrollmentsResult.data || [];
    const org = orgResult.data || null;

    // Fetch documents for all enrollments
    const enrollmentIds = enrollments.map((e: any) => e.id);
    let documents: any[] = [];
    if (enrollmentIds.length > 0) {
      const { data: docs } = await (supabase as any)
        .from('client_documents')
        .select('id, enrollment_id, title, document_type, file_url, external_url, category, created_at')
        .in('enrollment_id', enrollmentIds)
        .order('created_at', { ascending: false });
      documents = docs || [];
    }

    // Find same-company users
    let sameCompanyUsers: any[] = [];
    if (user.org_id) {
      const { data: coworkers } = await (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name, full_name')
        .eq('org_id', user.org_id)
        .neq('id', id)
        .limit(20);
      sameCompanyUsers = coworkers || [];
    }

    // Determine user type
    const isClient = enrollments.length > 0;
    const type = isClient ? 'client' : 'user';

    // Build activity feed
    const activity: any[] = [];
    const seenIds = new Set<string>();

    for (const r of (callScoresResult.data || [])) {
      seenIds.add(r.id);
      const tierLabel = r.version === 'pro' || r.version === 'full' ? 'Pro' : r.version === 'lite' ? 'Lite' : 'Instant';
      const gradeLabel = r.overall_grade ? ` (${r.overall_grade})` : '';
      const summaryLabel = r.diagnosis_summary ? ` — ${r.diagnosis_summary.substring(0, 60)}` : '';
      activity.push({
        type: 'call_lab',
        id: r.id,
        label: `Call Lab ${tierLabel}${gradeLabel}${summaryLabel}`,
        score: r.overall_score,
        version: r.version,
        date: r.created_at,
        url: `/call-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (callLabReportsResult.data || [])) {
      if (seenIds.has(r.id)) continue;
      activity.push({
        type: 'call_lab',
        id: r.id,
        label: [r.buyer_name, r.company_name].filter(Boolean).join(' @ ') || 'Call Analysis',
        score: r.overall_score,
        version: r.tier,
        date: r.created_at,
        url: `/call-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (discoveryResult.data || [])) {
      activity.push({
        type: 'discovery',
        id: r.id,
        label: [r.target_company, r.contact_name].filter(Boolean).join(' / ') || 'Discovery Brief',
        version: r.version,
        date: r.created_at,
        url: `/discovery-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (visibilityResult.data || [])) {
      activity.push({
        type: 'visibility',
        id: r.id,
        label: r.brand_name || 'Visibility Report',
        score: r.visibility_score,
        date: r.created_at,
        url: `/visibility-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (assessmentsResult.data || [])) {
      activity.push({
        type: 'assessment',
        id: r.id,
        label: r.intake_data?.agencyName || 'Assessment',
        score: r.overall_score,
        date: r.created_at,
        url: `/growthos/results/${r.id}?admin=1`,
      });
    }

    for (const r of (coachingResult.data || [])) {
      activity.push({
        type: 'coaching',
        id: r.id,
        label: `${r.report_type} coaching report (${r.calls_analyzed} calls)`,
        date: r.created_at,
        url: `/dashboard/coaching/${r.id}?admin=1`,
      });
    }

    for (const r of (fridaysResult.data || [])) {
      activity.push({
        type: 'friday',
        id: r.id,
        label: `5-Minute Friday — Week of ${r.week_of}`,
        date: r.submitted_at || r.week_of,
      });
    }

    for (const r of (loopsEventsResult.data || [])) {
      activity.push({
        type: 'loops_event',
        id: r.id,
        label: r.event_name,
        date: r.sent_at,
      });
    }

    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      user: {
        ...user,
        last_sign_in_at: lastSignIn,
        type,
      },
      org,
      enrollments,
      activity,
      subscriptions: subscriptionsResult.data || [],
      documents,
      same_company_users: sameCompanyUsers,
    });
  } catch (error) {
    console.error('[Admin Users] Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServerClient();

    // Update user fields
    const userFields: Record<string, any> = {};
    const directFields = ['first_name', 'last_name', 'email', 'subscription_tier', 'call_lab_tier', 'discovery_lab_tier', 'visibility_lab_tier', 'tags'];
    for (const field of directFields) {
      if (body[field] !== undefined) userFields[field] = body[field];
    }

    // Handle preferences (merge, don't replace)
    if (body.preferences) {
      const { data: current } = await (supabase as any)
        .from('users')
        .select('preferences')
        .eq('id', id)
        .single();
      userFields.preferences = { ...(current?.preferences || {}), ...body.preferences };
    }

    if (Object.keys(userFields).length > 0) {
      userFields.updated_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('users')
        .update(userFields)
        .eq('id', id);
      if (error) {
        console.error('[Admin Users] Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
    }

    // Update company → org-based flow
    if (body.company) {
      const { enrollment_id, org_id: manualOrgId, create_org, ...companyFields } = body.company;

      // Get the current user to check org_id and email
      const { data: currentUser } = await (supabase as any)
        .from('users')
        .select('org_id, email')
        .eq('id', id)
        .single();

      const userEmail = currentUser?.email || '';
      const domain = extractDomain(userEmail);
      const isPublicDomain = domain ? PUBLIC_EMAIL_DOMAINS.has(domain) : true;

      let targetOrgId: string | null = manualOrgId || currentUser?.org_id || null;

      // Try to find org by domain if user has no org yet and wasn't manually linked
      if (!targetOrgId && domain && !isPublicDomain) {
        const { data: domainOrg } = await (supabase as any)
          .from('orgs')
          .select('id')
          .eq('primary_domain', domain)
          .single();

        if (domainOrg) {
          targetOrgId = domainOrg.id;
        }
      }

      // Create org if we still don't have one
      if (!targetOrgId) {
        const orgInsert: Record<string, any> = {
          name: companyFields.name || companyFields.company_name || 'New Company',
          created_by_user_id: id,
          personal: isPublicDomain,
          mode: 'solo',
        };
        if (domain && !isPublicDomain) {
          orgInsert.primary_domain = domain;
        }
        if (companyFields.website || companyFields.url) orgInsert.website = companyFields.website || companyFields.url;
        if (companyFields.target_industry || companyFields.industry_niche) orgInsert.target_industry = companyFields.target_industry || companyFields.industry_niche;
        if (companyFields.company_size || companyFields.team_size) orgInsert.company_size = companyFields.company_size || companyFields.team_size;
        if (companyFields.company_revenue || companyFields.revenue_range) orgInsert.company_revenue = companyFields.company_revenue || companyFields.revenue_range;

        const { data: newOrg, error: orgCreateErr } = await (supabase as any)
          .from('orgs')
          .insert(orgInsert)
          .select('id')
          .single();

        if (orgCreateErr) {
          console.error('[Admin Users] Create org error:', orgCreateErr);
        } else {
          targetOrgId = newOrg.id;
        }
      } else {
        // Update existing org fields
        const orgUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        if (companyFields.name !== undefined || companyFields.company_name !== undefined) {
          orgUpdate.name = companyFields.name ?? companyFields.company_name;
        }
        if (companyFields.website !== undefined || companyFields.url !== undefined) {
          orgUpdate.website = companyFields.website ?? companyFields.url;
        }
        if (companyFields.target_industry !== undefined || companyFields.industry_niche !== undefined) {
          orgUpdate.target_industry = companyFields.target_industry ?? companyFields.industry_niche;
        }
        if (companyFields.company_size !== undefined || companyFields.team_size !== undefined) {
          orgUpdate.company_size = companyFields.company_size ?? companyFields.team_size;
        }
        if (companyFields.company_revenue !== undefined || companyFields.revenue_range !== undefined) {
          orgUpdate.company_revenue = companyFields.company_revenue ?? companyFields.revenue_range;
        }

        if (Object.keys(orgUpdate).length > 1) {
          const { error: orgUpdateErr } = await (supabase as any)
            .from('orgs')
            .update(orgUpdate)
            .eq('id', targetOrgId);
          if (orgUpdateErr) console.error('[Admin Users] Update org error:', orgUpdateErr);
        }
      }

      // Link user to org if not already linked
      if (targetOrgId && currentUser?.org_id !== targetOrgId) {
        await (supabase as any)
          .from('users')
          .update({ org_id: targetOrgId, updated_at: new Date().toISOString() })
          .eq('id', id);

        // Merge client_companies data into org (first link only)
        const { data: enrollments } = await (supabase as any)
          .from('client_enrollments')
          .select('id')
          .eq('user_id', id);

        if (enrollments?.length > 0) {
          const enrollmentIds = enrollments.map((e: any) => e.id);
          const { data: clientCompany } = await (supabase as any)
            .from('client_companies')
            .select('company_name, url, industry_niche, team_size, revenue_range')
            .in('enrollment_id', enrollmentIds)
            .limit(1)
            .maybeSingle();

          if (clientCompany) {
            const { data: currentOrg } = await (supabase as any)
              .from('orgs')
              .select('name, website, target_industry, company_size, company_revenue')
              .eq('id', targetOrgId)
              .single();

            if (currentOrg) {
              const mergeUpdate: Record<string, any> = {};
              if (!currentOrg.name && clientCompany.company_name) mergeUpdate.name = clientCompany.company_name;
              if (!currentOrg.website && clientCompany.url) mergeUpdate.website = clientCompany.url;
              if (!currentOrg.target_industry && clientCompany.industry_niche) mergeUpdate.target_industry = clientCompany.industry_niche;
              if (!currentOrg.company_size && clientCompany.team_size) mergeUpdate.company_size = clientCompany.team_size;
              if (!currentOrg.company_revenue && clientCompany.revenue_range) mergeUpdate.company_revenue = clientCompany.revenue_range;

              if (Object.keys(mergeUpdate).length > 0) {
                mergeUpdate.updated_at = new Date().toISOString();
                await (supabase as any)
                  .from('orgs')
                  .update(mergeUpdate)
                  .eq('id', targetOrgId);
              }
            }
          }
        }
      }

      // Auto-link coworkers with same email domain (only for non-public domains)
      if (targetOrgId && domain && !isPublicDomain) {
        const domainPattern = `%@${domain}`;
        await (supabase as any)
          .from('users')
          .update({ org_id: targetOrgId, updated_at: new Date().toISOString() })
          .like('email', domainPattern)
          .is('org_id', null)
          .neq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Users] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
