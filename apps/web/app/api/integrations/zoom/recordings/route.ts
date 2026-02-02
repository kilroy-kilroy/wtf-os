import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { listRecordings, getValidAccessToken, getRecordingMetadata } from '@/lib/zoom';

/**
 * GET /api/integrations/zoom/recordings
 *
 * List cloud recordings from the user's Zoom account.
 * Supports optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
 */
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const zoomIntegration = userData?.preferences?.integrations?.zoom;

    if (!zoomIntegration?.connected || !zoomIntegration?.tokens) {
      return NextResponse.json(
        { error: 'Zoom not connected' },
        { status: 400 }
      );
    }

    // Get valid access token (refresh if needed)
    const { accessToken, updatedTokens, error: tokenError } = await getValidAccessToken(
      zoomIntegration.tokens
    );

    if (tokenError || !accessToken) {
      return NextResponse.json(
        { error: tokenError || 'Failed to get access token' },
        { status: 401 }
      );
    }

    // If tokens were refreshed, persist them
    if (updatedTokens) {
      const existingPreferences = userData?.preferences || {};
      await supabase
        .from('users')
        .update({
          preferences: {
            ...existingPreferences,
            integrations: {
              ...(existingPreferences.integrations || {}),
              zoom: {
                ...zoomIntegration,
                tokens: updatedTokens,
              },
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Parse query params
    const url = new URL(request.url);
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const result = await listRecordings(accessToken, from, to);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch recordings' },
        { status: 500 }
      );
    }

    const recordingsWithMetadata = (result.recordings || []).map((recording) => ({
      ...recording,
      ...getRecordingMetadata(recording),
    }));

    return NextResponse.json({
      success: true,
      recordings: recordingsWithMetadata,
    });
  } catch (error) {
    console.error('[Zoom Recordings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
