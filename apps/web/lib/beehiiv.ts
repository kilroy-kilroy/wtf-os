/**
 * Beehiiv Newsletter Integration
 *
 * Used for:
 * - Adding new subscribers when users provide their email
 * - Syncing leads from Discovery Lab, Call Lab, and signup flows
 */

import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics';

const BEEHIIV_API_BASE = 'https://api.beehiiv.com/v2';

interface BeehiivSubscriber {
  email: string;
  first_name?: string;
  last_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referring_site?: string;
  custom_fields?: Array<{ name: string; value: string }>;
}

interface BeehiivResponse {
  data?: {
    id: string;
    email: string;
    status: string;
  };
  errors?: Array<{ message: string }>;
}

function getApiKey(): string | null {
  return process.env.BEEHIIV_API_KEY || null;
}

function getPublicationId(): string | null {
  return process.env.BEEHIIV_PUBLICATION_ID || null;
}

/**
 * Add a subscriber to Beehiiv newsletter
 */
export async function addSubscriber(
  subscriber: BeehiivSubscriber
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = getApiKey();
  const publicationId = getPublicationId();

  if (!apiKey) {
    console.warn('[Beehiiv] API key not configured (BEEHIIV_API_KEY), skipping subscriber:', subscriber.email);
    return { success: false, error: 'API key not configured' };
  }

  if (!publicationId) {
    console.warn('[Beehiiv] Publication ID not configured (BEEHIIV_PUBLICATION_ID), skipping subscriber:', subscriber.email);
    return { success: false, error: 'Publication ID not configured' };
  }

  console.log('[Beehiiv] Adding subscriber:', {
    email: subscriber.email,
    utm_source: subscriber.utm_source,
    has_name: !!(subscriber.first_name || subscriber.last_name),
  });

  try {
    const response = await fetch(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: subscriber.email,
          first_name: subscriber.first_name,
          last_name: subscriber.last_name,
          reactivate_existing: true, // Reactivate if they unsubscribed before
          send_welcome_email: false, // We handle welcome emails via Loops
          utm_source: subscriber.utm_source || 'app',
          utm_medium: subscriber.utm_medium || 'product',
          utm_campaign: subscriber.utm_campaign,
          referring_site: subscriber.referring_site || 'app.timkilroy.com',
          custom_fields: subscriber.custom_fields,
        }),
      }
    );

    const data: BeehiivResponse = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors?.[0]?.message || `HTTP ${response.status}`;
      console.error('[Beehiiv] API error for', subscriber.email, ':', errorMsg, 'Status:', response.status);
      return { success: false, error: errorMsg };
    }

    console.log('[Beehiiv] Subscriber added successfully:', {
      email: subscriber.email,
      subscriber_id: data.data?.id,
      status: data.data?.status,
    });

    // Track newsletter signup in Vercel Analytics
    await trackServerEvent(AnalyticsEvents.NEWSLETTER_SIGNUP, {
      source: subscriber.utm_source || 'unknown',
      medium: subscriber.utm_medium || 'unknown',
      has_name: !!(subscriber.first_name || subscriber.last_name),
    });

    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error('[Beehiiv] Subscriber creation failed for', subscriber.email, ':', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add subscriber from Discovery Lab submission
 */
export async function addDiscoveryLabSubscriber(
  email: string,
  name?: string,
  company?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const [firstName, ...lastNameParts] = (name || '').split(' ');
  const lastName = lastNameParts.join(' ');

  return addSubscriber({
    email,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    utm_source: 'discovery-lab',
    utm_medium: 'lead-magnet',
    custom_fields: company
      ? [{ name: 'company', value: company }]
      : undefined,
  });
}

/**
 * Add subscriber from Call Lab submission
 */
export async function addCallLabSubscriber(
  email: string,
  name?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const [firstName, ...lastNameParts] = (name || '').split(' ');
  const lastName = lastNameParts.join(' ');

  return addSubscriber({
    email,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    utm_source: 'call-lab',
    utm_medium: 'lead-magnet',
  });
}

/**
 * Add subscriber from app signup/onboarding
 */
export async function addAppSignupSubscriber(
  email: string,
  firstName?: string,
  lastName?: string,
  company?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return addSubscriber({
    email,
    first_name: firstName,
    last_name: lastName,
    utm_source: 'app-signup',
    utm_medium: 'product',
    custom_fields: company
      ? [{ name: 'company', value: company }]
      : undefined,
  });
}

/**
 * Add subscriber from GrowthOS assessment completion
 * Tags them for the Agency Inner Circle list
 */
export async function addAssessmentSubscriber(
  email: string,
  name?: string,
  agencyName?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const [firstName, ...lastNameParts] = (name || '').split(' ');
  const lastName = lastNameParts.join(' ');

  return addSubscriber({
    email,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    utm_source: 'growthos-assessment',
    utm_medium: 'assessment',
    utm_campaign: 'agency-inner-circle',
    custom_fields: agencyName
      ? [{ name: 'company', value: agencyName }]
      : undefined,
  });
}

/**
 * Add subscriber from Stripe checkout (Pro upgrade)
 */
export async function addProSubscriber(
  email: string,
  product: 'call-lab-pro' | 'discovery-lab-pro' | 'bundle'
): Promise<{ success: boolean; id?: string; error?: string }> {
  return addSubscriber({
    email,
    utm_source: product,
    utm_medium: 'purchase',
    custom_fields: [{ name: 'product', value: product }],
  });
}
