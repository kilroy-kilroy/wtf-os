# Unified Person Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give WTF-OS a per-person view where email, calls, and assessments appear on one auto-connected timeline, with an AI "where we are / next step" summary.

**Architecture:** Smart writes, dumb reads. A single `resolveContact()` turns any email string into the one canonical `contacts` row; every source (assessments inline, Fireflies calls + Copper emails via a 3-hour cron) then upserts an idempotent row into one `timeline_events` join table. The `/person/[id]` page is a single query plus a cached summary. Existing source tables are never altered — the join lives entirely in `timeline_events`.

**Tech Stack:** Next.js 14 App Router, TypeScript (strict), Supabase (Postgres, service-role server client), Turborepo, Vitest, Vercel Cron.

## Global Constraints

- **Test runner:** Vitest. Run a single file with `cd apps/web && npx vitest run <path>`. Tests are co-located as `*.test.ts` next to the source file.
- **Migrations:** SQL files in `supabase/migrations/`, named `YYYYMMDD_<description>.sql`.
- **Server DB access:** `import { createServerClient } from '@repo/db/client'` (service role; bypasses RLS). Type is `import type { SupabaseClient } from '@repo/db'`.
- **New tables not in generated types:** access with `(supabase as any).from('table_name')` — same pattern the Copper webhook already uses for `discovery_log`. Do NOT regenerate `packages/db/types.ts` in this plan.
- **Cron auth:** GET route; reject unless `request.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET` (when `CRON_SECRET` is set). Register in `apps/web/vercel.json` under `crons`.
- **Email source in v1 is Copper, not Gmail.** No Gmail sync, no company roll-up view, no webhooks — all deferred.
- **Commit** after each task with a `feat:`/`chore:` message.

---

## File Structure

**Create:**
- `supabase/migrations/20260709_create_timeline_events.sql` — the three new tables
- `apps/web/lib/timeline/identity.ts` — pure helpers (normalize/derive/free-mail)
- `apps/web/lib/timeline/identity.test.ts`
- `apps/web/lib/timeline/resolve-contact.ts` — `resolveContact()`
- `apps/web/lib/timeline/resolve-contact.test.ts`
- `apps/web/lib/timeline/emit-event.ts` — `emitTimelineEvent()`
- `apps/web/lib/timeline/emit-event.test.ts`
- `apps/web/lib/timeline/summary.ts` — `generateContactSummary()`
- `apps/web/lib/timeline/summary.test.ts`
- `apps/web/lib/copper-emails.ts` — `fetchRecentCopperEmails()`
- `apps/web/app/api/admin/timeline/backfill/route.ts` — one-time backfill (admin POST)
- `apps/web/app/person/[id]/page.tsx` — Person View
- `apps/web/app/person/page.tsx` — search/recent-contacts entry point
- `apps/web/app/api/person/[id]/refresh-summary/route.ts` — Refresh button endpoint
- `apps/web/app/api/cron/timeline-sync/route.ts` — 3-hour Fireflies + Copper sync

**Modify:**
- `apps/web/app/api/analyze/biz-dev/route.ts` — inline emit on completion
- `apps/web/app/api/analyze/discovery/route.ts` — inline emit on completion
- `apps/web/app/api/growthos/route.ts` — inline emit on completion
- `apps/web/vercel.json` — add the `timeline-sync` cron

---

## Task 1: Schema — timeline_events, contact_summaries, sync_state

**Files:**
- Create: `supabase/migrations/20260709_create_timeline_events.sql`

**Interfaces:**
- Produces (used by every later task):
  - `timeline_events(id, contact_id, company_id, deal_id, source_type, source_id, occurred_at, title, summary, payload, created_at)` with `unique (source_type, source_id)`.
  - `contact_summaries(contact_id pk, summary, next_step, generated_at, source_hash)`.
  - `sync_state(source pk, last_synced_at, updated_at)`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260709_create_timeline_events.sql
-- Unified person timeline: join layer + cached summaries + cron high-water marks.

create table if not exists timeline_events (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,
  company_id   uuid references companies(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  source_type  text not null check (source_type in ('email','call','assessment','discovery')),
  source_id    text not null,
  occurred_at  timestamptz not null,
  title        text not null,
  summary      text,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists idx_timeline_events_contact
  on timeline_events (contact_id, occurred_at desc);

create table if not exists contact_summaries (
  contact_id   uuid primary key references contacts(id) on delete cascade,
  summary      text not null default '',
  next_step    text not null default '',
  generated_at timestamptz not null default now(),
  source_hash  text
);

create table if not exists sync_state (
  source         text primary key,           -- 'fireflies' | 'copper_email'
  last_synced_at timestamptz,
  updated_at     timestamptz not null default now()
);

-- Service role (server client) bypasses RLS; enable it so nothing is
-- accidentally exposed via the anon key.
alter table timeline_events   enable row level security;
alter table contact_summaries enable row level security;
alter table sync_state        enable row level security;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push` (or paste the SQL into the Supabase SQL editor for the project).
Expected: three tables created, no errors.

- [ ] **Step 3: Verify tables exist**

Run this query in the Supabase SQL editor:
```sql
select table_name from information_schema.tables
where table_name in ('timeline_events','contact_summaries','sync_state');
```
Expected: 3 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260709_create_timeline_events.sql
git commit -m "feat(timeline): schema for timeline_events, contact_summaries, sync_state"
```

---

## Task 2: Pure identity helpers

**Files:**
- Create: `apps/web/lib/timeline/identity.ts`
- Test: `apps/web/lib/timeline/identity.test.ts`

**Interfaces:**
- Produces (used by `resolveContact` in Task 3):
  - `normalizeEmail(email: string | null | undefined): string | null` — lowercased, trimmed, or `null` if not a valid `local@domain`.
  - `deriveDomain(email: string): string | null` — the domain part of a normalized email, else `null`.
  - `isFreeMailDomain(domain: string): boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/timeline/identity.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeEmail, deriveDomain, isFreeMailDomain } from './identity';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Tim@Example.COM ')).toBe('tim@example.com');
  });
  it('rejects strings without a single @domain', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('a@b@c.com')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('deriveDomain', () => {
  it('returns the domain', () => {
    expect(deriveDomain('tim@acme.co')).toBe('acme.co');
  });
  it('returns null for junk', () => {
    expect(deriveDomain('nope')).toBeNull();
  });
});

describe('isFreeMailDomain', () => {
  it('flags consumer providers', () => {
    expect(isFreeMailDomain('gmail.com')).toBe(true);
    expect(isFreeMailDomain('outlook.com')).toBe(true);
  });
  it('does not flag business domains', () => {
    expect(isFreeMailDomain('acme.co')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/identity.test.ts`
Expected: FAIL — cannot find module `./identity`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/timeline/identity.ts
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com',
  'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'mac.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com',
]);

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  // exactly one @, non-empty local part, domain with a dot
  const match = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(trimmed);
  return match ? trimmed : null;
}

export function deriveDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return normalized.split('@')[1] ?? null;
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.trim().toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/identity.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/timeline/identity.ts apps/web/lib/timeline/identity.test.ts
git commit -m "feat(timeline): pure email identity helpers"
```

---

## Task 3: resolveContact

**Files:**
- Create: `apps/web/lib/timeline/resolve-contact.ts`
- Test: `apps/web/lib/timeline/resolve-contact.test.ts`

**Interfaces:**
- Consumes: `normalizeEmail`, `deriveDomain`, `isFreeMailDomain` (Task 2); `SupabaseClient` from `@repo/db`.
- Produces (used by every emit call site):
  - `resolveContact(supabase: SupabaseClient, email: string | null | undefined, opts?: { name?: string; companyName?: string; url?: string }): Promise<{ id: string; company_id: string | null } | null>` — returns the canonical contact (creating contact and, for business domains, company as needed), or `null` when the email is unusable.

Behavior: normalize email → if null, return null. Look up `contacts` by email (case-insensitive; store normalized). If found, return it. If not, resolve/create company first (business domains only), then insert the contact linked to it.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/timeline/resolve-contact.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveContact } from './resolve-contact';

// Minimal chainable Supabase stub. Each table gets a scripted single-row result.
function stubClient(script: {
  contactByEmail?: any;
  insertedContact?: any;
  companyByDomain?: any;
  insertedCompany?: any;
}) {
  const calls: any[] = [];
  const client: any = {
    from(table: string) {
      const ctx: any = { table, _eq: {} };
      const api: any = {
        select: () => api,
        eq: (col: string, val: any) => { ctx._eq[col] = val; return api; },
        ilike: (col: string, val: any) => { ctx._eq[col] = val; return api; },
        limit: () => api,
        maybeSingle: async () => {
          calls.push({ op: 'select', ...ctx });
          if (table === 'contacts') return { data: script.contactByEmail ?? null, error: null };
          if (table === 'companies') return { data: script.companyByDomain ?? null, error: null };
          return { data: null, error: null };
        },
        insert: (row: any) => {
          calls.push({ op: 'insert', table, row });
          return {
            select: () => ({
              single: async () => ({
                data: table === 'contacts' ? script.insertedContact : script.insertedCompany,
                error: null,
              }),
            }),
          };
        },
      };
      return api;
    },
    _calls: calls,
  };
  return client;
}

describe('resolveContact', () => {
  it('returns null for an unusable email', async () => {
    const client = stubClient({});
    expect(await resolveContact(client, 'garbage')).toBeNull();
  });

  it('returns the existing contact without inserting', async () => {
    const client = stubClient({ contactByEmail: { id: 'c1', company_id: 'co1' } });
    const result = await resolveContact(client, 'Tim@Acme.co');
    expect(result).toEqual({ id: 'c1', company_id: 'co1' });
    expect(client._calls.some((c: any) => c.op === 'insert')).toBe(false);
  });

  it('creates company + contact for a new business email', async () => {
    const client = stubClient({
      contactByEmail: null,
      companyByDomain: null,
      insertedCompany: { id: 'coNew' },
      insertedContact: { id: 'cNew', company_id: 'coNew' },
    });
    const result = await resolveContact(client, 'jane@newco.com', { name: 'Jane' });
    expect(result).toEqual({ id: 'cNew', company_id: 'coNew' });
    const inserts = client._calls.filter((c: any) => c.op === 'insert');
    expect(inserts.map((i: any) => i.table)).toEqual(['companies', 'contacts']);
  });

  it('does NOT create a company for a free-mail address', async () => {
    const client = stubClient({
      contactByEmail: null,
      insertedContact: { id: 'cNew', company_id: null },
    });
    const result = await resolveContact(client, 'someone@gmail.com', { name: 'Someone' });
    expect(result).toEqual({ id: 'cNew', company_id: null });
    const inserts = client._calls.filter((c: any) => c.op === 'insert');
    expect(inserts.map((i: any) => i.table)).toEqual(['contacts']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/resolve-contact.test.ts`
Expected: FAIL — cannot find module `./resolve-contact`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/timeline/resolve-contact.ts
import type { SupabaseClient } from '@repo/db';
import { normalizeEmail, deriveDomain, isFreeMailDomain } from './identity';

type Contact = { id: string; company_id: string | null };

async function resolveCompany(
  supabase: any,
  domain: string,
  opts: { companyName?: string; url?: string },
): Promise<string | null> {
  // Match an existing company by its url containing the domain.
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('url', `%${domain}%`)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('companies')
    .insert({ name: opts.companyName || domain, url: opts.url || `https://${domain}` })
    .select('id')
    .single();
  if (error || !created) return null;
  return created.id;
}

export async function resolveContact(
  supabase: SupabaseClient,
  email: string | null | undefined,
  opts: { name?: string; companyName?: string; url?: string } = {},
): Promise<Contact | null> {
  const db = supabase as any;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data: existing } = await db
    .from('contacts')
    .select('id, company_id')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();
  if (existing) return { id: existing.id, company_id: existing.company_id ?? null };

  const domain = deriveDomain(normalized);
  let companyId: string | null = null;
  if (domain && !isFreeMailDomain(domain)) {
    companyId = await resolveCompany(db, domain, opts);
  }

  const { data: created, error } = await db
    .from('contacts')
    .insert({
      email: normalized,
      name: opts.name || normalized,
      company_id: companyId,
    })
    .select('id, company_id')
    .single();
  if (error || !created) return null;
  return { id: created.id, company_id: created.company_id ?? null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/resolve-contact.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/timeline/resolve-contact.ts apps/web/lib/timeline/resolve-contact.test.ts
git commit -m "feat(timeline): resolveContact email-to-canonical-contact resolver"
```

---

## Task 4: emitTimelineEvent

**Files:**
- Create: `apps/web/lib/timeline/emit-event.ts`
- Test: `apps/web/lib/timeline/emit-event.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient`.
- Produces (used by assessment routes, backfill, and both crons):
  - `type TimelineEventInput = { contactId: string; companyId?: string | null; dealId?: string | null; sourceType: 'email' | 'call' | 'assessment' | 'discovery'; sourceId: string; occurredAt: string; title: string; summary?: string; payload?: Record<string, unknown> }`
  - `emitTimelineEvent(supabase: SupabaseClient, e: TimelineEventInput): Promise<void>` — idempotent upsert on `(source_type, source_id)`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/timeline/emit-event.test.ts
import { describe, it, expect } from 'vitest';
import { emitTimelineEvent } from './emit-event';

function stubClient() {
  const upserts: any[] = [];
  const client: any = {
    from() {
      return {
        upsert: (row: any, opts: any) => {
          upserts.push({ row, opts });
          return Promise.resolve({ error: null });
        },
      };
    },
    _upserts: upserts,
  };
  return client;
}

describe('emitTimelineEvent', () => {
  it('upserts a row keyed on source_type+source_id', async () => {
    const client = stubClient();
    await emitTimelineEvent(client, {
      contactId: 'c1',
      sourceType: 'assessment',
      sourceId: 'a1',
      occurredAt: '2026-07-09T00:00:00Z',
      title: 'GrowthOS assessment',
    });
    expect(client._upserts).toHaveLength(1);
    const { row, opts } = client._upserts[0];
    expect(row.contact_id).toBe('c1');
    expect(row.source_type).toBe('assessment');
    expect(row.source_id).toBe('a1');
    expect(row.title).toBe('GrowthOS assessment');
    expect(row.payload).toEqual({});
    expect(opts.onConflict).toBe('source_type,source_id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/emit-event.test.ts`
Expected: FAIL — cannot find module `./emit-event`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/timeline/emit-event.ts
import type { SupabaseClient } from '@repo/db';

export type TimelineEventInput = {
  contactId: string;
  companyId?: string | null;
  dealId?: string | null;
  sourceType: 'email' | 'call' | 'assessment' | 'discovery';
  sourceId: string;
  occurredAt: string; // ISO timestamp
  title: string;
  summary?: string;
  payload?: Record<string, unknown>;
};

export async function emitTimelineEvent(
  supabase: SupabaseClient,
  e: TimelineEventInput,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('timeline_events')
    .upsert(
      {
        contact_id: e.contactId,
        company_id: e.companyId ?? null,
        deal_id: e.dealId ?? null,
        source_type: e.sourceType,
        source_id: e.sourceId,
        occurred_at: e.occurredAt,
        title: e.title,
        summary: e.summary ?? null,
        payload: e.payload ?? {},
      },
      { onConflict: 'source_type,source_id' },
    );
  if (error) {
    console.error('[timeline] emitTimelineEvent failed', error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/emit-event.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/timeline/emit-event.ts apps/web/lib/timeline/emit-event.test.ts
git commit -m "feat(timeline): idempotent emitTimelineEvent upsert"
```

---

## Task 5: Inline emit on assessments + one-time backfill

Assessments are the fastest payoff — they already live in Supabase, so wiring emit + backfill lights up the timeline before any cron exists.

**Files:**
- Modify: `apps/web/app/api/analyze/biz-dev/route.ts` (after the `biz_dev_assessments` insert)
- Modify: `apps/web/app/api/analyze/discovery/route.ts` (after the `discovery_briefs` insert)
- Modify: `apps/web/app/api/growthos/route.ts` (after the `assessments` insert)
- Create: `apps/web/app/api/admin/timeline/backfill/route.ts`
- Create: `apps/web/lib/timeline/emit-assessment.ts` (shared helper so all three routes + backfill call one thing)
- Test: `apps/web/lib/timeline/emit-assessment.test.ts`

**Interfaces:**
- Consumes: `resolveContact` (Task 3), `emitTimelineEvent` (Task 4).
- Produces:
  - `emitAssessmentEvent(supabase, row, kind): Promise<void>` where
    `row: { id: string; email?: string | null; name?: string | null; company_name?: string | null; website_url?: string | null; created_at?: string | null; score?: number | null }`
    and `kind: 'biz_dev' | 'discovery' | 'growthos'`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/timeline/emit-assessment.test.ts
import { describe, it, expect, vi } from 'vitest';

const resolveContact = vi.fn();
const emitTimelineEvent = vi.fn();
vi.mock('./resolve-contact', () => ({ resolveContact }));
vi.mock('./emit-event', () => ({ emitTimelineEvent }));

import { emitAssessmentEvent } from './emit-assessment';

describe('emitAssessmentEvent', () => {
  it('resolves the contact then emits an assessment event', async () => {
    resolveContact.mockResolvedValue({ id: 'c1', company_id: 'co1' });
    emitTimelineEvent.mockResolvedValue(undefined);
    await emitAssessmentEvent({} as any, {
      id: 'a1', email: 'jane@acme.co', name: 'Jane',
      created_at: '2026-07-09T00:00:00Z', score: 68,
    }, 'biz_dev');
    expect(resolveContact).toHaveBeenCalledWith({}, 'jane@acme.co',
      { name: 'Jane', companyName: undefined, url: undefined });
    const emit = emitTimelineEvent.mock.calls[0][1];
    expect(emit.sourceType).toBe('assessment');
    expect(emit.sourceId).toBe('biz_dev:a1');
    expect(emit.contactId).toBe('c1');
    expect(emit.title).toContain('Biz Dev');
  });

  it('no-ops when the email cannot resolve', async () => {
    resolveContact.mockResolvedValue(null);
    emitTimelineEvent.mockClear();
    await emitAssessmentEvent({} as any, { id: 'a2', email: null }, 'growthos');
    expect(emitTimelineEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/emit-assessment.test.ts`
Expected: FAIL — cannot find module `./emit-assessment`.

- [ ] **Step 3: Write the shared helper**

```typescript
// apps/web/lib/timeline/emit-assessment.ts
import type { SupabaseClient } from '@repo/db';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent } from './emit-event';

type Kind = 'biz_dev' | 'discovery' | 'growthos';
type Row = {
  id: string;
  email?: string | null;
  name?: string | null;
  company_name?: string | null;
  website_url?: string | null;
  created_at?: string | null;
  score?: number | null;
};

const LABEL: Record<Kind, string> = {
  biz_dev: 'Biz Dev assessment',
  discovery: 'Discovery brief',
  growthos: 'GrowthOS assessment',
};

export async function emitAssessmentEvent(
  supabase: SupabaseClient,
  row: Row,
  kind: Kind,
): Promise<void> {
  const contact = await resolveContact(supabase, row.email, {
    name: row.name || undefined,
    companyName: row.company_name || undefined,
    url: row.website_url || undefined,
  });
  if (!contact) return;

  const title = row.score != null ? `${LABEL[kind]} — ${row.score}` : LABEL[kind];
  await emitTimelineEvent(supabase, {
    contactId: contact.id,
    companyId: contact.company_id,
    sourceType: kind === 'discovery' ? 'discovery' : 'assessment',
    sourceId: `${kind}:${row.id}`,
    occurredAt: row.created_at || new Date().toISOString(),
    title,
    payload: { kind, assessmentId: row.id },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/emit-assessment.test.ts`
Expected: PASS (2 cases).

- [ ] **Step 5: Wire emit into the three assessment routes**

In `apps/web/app/api/analyze/biz-dev/route.ts`, find where the `biz_dev_assessments` row is inserted and its `id` is available, then add (using the same `supabase` server client already in scope, and the row's `email`, `name`, `company_name`, `website_url`, `composite_score`, `created_at`):

```typescript
import { emitAssessmentEvent } from '@/lib/timeline/emit-assessment';
// ...after the insert returns `saved` (the inserted row with id):
await emitAssessmentEvent(supabase, {
  id: saved.id, email: saved.email, name: saved.name,
  company_name: saved.company_name, website_url: saved.website_url,
  created_at: saved.created_at, score: saved.composite_score,
}, 'biz_dev');
```

In `apps/web/app/api/analyze/discovery/route.ts`, after the `discovery_briefs` insert returns the row:

```typescript
import { emitAssessmentEvent } from '@/lib/timeline/emit-assessment';
await emitAssessmentEvent(supabase, {
  id: brief.id, email: brief.lead_email, name: brief.lead_name,
  company_name: brief.lead_company, created_at: brief.created_at,
}, 'discovery');
```

In `apps/web/app/api/growthos/route.ts`, after the `assessments` insert (email lives in `intake_data`):

```typescript
import { emitAssessmentEvent } from '@/lib/timeline/emit-assessment';
const intake = (saved.intake_data ?? {}) as any;
await emitAssessmentEvent(supabase, {
  id: saved.id, email: intake.email, name: intake.name,
  company_name: intake.company_name || intake.agency_name,
  website_url: intake.website_url,
  created_at: saved.created_at, score: saved.overall_score,
}, 'growthos');
```

Wrap each call in try/catch (or rely on `emitTimelineEvent` swallowing errors) so a timeline failure never breaks assessment delivery.

- [ ] **Step 6: Write the backfill route**

```typescript
// apps/web/app/api/admin/timeline/backfill/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { emitAssessmentEvent } from '@/lib/timeline/emit-assessment';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerClient();
  const db = supabase as any;
  let count = 0;

  const biz = (await db.from('biz_dev_assessments')
    .select('id, email, name, company_name, website_url, created_at, composite_score')).data || [];
  for (const r of biz) {
    await emitAssessmentEvent(supabase, { ...r, score: r.composite_score }, 'biz_dev');
    count++;
  }

  const disc = (await db.from('discovery_briefs')
    .select('id, lead_email, lead_name, lead_company, created_at')).data || [];
  for (const r of disc) {
    await emitAssessmentEvent(supabase, {
      id: r.id, email: r.lead_email, name: r.lead_name,
      company_name: r.lead_company, created_at: r.created_at,
    }, 'discovery');
    count++;
  }

  const growth = (await db.from('assessments')
    .select('id, intake_data, created_at, overall_score')).data || [];
  for (const r of growth) {
    const intake = r.intake_data || {};
    await emitAssessmentEvent(supabase, {
      id: r.id, email: intake.email, name: intake.name,
      company_name: intake.company_name || intake.agency_name,
      website_url: intake.website_url, created_at: r.created_at, score: r.overall_score,
    }, 'growthos');
    count++;
  }

  return NextResponse.json({ ok: true, processed: count });
}
```

- [ ] **Step 7: Run the backfill once and verify**

Run (replace SECRET and host):
```bash
curl -X POST https://app.timkilroy.com/api/admin/timeline/backfill \
  -H "Authorization: Bearer $CRON_SECRET"
```
Then in Supabase SQL editor:
```sql
select source_type, count(*) from timeline_events group by 1;
```
Expected: non-zero `assessment` and `discovery` counts.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/timeline/emit-assessment.ts apps/web/lib/timeline/emit-assessment.test.ts \
  apps/web/app/api/analyze/biz-dev/route.ts apps/web/app/api/analyze/discovery/route.ts \
  apps/web/app/api/growthos/route.ts apps/web/app/api/admin/timeline/backfill/route.ts
git commit -m "feat(timeline): emit assessment events inline + one-time backfill"
```

---

## Task 6: Person View page + entry point

**Files:**
- Create: `apps/web/app/person/[id]/page.tsx`
- Create: `apps/web/app/person/page.tsx`

**Interfaces:**
- Consumes: `timeline_events`, `contacts`, `companies`, `contact_summaries` tables.
- Produces: browsable `/person` (search + recent) and `/person/[id]` (header + summary card + timeline).

Note: these are server components that query with `createServerClient()`. No unit test (rendering/data-fetch page); verified by loading in the browser.

- [ ] **Step 1: Write the person detail page**

```tsx
// apps/web/app/person/[id]/page.tsx
import { createServerClient } from '@repo/db/client';
import { notFound } from 'next/navigation';

const ICON: Record<string, string> = {
  email: '📧', call: '📞', assessment: '📋', discovery: '🔎',
};

export default async function PersonPage({ params }: { params: { id: string } }) {
  const db = createServerClient() as any;

  const { data: contact } = await db
    .from('contacts')
    .select('id, name, email, role, buyer_type, company_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!contact) notFound();

  const { data: company } = contact.company_id
    ? await db.from('companies').select('name, url').eq('id', contact.company_id).maybeSingle()
    : { data: null };

  const { data: summary } = await db
    .from('contact_summaries')
    .select('summary, next_step, generated_at')
    .eq('contact_id', params.id)
    .maybeSingle();

  const { data: events } = await db
    .from('timeline_events')
    .select('id, source_type, title, summary, occurred_at')
    .eq('contact_id', params.id)
    .order('occurred_at', { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{contact.name}</h1>
        <p className="text-muted-foreground">
          {company?.data?.name ?? company?.name ?? ''}{contact.role ? ` · ${contact.role}` : ''}
          {contact.buyer_type ? ` · ${contact.buyer_type}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      </header>

      <section className="rounded-lg border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Where we are / Next step</h2>
          <form action={`/api/person/${params.id}/refresh-summary`} method="post">
            <button className="text-sm underline" type="submit">Refresh</button>
          </form>
        </div>
        {summary ? (
          <>
            <p className="mt-2 whitespace-pre-wrap">{summary.summary}</p>
            <p className="mt-2 font-medium">Next: {summary.next_step}</p>
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">No summary yet — click Refresh.</p>
        )}
      </section>

      <section className="space-y-3">
        {(events ?? []).map((e: any) => (
          <div key={e.id} className="flex gap-3 border-b pb-3">
            <div className="text-xl">{ICON[e.source_type] ?? '•'}</div>
            <div>
              <div className="font-medium">{e.title}</div>
              {e.summary && <div className="text-sm text-muted-foreground">{e.summary}</div>}
              <div className="text-xs text-muted-foreground">
                {new Date(e.occurred_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {(events ?? []).length === 0 && (
          <p className="text-muted-foreground">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the entry-point page (search + recent)**

```tsx
// apps/web/app/person/page.tsx
import { createServerClient } from '@repo/db/client';
import Link from 'next/link';

export default async function PeopleIndex({
  searchParams,
}: { searchParams: { q?: string } }) {
  const db = createServerClient() as any;
  const q = searchParams.q?.trim();

  let contacts: any[] = [];
  if (q) {
    const { data } = await db.from('contacts')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(25);
    contacts = data ?? [];
  } else {
    // recently active: contacts with the newest timeline events
    const { data } = await db.from('timeline_events')
      .select('contact_id, occurred_at, contacts(id, name, email)')
      .order('occurred_at', { ascending: false })
      .limit(50);
    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.contacts && !seen.has(row.contact_id)) {
        seen.add(row.contact_id);
        contacts.push(row.contacts);
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">People</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={q ?? ''} placeholder="Search name or email"
          className="border rounded px-3 py-2 flex-1" />
        <button className="border rounded px-3">Search</button>
      </form>
      <ul className="divide-y">
        {contacts.map((c) => (
          <li key={c.id} className="py-2">
            <Link href={`/person/${c.id}`} className="hover:underline">
              {c.name} <span className="text-muted-foreground text-sm">{c.email}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `cd apps/web && npm run dev`
Visit `http://localhost:3000/person` → recent contacts appear (populated by the Task 5 backfill).
Click one → header + timeline of assessment/discovery events render, newest first.
Expected: a real person shows their assessment history on one page.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/person
git commit -m "feat(timeline): person view page + people search entry point"
```

---

## Task 7: Fireflies call sync (cron)

**Files:**
- Create: `apps/web/app/api/cron/timeline-sync/route.ts`
- Create: `apps/web/lib/timeline/fireflies-sync.ts`
- Test: `apps/web/lib/timeline/fireflies-sync.test.ts`
- Modify: `apps/web/vercel.json` (add cron)

**Interfaces:**
- Consumes: `listTranscripts`, `getTranscriptMetadata` from `@/lib/fireflies`; `resolveContact`, `emitTimelineEvent`.
- Produces:
  - `transcriptToEvents(meta, resolvedByEmail): TimelineEventInput[]` — pure mapping used by the cron and tested in isolation. `meta: { id: string; title: string; date: number; attendeeEmails: string[] }`; `resolvedByEmail: Map<string, { id: string; company_id: string | null }>`.
  - `syncFireflies(supabase, apiKey, since): Promise<number>` — orchestrator returning events emitted.

- [ ] **Step 1: Write the failing test (pure mapping)**

```typescript
// apps/web/lib/timeline/fireflies-sync.test.ts
import { describe, it, expect } from 'vitest';
import { transcriptToEvents } from './fireflies-sync';

describe('transcriptToEvents', () => {
  it('emits one call event per matched attendee', () => {
    const resolved = new Map([
      ['jane@acme.co', { id: 'c1', company_id: 'co1' }],
      ['bob@acme.co', { id: 'c2', company_id: 'co1' }],
    ]);
    const events = transcriptToEvents(
      { id: 'ff1', title: 'Pricing call', date: 1751500800000,
        attendeeEmails: ['jane@acme.co', 'bob@acme.co', 'tim@timkilroy.com'] },
      resolved,
    );
    expect(events).toHaveLength(2); // tim not in resolved map
    expect(events[0]).toMatchObject({
      contactId: 'c1', sourceType: 'call', sourceId: 'ff1',
      title: 'Call: Pricing call',
    });
    expect(events[1].contactId).toBe('c2');
  });

  it('emits nothing when no attendee resolves', () => {
    expect(transcriptToEvents(
      { id: 'ff2', title: 'x', date: 1, attendeeEmails: ['nobody@x.com'] },
      new Map(),
    )).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/fireflies-sync.test.ts`
Expected: FAIL — cannot find module `./fireflies-sync`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/timeline/fireflies-sync.ts
import type { SupabaseClient } from '@repo/db';
import { listTranscripts, getTranscriptMetadata } from '@/lib/fireflies';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent, type TimelineEventInput } from './emit-event';

type Meta = { id: string; title: string; date: number; attendeeEmails: string[] };

export function transcriptToEvents(
  meta: Meta,
  resolvedByEmail: Map<string, { id: string; company_id: string | null }>,
): TimelineEventInput[] {
  const events: TimelineEventInput[] = [];
  const seen = new Set<string>();
  for (const email of meta.attendeeEmails) {
    const contact = resolvedByEmail.get(email.toLowerCase());
    if (!contact || seen.has(contact.id)) continue;
    seen.add(contact.id);
    events.push({
      contactId: contact.id,
      companyId: contact.company_id,
      sourceType: 'call',
      sourceId: meta.id,
      occurredAt: new Date(meta.date).toISOString(),
      title: `Call: ${meta.title}`,
      payload: { firefliesId: meta.id },
    });
  }
  return events;
}

export async function syncFireflies(
  supabase: SupabaseClient,
  apiKey: string,
  since: Date,
): Promise<number> {
  const transcripts = await listTranscripts(apiKey, { fromDate: since });
  let emitted = 0;
  for (const t of transcripts) {
    const meta = getTranscriptMetadata(t);
    // getTranscriptMetadata must expose id, title, a numeric date, and attendee emails.
    const attendeeEmails: string[] = (meta as any).attendeeEmails
      ?? (t as any).meeting_attendees?.map((a: any) => a.email).filter(Boolean)
      ?? [];
    const resolved = new Map<string, { id: string; company_id: string | null }>();
    for (const email of attendeeEmails) {
      const c = await resolveContact(supabase, email);
      if (c) resolved.set(email.toLowerCase(), c);
    }
    for (const e of transcriptToEvents(
      { id: (meta as any).id ?? (t as any).id, title: (meta as any).title ?? 'Untitled',
        date: (meta as any).date ?? Date.now(), attendeeEmails },
      resolved,
    )) {
      await emitTimelineEvent(supabase, e);
      emitted++;
    }
  }
  return emitted;
}
```

> Note for the implementer: open `apps/web/lib/fireflies.ts` and confirm the exact fields `listTranscripts` and `getTranscriptMetadata` return (attendee emails, id, title, date). Adjust the field access above to match; the pure `transcriptToEvents` contract stays fixed.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/fireflies-sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the cron route**

```typescript
// apps/web/app/api/cron/timeline-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { syncFireflies } from '@/lib/timeline/fireflies-sync';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServerClient();
  const db = supabase as any;

  // High-water mark; default to 7 days back on first run.
  const { data: state } = await db.from('sync_state')
    .select('last_synced_at').eq('source', 'fireflies').maybeSingle();
  const since = state?.last_synced_at
    ? new Date(state.last_synced_at)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const apiKey = process.env.FIREFLIES_API_KEY;
  let calls = 0;
  if (apiKey) {
    calls = await syncFireflies(supabase, apiKey, since);
  }

  await db.from('sync_state').upsert(
    { source: 'fireflies', last_synced_at: now.toISOString(), updated_at: now.toISOString() },
    { onConflict: 'source' },
  );

  return NextResponse.json({ ok: true, calls });
}
```

> Note: if Fireflies keys are stored per-user in `users.preferences.integrations.fireflies.apiKey` rather than an env var, read the operator's key from there instead of `process.env.FIREFLIES_API_KEY`. Confirm against `apps/web/app/api/integrations/fireflies/transcripts/route.ts`.

- [ ] **Step 6: Register the cron**

In `apps/web/vercel.json`, add to the `crons` array:
```json
{ "path": "/api/cron/timeline-sync", "schedule": "0 */3 * * *" }
```

- [ ] **Step 7: Verify locally**

Run: `cd apps/web && npm run dev`, then:
```bash
curl "http://localhost:3000/api/cron/timeline-sync" -H "Authorization: Bearer $CRON_SECRET"
```
Expected: `{ "ok": true, "calls": <n> }`. Check a recent call appears on the matching `/person/[id]`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/timeline/fireflies-sync.ts apps/web/lib/timeline/fireflies-sync.test.ts \
  apps/web/app/api/cron/timeline-sync/route.ts apps/web/vercel.json
git commit -m "feat(timeline): 3-hour Fireflies call sync into timeline"
```

---

## Task 8: Copper email sync (into the same cron)

**Files:**
- Create: `apps/web/lib/copper-emails.ts`
- Create: `apps/web/lib/timeline/copper-email-sync.ts`
- Test: `apps/web/lib/timeline/copper-email-sync.test.ts`
- Modify: `apps/web/app/api/cron/timeline-sync/route.ts` (call the Copper sync too)

**Interfaces:**
- Consumes: Copper API auth (headers `X-PW-AccessToken`, `X-PW-Application: developer_api`) — reuse the pattern in `apps/web/lib/copper-discovery.ts`; `resolveContact`, `emitTimelineEvent`.
- Produces:
  - `copperEmailToEvent(email, contact): TimelineEventInput` — pure. `email: { id: string|number; subject: string; snippet: string; senderEmail: string; occurredAt: string }`.
  - `fetchRecentCopperEmails(since: Date): Promise<CopperEmail[]>` in `copper-emails.ts`.
  - `syncCopperEmails(supabase, since): Promise<number>`.

- [ ] **Step 1: Write the failing test (pure mapping)**

```typescript
// apps/web/lib/timeline/copper-email-sync.test.ts
import { describe, it, expect } from 'vitest';
import { copperEmailToEvent } from './copper-email-sync';

describe('copperEmailToEvent', () => {
  it('maps a copper email to an email timeline event', () => {
    const e = copperEmailToEvent(
      { id: 42, subject: 'Proposal follow-up', snippet: 'Circling back…',
        senderEmail: 'jane@acme.co', occurredAt: '2026-07-08T12:00:00Z' },
      { id: 'c1', company_id: 'co1' },
    );
    expect(e).toMatchObject({
      contactId: 'c1', companyId: 'co1', sourceType: 'email',
      sourceId: 'copper:42', title: 'Email: Proposal follow-up',
      summary: 'Circling back…', occurredAt: '2026-07-08T12:00:00Z',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/copper-email-sync.test.ts`
Expected: FAIL — cannot find module `./copper-email-sync`.

- [ ] **Step 3: Write the Copper email fetcher**

```typescript
// apps/web/lib/copper-emails.ts
// Reuses the auth pattern from copper-discovery.ts.
const COPPER_BASE = 'https://api.copper.com/developer_api/v1';

function headers() {
  return {
    'X-PW-AccessToken': process.env.COPPER_API_KEY!,
    'X-PW-Application': 'developer_api',
    'X-PW-UserEmail': process.env.COPPER_USER_EMAIL!,
    'Content-Type': 'application/json',
  };
}

export type CopperEmail = {
  id: string | number;
  subject: string;
  snippet: string;
  senderEmail: string;
  occurredAt: string; // ISO
};

// Copper logs emails as Activities of the email activity type.
// Pull recent activities and keep the email-type ones with a sender we can match.
export async function fetchRecentCopperEmails(since: Date): Promise<CopperEmail[]> {
  const res = await fetch(`${COPPER_BASE}/activities/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      minimum_activity_date: Math.floor(since.getTime() / 1000),
      page_size: 200,
    }),
  });
  if (!res.ok) {
    console.error('[timeline] copper activities fetch failed', res.status);
    return [];
  }
  const rows = (await res.json()) as any[];
  return rows
    .filter((r) => r?.details?.category === 'email' || r?.type?.category === 'email')
    .map((r) => ({
      id: r.id,
      subject: r.details?.subject ?? r.subject ?? '(no subject)',
      snippet: (r.details?.body ?? r.body ?? '').toString().slice(0, 200),
      senderEmail: r.details?.from ?? r.from_email ?? '',
      occurredAt: new Date((r.activity_date ?? 0) * 1000).toISOString(),
    }))
    .filter((e) => e.senderEmail);
}
```

> Note for the implementer: Copper's activities payload shape varies by account config. Open `apps/web/lib/copper-discovery.ts` to copy the exact working header/env-var names, then verify the field paths above against one real response (`console.log` the first row). The pure `copperEmailToEvent` contract does not change regardless of payload shape.

- [ ] **Step 4: Write the sync + pure mapping**

```typescript
// apps/web/lib/timeline/copper-email-sync.ts
import type { SupabaseClient } from '@repo/db';
import { fetchRecentCopperEmails } from '@/lib/copper-emails';
import { resolveContact } from './resolve-contact';
import { emitTimelineEvent, type TimelineEventInput } from './emit-event';

export function copperEmailToEvent(
  email: { id: string | number; subject: string; snippet: string; senderEmail: string; occurredAt: string },
  contact: { id: string; company_id: string | null },
): TimelineEventInput {
  return {
    contactId: contact.id,
    companyId: contact.company_id,
    sourceType: 'email',
    sourceId: `copper:${email.id}`,
    occurredAt: email.occurredAt,
    title: `Email: ${email.subject}`,
    summary: email.snippet,
    payload: { copperActivityId: email.id, from: email.senderEmail },
  };
}

export async function syncCopperEmails(supabase: SupabaseClient, since: Date): Promise<number> {
  const emails = await fetchRecentCopperEmails(since);
  let emitted = 0;
  for (const email of emails) {
    const contact = await resolveContact(supabase, email.senderEmail);
    if (!contact) continue;
    await emitTimelineEvent(supabase, copperEmailToEvent(email, contact));
    emitted++;
  }
  return emitted;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/copper-email-sync.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire Copper into the cron**

In `apps/web/app/api/cron/timeline-sync/route.ts`, add alongside the Fireflies block:
```typescript
import { syncCopperEmails } from '@/lib/timeline/copper-email-sync';
// ...after computing `since` for fireflies, add an independent copper high-water:
const { data: emailState } = await db.from('sync_state')
  .select('last_synced_at').eq('source', 'copper_email').maybeSingle();
const emailSince = emailState?.last_synced_at
  ? new Date(emailState.last_synced_at)
  : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const emails = await syncCopperEmails(supabase, emailSince);
await db.from('sync_state').upsert(
  { source: 'copper_email', last_synced_at: now.toISOString(), updated_at: now.toISOString() },
  { onConflict: 'source' },
);
// include `emails` in the JSON response
```
Update the final response to `NextResponse.json({ ok: true, calls, emails })`.

- [ ] **Step 7: Verify locally**

Run the cron again:
```bash
curl "http://localhost:3000/api/cron/timeline-sync" -H "Authorization: Bearer $CRON_SECRET"
```
Expected: `{ "ok": true, "calls": <n>, "emails": <m> }`. Confirm an email event appears on a `/person/[id]` whose email Copper knows.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/copper-emails.ts apps/web/lib/timeline/copper-email-sync.ts \
  apps/web/lib/timeline/copper-email-sync.test.ts apps/web/app/api/cron/timeline-sync/route.ts
git commit -m "feat(timeline): Copper email sync into timeline"
```

---

## Task 9: Cached "next step" summary + Refresh

**Files:**
- Create: `apps/web/lib/timeline/summary.ts`
- Test: `apps/web/lib/timeline/summary.test.ts`
- Create: `apps/web/app/api/person/[id]/refresh-summary/route.ts`
- Modify: `apps/web/app/api/cron/timeline-sync/route.ts` (regenerate changed contacts)

**Interfaces:**
- Consumes: `timeline_events`, `contact_summaries`; the project's existing Claude client (check `packages/utils` / `lib` for the wrapper used by other analyze routes).
- Produces:
  - `buildSummaryPrompt(events: {source_type: string; title: string; summary: string|null; occurred_at: string}[]): string` — pure.
  - `generateContactSummary(supabase, contactId): Promise<{ summary: string; next_step: string } | null>` — reads recent events, calls the LLM, upserts `contact_summaries`.

- [ ] **Step 1: Write the failing test (pure prompt builder)**

```typescript
// apps/web/lib/timeline/summary.test.ts
import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt } from './summary';

describe('buildSummaryPrompt', () => {
  it('lists events newest-first and asks for state + next step', () => {
    const prompt = buildSummaryPrompt([
      { source_type: 'call', title: 'Call: pricing', summary: 'discussed tiers', occurred_at: '2026-07-08T00:00:00Z' },
      { source_type: 'assessment', title: 'GrowthOS — 68', summary: null, occurred_at: '2026-07-01T00:00:00Z' },
    ]);
    expect(prompt).toContain('Call: pricing');
    expect(prompt).toContain('GrowthOS — 68');
    expect(prompt.toLowerCase()).toContain('next step');
  });

  it('handles an empty timeline', () => {
    expect(buildSummaryPrompt([])).toContain('No activity');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/timeline/summary.test.ts`
Expected: FAIL — cannot find module `./summary`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/timeline/summary.ts
import type { SupabaseClient } from '@repo/db';

type EventRow = { source_type: string; title: string; summary: string | null; occurred_at: string };

export function buildSummaryPrompt(events: EventRow[]): string {
  if (events.length === 0) {
    return 'No activity for this contact yet. Reply with JSON {"summary":"No activity yet.","next_step":"Reach out to open the conversation."}';
  }
  const lines = events
    .map((e) => `- [${e.occurred_at}] (${e.source_type}) ${e.title}${e.summary ? ` — ${e.summary}` : ''}`)
    .join('\n');
  return [
    'You are summarizing the relationship with one prospect for a busy consultant.',
    'Here is their activity timeline, newest first:',
    lines,
    '',
    'Reply ONLY with JSON: {"summary": "2-3 sentences on where the relationship stands", "next_step": "the single best next action"}.',
  ].join('\n');
}

export async function generateContactSummary(
  supabase: SupabaseClient,
  contactId: string,
): Promise<{ summary: string; next_step: string } | null> {
  const db = supabase as any;
  const { data: events } = await db
    .from('timeline_events')
    .select('source_type, title, summary, occurred_at')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(30);

  const prompt = buildSummaryPrompt(events ?? []);

  // Use the same Claude wrapper other analyze routes use. Example with the SDK:
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content.map((c: any) => (c.type === 'text' ? c.text : '')).join('');
  let parsed: { summary: string; next_step: string };
  try {
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    return null;
  }

  await db.from('contact_summaries').upsert(
    {
      contact_id: contactId,
      summary: parsed.summary,
      next_step: parsed.next_step,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'contact_id' },
  );
  return parsed;
}
```

> Note: confirm the model id and API-key env var against another analyze route (e.g. `apps/web/app/api/analyze/biz-dev/route.ts`) and reuse the existing wrapper if one exists instead of importing the SDK directly.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/timeline/summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the Refresh route**

```typescript
// apps/web/app/api/person/[id]/refresh-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { generateContactSummary } from '@/lib/timeline/summary';

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerClient();
  await generateContactSummary(supabase, params.id);
  // The person page reads the fresh row on reload.
  return NextResponse.redirect(
    new URL(`/person/${params.id}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  );
}
```

- [ ] **Step 6: Regenerate summaries for changed contacts in the cron**

In `apps/web/app/api/cron/timeline-sync/route.ts`, after both syncs, regenerate summaries only for contacts touched this run. Collect contact ids from the events emitted this run (have `syncFireflies`/`syncCopperEmails` return the set, or re-query `timeline_events` for `created_at >= runStart`), then:
```typescript
import { generateContactSummary } from '@/lib/timeline/summary';
const { data: touched } = await db.from('timeline_events')
  .select('contact_id').gte('created_at', now.toISOString());
const ids = [...new Set((touched ?? []).map((r: any) => r.contact_id))];
for (const id of ids) { await generateContactSummary(supabase, id); }
```
(Compute `now`/`runStart` at the top of the handler before syncing so "changed this run" is accurate.)

- [ ] **Step 7: Verify end-to-end**

Run: `cd apps/web && npm run dev`. Open a `/person/[id]` with events, click **Refresh**.
Expected: page reloads with a populated "Where we are / Next step" card.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/timeline/summary.ts apps/web/lib/timeline/summary.test.ts \
  apps/web/app/api/person/[id]/refresh-summary/route.ts apps/web/app/api/cron/timeline-sync/route.ts
git commit -m "feat(timeline): cached next-step summary + refresh + cron regeneration"
```

---

## Self-Review

**Spec coverage:**
- resolver → Task 3 · `timeline_events` → Task 1 · inline emit + backfill → Task 5 · 3-hour cron (Fireflies + Copper) → Tasks 7–8 · `/person/[id]` + entry point → Task 6 · cached summary + Refresh → Task 9 · free-mail rule → Task 2/3 · idempotency → Task 4. All spec sections map to a task.
- Non-goals (Gmail, company roll-up, webhooks, fuzzy matching) are excluded — no task implements them.

**Type consistency:** `resolveContact` returns `{ id; company_id }` and every caller (emit-assessment, fireflies-sync, copper-email-sync, backfill) consumes exactly that shape. `TimelineEventInput` is defined once in `emit-event.ts` and imported everywhere it is produced. `emitTimelineEvent` conflict target `'source_type,source_id'` matches the migration's `unique (source_type, source_id)`.

**Known verification points flagged inline (not placeholders — real code is present, with a check against live payloads):** Fireflies transcript field names (Task 7), Copper activities payload shape + auth env-var names (Task 8), the Claude wrapper/model id (Task 9). Each has a working default and a one-line "confirm against existing file X" note.
