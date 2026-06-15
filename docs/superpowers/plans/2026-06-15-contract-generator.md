# Contract Generator + E-Sign (Firma) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An internal admin tool to fill a contract template, AI-draft a Statement of Work, render a PDF, and send it for e-signature via Firma (client signs, then WTF countersigns) with status tracked to completion.

**Architecture:** Single source of truth = our HTML templates. A pure merge engine fills `{{placeholders}}`, the existing `@repo/pdf` `htmlToPdf` renders the PDF, a thin `lib/firma.ts` client is the only seam to Firma. State lives in four Supabase tables; the signed PDF lands in a private `contracts` bucket. Webhook-first status with a manual poll backup. All new app code is admin-gated and runs server-side.

**Tech Stack:** Next.js (App Router, `apps/web`), Supabase (service-role server client), `@repo/pdf` (`htmlToPdf`), `@repo/utils` (`runModel`), `@repo/prompts`, Vitest, Firma REST API.

**Spec:** `docs/superpowers/specs/2026-06-15-contract-generator-design.md`

**Deviation from spec (intentional):** The spec named `packages/contracts/template-engine.ts`. To avoid standing up a new workspace package for one pure function used only by the web app, the merge engine lives at `apps/web/lib/contracts/template-engine.ts`. Everything else matches the spec.

**Conventions discovered (follow these):**
- Server auth: `createClient()` from `@/lib/supabase-auth-server` → `.auth.getUser()`. Admin check: `users.is_admin` via service-role client `getSupabaseServerClient()` from `@/lib/supabase-server`.
- Private file delivery: keep bucket private, mint a 60s signed URL server-side, 302 redirect (see `apps/web/app/api/client/documents/[id]/file/route.ts`).
- AI: `runModel(toolName, systemPrompt, userPrompt, options?)` from `@repo/utils`; every `toolName` MUST have a `MODEL_CONFIGS` entry in `packages/utils/ai.ts` or it throws.
- Migrations: `supabase/migrations/YYYYMMDD_name.sql`, enable RLS, add a service-role policy (see `20260613_create_wah_wah_reports.sql`).
- Tests: Vitest, colocated `*.test.ts`. `apps/web/vitest.config.ts` `include` is scoped and MUST be widened for new tests to run.

---

## Task 0: Database migration + private bucket

**Files:**
- Create: `supabase/migrations/20260615_create_contracts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Contract Generator + E-Sign (Firma).
-- Single source of truth = our HTML templates. Firma is the e-sign layer only.
-- The app talks to these tables with the service-role key, server-side, behind
-- the admin gate, so RLS exposes nothing to anon/authenticated clients.

-- Reusable contract templates (authored once from existing Word/Google docs).
create table if not exists public.contract_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  body_html     text not null,                 -- contract language with {{placeholders}} + {{sow}}
  variables     jsonb not null default '[]',   -- [{key,label,required}] drives the form
  signer_config jsonb not null default '{}',   -- default signer roles/labels
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Reusable SOW building blocks dropped into a draft.
create table if not exists public.sow_snippets (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   text not null default 'clause',   -- deliverable | clause | timeline | ...
  body_html  text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- One generated contract. merged_html + field_values are an immutable snapshot:
-- once sent, editing a template must not change in-flight contracts.
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid references public.contract_templates(id),
  title           text not null default 'Untitled contract',
  field_values    jsonb not null default '{}',
  sow_html        text not null default '',
  merged_html     text,
  pdf_path        text,
  signed_pdf_path text,
  status          text not null default 'draft', -- draft|sent|viewed|signed|completed|declined|voided
  firma_request_id text,
  last_error      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contracts_status_idx on public.contracts (status, created_at desc);

-- Per-signer status (client signs first, counter second).
create table if not exists public.contract_signers (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.contracts(id) on delete cascade,
  role            text not null,            -- client | counter
  name            text not null,
  email           text not null,
  sign_order      int  not null default 1,
  status          text not null default 'pending', -- pending|viewed|signed
  signed_at       timestamptz,
  firma_signer_id text
);

create index if not exists contract_signers_contract_idx on public.contract_signers (contract_id);

-- RLS: service-role only (app is server-side + admin-gated; nothing client-readable).
alter table public.contract_templates enable row level security;
alter table public.sow_snippets       enable row level security;
alter table public.contracts          enable row level security;
alter table public.contract_signers   enable row level security;

drop policy if exists "Service role full access contract_templates" on public.contract_templates;
create policy "Service role full access contract_templates" on public.contract_templates
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access sow_snippets" on public.sow_snippets;
create policy "Service role full access sow_snippets" on public.sow_snippets
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access contracts" on public.contracts;
create policy "Service role full access contracts" on public.contracts
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Service role full access contract_signers" on public.contract_signers;
create policy "Service role full access contract_signers" on public.contract_signers
  for all using ((select auth.role()) = 'service_role');

-- Private storage bucket for generated + signed PDFs.
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or paste into the Supabase SQL editor for the linked project).
Expected: four tables created, `contracts` bucket present in Storage. Verify with:
`select count(*) from public.contracts;` → `0` (no error).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260615_create_contracts.sql
git commit -m "feat(contracts): add contracts schema + private bucket"
```

---

## Task 1: Firma API docs spike (confirm shapes before coding the client)

**Why:** We must not invent Firma's endpoint paths, field names, or webhook signature scheme. Confirm them once, write them down, and build the client against the notes.

**Files:**
- Create: `docs/firma-api-notes.md`

- [ ] **Step 1: Read the Firma API reference**

Fetch and read these (the client uses a bearer API key + JSON):
- https://docs.firma.dev/guides/complete-setup-guide
- The API reference linked from the docs (signing requests, signers, webhooks, retrieving the signed PDF).

- [ ] **Step 2: Record the confirmed shapes**

Write `docs/firma-api-notes.md` capturing, with exact strings:
- Base URL and auth header (e.g. `Authorization: Bearer firma_test_…`).
- Create-signing-request endpoint: method, path, request body (how the PDF is attached — multipart upload vs. base64), how signers + sign order are specified.
- **Signature field placement:** does Firma detect text anchors in the PDF, or require x/y coordinates? Record the exact mechanism. (Our template carries `{{sig_client}}`, `{{sig_counter}}`, `{{date_client}}`, `{{date_counter}}` anchors — confirm how to bind them.)
- Webhook: event names for viewed/signed/completed/declined, the signature header name, and the HMAC algorithm.
- Retrieve signed document: endpoint to download the completed PDF + audit trail.
- Test vs live: how the key prefix selects the environment.

- [ ] **Step 3: Commit**

```bash
git add docs/firma-api-notes.md
git commit -m "docs(contracts): confirmed Firma API shapes for the e-sign client"
```

---

## Task 2: Template merge engine (pure, TDD)

**Files:**
- Create: `apps/web/lib/contracts/template-engine.ts`
- Test: `apps/web/lib/contracts/template-engine.test.ts`
- Modify: `apps/web/vitest.config.ts` (widen test include)

- [ ] **Step 1: Widen the vitest include so new tests run**

In `apps/web/vitest.config.ts`, change the `include` line:

```ts
    include: ["lib/wah-wah/**/*.test.ts", "lib/contracts/**/*.test.ts"],
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/web/lib/contracts/template-engine.test.ts
import { describe, it, expect } from 'vitest';
import { merge, extractVariables, SIGNATURE_ANCHORS } from './template-engine';

describe('extractVariables', () => {
  it('returns unique placeholder keys, excluding the sow slot and signature anchors', () => {
    const html = '<p>{{company_name}} at {{address}} — {{company_name}}</p>{{sow}}{{sig_client}}';
    expect(extractVariables(html)).toEqual(['address', 'company_name']);
  });
});

describe('merge', () => {
  it('substitutes field values and injects the SOW at the {{sow}} slot', () => {
    const out = merge('<h1>{{company_name}}</h1>{{sow}}', { company_name: 'Acme' }, '<p>Build stuff</p>');
    expect(out).toBe('<h1>Acme</h1><p>Build stuff</p>');
  });

  it('HTML-escapes field values to prevent injection', () => {
    const out = merge('<p>{{name}}</p>{{sow}}', { name: '<script>x</script>' }, '');
    expect(out).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });

  it('preserves signature anchors for Firma (does not treat them as missing)', () => {
    const out = merge('{{sow}}<div>{{sig_client}}</div>', {}, 'SOW');
    expect(out).toBe('SOW<div>{{sig_client}}</div>');
  });

  it('throws listing every missing required field', () => {
    expect(() => merge('{{a}} {{b}}{{sow}}', { a: 'x' }, '')).toThrowError(/missing.*b/i);
  });

  it('exposes the reserved signature anchor names', () => {
    expect(SIGNATURE_ANCHORS).toContain('sig_client');
    expect(SIGNATURE_ANCHORS).toContain('sig_counter');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run lib/contracts/template-engine.test.ts`
Expected: FAIL — `Cannot find module './template-engine'`.

- [ ] **Step 4: Write the implementation**

```ts
// apps/web/lib/contracts/template-engine.ts
//
// Pure {{placeholder}} merge for contract templates. No I/O.
//
// Reserved names are NOT user fields:
//   - {{sow}}                          → the rendered Statement of Work HTML
//   - {{sig_client}} / {{sig_counter}} → Firma signature anchors (left intact)
//   - {{date_client}} / {{date_counter}} → Firma date anchors (left intact)

export const SIGNATURE_ANCHORS = ['sig_client', 'sig_counter', 'date_client', 'date_counter'] as const;
const RESERVED = new Set<string>(['sow', ...SIGNATURE_ANCHORS]);

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** All non-reserved placeholder keys in the template, sorted and de-duplicated. */
export function extractVariables(bodyHtml: string): string[] {
  const found = new Set<string>();
  for (const m of bodyHtml.matchAll(PLACEHOLDER)) {
    const key = m[1].toLowerCase();
    if (!RESERVED.has(key)) found.add(key);
  }
  return [...found].sort();
}

/**
 * Merge field values + SOW into the template body.
 * - {{sow}} is replaced with sowHtml (already trusted, rendered HTML).
 * - {{field}} is replaced with the HTML-escaped field value.
 * - Signature/date anchors are left untouched for Firma to bind.
 * - Throws if any non-reserved, non-anchor placeholder has no value.
 */
export function merge(bodyHtml: string, fieldValues: Record<string, string>, sowHtml: string): string {
  const missing = new Set<string>();
  const out = bodyHtml.replace(PLACEHOLDER, (whole, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (key === 'sow') return sowHtml;
    if (RESERVED.has(key)) return whole; // signature/date anchors stay literal
    const value = fieldValues[key];
    if (value === undefined || value === null || value === '') {
      missing.add(key);
      return whole;
    }
    return escapeHtml(String(value));
  });
  if (missing.size > 0) {
    throw new Error(`Cannot render contract — missing required field(s): ${[...missing].sort().join(', ')}`);
  }
  return out;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run lib/contracts/template-engine.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/contracts/template-engine.ts apps/web/lib/contracts/template-engine.test.ts apps/web/vitest.config.ts
git commit -m "feat(contracts): pure template merge engine + widen vitest include"
```

---

## Task 3: SOW drafting prompt + model config (TDD on the pure prompt builder)

**Files:**
- Create: `packages/prompts/contracts/sow-draft.ts`
- Modify: `packages/prompts/index.ts` (export the new module)
- Modify: `packages/utils/ai.ts` (register `contract-sow` in `MODEL_CONFIGS`)
- Create: `apps/web/lib/contracts/sow.ts` (thin `draftSow` caller)
- Test: `apps/web/lib/contracts/sow.test.ts`

- [ ] **Step 1: Write the failing test for the prompt builder**

```ts
// apps/web/lib/contracts/sow.test.ts
import { describe, it, expect } from 'vitest';
import { buildSowUserPrompt, SOW_SYSTEM_PROMPT } from '@repo/prompts';

describe('buildSowUserPrompt', () => {
  it('includes the particulars and the client/company context', () => {
    const p = buildSowUserPrompt('2 landing pages, 3 weeks, $8k', { company_name: 'Acme', engagement: 'Web revamp' });
    expect(p).toContain('2 landing pages, 3 weeks, $8k');
    expect(p).toContain('Acme');
    expect(p).toContain('Web revamp');
  });

  it('still produces a prompt when context is empty', () => {
    expect(buildSowUserPrompt('do the thing', {})).toContain('do the thing');
  });
});

describe('SOW_SYSTEM_PROMPT', () => {
  it('instructs the model to return HTML fragments only', () => {
    expect(SOW_SYSTEM_PROMPT.toLowerCase()).toContain('html');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run lib/contracts/sow.test.ts`
Expected: FAIL — `buildSowUserPrompt` / `SOW_SYSTEM_PROMPT` not exported from `@repo/prompts`.

- [ ] **Step 3: Create the prompt module**

```ts
// packages/prompts/contracts/sow-draft.ts

export const SOW_SYSTEM_PROMPT = `You are a contracts assistant for a B2B consultancy.
You turn rough engagement particulars into a clean, professional Statement of Work.

Output rules:
- Return an HTML fragment ONLY (no <html>, <head>, or <body> wrapper, no markdown fences).
- Use <h3> for section headings and <ul>/<li> for lists.
- Include, when the particulars support them: Overview, Deliverables, Timeline, Fees & Payment, Assumptions.
- Be specific and concise. Do not invent prices, dates, or scope that were not provided.
- Do not add signature lines — those are handled by the contract template.`;

export interface SowContext {
  company_name?: string;
  engagement?: string;
  [key: string]: string | undefined;
}

/** Pure builder: rough particulars + context -> the user prompt string. */
export function buildSowUserPrompt(particulars: string, context: SowContext): string {
  const contextLines = Object.entries(context)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return [
    'Draft a Statement of Work from these particulars.',
    '',
    'PARTICULARS:',
    particulars.trim(),
    '',
    contextLines ? `CONTEXT:\n${contextLines}` : 'CONTEXT: (none provided)',
  ].join('\n');
}
```

- [ ] **Step 4: Export it from the prompts barrel**

In `packages/prompts/index.ts`, add at the end of the export list:

```ts
export * from './contracts/sow-draft';
```

- [ ] **Step 5: Register the model config**

In `packages/utils/ai.ts`, inside the `MODEL_CONFIGS` object (alongside the other entries, before the closing `};`), add:

```ts
  'contract-sow': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 4096,
    temperature: 0.3,
  },
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run lib/contracts/sow.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 7: Write the thin caller (no test — it only wires runModel)**

```ts
// apps/web/lib/contracts/sow.ts
import { runModel } from '@repo/utils';
import { SOW_SYSTEM_PROMPT, buildSowUserPrompt, type SowContext } from '@repo/prompts';

/** Draft a SOW HTML fragment from rough particulars. Server-side only. */
export async function draftSow(particulars: string, context: SowContext): Promise<string> {
  const { content } = await runModel(
    'contract-sow',
    SOW_SYSTEM_PROMPT,
    buildSowUserPrompt(particulars, context),
  );
  // Strip any stray code fences the model might add.
  return content.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
}
```

- [ ] **Step 8: Commit**

```bash
git add packages/prompts/contracts/sow-draft.ts packages/prompts/index.ts packages/utils/ai.ts apps/web/lib/contracts/sow.ts apps/web/lib/contracts/sow.test.ts
git commit -m "feat(contracts): SOW drafting prompt, model config, and caller"
```

---

## Task 4: Contract PDF wrapper

**Files:**
- Create: `apps/web/lib/contracts/contract-pdf.ts`

- [ ] **Step 1: Write the implementation**

```ts
// apps/web/lib/contracts/contract-pdf.ts
import { htmlToPdf } from '@repo/pdf';

// Print CSS for a Letter contract: readable serif body, real margins, page breaks.
const CONTRACT_CSS = `
  @page { size: Letter; margin: 1in; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 16pt; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  ul { margin: 6pt 0 6pt 18pt; }
  .sig-block { margin-top: 36pt; page-break-inside: avoid; }
`;

/**
 * Wrap merged contract HTML in a full print document and render to a PDF buffer.
 * The merged HTML still contains Firma anchors ({{sig_client}} etc.) as literal
 * text — Firma binds signature fields to them after upload.
 */
export async function renderContractPdf(mergedHtml: string): Promise<Buffer> {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${CONTRACT_CSS}</style></head><body>${mergedHtml}</body></html>`;
  return htmlToPdf(doc, { format: 'Letter' });
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors from `contract-pdf.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/contracts/contract-pdf.ts
git commit -m "feat(contracts): contract PDF render wrapper over @repo/pdf"
```

---

## Task 5: Firma client — webhook verify + status map (TDD), plus HTTP wrapper

**Files:**
- Create: `apps/web/lib/firma.ts`
- Test: `apps/web/lib/contracts/firma.test.ts`

> Build the pure, testable parts (env key selection, webhook HMAC verification, event→status mapping) with TDD. Fill the HTTP request bodies from `docs/firma-api-notes.md` (Task 1). Where this file shows a request shape, **reconcile field names/paths with the notes** before Task 7 runs against test mode.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/contracts/firma.test.ts
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhook, mapFirmaStatus } from '@/lib/firma';

describe('mapFirmaStatus', () => {
  it('maps Firma events to our contract statuses', () => {
    expect(mapFirmaStatus('document.viewed')).toBe('viewed');
    expect(mapFirmaStatus('document.signed')).toBe('signed');
    expect(mapFirmaStatus('document.completed')).toBe('completed');
    expect(mapFirmaStatus('document.declined')).toBe('declined');
  });
  it('returns null for events we do not track', () => {
    expect(mapFirmaStatus('document.created')).toBeNull();
  });
});

describe('verifyWebhook', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({ event: 'document.completed' });
  const good = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  it('accepts a correct HMAC-SHA256 signature', () => {
    expect(verifyWebhook(payload, good, secret)).toBe(true);
  });
  it('rejects a tampered signature', () => {
    expect(verifyWebhook(payload, 'deadbeef', secret)).toBe(false);
  });
  it('rejects when the payload was altered', () => {
    expect(verifyWebhook(payload + 'x', good, secret)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run lib/contracts/firma.test.ts`
Expected: FAIL — `Cannot find module '@/lib/firma'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/firma.ts
//
// The ONLY seam to Firma. Everything Firma-specific lives here.
// Request bodies/paths below are confirmed in docs/firma-api-notes.md (Task 1) —
// reconcile field names there before sending against test mode.

import crypto from 'node:crypto';

export type ContractStatus =
  | 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'declined' | 'voided';

const FIRMA_BASE_URL = 'https://api.firma.dev'; // confirm in firma-api-notes.md

/** Select test vs live key from FIRMA_ENV. */
function apiKey(): string {
  const env = (process.env.FIRMA_ENV || 'test').toLowerCase();
  const key = env === 'live' ? process.env.FIRMA_API_KEY_LIVE : process.env.FIRMA_API_KEY_TEST;
  if (!key) throw new Error(`Firma API key not set for FIRMA_ENV=${env}`);
  return key;
}

async function firmaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${FIRMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Firma ${init.method || 'GET'} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export interface FirmaSigner {
  role: 'client' | 'counter';
  name: string;
  email: string;
  order: number;
}

export interface CreateSigningRequestResult {
  requestId: string;
  signerIds: Record<string, string>; // role -> firma signer id
}

/**
 * Create a signing request from a PDF + signers.
 * Signature fields bind to the anchors embedded in the PDF (see firma-api-notes.md).
 * The exact body shape (multipart vs. base64, anchor field) comes from Task 1.
 */
export async function createSigningRequest(
  pdf: Buffer,
  signers: FirmaSigner[],
): Promise<CreateSigningRequestResult> {
  const res = await firmaFetch('/v1/signing-requests', {
    method: 'POST',
    body: JSON.stringify({
      document_base64: pdf.toString('base64'),
      signers: signers.map((s) => ({
        name: s.name,
        email: s.email,
        order: s.order,
        anchor: s.role === 'client' ? 'sig_client' : 'sig_counter',
        date_anchor: s.role === 'client' ? 'date_client' : 'date_counter',
      })),
    }),
  });
  const json = await res.json();
  const signerIds: Record<string, string> = {};
  for (const s of json.signers ?? []) signerIds[s.anchor === 'sig_client' ? 'client' : 'counter'] = s.id;
  return { requestId: json.id, signerIds };
}

export interface FirmaRequestState {
  status: ContractStatus;
  signedPdf?: Buffer; // present when completed
}

/** Fetch current request state; download the signed PDF if completed. */
export async function getRequest(requestId: string): Promise<FirmaRequestState> {
  const res = await firmaFetch(`/v1/signing-requests/${requestId}`);
  const json = await res.json();
  const status = (mapFirmaStatus(`document.${json.status}`) ?? 'sent') as ContractStatus;
  let signedPdf: Buffer | undefined;
  if (status === 'completed' && json.signed_document_url) {
    const dl = await fetch(json.signed_document_url);
    signedPdf = Buffer.from(await dl.arrayBuffer());
  }
  return { status, signedPdf };
}

export async function voidRequest(requestId: string): Promise<void> {
  await firmaFetch(`/v1/signing-requests/${requestId}/void`, { method: 'POST' });
}

/** Map a Firma event name to our status, or null if we don't track it. */
export function mapFirmaStatus(event: string): ContractStatus | null {
  switch (event) {
    case 'document.viewed': return 'viewed';
    case 'document.signed': return 'signed';
    case 'document.completed': return 'completed';
    case 'document.declined': return 'declined';
    default: return null;
  }
}

/** Constant-time HMAC-SHA256 verification of a webhook payload. */
export function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run lib/contracts/firma.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/firma.ts apps/web/lib/contracts/firma.test.ts
git commit -m "feat(contracts): Firma client with webhook verify + status mapping"
```

---

## Task 6: Service layer (createContract, generateAndSend, syncStatus)

**Files:**
- Create: `apps/web/lib/contracts/service.ts`

- [ ] **Step 1: Write the implementation**

```ts
// apps/web/lib/contracts/service.ts
//
// Orchestration: DB + merge engine + PDF + Firma. Server-side only.

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { merge } from './template-engine';
import { renderContractPdf } from './contract-pdf';
import {
  createSigningRequest, getRequest, type FirmaSigner, type ContractStatus,
} from '@/lib/firma';

const BUCKET = 'contracts';

export interface CreateContractInput {
  templateId: string;
  title: string;
  fieldValues: Record<string, string>;
  sowHtml: string;
  signers: FirmaSigner[];
  createdBy: string;
}

/** Persist a draft contract + its signers. */
export async function createContract(input: CreateContractInput): Promise<string> {
  const db = getSupabaseServerClient();
  const { data: contract, error } = await db
    .from('contracts')
    .insert({
      template_id: input.templateId,
      title: input.title,
      field_values: input.fieldValues,
      sow_html: input.sowHtml,
      status: 'draft',
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error || !contract) throw new Error(`createContract failed: ${error?.message}`);

  const rows = input.signers.map((s) => ({
    contract_id: contract.id,
    role: s.role,
    name: s.name,
    email: s.email,
    sign_order: s.order,
  }));
  const { error: sErr } = await db.from('contract_signers').insert(rows);
  if (sErr) throw new Error(`createContract signers failed: ${sErr.message}`);
  return contract.id;
}

/**
 * Render the immutable snapshot, generate the PDF, create the Firma request,
 * and advance the contract to `sent`. Idempotent: only advances on success;
 * failures leave the contract `draft` with last_error set and send nothing.
 */
export async function generateAndSend(contractId: string): Promise<void> {
  const db = getSupabaseServerClient();

  const { data: contract } = await db
    .from('contracts').select('*').eq('id', contractId).single();
  if (!contract) throw new Error('contract not found');
  if (contract.status !== 'draft') return; // already sent — no duplicate envelope

  const { data: template } = await db
    .from('contract_templates').select('body_html').eq('id', contract.template_id).single();
  if (!template) throw new Error('template not found');

  const { data: signers } = await db
    .from('contract_signers').select('*').eq('contract_id', contractId).order('sign_order');
  if (!signers?.length) throw new Error('no signers');

  try {
    const mergedHtml = merge(template.body_html, contract.field_values, contract.sow_html);
    const pdf = await renderContractPdf(mergedHtml);

    const pdfPath = `${contractId}/contract.pdf`;
    const up = await db.storage.from(BUCKET).upload(pdfPath, pdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (up.error) throw new Error(`pdf upload failed: ${up.error.message}`);

    const firmaSigners: FirmaSigner[] = signers.map((s) => ({
      role: s.role as 'client' | 'counter', name: s.name, email: s.email, order: s.sign_order,
    }));
    const { requestId, signerIds } = await createSigningRequest(pdf, firmaSigners);

    await db.from('contracts').update({
      merged_html: mergedHtml, pdf_path: pdfPath, firma_request_id: requestId,
      status: 'sent', last_error: null, updated_at: new Date().toISOString(),
    }).eq('id', contractId);

    for (const s of signers) {
      const fid = signerIds[s.role];
      if (fid) await db.from('contract_signers').update({ firma_signer_id: fid }).eq('id', s.id);
    }
  } catch (err) {
    await db.from('contracts').update({
      last_error: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    throw err;
  }
}

/** Poll-backup: pull current state from Firma and persist it (incl. signed PDF). */
export async function syncStatus(contractId: string): Promise<ContractStatus> {
  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('firma_request_id, status').eq('id', contractId).single();
  if (!contract?.firma_request_id) throw new Error('contract has no Firma request');

  const state = await getRequest(contract.firma_request_id);
  const update: Record<string, unknown> = { status: state.status, updated_at: new Date().toISOString() };

  if (state.status === 'completed' && state.signedPdf) {
    const signedPath = `${contractId}/signed.pdf`;
    const up = await db.storage.from(BUCKET).upload(signedPath, state.signedPdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (!up.error) update.signed_pdf_path = signedPath;
  }
  await db.from('contracts').update(update).eq('id', contractId);
  return state.status;
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors from `service.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/contracts/service.ts
git commit -m "feat(contracts): service layer for create/send/sync"
```

---

## Task 7: API routes (admin-gated send + sync, gated file, webhook)

**Files:**
- Create: `apps/web/lib/contracts/require-admin.ts`
- Create: `apps/web/app/api/contracts/[id]/send/route.ts`
- Create: `apps/web/app/api/contracts/[id]/sync/route.ts`
- Create: `apps/web/app/api/contracts/[id]/file/route.ts`
- Create: `apps/web/app/api/firma/webhook/route.ts`

- [ ] **Step 1: Admin guard helper**

```ts
// apps/web/lib/contracts/require-admin.ts
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/** Returns the admin user id, or null if the caller is not a logged-in admin. */
export async function requireAdmin(): Promise<string | null> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const { data: row } = await getSupabaseServerClient()
    .from('users').select('is_admin').eq('id', user.id).single();
  return row?.is_admin ? user.id : null;
}
```

- [ ] **Step 2: Send route**

```ts
// apps/web/app/api/contracts/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { generateAndSend } from '@/lib/contracts/service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    await generateAndSend(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'send failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Sync route**

```ts
// apps/web/app/api/contracts/[id]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { syncStatus } from '@/lib/contracts/service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    const status = await syncStatus(id);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'sync failed' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Gated file route (signed PDF, private bucket, 60s signed URL)**

```ts
// apps/web/app/api/contracts/[id]/file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'contracts';
const TTL = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const which = new URL(req.url).searchParams.get('which') === 'draft' ? 'pdf_path' : 'signed_pdf_path';

  const db = getSupabaseServerClient();
  const { data: contract } = await db.from('contracts').select('pdf_path, signed_pdf_path').eq('id', id).single();
  const path = contract?.[which as 'pdf_path' | 'signed_pdf_path'];
  if (!path) return NextResponse.json({ error: 'No file' }, { status: 404 });

  const { data: signed, error } = await db.storage.from(BUCKET).createSignedUrl(path, TTL);
  if (error || !signed) return NextResponse.json({ error: 'Could not sign' }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
```

- [ ] **Step 5: Webhook route (verify signature, update status, store signed PDF)**

```ts
// apps/web/app/api/firma/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyWebhook, mapFirmaStatus } from '@/lib/firma';
import { syncStatus } from '@/lib/contracts/service';

// Confirm the signature header name in docs/firma-api-notes.md (Task 1).
const SIG_HEADER = 'x-firma-signature';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get(SIG_HEADER) || '';
  const secret = process.env.FIRMA_WEBHOOK_SECRET;
  if (!secret || !verifyWebhook(raw, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(raw);
  const status = mapFirmaStatus(body.event);
  if (!status) return NextResponse.json({ ok: true }); // untracked event

  const db = getSupabaseServerClient();
  const requestId = body.signing_request_id ?? body.id; // confirm field in notes
  const { data: contract } = await db
    .from('contracts').select('id').eq('firma_request_id', requestId).single();
  if (!contract) return NextResponse.json({ ok: true }); // unknown request — ignore

  if (status === 'completed') {
    // Pull the signed PDF + audit trail via the same path as the poll backup.
    await syncStatus(contract.id);
  } else {
    await db.from('contracts').update({ status, updated_at: new Date().toISOString() }).eq('id', contract.id);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Type-check + build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/contracts/require-admin.ts apps/web/app/api/contracts apps/web/app/api/firma
git commit -m "feat(contracts): admin-gated send/sync/file routes + Firma webhook"
```

---

## Task 8: Admin UI — list + new-contract page

**Files:**
- Create: `apps/web/lib/contracts/queries.ts` (server data loaders)
- Create: `apps/web/app/admin/contracts/page.tsx` (list, server component)
- Create: `apps/web/app/admin/contracts/new/page.tsx` (server wrapper)
- Create: `apps/web/app/admin/contracts/new/NewContractForm.tsx` (client form)
- Create: `apps/web/app/api/contracts/route.ts` (create draft)
- Create: `apps/web/app/api/contracts/draft-sow/route.ts` (AI draft endpoint)
- Modify: `apps/web/app/admin/layout.tsx` (add nav link)

- [ ] **Step 1: Add the nav link**

In `apps/web/app/admin/layout.tsx`, add to the `NAV_LINKS` array:

```ts
  { href: '/admin/contracts', label: 'Contracts', icon: '▤' },
```

- [ ] **Step 2: Server data loaders**

```ts
// apps/web/lib/contracts/queries.ts
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function listContracts() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('contracts')
    .select('id, title, status, created_at, signed_pdf_path')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listActiveTemplates() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('contract_templates')
    .select('id, name, variables, body_html')
    .eq('is_active', true)
    .order('name');
  return data ?? [];
}

export async function listSnippets() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('sow_snippets')
    .select('id, label, category, body_html')
    .eq('is_active', true)
    .order('category');
  return data ?? [];
}
```

- [ ] **Step 3: Create-draft API route**

```ts
// apps/web/app/api/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { createContract } from '@/lib/contracts/service';

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  try {
    const id = await createContract({
      templateId: body.templateId,
      title: body.title,
      fieldValues: body.fieldValues,
      sowHtml: body.sowHtml,
      signers: body.signers,
      createdBy: adminId,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'create failed' }, { status: 500 });
  }
}
```

- [ ] **Step 4: AI draft-SOW API route**

```ts
// apps/web/app/api/contracts/draft-sow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { draftSow } from '@/lib/contracts/sow';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { particulars, context } = await req.json();
  try {
    const html = await draftSow(particulars ?? '', context ?? {});
    return NextResponse.json({ ok: true, html });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'draft failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: List page (server component)**

```tsx
// apps/web/app/admin/contracts/page.tsx
import Link from 'next/link';
import { listContracts } from '@/lib/contracts/queries';

const BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200', sent: 'bg-blue-900 text-blue-200',
  viewed: 'bg-indigo-900 text-indigo-200', signed: 'bg-amber-900 text-amber-200',
  completed: 'bg-emerald-900 text-emerald-200', declined: 'bg-red-900 text-red-200',
  voided: 'bg-slate-800 text-slate-400',
};

export default async function ContractsPage() {
  const contracts = await listContracts();
  return (
    <div className="p-6 md:pl-64">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Contracts</h1>
        <Link href="/admin/contracts/new" className="px-4 py-2 rounded-lg bg-[#E51B23] text-white text-sm font-medium">
          New contract
        </Link>
      </div>
      <div className="rounded-lg border border-slate-800 divide-y divide-slate-800">
        {contracts.length === 0 && <p className="p-4 text-slate-500 text-sm">No contracts yet.</p>}
        {contracts.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-white text-sm font-medium">{c.title}</p>
              <p className="text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${BADGE[c.status] ?? 'bg-slate-700'}`}>{c.status}</span>
              {c.signed_pdf_path && (
                <a href={`/api/contracts/${c.id}/file`} className="text-xs text-blue-300 underline">Signed PDF</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: New-contract server wrapper**

```tsx
// apps/web/app/admin/contracts/new/page.tsx
import { listActiveTemplates, listSnippets } from '@/lib/contracts/queries';
import NewContractForm from './NewContractForm';

export default async function NewContractPage() {
  const [templates, snippets] = await Promise.all([listActiveTemplates(), listSnippets()]);
  return (
    <div className="p-6 md:pl-64">
      <h1 className="text-xl font-bold text-white mb-6">New contract</h1>
      <NewContractForm templates={templates} snippets={snippets} />
    </div>
  );
}
```

- [ ] **Step 7: New-contract client form (the 4-step flow on one screen)**

```tsx
// apps/web/app/admin/contracts/new/NewContractForm.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Variable = { key: string; label: string; required?: boolean };
type Template = { id: string; name: string; variables: Variable[]; body_html: string };
type Snippet = { id: string; label: string; category: string; body_html: string };

export default function NewContractForm({ templates, snippets }: { templates: Template[]; snippets: Snippet[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [particulars, setParticulars] = useState('');
  const [sowHtml, setSowHtml] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [counterName, setCounterName] = useState('Tim Kilroy');
  const [counterEmail, setCounterEmail] = useState('tim@timkilroy.com');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  async function draftWithAi() {
    setBusy('Drafting…'); setError(null);
    try {
      const res = await fetch('/api/contracts/draft-sow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ particulars, context: { company_name: fields.company_name, ...fields } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSowHtml(json.html);
    } catch (e) { setError(e instanceof Error ? e.message : 'draft failed'); }
    finally { setBusy(null); }
  }

  function addSnippet(s: Snippet) { setSowHtml((prev) => `${prev}\n${s.body_html}`); }

  async function saveAndSend(send: boolean) {
    setBusy(send ? 'Generating & sending…' : 'Saving…'); setError(null);
    try {
      const create = await fetch('/api/contracts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId, title: `${fields.company_name ?? 'Contract'} — ${template?.name ?? ''}`,
          fieldValues: fields, sowHtml,
          signers: [
            { role: 'client', name: clientName, email: clientEmail, order: 1 },
            { role: 'counter', name: counterName, email: counterEmail, order: 2 },
          ],
        }),
      });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error);
      if (send) {
        const sent = await fetch(`/api/contracts/${created.id}/send`, { method: 'POST' });
        const sentJson = await sent.json();
        if (!sent.ok) throw new Error(sentJson.error);
      }
      router.push('/admin/contracts');
    } catch (e) { setError(e instanceof Error ? e.message : 'failed'); }
    finally { setBusy(null); }
  }

  const merged = useMemo(() => {
    if (!template) return '';
    let html = template.body_html.replace(/\{\{\s*sow\s*\}\}/gi, sowHtml);
    for (const [k, v] of Object.entries(fields)) html = html.replaceAll(`{{${k}}}`, v);
    return html;
  }, [template, fields, sowHtml]);

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-6xl">
      <div className="space-y-6">
        {/* 1. Template */}
        <section className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">1. Template</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm">
            <option value="">Select a template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </section>

        {/* 2. Client details (auto-generated from template variables) */}
        {template && (
          <section className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">2. Client details</label>
            {template.variables.map((v) => (
              <input key={v.key} placeholder={v.label} value={fields[v.key] ?? ''}
                onChange={(e) => setFields((f) => ({ ...f, [v.key]: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <input placeholder="Client signer name" value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
              <input placeholder="Client signer email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            </div>
          </section>
        )}

        {/* 3. SOW */}
        {template && (
          <section className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">3. Statement of Work</label>
            <textarea placeholder="Rough particulars: deliverables, timeline, price…" value={particulars}
              onChange={(e) => setParticulars(e.target.value)} rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            <button type="button" onClick={draftWithAi} disabled={!!busy}
              className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs">Draft with AI</button>
            <div className="flex flex-wrap gap-1 pt-1">
              {snippets.map((s) => (
                <button key={s.id} type="button" onClick={() => addSnippet(s)}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">+ {s.label}</button>
              ))}
            </div>
            <textarea value={sowHtml} onChange={(e) => setSowHtml(e.target.value)} rows={8}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-xs font-mono" />
          </section>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {template && (
          <div className="flex gap-2">
            <button type="button" onClick={() => saveAndSend(false)} disabled={!!busy}
              className="px-4 py-2 rounded bg-slate-700 text-white text-sm">Save draft</button>
            <button type="button" onClick={() => saveAndSend(true)} disabled={!!busy}
              className="px-4 py-2 rounded bg-[#E51B23] text-white text-sm">{busy ?? 'Generate & Send'}</button>
          </div>
        )}
      </div>

      {/* 4. Live preview */}
      <div className="md:sticky md:top-6 h-fit">
        <label className="text-sm text-slate-300 font-medium">4. Preview</label>
        <div className="mt-2 bg-white text-black rounded p-6 text-sm overflow-auto max-h-[80vh]"
          dangerouslySetInnerHTML={{ __html: merged || '<p class="text-slate-400">Select a template…</p>' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Type-check + build**

Run: `cd apps/web && npx tsc --noEmit && npm run build`
Expected: compiles; `/admin/contracts` and `/admin/contracts/new` appear in the route list.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/contracts/queries.ts apps/web/app/admin/contracts apps/web/app/api/contracts/route.ts apps/web/app/api/contracts/draft-sow apps/web/app/admin/layout.tsx
git commit -m "feat(contracts): admin contracts list + new-contract flow"
```

---

## Task 9: Seed one template + snippet, then end-to-end test in Firma test mode

**Files:**
- Create: `scripts/seed-contract-template.ts` (one-off seed)

- [ ] **Step 1: Convert one real contract into a template row**

Take one existing Word/Google contract. Convert its body to HTML, replace the variable parts with `{{placeholders}}` (e.g. `{{company_name}}`, `{{address}}`, `{{effective_date}}`, `{{fee}}`), put `{{sow}}` where the Statement of Work belongs, and place `{{sig_client}}` / `{{date_client}}` / `{{sig_counter}}` / `{{date_counter}}` in the signature block.

- [ ] **Step 2: Write the seed script**

```ts
// scripts/seed-contract-template.ts
// Run with: npx tsx scripts/seed-contract-template.ts
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const BODY_HTML = `
  <h1>Master Services Agreement</h1>
  <p>This Agreement is between WTF and {{company_name}}, located at {{address}},
     effective {{effective_date}}.</p>
  <h2>Statement of Work</h2>
  {{sow}}
  <h2>Fees</h2>
  <p>Total fee: {{fee}}.</p>
  <div class="sig-block">
    <p>Client: {{sig_client}} &nbsp; Date: {{date_client}}</p>
    <p>WTF: {{sig_counter}} &nbsp; Date: {{date_counter}}</p>
  </div>
`;

async function main() {
  await db.from('contract_templates').insert({
    name: 'Master Services Agreement',
    slug: 'msa',
    body_html: BODY_HTML,
    variables: [
      { key: 'company_name', label: 'Company name', required: true },
      { key: 'address', label: 'Address', required: true },
      { key: 'effective_date', label: 'Effective date', required: true },
      { key: 'fee', label: 'Total fee', required: true },
    ],
    signer_config: { roles: ['client', 'counter'] },
  });
  await db.from('sow_snippets').insert([
    { label: 'Weekly check-ins', category: 'clause', body_html: '<p>Weekly 30-minute check-in calls.</p>' },
    { label: 'Net-30 payment', category: 'clause', body_html: '<p>Invoices are due Net-30.</p>' },
  ]);
  console.log('Seeded MSA template + 2 snippets.');
}
main().then(() => process.exit(0));
```

- [ ] **Step 3: Run the seed**

Run: `cd /Users/timkilroy/Projects/wtf-os && npx tsx scripts/seed-contract-template.ts`
Expected: `Seeded MSA template + 2 snippets.` Verify: `select name from contract_templates;` → `Master Services Agreement`.

- [ ] **Step 4: End-to-end manual test (Firma TEST mode)**

Ensure `.env.local` has the **rotated** test key and `FIRMA_ENV=test`. Then:
1. `npm run dev`, open `/admin/contracts/new` (logged in as an admin).
2. Pick the MSA template, fill the fields + client signer (use an email you control), type particulars, click **Draft with AI**, tweak the SOW.
3. Click **Generate & Send**. Expect redirect to the list with status `sent`.
4. Confirm the test-mode envelope arrived in Firma + the signer email.
5. Complete the test signature; confirm the webhook flips status to `completed` (or click **Refresh status** / hit `/api/contracts/<id>/sync`).
6. Confirm the **Signed PDF** link on the list opens the stored signed document.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-contract-template.ts
git commit -m "chore(contracts): seed MSA template + snippets for e2e test"
```

---

## Self-Review Notes (verify before execution)

- **Spec coverage:** data model (Task 0), single-source HTML templates (Tasks 2, 9), manual client form (Task 8), AI SOW + snippets (Tasks 3, 8), 2-signer client→counter (Tasks 5, 6, 8), PDF via `@repo/pdf` (Task 4), Firma seam (Task 5), webhook-first + poll backup (Tasks 6, 7), private signed-PDF delivery (Task 7), immutable `merged_html` snapshot (Task 6), test-mode gate via `FIRMA_ENV` (Task 5), error handling leaves `draft` + `last_error` (Task 6). All covered.
- **Open dependency:** Tasks 5–7 use plausible Firma request/field/header names that **must be reconciled** with `docs/firma-api-notes.md` from Task 1 before the Task 9 live test. This is the one spec-flagged unknown (signature-anchor binding + webhook signature scheme).
- **Prerequisite:** rotated Firma test key in `.env.local`, `FIRMA_ENV=test`, `FIRMA_WEBHOOK_SECRET` set, and the Firma webhook pointed at `/api/firma/webhook` (use a tunnel for local testing).
```
