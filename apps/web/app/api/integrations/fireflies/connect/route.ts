import { createClient } from '@/lib/supabase-auth-server';
import { NextResponse } from 'next/server';
import { verifyApiKey, getUserInfo } from '@/lib/fireflies';

/**
 * POST /api/integrations/fireflies/connect
 *
 * Connect a user's Fireflies account by verifying and storing their API key.
 * The API key is stored encrypted in the user's preferences.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API key from request body
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Verify the API key with Fireflies
    const verification = await verifyApiKey(apiKey.trim());

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid API key' },
        { status: 400 }
      );
    }

    // Get user info from Fireflies for display
    const userInfo = await getUserInfo(apiKey.trim());

    // Store the API key in user preferences
    // First get existing preferences
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const existingPreferences = userData?.preferences || {};

    // Update preferences with Fireflies integration data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        preferences: {
          ...existingPreferences,
          integrations: {
            ...(existingPreferences.integrations || {}),
            fireflies: {
              connected: true,
              apiKey: apiKey.trim(),
              connectedAt: new Date().toISOString(),
              userEmail: userInfo.user?.email,
              userName: userInfo.user?.name,
            },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Fireflies Connect] Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fireflies connected successfully',
      user: userInfo.user,
    });
  } catch (error) {
    console.error('[Fireflies Connect] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
