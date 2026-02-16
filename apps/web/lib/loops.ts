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
  // Custom properties for Client Portal
  enrolledProgram?: string;
  clientLoginUrl?: string;
  clientTempPassword?: string;
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
        enrolledProgram: contact.enrolledProgram,
        clientLoginUrl: contact.clientLoginUrl,
        clientTempPassword: contact.clientTempPassword,
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
 * Fire when user upgrades to any Pro product
 * This should stop the nurture sequence for that product
 */
export async function onProUpgrade(
  email: string,
  planType: 'solo' | 'team' = 'solo',
  product: string = 'call-lab-pro'
): Promise<{ success: boolean; error?: string }> {
  // Map product to appropriate user group
  const userGroupMap: Record<string, string> = {
    'call-lab-pro': 'call_lab_pro',
    'discovery-lab-pro': 'discovery_lab_pro',
    'visibility-lab-pro': 'visibility_lab_pro',
    'bundle': 'salesos_pro',
    'growth-bundle': 'growthos_pro',
  };

  const userGroup = userGroupMap[product] || 'call_lab_pro';

  // Update their user group to stop nurture sequences
  await updateContact(email, {
    userGroup,
    callLabTier: planType,
  });

  // Send the upgrade event
  return sendEvent({
    email,
    eventName: 'upgraded_to_pro',
    eventProperties: {
      planType,
      product,
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
  companyName?: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/call-lab/report/${reportId}`;

  const eventName = reportType === 'pro'
    ? 'report_generated_pro'
    : 'report_generated_lite';

  return sendEvent({
    email,
    eventName,
    eventProperties: {
      reportId,
      reportUrl,
      reportType,
      prospectName: prospectName || '',
      companyName: companyName || '',
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}

/**
 * Fire when a Discovery Lab report is generated
 * Triggers email sequences with link to report
 */
export async function onDiscoveryReportGenerated(
  email: string,
  reportType: 'lite' | 'pro' = 'lite',
  targetCompany: string,
  targetContact?: string,
  targetContactTitle?: string,
  reportId?: string,
  reportUrl?: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const reportTypeLabel = reportType === 'pro'
    ? 'SalesOS Discovery Lab Pro'
    : 'SalesOS Discovery Lab';

  const eventName = reportType === 'pro'
    ? 'discovery_report_generated_pro'
    : 'discovery_report_generated_lite';

  return sendEvent({
    email,
    eventName,
    eventProperties: {
      reportType: reportTypeLabel,
      targetCompany,
      targetContact: targetContact || '',
      targetContactTitle: targetContactTitle || '',
      reportId: reportId || '',
      reportUrl: reportUrl || '',
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}

/**
 * Fire when we need to nudge a user about a call outcome
 * Triggers email asking them to tag how the call went
 */
export async function onOutcomeNudge(
  email: string,
  firstName: string,
  callDate: string,
  prospect: string,
  callId: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const updateUrl = `${appUrl}/calls/${callId}/outcome`;

  return sendEvent({
    email,
    eventName: 'outcome_nudge',
    eventProperties: {
      firstName: firstName || 'there',
      callDate,
      prospect,
      updateUrl,
      callId,
    },
  });
}

/**
 * Fire when a GrowthOS assessment is completed
 * Triggers post-assessment email sequence (results + roadmap call CTA)
 */
export async function onAssessmentCompleted(
  email: string,
  firstName: string,
  agencyName: string,
  assessmentId: string,
  overallScore: number,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const resultsUrl = `${appUrl}/growthos/results/${assessmentId}`;

  // Create/update contact so Loops knows this person
  await createOrUpdateContact({
    email,
    firstName,
    source: 'growthos_assessment',
    subscribed: true,
    userGroup: 'growthos_assessment',
    companyName: agencyName,
  });

  return sendEvent({
    email,
    eventName: 'assessment_completed',
    eventProperties: {
      firstName: firstName || '',
      agencyName: agencyName || '',
      assessmentId,
      overallScore,
      resultsUrl,
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}

/**
 * Fire when a Visibility Lab report is generated
 * Triggers email sequence with link to visibility report
 */
export async function onVisibilityReportGenerated(
  email: string,
  reportId: string,
  visibilityScore: number,
  brandName: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/visibility-lab/report/${reportId}`;

  return sendEvent({
    email,
    eventName: 'visibility_report_generated',
    eventProperties: {
      reportId,
      reportUrl,
      visibilityScore,
      brandName,
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}

/**
 * Fire when a Visibility Lab Pro report is generated
 * Triggers email sequence with link to the Pro visibility report
 */
export async function onVisibilityProReportGenerated(
  email: string,
  reportId: string,
  kviScore: number,
  brandName: string,
  diagnosisSeverity?: string,
  brandArchetype?: string,
  archetype?: string,
  executionScore?: number,
  positioningScore?: number
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/visibility-lab-pro/report/${reportId}`;

  return sendEvent({
    email,
    eventName: 'visibility_pro_report_generated',
    eventProperties: {
      reportId,
      reportUrl,
      reportType: 'DemandOS Visibility Lab Pro',
      kviScore,
      brandName,
      diagnosisSeverity: diagnosisSeverity || '',
      brandArchetype: brandArchetype || '',
      archetype: archetype || '',
      executionScore: executionScore ?? 0,
      positioningScore: positioningScore ?? 0,
    },
  });
}

/**
 * Fire when a coaching report is ready (weekly, monthly, quarterly)
 * Triggers email with link to coaching report
 *
 * Uses separate Loops events for each report type:
 * - coaching_weekly_ready
 * - coaching_monthly_ready
 * - coaching_quarterly_ready
 */
export async function onCoachingReportReady(
  email: string,
  reportType: 'weekly' | 'monthly' | 'quarterly',
  reportId: string,
  periodStart: string,
  periodEnd: string,
  firstName?: string,
  oneThingBehavior?: string,
  oneThingDrill?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
  const reportUrl = `${appUrl}/dashboard/coaching/${reportId}`;

  // Map report type to specific Loops event
  const eventNameMap = {
    weekly: 'coaching_weekly_ready',
    monthly: 'coaching_monthly_ready',
    quarterly: 'coaching_quarterly_ready',
  } as const;

  const eventName = eventNameMap[reportType];

  return sendEvent({
    email,
    eventName,
    eventProperties: {
      reportId,
      reportUrl,
      periodStart,
      periodEnd,
      firstName: firstName || '',
      oneThingBehavior: oneThingBehavior || '',
      oneThingDrill: oneThingDrill || '',
    },
  });
}

// ============================================
// CLIENT PORTAL EVENTS
// ============================================

/**
 * Fire when a client is invited to a program
 * Sends welcome email with login link and temp password
 */
export async function onClientInvited(
  email: string,
  firstName: string,
  programName: string,
  loginUrl: string,
  tempPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Set contact properties including login details for email templates
  await createOrUpdateContact({
    email,
    firstName,
    source: 'client_invite',
    subscribed: true,
    userGroup: 'client',
    enrolledProgram: programName,
    clientLoginUrl: loginUrl,
    clientTempPassword: tempPassword,
  });

  return sendEvent({
    email,
    eventName: 'client_invited',
    eventProperties: {
      firstName: firstName || '',
      programName,
      loginUrl,
      tempPassword,
    },
  });
}

/**
 * Fire when a client completes onboarding
 * Sends welcome-to-dashboard email
 */
export async function onClientOnboarded(
  email: string,
  firstName: string,
  programName: string,
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  // Update contact with company name and ensure enrolledProgram is set
  await updateContact(email, {
    companyName,
    enrolledProgram: programName,
  });

  return sendEvent({
    email,
    eventName: 'client_onboarded',
    eventProperties: {
      firstName: firstName || '',
      programName,
      companyName,
      dashboardUrl: `${appUrl}/client/dashboard`,
    },
  });
}

/**
 * Fire every Friday morning to remind clients to submit their 5-Minute Friday
 * Triggered by cron job
 */
export async function onFiveMinuteFridayReminder(
  email: string,
  firstName: string,
  programName: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  return sendEvent({
    email,
    eventName: 'five_minute_friday_reminder',
    eventProperties: {
      firstName: firstName || 'there',
      programName,
      submitUrl: `${appUrl}/client/five-minute-friday`,
    },
  });
}

/**
 * Fire when admin responds to a 5-Minute Friday submission
 * Notifies client of the response
 */
export async function onFiveMinuteFridayResponse(
  email: string,
  weekOf: string,
  responsePreview: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  return sendEvent({
    email,
    eventName: 'five_minute_friday_response',
    eventProperties: {
      weekOf,
      responsePreview: responsePreview.substring(0, 200),
      viewUrl: `${appUrl}/client/five-minute-friday/history`,
    },
  });
}