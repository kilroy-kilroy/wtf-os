import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get all friday submissions with response status
    const { data: submissions } = await supabase
      .from('five_minute_fridays')
      .select(`
        id,
        user_id,
        week_of,
        worked_on,
        working_on_next,
        concerned_about,
        happy_about,
        whats_in_the_way,
        submitted_at,
        enrollment:client_enrollments(
          program:client_programs(name),
          company:client_companies(company_name)
        ),
        responses:five_minute_friday_responses(id)
      `)
      .order('week_of', { ascending: false })
      .limit(100);

    if (!submissions) {
      return NextResponse.json({ fridays: [] });
    }

    // Enrich with user data
    const fridays = [];
    for (const sub of submissions) {
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);

      fridays.push({
        id: sub.id,
        user_email: userData?.user?.email || 'unknown',
        user_name: userData?.user?.user_metadata?.full_name || null,
        company_name: sub.enrollment?.company?.company_name || null,
        program_name: sub.enrollment?.program?.name || 'Unknown',
        week_of: sub.week_of,
        worked_on: sub.worked_on,
        working_on_next: sub.working_on_next,
        concerned_about: sub.concerned_about,
        happy_about: sub.happy_about,
        whats_in_the_way: sub.whats_in_the_way,
        submitted_at: sub.submitted_at,
        has_response: sub.responses && sub.responses.length > 0,
      });
    }

    return NextResponse.json({ fridays });
  } catch (error) {
    console.error('Admin friday error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
