/**
 * Loops.so Email Marketing Integration
 *
 * Handles:
 * - Adding contacts to audience
 * - Sending transactional emails
 * - Syncing leads and subscribers
 */

const LOOPS_API_URL = 'https://app.loops.so/api/v1';

interface LoopsContactOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  userId?: string;
  mailingLists?: Record<string, boolean>;
  // Custom properties
  [key: string]: string | number | boolean | Record<string, boolean> | undefined;
}

interface LoopsTransactionalOptions {
  email: string;
  transactionalId: string;
  addToAudience?: boolean;
  dataVariables?: Record<string, string | number>;
}

interface LoopsResponse {
  success: boolean;
  id?: string;
  message?: string;
}

class LoopsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${LOOPS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Loops API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new contact in your audience
   */
  async createContact(options: LoopsContactOptions): Promise<LoopsResponse> {
    return this.request<LoopsResponse>('/contacts/create', 'POST', options);
  }

  /**
   * Update an existing contact (or create if doesn't exist)
   */
  async updateContact(
    email: string,
    properties: Record<string, string | number | boolean>
  ): Promise<LoopsResponse> {
    return this.request<LoopsResponse>('/contacts/update', 'PUT', {
      email,
      ...properties,
    });
  }

  /**
   * Find a contact by email
   */
  async findContact(email: string): Promise<LoopsResponse & { contact?: LoopsContactOptions }> {
    return this.request(`/contacts/find?email=${encodeURIComponent(email)}`, 'GET');
  }

  /**
   * Send a transactional email
   */
  async sendTransactionalEmail(options: LoopsTransactionalOptions): Promise<LoopsResponse> {
    return this.request<LoopsResponse>('/transactional', 'POST', options);
  }

  /**
   * Send an event to trigger automations
   */
  async sendEvent(
    email: string,
    eventName: string,
    eventProperties?: Record<string, string | number>
  ): Promise<LoopsResponse> {
    return this.request<LoopsResponse>('/events/send', 'POST', {
      email,
      eventName,
      eventProperties,
    });
  }

  /**
   * Test API key validity
   */
  async testApiKey(): Promise<{ success: boolean; teamName?: string }> {
    return this.request('/api-key', 'GET');
  }
}

// Singleton instance
let loopsClient: LoopsClient | null = null;

export function getLoopsClient(): LoopsClient | null {
  if (!loopsClient) {
    const apiKey = process.env.LOOPS_API_KEY;
    if (!apiKey) {
      console.warn('LOOPS_API_KEY not configured');
      return null;
    }
    loopsClient = new LoopsClient(apiKey);
  }
  return loopsClient;
}

/**
 * Add a lead to Loops audience
 * Use this when capturing emails from lead magnets
 */
export async function addLeadToLoops(
  email: string,
  source: string,
  properties?: Record<string, string | number>
): Promise<{ success: boolean; error?: string }> {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops not configured' };
  }

  try {
    await client.createContact({
      email,
      source,
      subscribed: true,
      userGroup: 'lead',
      ...properties,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to add lead to Loops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a plain text email via Loops transactional API
 * Creates a simple email without needing a pre-made template
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: {
    addToAudience?: boolean;
    transactionalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops not configured' };
  }

  // For simple emails, we use a generic transactional template
  // You'll need to create a transactional email in Loops with these data variables:
  // - subject
  // - body
  const transactionalId = options?.transactionalId || process.env.LOOPS_GENERIC_EMAIL_ID;

  if (!transactionalId) {
    return {
      success: false,
      error: 'No transactional email template ID configured. Set LOOPS_GENERIC_EMAIL_ID.',
    };
  }

  try {
    await client.sendTransactionalEmail({
      email: to,
      transactionalId,
      addToAudience: options?.addToAudience ?? false,
      dataVariables: {
        subject,
        body,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send email via Loops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a contact's subscription tier/status
 */
export async function updateContactSubscription(
  email: string,
  tier: 'lead' | 'free' | 'subscriber' | 'client',
  planType?: 'solo' | 'team'
): Promise<{ success: boolean; error?: string }> {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops not configured' };
  }

  try {
    await client.updateContact(email, {
      userGroup: tier,
      subscriptionTier: tier,
      ...(planType && { planType }),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update contact in Loops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger an event for email automations
 */
export async function triggerLoopsEvent(
  email: string,
  eventName: string,
  properties?: Record<string, string | number>
): Promise<{ success: boolean; error?: string }> {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops not configured' };
  }

  try {
    await client.sendEvent(email, eventName, properties);
    return { success: true };
  } catch (error) {
    console.error('Failed to trigger Loops event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { LoopsClient };
export type { LoopsContactOptions, LoopsTransactionalOptions, LoopsResponse };
