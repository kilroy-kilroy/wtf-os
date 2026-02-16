import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
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
      return NextResponse.json({ clients: [] });
    }

    // Get auth user data for last_sign_in_at, email, name
    const { data: authData } = await supabase.auth.admin.listUsers();
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

    // Build health data
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
        health = 'red'; // Never logged in
      } else if (daysSinceLogin >= 14 || missedFridays >= 2) {
        health = 'red';
      } else if (daysSinceLogin >= 7 || missedFridays >= 1) {
        health = 'yellow';
      }

      return {
        enrollmentId: e.id,
        userId: e.user_id,
        name: auth?.name || auth?.email || 'Unknown',
        email: auth?.email || '',
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
      };
    });

    // Sort: red first, then yellow, then green
    const healthOrder = { red: 0, yellow: 1, green: 2 };
    clients.sort((a: any, b: any) => healthOrder[a.health as keyof typeof healthOrder] - healthOrder[b.health as keyof typeof healthOrder]);

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[Client Health] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
