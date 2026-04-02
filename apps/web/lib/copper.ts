/**
 * Copper CRM Integration
 *
 * Fire-and-forget functions for syncing leads, opportunities, and notes.
 * All functions catch errors internally — callers never need try/catch.
 *
 * Env vars: COPPER_API_KEY, COPPER_API_EMAIL
 */

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

// KLRY Pipeline
const PIPELINE_ID = 1044966;

export const COPPER_STAGES = {
  LEAD: 5005078,
  DISCOVERY_CALL: 5005079,
  QUALIFIED: 5005080,
  ALIGNMENT: 5005081,
  VERBAL: 5005082,
  CONTRACT: 5005083,
  CLOSED_WON: 5005084,
  CLOSED_LOST: 5005085,
} as const;

// $588 ACV = $49/mo × 12. Copper uses cents.
export const PRO_ACV = 58800;
export const BUNDLE_ACV = 176400; // 3 × $588

function getHeaders(): Record<string, string> | null {
  const apiKey = process.env.COPPER_API_KEY;
  const apiEmail = process.env.COPPER_API_EMAIL;
  if (!apiKey || !apiEmail) {
    console.log('[Copper] API key or email not configured, skipping');
    return null;
  }
  return {
    'X-PW-AccessToken': apiKey,
    'X-PW-UserEmail': apiEmail,
    'X-PW-Application': 'developer_api',
    'Content-Type': 'application/json',
  };
}

async function copperFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers = getHeaders();
  if (!headers) return null;
  const res = await fetch(`${COPPER_API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[Copper] ${options.method || 'GET'} ${path} failed (${res.status}):`, text);
    return null;
  }
  return res.json().catch(() => null);
}

// ============================================================================
// People
// ============================================================================

export async function copperFindPersonByEmail(email: string): Promise<{ id: number } | null> {
  const results = await copperFetch('/people/search', {
    method: 'POST',
    body: JSON.stringify({ emails: [email] }),
  });
  if (Array.isArray(results) && results.length > 0) {
    return { id: results[0].id };
  }
  return null;
}

export async function copperCreatePerson(params: {
  email: string;
  name?: string;
  companyName?: string;
}): Promise<{ id: number } | null> {
  const nameParts = (params.name || '').split(' ');
  return copperFetch('/people', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name || params.email,
      emails: [{ email: params.email, category: 'work' }],
      ...(params.companyName && { company_name: params.companyName }),
    }),
  });
}

export async function copperFindOrCreatePerson(params: {
  email: string;
  name?: string;
  companyName?: string;
}): Promise<{ id: number } | null> {
  const existing = await copperFindPersonByEmail(params.email);
  if (existing) return existing;
  return copperCreatePerson(params);
}

// ============================================================================
// Opportunities
// ============================================================================

export async function copperFindOpportunityByPerson(
  personId: number,
  productPrefix: string
): Promise<{ id: number; pipeline_stage_id: number } | null> {
  const results = await copperFetch('/opportunities/search', {
    method: 'POST',
    body: JSON.stringify({ primary_contact_id: personId }),
  });
  if (!Array.isArray(results)) return null;
  const match = results.find((o: any) => o.name?.startsWith(productPrefix));
  if (match) return { id: match.id, pipeline_stage_id: match.pipeline_stage_id };
  return null;
}

export async function copperCreateOpportunity(params: {
  personId: number;
  personEmail: string;
  productName: string;
  monetaryValue: number;
  stageId: number;
}): Promise<{ id: number } | null> {
  return copperFetch('/opportunities', {
    method: 'POST',
    body: JSON.stringify({
      name: `${params.productName} — ${params.personEmail}`,
      pipeline_id: PIPELINE_ID,
      pipeline_stage_id: params.stageId,
      monetary_value: params.monetaryValue,
      primary_contact_id: params.personId,
    }),
  });
}

export async function copperUpdateOpportunity(
  opportunityId: number,
  updates: { pipeline_stage_id?: number; monetary_value?: number }
): Promise<boolean> {
  const result = await copperFetch(`/opportunities/${opportunityId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result !== null;
}

export async function copperFindOrCreateOpportunity(params: {
  personId: number;
  personEmail: string;
  productName: string;
  monetaryValue: number;
  stageId: number;
}): Promise<{ id: number } | null> {
  const existing = await copperFindOpportunityByPerson(params.personId, params.productName);
  if (existing) return existing;
  return copperCreateOpportunity(params);
}

// ============================================================================
// Notes
// ============================================================================

export async function copperAddNote(personId: number, text: string): Promise<boolean> {
  const result = await copperFetch('/activities', {
    method: 'POST',
    body: JSON.stringify({
      type: { id: 0, category: 'user' },
      details: text,
      parent: { type: 'person', id: personId },
    }),
  });
  return result !== null;
}

// ============================================================================
// High-Level Convenience Functions
// ============================================================================

/**
 * Sync a new lead to Copper: find/create person → find/create opportunity → add note.
 * Fire-and-forget — catches all errors internally.
 */
export async function copperSyncLead(params: {
  email: string;
  name?: string;
  companyName?: string;
  productName: string;
  opportunityValue: number;
  stageId: number;
  note: string;
}): Promise<void> {
  try {
    const person = await copperFindOrCreatePerson({
      email: params.email,
      name: params.name,
      companyName: params.companyName,
    });
    if (!person) return;

    await copperFindOrCreateOpportunity({
      personId: person.id,
      personEmail: params.email,
      productName: params.productName,
      monetaryValue: params.opportunityValue,
      stageId: params.stageId,
    });

    await copperAddNote(person.id, params.note);
  } catch (err) {
    console.error('[Copper] syncLead failed:', err);
  }
}

/**
 * Close a deal in Copper: find person → find/create opportunity → mark Closed-Won → add note.
 * Fire-and-forget — catches all errors internally.
 */
export async function copperCloseDeal(params: {
  email: string;
  productName: string;
  monetaryValue: number;
  note: string;
}): Promise<void> {
  try {
    const person = await copperFindPersonByEmail(params.email);
    if (!person) {
      // Create person if they don't exist (edge case: direct Stripe purchase)
      const newPerson = await copperCreatePerson({ email: params.email });
      if (!newPerson) return;
      await copperCreateOpportunity({
        personId: newPerson.id,
        personEmail: params.email,
        productName: params.productName,
        monetaryValue: params.monetaryValue,
        stageId: COPPER_STAGES.CLOSED_WON,
      });
      await copperAddNote(newPerson.id, params.note);
      return;
    }

    const opp = await copperFindOpportunityByPerson(person.id, params.productName);
    if (opp) {
      await copperUpdateOpportunity(opp.id, {
        pipeline_stage_id: COPPER_STAGES.CLOSED_WON,
        monetary_value: params.monetaryValue,
      });
    } else {
      await copperCreateOpportunity({
        personId: person.id,
        personEmail: params.email,
        productName: params.productName,
        monetaryValue: params.monetaryValue,
        stageId: COPPER_STAGES.CLOSED_WON,
      });
    }

    await copperAddNote(person.id, params.note);
  } catch (err) {
    console.error('[Copper] closeDeal failed:', err);
  }
}

/**
 * Add a report note to an existing Copper contact + ensure opportunity exists.
 * Fire-and-forget — catches all errors internally.
 */
export async function copperLogReport(params: {
  email: string;
  productName: string;
  opportunityValue: number;
  note: string;
}): Promise<void> {
  try {
    const person = await copperFindPersonByEmail(params.email);
    if (!person) return; // Don't create people just for report notes

    await copperFindOrCreateOpportunity({
      personId: person.id,
      personEmail: params.email,
      productName: params.productName,
      monetaryValue: params.opportunityValue,
      stageId: COPPER_STAGES.LEAD,
    });

    await copperAddNote(person.id, params.note);
  } catch (err) {
    console.error('[Copper] logReport failed:', err);
  }
}
