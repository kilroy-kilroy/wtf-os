# Discovery Lab Copper Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a headless agent that auto-runs Discovery Lab research when a new Copper opportunity is created, writes a condensed summary back to Copper custom fields, saves the full report to the database, and sends a Slack notification.

**Architecture:** A Vercel API route (`/api/webhooks/copper`) receives Copper webhook POSTs. It fetches opportunity/company/contact data from Copper, runs the existing Discovery Lab Pro analysis (Claude via `runModel`), saves the full report to `discovery_briefs`, writes a condensed 3-section summary to Copper custom fields, and notifies via Slack. A setup script creates the Copper custom fields and webhook registration.

**Tech Stack:** Next.js API route, Copper REST API, Claude/GPT via existing `runModel`, Supabase, Slack webhook

**Spec:** `docs/superpowers/specs/2026-04-01-discovery-lab-copper-agent-design.md`

---

## File Map

```
CREATE: supabase/migrations/20260401_add_discovery_log.sql        — discovery_log table
CREATE: scripts/copper-setup.ts                                    — One-time: create custom fields + register webhook
CREATE: apps/web/lib/copper-discovery.ts                           — Copper-specific helpers (fetch opp, write fields)
CREATE: apps/web/lib/discovery-agent.ts                            — Orchestrator (build prompt, call AI, parse response)
CREATE: apps/web/app/api/webhooks/copper/route.ts                  — Webhook handler
```

---

### Task 1: Create discovery_log table migration

**Files:**
- Create: `supabase/migrations/20260401_add_discovery_log.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Discovery Agent Log
-- Tracks automated discovery runs triggered by Copper webhooks

CREATE TABLE IF NOT EXISTS discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id BIGINT NOT NULL,
  opportunity_name TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_payload JSONB,
  output_summary JSONB,
  discovery_brief_id UUID,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discovery_log_opp ON discovery_log(opportunity_id);
CREATE INDEX idx_discovery_log_created ON discovery_log(created_at DESC);

ALTER TABLE discovery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON discovery_log
  FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Commit**

```
git add supabase/migrations/20260401_add_discovery_log.sql
git commit -m "feat: add discovery_log table for automated research tracking"
```

---

### Task 2: Create Copper setup script

**Files:**
- Create: `scripts/copper-setup.ts`

- [ ] **Step 1: Write the setup script**

This is a one-time Node.js script (run manually) that:
1. Creates 5 custom fields on the Opportunity entity via Copper API
2. Registers the webhook for new opportunities
3. Prints all the env vars you need to add to Vercel

```typescript
/**
 * One-time Copper CRM setup script.
 *
 * Run with: npx tsx scripts/copper-setup.ts
 *
 * Requires env vars: COPPER_API_KEY, COPPER_API_EMAIL
 * Optional: COPPER_WEBHOOK_SECRET (generates one if not set)
 *
 * Creates custom fields on Opportunity + registers webhook.
 * Prints env vars to add to Vercel.
 */

import { randomBytes } from 'crypto';

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

async function copperFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.COPPER_API_KEY;
  const apiEmail = process.env.COPPER_API_EMAIL;
  if (!apiKey || !apiEmail) {
    throw new Error('Set COPPER_API_KEY and COPPER_API_EMAIL env vars');
  }

  const res = await fetch(`${COPPER_API_BASE}${path}`, {
    ...options,
    headers: {
      'X-PW-AccessToken': apiKey,
      'X-PW-UserEmail': apiEmail,
      'X-PW-Application': 'developer_api',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copper API ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function createCustomField(name: string, dataType: string, options?: string[]) {
  const body: any = {
    name,
    data_type: dataType,
    available_on: ['opportunity'],
  };
  if (options) {
    body.options = options.map(o => ({ name: o }));
  }
  const result = await copperFetch('/custom_field_definitions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  console.log(`Created field "${name}" (ID: ${result.id})`);
  return result;
}

async function main() {
  console.log('=== Copper CRM Setup ===\n');

  // 1. Create custom fields
  console.log('Creating custom fields on Opportunity...\n');

  const briefField = await createCustomField('Discovery Brief', 'Text');
  const contactsField = await createCustomField('Key Contacts', 'Text');
  const startersField = await createCustomField('Conversation Starters', 'Text');
  const statusField = await createCustomField('Discovery Status', 'Dropdown', [
    'Pending', 'Running', 'Complete', 'Error',
  ]);
  const dateField = await createCustomField('Discovery Run Date', 'Date');

  // Extract dropdown option IDs
  const statusOptions = statusField.options || [];
  const pendingId = statusOptions.find((o: any) => o.name === 'Pending')?.id;
  const runningId = statusOptions.find((o: any) => o.name === 'Running')?.id;
  const completeId = statusOptions.find((o: any) => o.name === 'Complete')?.id;
  const errorId = statusOptions.find((o: any) => o.name === 'Error')?.id;

  // 2. Register webhook
  console.log('\nRegistering webhook...\n');

  const secret = process.env.COPPER_WEBHOOK_SECRET || randomBytes(32).toString('hex');
  const webhookUrl = 'https://app.timkilroy.com/api/webhooks/copper';

  const webhook = await copperFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      target: webhookUrl,
      type: 'opportunity',
      event: 'new',
      secret: { key: secret },
    }),
  });

  console.log(`Webhook registered (ID: ${webhook.id})`);

  // 3. Print env vars
  console.log('\n=== Add these env vars to Vercel ===\n');
  console.log(`COPPER_FIELD_DISCOVERY_BRIEF=${briefField.id}`);
  console.log(`COPPER_FIELD_KEY_CONTACTS=${contactsField.id}`);
  console.log(`COPPER_FIELD_CONVERSATION_STARTERS=${startersField.id}`);
  console.log(`COPPER_FIELD_DISCOVERY_STATUS=${statusField.id}`);
  console.log(`COPPER_FIELD_DISCOVERY_DATE=${dateField.id}`);
  console.log(`COPPER_STATUS_PENDING=${pendingId}`);
  console.log(`COPPER_STATUS_RUNNING=${runningId}`);
  console.log(`COPPER_STATUS_COMPLETE=${completeId}`);
  console.log(`COPPER_STATUS_ERROR=${errorId}`);
  console.log(`COPPER_WEBHOOK_SECRET=${secret}`);
  console.log('\nDone! Add these to Vercel then deploy.');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```
git add scripts/copper-setup.ts
git commit -m "feat: add Copper setup script for custom fields and webhook registration"
```

---

### Task 3: Create copper-discovery.ts (Copper-specific helpers)

**Files:**
- Create: `apps/web/lib/copper-discovery.ts`

- [ ] **Step 1: Write the Copper discovery helpers**

This module handles fetching opportunity/company/contact data from Copper and writing research results back to custom fields. It imports from the existing `apps/web/lib/copper.ts` for the base `copperFetch` — but wait, `copperFetch` is not exported. So this module will use its own fetch helper with the same pattern.

```typescript
/**
 * Copper Discovery Agent Helpers
 *
 * Fetches opportunity/company/contact data from Copper and
 * writes Discovery Lab research back to custom fields.
 */

const COPPER_API_BASE = 'https://api.copper.com/developer_api/v1';

function getHeaders(): Record<string, string> | null {
  const apiKey = process.env.COPPER_API_KEY;
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
```

- [ ] **Step 2: Commit**

```
git add apps/web/lib/copper-discovery.ts
git commit -m "feat: add Copper discovery helpers for fetching opportunities and writing results"
```

---

### Task 4: Create discovery-agent.ts (orchestrator)

**Files:**
- Create: `apps/web/lib/discovery-agent.ts`

- [ ] **Step 1: Write the discovery agent orchestrator**

This module takes Copper opportunity/company/contact data, builds a prompt, calls the AI, and returns both a condensed summary (for Copper fields) and a full markdown report (for the database).

```typescript
/**
 * Discovery Agent Orchestrator
 *
 * Takes Copper opportunity data, runs Discovery Lab analysis,
 * returns both a condensed summary (for CRM fields) and full report (for DB).
 */

import {
  runModel,
  retryWithBackoff,
  fetchCompanyNews,
} from '@repo/utils';
import {
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';
import type { CopperCompany, CopperPerson, CopperOpportunity, DiscoverySummary } from './copper-discovery';

export interface DiscoveryAgentInput {
  opportunity: CopperOpportunity;
  company: CopperCompany | null;
  contact: CopperPerson | null;
}

export interface DiscoveryAgentResult {
  summary: DiscoverySummary;
  fullMarkdown: string;
  modelUsed: string;
  durationMs: number;
  tokens: { input: number; output: number };
}

/**
 * Run Discovery Lab analysis for a Copper opportunity.
 */
export async function runDiscoveryAgent(input: DiscoveryAgentInput): Promise<DiscoveryAgentResult> {
  const startTime = Date.now();
  const { opportunity, company, contact } = input;

  const companyName = company?.name || opportunity.name;
  const companyWebsite = company?.websites?.[0]?.url || null;
  const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null;
  const contactTitle = contact?.title || null;
  const contactEmail = contact?.emails?.[0]?.email || null;

  // Fetch company news (non-blocking if it fails)
  let newsData: { recent_news: any[]; funding_info: any; raw_response: string } = {
    recent_news: [],
    funding_info: null,
    raw_response: '',
  };
  if (companyWebsite || companyName) {
    try {
      let domain: string | undefined;
      if (companyWebsite) {
        try {
          const url = new URL(companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`);
          domain = url.hostname.replace('www.', '');
        } catch {
          domain = companyWebsite.replace('www.', '').split('/')[0];
        }
      }
      newsData = await fetchCompanyNews(companyName, domain);
    } catch (err) {
      console.warn('[DiscoveryAgent] News fetch failed:', err);
    }
  }

  // Build Discovery Lab prompt
  const promptParams: DiscoveryLabPromptParams = {
    requestor_name: 'Tim Kilroy',
    requestor_email: process.env.COPPER_API_EMAIL || '',
    requestor_company: 'TimKilroy.com',
    service_offered: 'Sales coaching and consulting',
    target_company: companyName,
    target_website: companyWebsite || undefined,
    target_contact_name: contactName || undefined,
    target_contact_title: contactTitle || undefined,
    recent_news: newsData.recent_news.length > 0 ? newsData.recent_news : undefined,
    funding_info: newsData.funding_info || undefined,
  };

  const systemPrompt = DISCOVERY_LAB_PRO_SYSTEM;
  const userPrompt = DISCOVERY_LAB_PRO_USER(promptParams);

  // Run AI analysis
  let modelUsed = 'claude-sonnet-4-5-20250929';
  let tokens: { input: number; output: number };
  let markdownResponse: string;

  try {
    const response = await retryWithBackoff(async () => {
      return await runModel('discovery-agent', systemPrompt, userPrompt);
    });
    tokens = response.usage;
    markdownResponse = response.content;
  } catch (err) {
    console.error('[DiscoveryAgent] Claude failed, trying GPT-4o:', err);
    try {
      const response = await retryWithBackoff(async () => {
        return await runModel('discovery-agent', systemPrompt, userPrompt, {
          provider: 'openai',
          model: 'gpt-4o',
        });
      });
      tokens = response.usage;
      modelUsed = 'gpt-4o';
      markdownResponse = response.content;
    } catch (fallbackErr) {
      throw new Error(`AI analysis failed: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown'}`);
    }
  }

  // Generate condensed summary for Copper fields
  const summary = extractSummary(markdownResponse, companyName, contactName);

  return {
    summary,
    fullMarkdown: markdownResponse,
    modelUsed,
    durationMs: Date.now() - startTime,
    tokens,
  };
}

/**
 * Extract a condensed 3-section summary from the full markdown report.
 * Each section is max ~500 chars for Copper text fields.
 */
function extractSummary(
  markdown: string,
  companyName: string,
  contactName: string | null,
): DiscoverySummary {
  // Try to extract sections from markdown headers
  const sections = markdown.split(/^#{1,3}\s+/m);

  let brief = '';
  let keyContacts = '';
  let conversationStarters = '';

  for (const section of sections) {
    const lower = section.toLowerCase();
    const content = section.replace(/^[^\n]+\n/, '').trim();
    const truncated = content.substring(0, 500);

    if (lower.startsWith('company') || lower.startsWith('overview') || lower.startsWith('executive') || lower.startsWith('about')) {
      if (!brief) brief = truncated;
    } else if (lower.startsWith('contact') || lower.startsWith('key people') || lower.startsWith('stakeholder') || lower.startsWith('decision')) {
      if (!keyContacts) keyContacts = truncated;
    } else if (lower.startsWith('conversation') || lower.startsWith('talking') || lower.startsWith('opener') || lower.startsWith('approach')) {
      if (!conversationStarters) conversationStarters = truncated;
    }
  }

  // Fallback: if we couldn't parse sections, use first 500 chars as brief
  if (!brief) {
    brief = markdown.substring(0, 500);
  }
  if (!keyContacts && contactName) {
    keyContacts = `Primary contact: ${contactName}. See full report for detailed analysis.`;
  }
  if (!conversationStarters) {
    conversationStarters = `Research complete for ${companyName}. See full report for talking points.`;
  }

  return { brief, keyContacts, conversationStarters };
}
```

- [ ] **Step 2: Commit**

```
git add apps/web/lib/discovery-agent.ts
git commit -m "feat: add discovery agent orchestrator with AI analysis and summary extraction"
```

---

### Task 5: Create the Copper webhook handler

**Files:**
- Create: `apps/web/app/api/webhooks/copper/route.ts`

- [ ] **Step 1: Write the webhook handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  fetchOpportunity,
  fetchCompany,
  fetchPerson,
  setDiscoveryStatus,
  writeDiscoveryResults,
} from '@/lib/copper-discovery';
import { runDiscoveryAgent } from '@/lib/discovery-agent';
import { sendSlackAlert } from '@/lib/slack';

export const maxDuration = 120; // 2 minutes — research takes time

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Copper webhook payload: { ids: [123, 456], type: "opportunity", event: "new" }
    const { ids, type, event } = body;

    if (type !== 'opportunity' || event !== 'new' || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = createServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

    // Process each opportunity (usually just one)
    for (const opportunityId of ids) {
      // Dedup check: skip if we processed this opportunity in the last 5 min
      const { data: recentLog } = await (supabase as any)
        .from('discovery_log')
        .select('id')
        .eq('opportunity_id', opportunityId)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(1);

      if (recentLog && recentLog.length > 0) {
        console.log(`[CopperWebhook] Skipping duplicate for opportunity ${opportunityId}`);
        continue;
      }

      // Create log entry
      const { data: logEntry } = await (supabase as any)
        .from('discovery_log')
        .insert({
          opportunity_id: opportunityId,
          status: 'pending',
        })
        .select('id')
        .single();

      const logId = logEntry?.id;

      try {
        // Fetch opportunity data from Copper
        const opportunity = await fetchOpportunity(opportunityId);

        // Update log with opportunity name
        if (logId) {
          await (supabase as any)
            .from('discovery_log')
            .update({ opportunity_name: opportunity.name, status: 'running' })
            .eq('id', logId);
        }

        // Set Copper status to Running
        await setDiscoveryStatus(opportunityId, 'running').catch(err => {
          console.warn('[CopperWebhook] Failed to set Running status:', err);
        });

        // Fetch related company and contact
        const company = opportunity.company_id
          ? await fetchCompany(opportunity.company_id).catch(() => null)
          : null;

        const contact = opportunity.primary_contact_id
          ? await fetchPerson(opportunity.primary_contact_id).catch(() => null)
          : null;

        const companyName = company?.name || opportunity.name;

        // Update log with company name
        if (logId) {
          await (supabase as any)
            .from('discovery_log')
            .update({
              company_name: companyName,
              input_payload: { opportunity, company, contact },
            })
            .eq('id', logId);
        }

        // Run Discovery Lab analysis
        const result = await runDiscoveryAgent({ opportunity, company, contact });

        // Save full report to discovery_briefs
        const contactEmail = contact?.emails?.[0]?.email || null;
        const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null;

        const { data: briefRecord } = await (supabase as any)
          .from('discovery_briefs')
          .insert({
            user_id: null,
            lead_email: contactEmail,
            lead_name: contactName,
            lead_company: companyName,
            version: 'pro',
            what_you_sell: 'Sales coaching and consulting',
            target_company: companyName,
            target_contact_name: contactName,
            target_contact_title: contact?.title || null,
            target_company_url: company?.websites?.[0]?.url || null,
            markdown_response: result.fullMarkdown,
            metadata: {
              source: 'copper_webhook',
              opportunity_id: opportunityId,
              copper_company_id: opportunity.company_id,
              model: result.modelUsed,
              tokens: result.tokens,
              duration_ms: result.durationMs,
            },
          })
          .select('id')
          .single();

        const reportId = briefRecord?.id;
        const reportUrl = reportId ? `${appUrl}/discovery-lab/report/${reportId}?admin=1` : null;

        // Write condensed summary back to Copper custom fields
        await writeDiscoveryResults(opportunityId, result.summary, reportUrl);

        // Update log
        if (logId) {
          await (supabase as any)
            .from('discovery_log')
            .update({
              status: 'complete',
              output_summary: result.summary,
              discovery_brief_id: reportId,
              duration_ms: result.durationMs,
            })
            .eq('id', logId);
        }

        // Slack notification
        sendSlackAlert({
          text: `Discovery brief ready for *${companyName}* — ${opportunity.name}`,
          color: 'success',
          fields: [
            { title: 'Company', value: companyName, short: true },
            { title: 'Contact', value: contactName || 'N/A', short: true },
            { title: 'Duration', value: `${Math.round(result.durationMs / 1000)}s`, short: true },
            { title: 'Model', value: result.modelUsed, short: true },
          ],
          linkUrl: reportUrl || undefined,
          linkText: 'View Full Report',
        });

        console.log(`[CopperWebhook] Discovery complete for ${companyName} (${result.durationMs}ms)`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[CopperWebhook] Error processing opportunity ${opportunityId}:`, errorMsg);

        // Update Copper status to Error
        await setDiscoveryStatus(opportunityId, 'error').catch(() => {});

        // Update log
        if (logId) {
          await (supabase as any)
            .from('discovery_log')
            .update({ status: 'error', error_message: errorMsg })
            .eq('id', logId);
        }

        // Slack error alert
        sendSlackAlert({
          text: `Discovery agent failed for opportunity ${opportunityId}: ${errorMsg}`,
          color: 'danger',
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[CopperWebhook] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```
git add apps/web/app/api/webhooks/copper/route.ts
git commit -m "feat: add Copper webhook handler for automated Discovery Lab research"
```

---

### Task 6: Final verification and push

- [ ] **Step 1: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -E "copper-discovery|discovery-agent|webhooks/copper"
```

Expected: no errors.

- [ ] **Step 2: Verify all files exist**

```bash
ls -la apps/web/lib/copper-discovery.ts apps/web/lib/discovery-agent.ts apps/web/app/api/webhooks/copper/route.ts scripts/copper-setup.ts supabase/migrations/20260401_add_discovery_log.sql
```

- [ ] **Step 3: Push**

```
git push
```

- [ ] **Step 4: Post-deploy setup instructions**

After deploy, run the setup script:
1. `npx tsx scripts/copper-setup.ts` (with COPPER_API_KEY and COPPER_API_EMAIL env vars set)
2. Copy the printed env vars to Vercel (`vercel env add` for each)
3. Apply the `discovery_log` migration via Supabase dashboard
4. Test by creating a new opportunity in Copper
