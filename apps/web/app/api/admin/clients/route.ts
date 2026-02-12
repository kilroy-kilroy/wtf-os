import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onProUpgrade } from '@/lib/loops';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
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

    const clients = [];

    for (const enrollment of enrollments) {
      const { data: userData } = await supabase.auth.admin.getUserById(enrollment.user_id);
      const program = enrollment.program as any;
      const company = enrollment.company as any;

      // Also fetch tier data from public.users (if record exists)
      const { data: publicUser } = await supabase
        .from('users')
        .select('call_lab_tier, discovery_lab_tier')
        .eq('id', enrollment.user_id)
        .single();

      clients.push({
        id: enrollment.id,
        user_id: enrollment.user_id,
        email: userData?.user?.email || 'unknown',
        full_name: userData?.user?.user_metadata?.full_name || null,
        program_name: program?.name || 'Unknown',
        program_slug: program?.slug || '',
        company_name: company?.company_name || null,
        onboarding_completed: enrollment.onboarding_completed,
        status: enrollment.status,
        enrolled_at: enrollment.enrolled_at,
        leads_sales_calls: enrollment.leads_sales_calls,
        call_lab_tier: publicUser?.call_lab_tier || null,
        discovery_lab_tier: publicUser?.discovery_lab_tier || null,
      });
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Admin clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { user_id, call_lab_tier, discovery_lab_tier } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const validTiers = ['free', 'pro', null];
    if (call_lab_tier !== undefined && !validTiers.includes(call_lab_tier)) {
      return NextResponse.json({ error: 'Invalid call_lab_tier value' }, { status: 400 });
    }
    if (discovery_lab_tier !== undefined && !validTiers.includes(discovery_lab_tier)) {
      return NextResponse.json({ error: 'Invalid discovery_lab_tier value' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if user has a public.users record
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      ...(call_lab_tier !== undefined && { call_lab_tier }),
      ...(discovery_lab_tier !== undefined && { discovery_lab_tier }),
    };

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user_id);

      if (error) {
        console.error('[Admin Clients] Update tier error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    } else {
      // Create minimal public.users record so tiers are set before they log in
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
      const { error } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email: authUser?.user?.email || '',
          ...(call_lab_tier !== undefined && { call_lab_tier }),
          ...(discovery_lab_tier !== undefined && { discovery_lab_tier }),
        });

      if (error) {
        console.error('[Admin Clients] Insert user for tier error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    // Fire Loops event when upgrading to Pro
    if (call_lab_tier === 'pro' || discovery_lab_tier === 'pro') {
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
      const email = authUser?.user?.email;
      if (email) {
        await onProUpgrade(email, 'solo').catch((err) =>
          console.error('[Admin Clients] Loops onProUpgrade error:', err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Clients] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
