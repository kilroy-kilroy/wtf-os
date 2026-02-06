import { createClient } from '@/lib/supabase-auth-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/integrations/fireflies/disconnect
 *
 * Disconnect a user's Fireflies account.
 */
export async function POST() {
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

    // Get existing preferences
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const existingPreferences = userData?.preferences || {};
    const existingIntegrations = existingPreferences.integrations || {};

    // Remove Fireflies integration
    const { fireflies: _, ...remainingIntegrations } = existingIntegrations;

    // Update preferences without Fireflies
    const { error: updateError } = await supabase
      .from('users')
      .update({
        preferences: {
          ...existingPreferences,
          integrations: remainingIntegrations,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Fireflies Disconnect] Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fireflies disconnected successfully',
    });
  } catch (error) {
    console.error('[Fireflies Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
