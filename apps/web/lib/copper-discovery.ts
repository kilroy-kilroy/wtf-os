/**
 * Copper Discovery Agent Helpers
 *
 * Fetches opportunity/company/contact data from Copper and
 * writes Discovery Lab research back to custom fields.
 */

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

function getHeaders(): Record<string, string> | null {
  const apiKey = process.env.COPPER_API;
  const apiEmail = process.env.COPPER_API_EMAIL;
  if (!apiKey || !apiEmail) return null;
  return {
    'X-PW-AccessToken': apiKey,
    'X-PW-UserEmail': apiEmail,
    'X-PW-Application': 'developer_api',
    'Content-Type': 'application/json',
  };
}

async function copperGet(path: string): Promise<any> {
  const headers = getHeaders();
  if (!headers) throw new Error('Copper API credentials not configured');
  const res = await fetch(`${COPPER_API_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Copper GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function copperPut(path: string, body: any): Promise<any> {
  const headers = getHeaders();
  if (!headers) throw new Error('Copper API credentials not configured');
  const res = await fetch(`${COPPER_API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Copper PUT ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ============================================================================
// Fetch opportunity data
// ============================================================================

export interface CopperOpportunity {
  id: number;
  name: string;
  company_id: number | null;
  primary_contact_id: number | null;
  details: string | null;
  monetary_value: number | null;
  pipeline_id: number;
  pipeline_stage_id: number;
  custom_fields: Array<{ custom_field_definition_id: number; value: any }>;
}

export interface CopperCompany {
  id: number;
  name: string;
  email_domain: string | null;
  details: string | null;
  websites: Array<{ url: string }> | null;
  phone_numbers: Array<{ number: string }> | null;
  address: { street?: string; city?: string; state?: string; country?: string } | null;
}

export interface CopperPerson {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  emails: Array<{ email: string }>;
  phone_numbers: Array<{ number: string }> | null;
  company_id: number | null;
  company_name: string | null;
  details: string | null;
}

export async function fetchOpportunity(id: number): Promise<CopperOpportunity> {
  return copperGet(`/opportunities/${id}`);
}

export async function fetchCompany(id: number): Promise<CopperCompany> {
  return copperGet(`/companies/${id}`);
}

export async function fetchPerson(id: number): Promise<CopperPerson> {
  return copperGet(`/people/${id}`);
}

// ============================================================================
// Write research results back to Copper
// ============================================================================

export interface DiscoverySummary {
  brief: string;
  keyContacts: string;
  conversationStarters: string;
}

export async function setDiscoveryStatus(opportunityId: number, status: 'pending' | 'running' | 'complete' | 'error'): Promise<void> {
  const statusFieldId = process.env.COPPER_FIELD_DISCOVERY_STATUS;
  const statusOptionId = {
    pending: process.env.COPPER_STATUS_PENDING,
    running: process.env.COPPER_STATUS_RUNNING,
    complete: process.env.COPPER_STATUS_COMPLETE,
    error: process.env.COPPER_STATUS_ERROR,
  }[status];

  if (!statusFieldId || !statusOptionId) {
    console.warn('[CopperDiscovery] Status field/option IDs not configured');
    return;
  }

  await copperPut(`/opportunities/${opportunityId}`, {
    custom_fields: [
      { custom_field_definition_id: Number(statusFieldId), value: Number(statusOptionId) },
    ],
  });
}

export async function writeDiscoveryResults(
  opportunityId: number,
  summary: DiscoverySummary,
  reportUrl: string | null,
): Promise<void> {
  const briefFieldId = process.env.COPPER_FIELD_DISCOVERY_BRIEF;
  const contactsFieldId = process.env.COPPER_FIELD_KEY_CONTACTS;
  const startersFieldId = process.env.COPPER_FIELD_CONVERSATION_STARTERS;
  const statusFieldId = process.env.COPPER_FIELD_DISCOVERY_STATUS;
  const dateFieldId = process.env.COPPER_FIELD_DISCOVERY_DATE;
  const completeOptionId = process.env.COPPER_STATUS_COMPLETE;

  const customFields: any[] = [];

  if (briefFieldId) {
    customFields.push({ custom_field_definition_id: Number(briefFieldId), value: summary.brief });
  }
  if (contactsFieldId) {
    customFields.push({ custom_field_definition_id: Number(contactsFieldId), value: summary.keyContacts });
  }
  if (startersFieldId) {
    customFields.push({ custom_field_definition_id: Number(startersFieldId), value: summary.conversationStarters });
  }
  if (statusFieldId && completeOptionId) {
    customFields.push({ custom_field_definition_id: Number(statusFieldId), value: Number(completeOptionId) });
  }
  if (dateFieldId) {
    // Copper date fields expect epoch seconds
    customFields.push({ custom_field_definition_id: Number(dateFieldId), value: Math.floor(Date.now() / 1000) });
  }

  await copperPut(`/opportunities/${opportunityId}`, { custom_fields: customFields });

  // Add note with link to full report
  if (reportUrl) {
    const headers = getHeaders();
    if (headers) {
      await fetch(`${COPPER_API_BASE}/activities`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: { id: 0, category: 'user' },
          details: `Discovery Lab research complete.\n\nFull report: ${reportUrl}`,
          parent: { type: 'opportunity', id: opportunityId },
        }),
      });
    }
  }
}
