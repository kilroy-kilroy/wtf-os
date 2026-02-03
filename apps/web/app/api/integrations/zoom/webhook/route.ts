import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  verifyWebhookRequest,
  getValidAccessToken,
  getRecordingFiles,
  downloadTranscript,
  parseVttTranscript,
  getRecordingMetadata,
  ZoomTokens,
} from '@/lib/zoom';

// Create Supabase admin client for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ZoomWebhookPayload {
  event: string;
  payload: {
    plainToken?: string;
    object?: {
      id: string;
      uuid: string;
      topic: string;
      host_email: string;
      host_id: string;
      duration?: number;
      start_time?: string;
      recording_files?: Array<{
        id: string;
        file_type: string;
        download_url: string;
      }>;
    };
  };
}

/**
 * Find a user by their connected Zoom email
 */
async function findUserByZoomEmail(zoomEmail: string) {
  // Query users where preferences.integrations.zoom.userEmail matches
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, preferences')
    .filter('preferences->integrations->zoom->userEmail', 'eq', zoomEmail);

  if (error) {
    console.error('[Zoom Webhook] Error finding user by Zoom email:', error);
    return null;
  }

  return users?.[0] || null;
}

/**
 * Create an ingestion item for a Zoom recording transcript
 */
async function createIngestionItem(
  userId: string,
  meetingId: string,
  topic: string,
  transcript: string,
  metadata: {
    duration?: number;
    startTime?: string;
    hostEmail?: string;
  }
) {
  const { data, error } = await supabaseAdmin.from('ingestion_items').insert({
    user_id: userId,
    source_type: 'transcript',
    source_channel: 'zoom',
    raw_content: transcript,
    content_format: 'text',
    status: 'pending',
    transcript_metadata: {
      meeting_id: meetingId,
      topic: topic,
      duration_seconds: metadata.duration ? metadata.duration * 60 : null,
      call_date: metadata.startTime,
      auto_imported: true,
    },
    metadata: {
      zoom_host_email: metadata.hostEmail,
      auto_imported_at: new Date().toISOString(),
    },
  }).select().single();

  if (error) {
    console.error('[Zoom Webhook] Error creating ingestion item:', error);
    return null;
  }

  return data;
}

/**
 * Process a completed transcript by downloading and storing it
 */
async function processTranscriptCompleted(
  hostEmail: string,
  meetingId: string,
  meetingUuid: string,
  topic: string,
  duration?: number,
  startTime?: string
) {
  console.log('[Zoom Webhook] Processing transcript for meeting:', { meetingId, topic, hostEmail });

  // Find the user who connected this Zoom account
  const user = await findUserByZoomEmail(hostEmail);
  if (!user) {
    console.log('[Zoom Webhook] No user found for Zoom email:', hostEmail);
    return { success: false, reason: 'user_not_found' };
  }

  const zoomIntegration = user.preferences?.integrations?.zoom;
  if (!zoomIntegration?.connected || !zoomIntegration?.tokens) {
    console.log('[Zoom Webhook] User found but Zoom not properly connected');
    return { success: false, reason: 'zoom_not_connected' };
  }

  // Get valid access token
  const { accessToken, updatedTokens, error: tokenError } = await getValidAccessToken(
    zoomIntegration.tokens as ZoomTokens
  );

  if (tokenError || !accessToken) {
    console.error('[Zoom Webhook] Failed to get access token:', tokenError);
    return { success: false, reason: 'token_error' };
  }

  // Persist refreshed tokens if needed
  if (updatedTokens) {
    const existingPreferences = user.preferences || {};
    await supabaseAdmin
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

  // Get recording files to find the transcript
  const recordingResult = await getRecordingFiles(accessToken, meetingUuid);
  if (!recordingResult.success || !recordingResult.recording) {
    console.error('[Zoom Webhook] Failed to get recording files:', recordingResult.error);
    return { success: false, reason: 'recording_fetch_error' };
  }

  const recording = recordingResult.recording;
  const transcriptFile = recording.recording_files?.find(
    (f) => f.file_type === 'TRANSCRIPT'
  );

  if (!transcriptFile) {
    console.log('[Zoom Webhook] No transcript file found for recording');
    return { success: false, reason: 'no_transcript' };
  }

  // Download and parse the transcript
  const transcriptResult = await downloadTranscript(accessToken, transcriptFile.download_url);
  if (!transcriptResult.success || !transcriptResult.content) {
    console.error('[Zoom Webhook] Failed to download transcript:', transcriptResult.error);
    return { success: false, reason: 'transcript_download_error' };
  }

  const formattedTranscript = parseVttTranscript(transcriptResult.content);
  const metadata = getRecordingMetadata(recording);

  // Create ingestion item
  const ingestionItem = await createIngestionItem(
    user.id,
    String(recording.id),
    recording.topic || topic,
    formattedTranscript,
    {
      duration: recording.duration || duration,
      startTime: recording.start_time || startTime,
      hostEmail,
    }
  );

  if (!ingestionItem) {
    return { success: false, reason: 'ingestion_error' };
  }

  console.log('[Zoom Webhook] Successfully auto-imported transcript:', {
    ingestionItemId: ingestionItem.id,
    userId: user.id,
    topic: recording.topic,
  });

  return {
    success: true,
    ingestionItemId: ingestionItem.id,
    userId: user.id,
  };
}

/**
 * POST /api/integrations/zoom/webhook
 *
 * Handles Zoom webhook events for recording.completed and recording.transcript_completed.
 * Also handles the Zoom webhook URL validation challenge.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const parsed: ZoomWebhookPayload = JSON.parse(body);

    // Handle Zoom URL validation challenge
    if (parsed.event === 'endpoint.url_validation') {
      const crypto = require('crypto');
      const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

      if (!secretToken) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
      }

      const hashForValidation = crypto
        .createHmac('sha256', secretToken)
        .update(parsed.payload.plainToken)
        .digest('hex');

      return NextResponse.json({
        plainToken: parsed.payload.plainToken,
        encryptedToken: hashForValidation,
      });
    }

    // Verify webhook signature for non-validation requests
    const timestamp = request.headers.get('x-zm-request-timestamp') || '';
    const signature = request.headers.get('x-zm-signature') || '';

    if (!verifyWebhookRequest(body, timestamp, signature)) {
      console.error('[Zoom Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = parsed.event;
    const payload = parsed.payload?.object;

    switch (event) {
      case 'recording.completed': {
        console.log('[Zoom Webhook] Recording completed:', {
          meetingId: payload?.id,
          topic: payload?.topic,
          hostEmail: payload?.host_email,
        });
        // Recording completed - we'll wait for transcript_completed if we want the transcript
        // Or we could store the recording info for later processing
        break;
      }

      case 'recording.transcript_completed': {
        console.log('[Zoom Webhook] Transcript completed:', {
          meetingId: payload?.id,
          topic: payload?.topic,
          hostEmail: payload?.host_email,
        });

        if (payload?.host_email && payload?.uuid) {
          // Process the transcript in the background
          // We don't await here to return quickly to Zoom
          processTranscriptCompleted(
            payload.host_email,
            String(payload.id),
            payload.uuid,
            payload.topic || 'Untitled Meeting',
            payload.duration,
            payload.start_time
          ).then((result) => {
            console.log('[Zoom Webhook] Transcript processing result:', result);
          }).catch((err) => {
            console.error('[Zoom Webhook] Transcript processing error:', err);
          });
        }
        break;
      }

      default:
        console.log('[Zoom Webhook] Unhandled event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Zoom Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
