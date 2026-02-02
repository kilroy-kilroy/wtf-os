import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/integrations/zoom/status
 *
 * Check if the current user has Zoom connected.
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

    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const zoomIntegration = userData?.preferences?.integrations?.zoom;

    if (!zoomIntegration?.connected) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      connectedAt: zoomIntegration.connectedAt,
      userEmail: zoomIntegration.userEmail,
      userName: zoomIntegration.userName,
    });
  } catch (error) {
    console.error('[Zoom Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
