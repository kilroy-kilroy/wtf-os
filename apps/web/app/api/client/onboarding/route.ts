import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-auth-server';
import type { OnboardingFormData } from '@/types/client';

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, ...data } = body as { enrollmentId: string } & OnboardingFormData;

    const supabase = getSupabaseServerClient();

    // Verify enrollment belongs to user
    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id, user_id')
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // 1. Create client company
    const { data: company, error: companyError } = await supabase
      .from('client_companies')
      .insert({
        enrollment_id: enrollmentId,
        company_name: data.company.company_name,
        url: data.company.url,
        industry_niche: data.company.industry_niche,
        hq_location: data.company.hq_location,
        founded: data.company.founded,
        team_size: data.company.team_size,
        revenue_range: data.company.revenue_range,
      })
      .select()
      .single();

    if (companyError || !company) {
      console.error('Company insert error:', companyError);
      return NextResponse.json({ error: 'Failed to create company', message: companyError?.message }, { status: 500 });
    }

    const companyId = company.id;

    // 2. Leadership contacts
    if (data.leadership?.contacts?.length > 0) {
      await supabase.from('client_leadership_contacts').insert(
        data.leadership.contacts.map((c: any) => ({ company_id: companyId, ...c }))
      );
    }

    // 3. Team members
    if (data.team?.members?.length > 0) {
      await supabase.from('client_team_members').insert(
        data.team.members.map((m: any) => ({ company_id: companyId, ...m }))
      );
    }

    // 4. Services
    if (data.services?.services?.length > 0) {
      await supabase.from('client_services').insert(
        data.services.services.map((s: any) => ({ company_id: companyId, ...s }))
      );
    }

    // 5. Portfolio (clients)
    if (data.clients?.clients?.length > 0) {
      await supabase.from('client_portfolio').insert(
        data.clients.clients.map((c: any) => ({ company_id: companyId, ...c }))
      );
    }

    // 6. Financials
    if (data.financials && Object.values(data.financials).some(v => v !== undefined)) {
      await supabase.from('client_financials').insert({
        company_id: companyId,
        ...data.financials,
      });
    }

    // 7. Sales process
    if (data.sales && Object.values(data.sales).some(v => v !== undefined)) {
      await supabase.from('client_sales_process').insert({
        company_id: companyId,
        ...data.sales,
      });
    }

    // 8. Ops capacity
    if (data.ops && Object.values(data.ops).some(v => v !== undefined)) {
      await supabase.from('client_ops_capacity').insert({
        company_id: companyId,
        ...data.ops,
      });
    }

    // 9. Competitors
    if (data.competitors?.competitors?.length > 0) {
      await supabase.from('client_competitors').insert(
        data.competitors.competitors.map((c: any) => ({ company_id: companyId, ...c }))
      );
    }

    // 10. Mark enrollment as complete, link company
    await supabase
      .from('client_enrollments')
      .update({ onboarding_completed: true, company_id: companyId })
      .eq('id', enrollmentId);

    return NextResponse.json({ success: true, company_id: companyId });
  } catch (error) {
    console.error('Onboarding submission error:', error);
    return NextResponse.json({ error: 'Internal server error', message: String(error) }, { status: 500 });
  }
}
