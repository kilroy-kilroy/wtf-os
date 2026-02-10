import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Admin Users API
 *
 * Search users and manage their subscription tiers.
 * Auth: ADMIN_API_KEY bearer token
 *
 * GET /api/admin/users?email=search@example.com
 * PATCH /api/admin/users { userId, call_lab_tier, discovery_lab_tier }
 */

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ADMIN_API_KEY;
  return !apiKey || authHeader === `Bearer ${apiKey}`;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email');

  if (!email || email.length < 3) {
    return NextResponse.json({ error: 'Email search query required (min 3 chars)' }, { status: 400 });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, call_lab_tier, discovery_lab_tier, subscription_tier, created_at')
      .ilike('email', `%${email}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[Admin Users] Search error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, call_lab_tier, discovery_lab_tier } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Validate tier values
    const validTiers = ['free', 'pro', null];
    if (call_lab_tier !== undefined && !validTiers.includes(call_lab_tier)) {
      return NextResponse.json({ error: 'Invalid call_lab_tier value' }, { status: 400 });
    }
    if (discovery_lab_tier !== undefined && !validTiers.includes(discovery_lab_tier)) {
      return NextResponse.json({ error: 'Invalid discovery_lab_tier value' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Build update object inline to avoid type issues
    const { data: user, error } = await supabase
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
        ...(call_lab_tier !== undefined && { call_lab_tier }),
        ...(discovery_lab_tier !== undefined && { discovery_lab_tier }),
      })
      .eq('id', userId)
      .select('id, email, first_name, last_name, call_lab_tier, discovery_lab_tier')
      .single();

    if (error) {
      console.error('[Admin Users] Update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
