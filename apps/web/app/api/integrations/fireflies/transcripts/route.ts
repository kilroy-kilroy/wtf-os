import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { listTranscripts, getTranscriptMetadata } from '@/lib/fireflies';

/**
 * GET /api/integrations/fireflies/transcripts
 *
 * List recent transcripts from the user's Fireflies account.
 */
export async function GET(request: Request) {
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

    // Get user preferences to retrieve API key
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const firefliesIntegration = userData?.preferences?.integrations?.fireflies;

    if (!firefliesIntegration?.connected || !firefliesIntegration?.apiKey) {
      return NextResponse.json(
        { error: 'Fireflies not connected' },
        { status: 400 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Fetch transcripts from Fireflies
    const result = await listTranscripts(firefliesIntegration.apiKey, limit);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch transcripts' },
        { status: 500 }
      );
    }

    // Add display metadata to each transcript
    const transcriptsWithMetadata = (result.transcripts || []).map((transcript) => ({
      ...transcript,
      ...getTranscriptMetadata(transcript),
    }));

    return NextResponse.json({
      success: true,
      transcripts: transcriptsWithMetadata,
    });
  } catch (error) {
    console.error('[Fireflies Transcripts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
