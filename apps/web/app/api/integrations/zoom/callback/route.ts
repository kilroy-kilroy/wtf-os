import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getZoomUser } from '@/lib/zoom';

/**
 * GET /api/integrations/zoom/callback
 *
 * OAuth callback handler. Exchanges the authorization code for tokens
 * and stores the connection in the user's preferences.
 */
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error) {
      console.error('[Zoom Callback] OAuth error:', error);
      return NextResponse.redirect(`${appUrl}/settings?zoom_error=denied`);
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}/settings?zoom_error=no_code`);
    }

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${appUrl}/settings?zoom_error=unauthorized`);
    }

    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/integrations/zoom/callback`;
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.tokens) {
      console.error('[Zoom Callback] Token exchange failed:', tokenResult.error);
      return NextResponse.redirect(`${appUrl}/settings?zoom_error=token_failed`);
    }

    // Get Zoom user info
    const userResult = await getZoomUser(tokenResult.tokens.access_token);
    const zoomUser = userResult.user;

    // Store tokens in user preferences
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const existingPreferences = userData?.preferences || {};

    const { error: updateError } = await supabase
      .from('users')
      .update({
        preferences: {
          ...existingPreferences,
          integrations: {
            ...(existingPreferences.integrations || {}),
            zoom: {
              connected: true,
              tokens: tokenResult.tokens,
              connectedAt: new Date().toISOString(),
              userEmail: zoomUser?.email,
              userName: zoomUser?.display_name || `${zoomUser?.first_name || ''} ${zoomUser?.last_name || ''}`.trim(),
              zoomUserId: zoomUser?.id,
            },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Zoom Callback] Database error:', updateError);
      return NextResponse.redirect(`${appUrl}/settings?zoom_error=save_failed`);
    }

    return NextResponse.redirect(`${appUrl}/settings?zoom_connected=true`);
  } catch (error) {
    console.error('[Zoom Callback] Error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/settings?zoom_error=unknown`);
  }
}
