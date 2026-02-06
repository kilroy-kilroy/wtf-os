import { createClient } from '@/lib/supabase-auth-server';
import { NextResponse } from 'next/server';
import {
  getRecordingFiles,
  downloadTranscript,
  parseVttTranscript,
  getValidAccessToken,
  getRecordingMetadata,
} from '@/lib/zoom';

/**
 * GET /api/integrations/zoom/recordings/[id]/transcript
 *
 * Get the transcript for a specific Zoom recording.
 * The [id] parameter is the meeting UUID (double-encoded if it starts with / or contains //).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: meetingId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
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

    // Get valid access token
    const { accessToken, updatedTokens, error: tokenError } = await getValidAccessToken(
      zoomIntegration.tokens
    );

    if (tokenError || !accessToken) {
      return NextResponse.json(
        { error: tokenError || 'Failed to get access token' },
        { status: 401 }
      );
    }

    // Persist refreshed tokens if needed
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

    // Get recording files for this meeting
    const recordingResult = await getRecordingFiles(accessToken, meetingId);

    if (!recordingResult.success || !recordingResult.recording) {
      return NextResponse.json(
        { error: recordingResult.error || 'Failed to fetch recording' },
        { status: 500 }
      );
    }

    const recording = recordingResult.recording;

    // Find the transcript file
    const transcriptFile = recording.recording_files?.find(
      (f) => f.file_type === 'TRANSCRIPT'
    );

    if (!transcriptFile) {
      return NextResponse.json(
        { error: 'No transcript available for this recording' },
        { status: 404 }
      );
    }

    // Download and parse the transcript
    const transcriptResult = await downloadTranscript(
      accessToken,
      transcriptFile.download_url
    );

    if (!transcriptResult.success || !transcriptResult.content) {
      return NextResponse.json(
        { error: transcriptResult.error || 'Failed to download transcript' },
        { status: 500 }
      );
    }

    const formattedTranscript = parseVttTranscript(transcriptResult.content);
    const metadata = getRecordingMetadata(recording);

    return NextResponse.json({
      success: true,
      transcript: {
        meetingId: recording.id,
        uuid: recording.uuid,
        topic: recording.topic,
        startTime: recording.start_time,
        duration: recording.duration,
        ...metadata,
        formattedText: formattedTranscript,
        rawVtt: transcriptResult.content,
      },
    });
  } catch (error) {
    console.error('[Zoom Transcript] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
