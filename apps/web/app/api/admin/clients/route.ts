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

    // Get all client enrollments with user and company data
    const { data: enrollments } = await supabase
      .from('client_enrollments')
      .select(`
        id,
        user_id,
        role,
        status,
        onboarding_completed,
        leads_sales_calls,
        enrolled_at,
        program:client_programs(name, slug),
        company:client_companies(company_name)
      `)
      .order('enrolled_at', { ascending: false });

    if (!enrollments) {
      return NextResponse.json({ clients: [] });
    }

    // Get user emails
    const userIds = enrollments.map(e => e.user_id);
    const clients = [];

    for (const enrollment of enrollments) {
      const { data: userData } = await supabase.auth.admin.getUserById(enrollment.user_id);

      clients.push({
        id: enrollment.id,
        email: userData?.user?.email || 'unknown',
        full_name: userData?.user?.user_metadata?.full_name || null,
        program_name: enrollment.program?.name || 'Unknown',
        program_slug: enrollment.program?.slug || '',
        company_name: enrollment.company?.company_name || null,
        onboarding_completed: enrollment.onboarding_completed,
        status: enrollment.status,
        enrolled_at: enrollment.enrolled_at,
        leads_sales_calls: enrollment.leads_sales_calls,
      });
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Admin clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
