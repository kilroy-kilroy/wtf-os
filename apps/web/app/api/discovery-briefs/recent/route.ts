import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get limit from query params (default 20)
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const search = searchParams.get('search') || '';

    // Fetch recent discovery briefs for this user
    let query = supabase
      .from('discovery_briefs')
      .select('id, target_company, target_contact_name, target_contact_title, created_at, version')
      .or(`user_id.eq.${user.id},lead_email.eq.${user.email}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add search filter if provided
    if (search) {
      query = query.or(`target_company.ilike.%${search}%,target_contact_name.ilike.%${search}%`);
    }

    const { data: briefs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching discovery briefs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch discovery briefs' }, { status: 500 });
    }

    // Format response
    const formattedBriefs = (briefs || []).map(brief => ({
      id: brief.id,
      companyName: brief.target_company,
      contactName: brief.target_contact_name,
      contactTitle: brief.target_contact_title,
      createdAt: brief.created_at,
      version: brief.version,
      label: `${brief.target_company}${brief.target_contact_name ? ` - ${brief.target_contact_name}` : ''}`,
    }));

    return NextResponse.json({
      briefs: formattedBriefs,
      count: formattedBriefs.length,
    });
  } catch (error) {
    console.error('Discovery briefs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
