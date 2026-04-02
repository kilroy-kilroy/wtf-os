import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
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

    // Update company fields
    if (body.company) {
      const { enrollment_id, org_id, create_org, ...companyFields } = body.company;
      console.log('[Admin Users] Company update:', { enrollment_id, org_id, create_org, companyFields });

      if (enrollment_id) {
        const { data: existing, error: findErr } = await (supabase as any)
          .from('client_companies')
          .select('id, company_name')
          .eq('enrollment_id', enrollment_id)
          .single();

        console.log('[Admin Users] Existing company lookup:', { existing, findErr: findErr?.message });

        if (existing) {
          const { error: updateErr } = await (supabase as any)
            .from('client_companies')
            .update({ ...companyFields, updated_at: new Date().toISOString() })
            .eq('enrollment_id', enrollment_id);
          console.log('[Admin Users] Update result:', { error: updateErr?.message });
          if (updateErr) console.error('[Admin Users] Update client_companies error:', updateErr);
        } else {
          // company_name is NOT NULL — ensure it's set on insert
          const insertData = {
            enrollment_id,
            company_name: companyFields.company_name || 'Unknown Company',
            ...companyFields,
          };
          console.log('[Admin Users] Inserting new company:', insertData);
          const { data: inserted, error: insertErr } = await (supabase as any)
            .from('client_companies')
            .insert(insertData)
            .select('id')
            .single();
          console.log('[Admin Users] Insert result:', { inserted, error: insertErr?.message });
          if (insertErr) console.error('[Admin Users] Insert client_companies error:', insertErr);
        }
      } else if (org_id) {
        await (supabase as any)
          .from('orgs')
          .update({ ...companyFields, updated_at: new Date().toISOString() })
          .eq('id', org_id);
      } else if (create_org) {
        // Create a new org for a user who doesn't have one
        const { data: newOrg } = await (supabase as any)
          .from('orgs')
          .insert({
            name: companyFields.name || companyFields.company_name || 'New Company',
            personal: true,
            mode: 'solo',
            created_by_user_id: id,
            ...companyFields,
          })
          .select('id')
          .single();
        if (newOrg) {
          await (supabase as any)
            .from('users')
            .update({ org_id: newOrg.id, updated_at: new Date().toISOString() })
            .eq('id', id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Users] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
