import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

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
    const supabase = createServerClient();

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

    const supabase = createServerClient();

    // Build update object with explicit type for Supabase
    const updates: {
      updated_at: string;
      call_lab_tier?: string | null;
      discovery_lab_tier?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (call_lab_tier !== undefined) {
      updates.call_lab_tier = call_lab_tier;
    }
    if (discovery_lab_tier !== undefined) {
      updates.discovery_lab_tier = discovery_lab_tier;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates as any)
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
