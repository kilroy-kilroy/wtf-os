import { NextResponse } from 'next/server';
import { verifyWebhookRequest } from '@/lib/zoom';

/**
 * POST /api/integrations/zoom/webhook
 *
 * Handles Zoom webhook events for recording.completed and recording.transcript_completed.
 * Also handles the Zoom webhook URL validation challenge.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const parsed = JSON.parse(body);

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

    switch (event) {
      case 'recording.completed': {
        const payload = parsed.payload?.object;
        console.log('[Zoom Webhook] Recording completed:', {
          meetingId: payload?.id,
          topic: payload?.topic,
          hostEmail: payload?.host_email,
        });
        // Future: auto-import recordings or notify users
        break;
      }

      case 'recording.transcript_completed': {
        const payload = parsed.payload?.object;
        console.log('[Zoom Webhook] Transcript completed:', {
          meetingId: payload?.id,
          topic: payload?.topic,
        });
        // Future: auto-import transcripts or notify users
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
