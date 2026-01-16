import { NextRequest, NextResponse } from 'next/server';
import { addCallLabSubscriber } from '@/lib/beehiiv';
import { sendEvent, createOrUpdateContact } from '@/lib/loops';
import { trackEmailCaptured } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, email } = body;

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Add to Beehiiv newsletter (fire-and-forget but log errors)
    addCallLabSubscriber(email, firstName).catch((err) => {
      console.error('[Workshop Subscribe] Beehiiv error:', err);
    });

    // Create/update contact in Loops
    await createOrUpdateContact({
      email,
      firstName,
      source: 'workshop_exit_popup',
      subscribed: true,
    }).catch((err) => {
      console.error('[Workshop Subscribe] Loops contact error:', err);
    });

    // Send workshop_resource_request event to Loops
    await sendEvent({
      email,
      eventName: 'workshop_resource_request',
      eventProperties: {
        firstName,
        resource: '2026_agency_planning_workshop',
        source: 'exit_intent_popup',
      },
    }).catch((err) => {
      console.error('[Workshop Subscribe] Loops event error:', err);
    });

    // Track in Vercel Analytics
    await trackEmailCaptured({
      source: 'exit_intent_workshop',
      isNewLead: true,
      hasName: true,
    });

    console.log('[Workshop Subscribe] Success:', { email, firstName });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Workshop Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
