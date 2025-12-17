/**
 * Loops.so Email Marketing Integration
 *
 * Used for:
 * - Adding new contacts when users complete onboarding
 * - Triggering email sequences (e.g., Call Lab → Pro nurture)
 * - Stopping sequences when users convert (upgrade to Pro)
 */

const LOOPS_API_BASE = 'https://app.loops.so/api/v1';

interface LoopsContact {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  // Custom properties for Call Lab
  callLabTier?: string;
  companyName?: string;
  role?: string;
  salesTeamSize?: string;
  signupDate?: string;
}

interface LoopsEventPayload {
  email: string;
  eventName: string;
  eventProperties?: Record<string, string | number | boolean>;
}

function getApiKey(): string | null {
  return process.env.LOOPS_API_KEY || null;
}

/**
 * Create or update a contact in Loops
 */
export async function createOrUpdateContact(contact: LoopsContact): Promise<{ success: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Loops API key not configured, skipping contact creation');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${LOOPS_API_BASE}/contacts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        source: contact.source || 'call_lab_signup',
        subscribed: contact.subscribed ?? true,
        userGroup: contact.userGroup || 'call_lab_free',
        // Custom fields (these need to be created in Loops dashboard first)
        callLabTier: contact.callLabTier || 'free',
        companyName: contact.companyName,
        role: contact.role,
        salesTeamSize: contact.salesTeamSize,
        signupDate: contact.signupDate || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Loops contact creation failed:', errorData);
      return { success: false, error: errorData.message || 'Failed to create contact' };
    }

    console.log(`Loops contact created/updated: ${contact.email}`);
    return { success: true };
  } catch (error) {
    console.error('Loops API error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send an event to Loops (triggers sequences and automations)
 */
export async function sendEvent(payload: LoopsEventPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Loops API key not configured, skipping event');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${LOOPS_API_BASE}/events/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payload.email,
        eventName: payload.eventName,
        eventProperties: payload.eventProperties || {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Loops event send failed:', errorData);
      return { success: false, error: errorData.message || 'Failed to send event' };
    }

    console.log(`Loops event sent: ${payload.eventName} for ${payload.email}`);
    return { success: true };
  } catch (error) {
    console.error('Loops API error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a contact's properties (e.g., when they upgrade)
 */
export async function updateContact(
  email: string,
  properties: Partial<LoopsContact>
): Promise<{ success: boolean; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Loops API key not configured, skipping contact update');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${LOOPS_API_BASE}/contacts/update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        ...properties,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Loops contact update failed:', errorData);
      return { success: false, error: errorData.message || 'Failed to update contact' };
    }

    console.log(`Loops contact updated: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Loops API error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// PRE-DEFINED EVENTS
// ============================================

/**
 * Fire when user signs up for Call Lab (free tier)
 * This starts the nurture sequence to convert to Pro
 */
export async function onCallLabSignup(
  email: string,
  firstName?: string,
  companyName?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    email,
    eventName: 'call_lab_signup',
    eventProperties: {
      firstName: firstName || '',
      companyName: companyName || '',
      tier: 'free',
    },
  });
}

/**
 * Fire when user completes their first Call Lab analysis
 */
export async function onFirstCallAnalysis(
  email: string
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    email,
    eventName: 'first_call_analysis',
  });
}

/**
 * Fire when user upgrades to Call Lab Pro
 * This should stop the nurture sequence
 */
export async function onProUpgrade(
  email: string,
  planType: 'solo' | 'team' = 'solo'
): Promise<{ success: boolean; error?: string }> {
  // Update their user group to stop nurture sequences
  await updateContact(email, {
    userGroup: 'call_lab_pro',
    callLabTier: planType,
  });

  // Send the upgrade event
  return sendEvent({
    email,
    eventName: 'upgraded_to_pro',
    eventProperties: {
      planType,
    },
  });
}

/**
 * Fire when subscription is cancelled
 */
export async function onSubscriptionCancelled(
  email: string
): Promise<{ success: boolean; error?: string }> {
  await updateContact(email, {
    userGroup: 'call_lab_churned',
    callLabTier: 'churned',
  });

  return sendEvent({
    email,
    eventName: 'subscription_cancelled',
  });
}

/**
 * Fire when a Call Lab report is generated
 * Sends transactional email with link to the report
 */
export async function onReportGenerated(
  email: string,
  reportId: string,
  reportType: 'lite' | 'pro' = 'lite',
  prospectName?: string,
  companyName?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/call-lab/report/${reportId}`;

  return sendEvent({
    email,
    eventName: 'report_generated',
    eventProperties: {
      reportId,
      reportUrl,
      reportType,
      prospectName: prospectName || '',
      companyName: companyName || '',
    },
  });
}
