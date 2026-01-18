import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTranscript, formatTranscriptForCallLab, getTranscriptMetadata } from '@/lib/fireflies';

/**
 * GET /api/integrations/fireflies/transcripts/[id]
 *
 * Get a specific transcript from Fireflies with full content.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { id: transcriptId } = await params;

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

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    // Fetch transcript from Fireflies
    const result = await getTranscript(firefliesIntegration.apiKey, transcriptId);

    if (!result.success || !result.transcript) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch transcript' },
        { status: 500 }
      );
    }

    const transcript = result.transcript;

    // Format transcript for Call Lab
    const formattedTranscript = formatTranscriptForCallLab(transcript);

    return NextResponse.json({
      success: true,
      transcript: {
        ...transcript,
        ...getTranscriptMetadata(transcript),
        formattedText: formattedTranscript,
      },
    });
  } catch (error) {
    console.error('[Fireflies Transcript] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
