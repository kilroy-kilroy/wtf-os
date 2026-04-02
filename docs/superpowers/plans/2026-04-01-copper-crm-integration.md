# Copper CRM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync all lead captures, report generations, and subscription purchases to Copper CRM with people, opportunities, and notes.

**Architecture:** A single utility module (`apps/web/lib/copper.ts`) exposes fire-and-forget functions. Each existing API route gets a one-line addition alongside its Loops/Beehiiv calls. No new endpoints, no new UI.

**Tech Stack:** Copper REST API v1, TypeScript, fetch

**Spec:** `docs/superpowers/specs/2026-04-01-copper-crm-integration-design.md`

---

## File Map

```
CREATE: apps/web/lib/copper.ts                                    — Copper API utility module
MODIFY: apps/web/app/api/growthos/route.ts                        — Assessment → Copper lead
MODIFY: apps/web/app/api/visibility-lab/analyze/route.ts          — Vis Lab Free → Copper lead
MODIFY: apps/web/app/api/visibility-lab-pro/analyze/route.ts      — Vis Lab Pro → Copper lead
MODIFY: apps/web/app/api/call-lab-instant/capture-lead/route.ts   — Instant capture → Copper lead
MODIFY: apps/web/app/api/analyze/discovery/route.ts               — Discovery → Copper lead
MODIFY: apps/web/app/api/analyze/call/route.ts                    — Call Lab report → Copper note
MODIFY: apps/web/app/api/webhooks/stripe/route.ts                 — Subscription → Copper close deal
```

---

### Task 1: Create the Copper utility module

**Files:**
- Create: `apps/web/lib/copper.ts`

- [ ] **Step 1: Create the Copper utility module**

Create `apps/web/lib/copper.ts` with the complete content below:

```typescript
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
```

- [ ] **Step 2: Commit**

```
git add apps/web/lib/copper.ts
git commit -m "feat: add Copper CRM utility module with lead sync, deal close, and report logging"
```

---

### Task 2: Integrate Copper into GrowthOS Assessment

**Files:**
- Modify: `apps/web/app/api/growthos/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of `apps/web/app/api/growthos/route.ts`, add after the existing imports:

```typescript
import { copperSyncLead, COPPER_STAGES } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper sync call**

In the POST handler, after the Beehiiv `addAssessmentSubscriber(...)` fire-and-forget block (around line 323-329), add:

```typescript
    // Copper CRM: create lead + WTF Assessment opportunity (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    copperSyncLead({
      email: intakeData.email,
      name: intakeData.founderName,
      companyName: intakeData.agencyName,
      productName: 'WTF Assessment',
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note: `Completed WTF Assessment — Score: ${scores.overall}/5. View: ${appUrl}/growthos/results/${assessmentId}`,
    }).catch(err => console.error('[Copper] assessment sync failed:', err));
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/growthos/route.ts
git commit -m "feat: sync GrowthOS assessment leads to Copper CRM"
```

---

### Task 3: Integrate Copper into Visibility Lab Free

**Files:**
- Modify: `apps/web/app/api/visibility-lab/analyze/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperSyncLead, PRO_ACV, COPPER_STAGES } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper sync call**

After the Beehiiv `addVisibilityLabSubscriber(...)` call (around line 204-206), add:

```typescript
      // Copper CRM: create lead + Visibility Lab Pro opportunity (fire-and-forget)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      if (reportId) {
        copperSyncLead({
          email: input.userEmail,
          name: input.userName,
          companyName: input.brandName,
          productName: 'Visibility Lab Pro',
          opportunityValue: PRO_ACV,
          stageId: COPPER_STAGES.LEAD,
          note: `Ran Visibility Lab Free — Score: ${report.visibilityScore}/100. View: ${appUrl}/visibility-lab/report/${reportId}`,
        }).catch(err => console.error('[Copper] visibility free sync failed:', err));
      }
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/visibility-lab/analyze/route.ts
git commit -m "feat: sync Visibility Lab Free leads to Copper CRM"
```

---

### Task 4: Integrate Copper into Visibility Lab Pro

**Files:**
- Modify: `apps/web/app/api/visibility-lab-pro/analyze/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperSyncLead, PRO_ACV, COPPER_STAGES } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper sync call**

After the Beehiiv `addVisibilityLabSubscriber(...)` call, add:

```typescript
      // Copper CRM: create lead + Visibility Lab Pro opportunity at Discovery Call stage (fire-and-forget)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      if (reportId) {
        copperSyncLead({
          email: input.userEmail,
          name: input.userName,
          companyName: input.brandName,
          productName: 'Visibility Lab Pro',
          opportunityValue: PRO_ACV,
          stageId: COPPER_STAGES.DISCOVERY_CALL,
          note: `Ran Visibility Lab Pro — Score: ${report.kvi?.compositeScore || 'N/A'}/100. View: ${appUrl}/visibility-lab/report/${reportId}`,
        }).catch(err => console.error('[Copper] visibility pro sync failed:', err));
      }
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/visibility-lab-pro/analyze/route.ts
git commit -m "feat: sync Visibility Lab Pro leads to Copper CRM"
```

---

### Task 5: Integrate Copper into Call Lab Instant capture

**Files:**
- Modify: `apps/web/app/api/call-lab-instant/capture-lead/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperSyncLead, PRO_ACV, COPPER_STAGES } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper sync call**

After the Beehiiv `addCallLabSubscriber(...)` fire-and-forget block (around line 64-70), add:

```typescript
    // Copper CRM: create lead + Call Lab Pro opportunity (fire-and-forget)
    copperSyncLead({
      email: email.toLowerCase().trim(),
      name: firstName || undefined,
      productName: 'Call Lab Pro',
      opportunityValue: PRO_ACV,
      stageId: COPPER_STAGES.LEAD,
      note: `Call Lab Instant report — Score: ${report.score || 'N/A'}/10. View: ${reportUrl}`,
    }).catch(err => console.error('[Copper] instant capture sync failed:', err));
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/call-lab-instant/capture-lead/route.ts
git commit -m "feat: sync Call Lab Instant leads to Copper CRM"
```

---

### Task 6: Integrate Copper into Discovery Lab

**Files:**
- Modify: `apps/web/app/api/analyze/discovery/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperSyncLead, PRO_ACV, COPPER_STAGES } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper sync call**

After the Beehiiv subscriber call and Loops event (near the end of the POST handler, before the final `return NextResponse.json(...)`), add:

```typescript
    // Copper CRM: create lead + Discovery Lab Pro opportunity (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    if (reportId) {
      copperSyncLead({
        email: requestor_email,
        name: requestor_name || undefined,
        companyName: requestor_company || undefined,
        productName: 'Discovery Lab Pro',
        opportunityValue: PRO_ACV,
        stageId: COPPER_STAGES.LEAD,
        note: `Ran Discovery Lab ${version} — Target: ${target_company}. View: ${appUrl}/discovery-lab/report/${reportId}`,
      }).catch(err => console.error('[Copper] discovery sync failed:', err));
    }
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/analyze/discovery/route.ts
git commit -m "feat: sync Discovery Lab leads to Copper CRM"
```

---

### Task 7: Integrate Copper into Call Lab Pro/Lite reports

**Files:**
- Modify: `apps/web/app/api/analyze/call/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperLogReport, PRO_ACV } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper note in the sendReportEmail helper**

Find the `sendReportEmail` helper function (around line 36-86). After the Loops event send, add a Copper call. The function already has access to `email`, `callScoreId`, `reportType`, `prospectName`, `prospectCompany`. Add after the Loops call:

```typescript
    // Copper CRM: log report + ensure Call Lab Pro opportunity exists (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    copperLogReport({
      email,
      productName: 'Call Lab Pro',
      opportunityValue: PRO_ACV,
      note: `Ran Call Lab ${reportType} report${prospectName ? ` — ${prospectName}` : ''}${prospectCompany ? ` @ ${prospectCompany}` : ''}. View: ${appUrl}/call-lab/report/${callScoreId}?admin=1`,
    }).catch(err => console.error('[Copper] call lab report note failed:', err));
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/analyze/call/route.ts
git commit -m "feat: log Call Lab reports to Copper CRM contacts"
```

---

### Task 8: Integrate Copper into Stripe webhook (close deals)

**Files:**
- Modify: `apps/web/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Add Copper import**

At the top of the file, add after existing imports:

```typescript
import { copperCloseDeal, PRO_ACV, BUNDLE_ACV } from '@/lib/copper';
```

- [ ] **Step 2: Add Copper close deal call**

In the `checkout.session.completed` handler, after the Beehiiv `addProSubscriber(...)` call (around line 134-136), add:

```typescript
              // Copper CRM: close deal as won (fire-and-forget)
              const copperProductMap: Record<string, string> = {
                'call-lab-pro': 'Call Lab Pro',
                'discovery-lab-pro': 'Discovery Lab Pro',
                'visibility-lab-pro': 'Visibility Lab Pro',
                'growth-bundle': 'Growth Bundle',
                'growthos-bundle': 'Growth Bundle',
              };
              const copperProductName = copperProductMap[product] || product;
              const copperValue = product.includes('bundle') ? BUNDLE_ACV : PRO_ACV;

              copperCloseDeal({
                email: session.customer_email!,
                productName: copperProductName,
                monetaryValue: copperValue,
                note: `Purchased ${copperProductName} (${planType} plan) — Subscription: ${subscription.id}`,
              }).catch(err => console.error('[Copper] close deal failed:', err));
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/api/webhooks/stripe/route.ts
git commit -m "feat: close Copper deals on Stripe subscription purchase"
```

---

### Task 9: Final verification and push

- [ ] **Step 1: TypeScript check**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -E "copper|growthos|visibility|call-lab|discover|stripe"`

Expected: no errors related to our changes.

- [ ] **Step 2: Verify imports resolve**

Check that `@/lib/copper` resolves correctly by grepping for the import across all modified files:

```bash
grep -r "from '@/lib/copper'" apps/web/app/api/ apps/web/lib/
```

Expected: 7 files import from copper.ts.

- [ ] **Step 3: Push**

```
git push
```
