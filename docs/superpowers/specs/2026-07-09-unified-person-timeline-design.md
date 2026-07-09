# Unified Person Timeline — Design

**Author:** Tim Kilroy
**Date:** 2026-07-09
**Status:** Design / approved for planning

---

## Problem

Communication about a prospect lives in three disconnected places:

- **Email** — captured in Copper (which already resolves each message to a person)
- **Calls** — captured and transcribed automatically by Fireflies
- **Assessments** — the diagnostics people complete inside WTF-OS (GrowthOS, Discovery Lab, Wah-Wah / Robot-Tim, biz-dev)

Copper alone is insufficient because much of the real conversation happens on calls, which Copper never sees. Today, tying a call, an email, and an assessment back to the same human is a manual step Tim has to remember to take. He doesn't want to remember.

**Root cause:** the person's email address is present in every silo (`contacts.email`, `biz_dev_assessments.email`, `discovery_briefs.lead_email`, GrowthOS `assessments.intake_data.email`, Fireflies attendee lists, Copper activities) but is never resolved to the *one canonical `contacts` row*. We have the email everywhere and the identity nowhere.

## Goal

A single place in WTF-OS — a per-person view — where email, calls, and assessments appear on one timeline, connected automatically, plus an AI summary of where the relationship stands and what to do next. Connection must be a **side effect of data arriving**, never a manual action.

## Non-goals (v1)

- Direct Gmail sync (email comes from Copper in v1; Gmail is a clean later upgrade)
- Company-level roll-up view aggregating every contact's timeline
- Real-time webhooks (a 3-hour cron is sufficient; webhooks are a phase-2 upgrade)

## What already exists (reuse, don't rebuild)

- **Identity spine:** `contacts` (has `email`, `company_id`), `companies` (has `url`), `deals` (has `company_id`, `stakeholder_ids`).
- **Copper webhook:** `apps/web/app/api/webhooks/copper/route.ts` — proves the write-back pattern.
- **Fireflies integration:** `apps/web/app/api/integrations/fireflies/*` and `lib/fireflies.ts` — currently pull-on-demand (`listTranscripts`).
- **Precedent for joining artifacts to people:** `call_lab_reports.discovery_brief_id` already links calls to discovery briefs by hand. This design generalizes that pattern into a spine so it happens automatically for every source.
- Stack: Next.js 14 App Router, TypeScript strict, Supabase (Postgres), Turborepo, Vercel (cron).

---

## Architecture

Smart writes, dumb reads. All intelligence lives on the ingestion side; the read side is a single query plus a cached summary.

```
Assessment completes ─┐
Fireflies call (cron) ─┼─► resolveContact(email) ─► timeline_events (idempotent) ─► /person/[id]
Copper email  (cron) ─┘         │                                                      (one query +
                                └─ find/create contacts + companies                    cached AI card)
```

### 1. `resolveContact(email, { name?, companyName?, url? })`

The **only** door through which anything attaches to a person.

1. Normalize the email (lowercase, trim).
2. Find the `contacts` row by normalized email; create it if absent (set `name` if provided).
3. Derive the company domain from the email domain (or a passed `url`); find-or-create the `companies` row; link `contacts.company_id`.
4. Return the `contacts` row (with `company_id`).

Notes:
- Matching is by normalized email only in v1. No fuzzy/name matching (YAGNI; revisit if duplicate humans become a real problem).
- Free-mail domains (gmail.com, etc.) do **not** create shared companies — treat as no company / personal.

### 2. `timeline_events` table

The join layer. Detail stays in existing source tables; this table is what the Person View reads.

```sql
create table timeline_events (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,
  company_id   uuid references companies(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  source_type  text not null,   -- 'email' | 'call' | 'assessment' | 'discovery'
  source_id    text not null,   -- id in the detail table
  occurred_at  timestamptz not null,
  title        text not null,   -- e.g. "Call: pricing discussion"
  summary      text,            -- 1–3 line gist for the timeline row
  payload      jsonb default '{}',  -- denormalized bits for rendering
  created_at   timestamptz not null default now(),
  unique (source_type, source_id)
);
create index on timeline_events (contact_id, occurred_at desc);
```

The `unique (source_type, source_id)` constraint makes every emit idempotent — the cron can re-see the same call or email forever with no duplicates. Use `insert ... on conflict (source_type, source_id) do update` so edited summaries refresh.

### 3. `emitTimelineEvent(sourceType, sourceId, contact, { occurredAt, title, summary, payload, dealId? })`

Thin helper: upserts one `timeline_events` row for a resolved contact. Every source calls `resolveContact` then `emitTimelineEvent`.

---

## Ingestion (the "without me remembering" machine)

Three feeds, all collapsing to *resolve → emit*.

### Assessments (inline)
At each assessment completion path, add one call: `emitTimelineEvent('assessment', row.id, resolveContact(row.email, …), …)`. Covers `biz_dev_assessments`, GrowthOS `assessments` (email inside `intake_data`), and `discovery_briefs` (`lead_email`).

A **one-time backfill script** walks existing rows in those tables, resolves each email, and emits historical events so the timeline has history on day one.

### Calls (Fireflies — 3-hour cron)
A Vercel cron lists Fireflies transcripts since a stored high-water timestamp. For each transcript, match **attendee emails** → `resolveContact` → store/ensure the transcript record → emit a `call` event (title = meeting title, summary = existing Fireflies/Call-Lab gist). A call with multiple external attendees emits an event per matched contact.

### Email (Copper — 3-hour cron)
The same cron pulls recent Copper activities/emails. Copper has already resolved each message to a person; take that person's email → `resolveContact` → emit an `email` event (title = subject, summary = snippet). We inherit Copper's matching rather than rebuild it.

### Cron shape
- Single Vercel cron, every 3 hours, running Fireflies pull then Copper pull.
- High-water timestamp per source stored in a small `sync_state` table (or a settings row).
- Idempotency from `timeline_events` unique constraint means a missed/overlapping run self-heals.

---

## Read side

### Route `/person/[id]`
1. **Header** — name, company, role, buyer type from `contacts` + `companies`.
2. **"Where we are / Next step" card** — cached AI summary (see below).
3. **Timeline** — `select * from timeline_events where contact_id = $1 order by occurred_at desc`. Render by `source_type` (📧 email, 📞 call, 📋 assessment, 🔎 discovery) with `title` + `summary`, expandable/linkable into the existing detail view for that artifact.

### AI "next step" card
- Stored in a `contact_summaries` table (`contact_id`, `summary`, `next_step`, `generated_at`, `source_hash`).
- **Not** generated on page load. The 3-hour cron regenerates it only for contacts whose timeline changed that cycle. A manual **Refresh** button covers "just got off a call, want it now."
- Prompt: given recent timeline events, produce (a) 2–3 sentence relationship state, (b) one recommended next action.

### Entry point
Minimal search box + "recently active contacts" list (contacts ordered by most recent `timeline_events.occurred_at`).

---

## Data model changes summary

- **New:** `timeline_events`, `contact_summaries`, `sync_state` (or equivalent settings rows).
- **Unchanged:** all existing assessment/call/discovery tables (they remain the detail store; the spine references them by id).
- No `contact_id` columns added to source tables — the join lives entirely in `timeline_events`, so backfilling and adding future sources never touches existing schemas or the read path.

## Error handling

- `resolveContact` on an unparseable/empty email: skip and log; do not create junk contacts.
- Cron per-item failures are isolated (one bad transcript/email doesn't abort the run); log and continue.
- Summary generation failure leaves the last cached card in place; Refresh retries.

## Testing

- Unit: `resolveContact` (new contact, existing contact, free-mail domain, missing name, domain derivation from email vs url).
- Unit: `emitTimelineEvent` idempotency (same source twice → one row, summary updates).
- Integration: backfill script produces one event per assessment with a valid email; none for rows without email.
- Integration: cron dedup — running twice over the same Fireflies/Copper window yields no duplicate events.
- Read: `/person/[id]` returns merged, correctly ordered timeline for a contact with all four source types.

## Build order

1. `timeline_events` + `contact_summaries` + `sync_state` migrations.
2. `resolveContact` + `emitTimelineEvent` + unit tests.
3. Inline emit on assessment completion + backfill script (fastest visible payoff — assessments appear immediately).
4. `/person/[id]` page reading the timeline (renders assessment history end-to-end).
5. 3-hour cron: Fireflies pull → emit.
6. 3-hour cron: Copper email pull → emit.
7. `contact_summaries` generation in cron + Refresh button + the "next step" card.

## Future (explicitly deferred)

- Direct Gmail sync (fuller coverage than Copper capture).
- Company roll-up view merging all contacts' timelines.
- Real-time via Fireflies/Copper webhooks.
- Fuzzy/name-based identity matching and contact de-duplication.
