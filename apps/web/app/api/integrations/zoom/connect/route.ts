import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/zoom';

/**
 * GET /api/integrations/zoom/connect
 *
 * Initiates the Zoom OAuth flow by redirecting the user to Zoom's authorization page.
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/integrations/zoom/callback`;
    const authUrl = getAuthorizationUrl(redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[Zoom Connect] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
