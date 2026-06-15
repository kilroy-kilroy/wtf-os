/**
 * Copper CRM Integration
 *
 * Fire-and-forget functions for syncing leads, opportunities, and notes.
 * All functions catch errors internally — callers never need try/catch.
 *
 * Env vars: COPPER_API, COPPER_API_EMAIL
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
  const apiKey = process.env.COPPER_API;
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
  // Copper's /opportunities/search filter is `primary_contact_ids` (plural
  // array). The singular `primary_contact_id` is rejected with HTTP 422, which
  // made this return null every time — so find-or-create always created a NEW
  // opportunity, producing duplicate opps for any lead who ran a tool twice
  // (affected every copperSyncLead caller, not just one tool).
  const results = await copperFetch('/opportunities/search', {
    method: 'POST',
    body: JSON.stringify({ primary_contact_ids: [personId] }),
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

// Biz-dev assessment leads (placeholder ACVs — confirm with Tim before launch)
export const BIZ_DEV_STUDIO_ACV = 18000;
export const BIZ_DEV_GROWTH_ACV = 36000;

export interface BizDevLeadInput {
  name: string;
  email: string;
  company_name: string;
  website_url: string;
  linkedin_url: string;
  cta_tier: 'studio' | 'growth';
  stage: string;
  composite: number;
  verdict: 'ready' | 'almost';
}

/**
 * Sync a Biz Dev Assessment lead to Copper.
 * Fire-and-forget — catches all errors internally.
 */
export async function copperSyncBizDevLead(lead: BizDevLeadInput): Promise<void> {
  const acv = lead.cta_tier === 'growth' ? BIZ_DEV_GROWTH_ACV : BIZ_DEV_STUDIO_ACV;
  const productName = `Biz Dev Assessment — SalesOS ${lead.cta_tier === 'growth' ? 'Growth' : 'Studio'}`;
  const note = [
    `Biz Dev Assessment completed`,
    `Stage: ${lead.stage}`,
    `Composite: ${lead.composite}/100`,
    `Verdict: ${lead.verdict}`,
    `CTA Tier: ${lead.cta_tier}`,
    `Website: ${lead.website_url}`,
    `LinkedIn: ${lead.linkedin_url}`,
  ].join('\n');

  return copperSyncLead({
    email: lead.email,
    name: lead.name,
    companyName: lead.company_name,
    productName,
    opportunityValue: acv,
    stageId: COPPER_STAGES.LEAD,
    note,
  });
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

// ============================================================================
// Companies — contract autofill
// ============================================================================

export interface CopperCompanyMatch {
  id: number;
  name: string;
  address: string; // formatted single line
  contacts: Array<{ name: string; email: string; title: string | null }>;
}

function formatCopperAddress(a: any): string {
  if (!a) return '';
  return [a.street, a.city, [a.state, a.postal_code].filter(Boolean).join(' '), a.country]
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

/**
 * Search Copper companies by name (for contract autofill). Each match includes
 * the company's contacts (people with an email) so a signer can be picked.
 */
export async function copperSearchCompanies(query: string): Promise<CopperCompanyMatch[]> {
  const companies = await copperFetch('/companies/search', {
    method: 'POST',
    body: JSON.stringify({ name: query, page_size: 5 }),
  });
  if (!Array.isArray(companies)) return [];

  const out: CopperCompanyMatch[] = [];
  for (const c of companies.slice(0, 5)) {
    const people = await copperFetch('/people/search', {
      method: 'POST',
      body: JSON.stringify({ company_ids: [c.id], page_size: 5 }),
    });
    const contacts = Array.isArray(people)
      ? people
          .map((p: any) => ({ name: p.name as string, email: (p.emails?.[0]?.email as string) || '', title: p.title ?? null }))
          .filter((p) => p.email)
      : [];
    out.push({ id: c.id, name: c.name, address: formatCopperAddress(c.address), contacts });
  }
  return out;
}
