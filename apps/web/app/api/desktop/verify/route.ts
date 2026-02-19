import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSubscriptionStatus } from '@/lib/subscription';

/**
 * GET /api/desktop/verify
 *
 * Verifies a Supabase access token from the desktop app and returns
 * the user's Call Lab Pro subscription status.
 *
 * Authorization: Bearer <supabase_access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Verify the token and get the user
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email associated with this account' },
        { status: 400 }
      );
    }

    // Get subscription status
    const status = await getSubscriptionStatus(supabase, user.id, user.email);

    return NextResponse.json({
      hasCallLabPro: status.hasCallLabPro,
      email: status.email,
      userId: user.id,
      source: status.source,
    });
  } catch (error) {
    console.error('Desktop verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
