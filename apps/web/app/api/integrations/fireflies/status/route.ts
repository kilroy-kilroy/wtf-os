import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/integrations/fireflies/status
 *
 * Check if the current user has Fireflies connected.
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const firefliesIntegration = userData?.preferences?.integrations?.fireflies;

    if (!firefliesIntegration?.connected) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      connectedAt: firefliesIntegration.connectedAt,
      userEmail: firefliesIntegration.userEmail,
      userName: firefliesIntegration.userName,
    });
  } catch (error) {
    console.error('[Fireflies Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
