# Demand OS Client Intake — Design Spec

**Date:** 2026-04-22
**Owner:** Tim Kilroy
**Status:** Design approved, ready for implementation plan

## Problem

Demand OS clients today land in the same 10-step "Intelligence Intake" wizard as Agency Studio clients. That wizard asks agency-shaped questions ("hours sold per week," "cost of delivery," "SOP quality") that make no sense for a demand-gen engagement, and captures zero artifacts (org charts, sales decks, pipeline exports). Kickoff calls burn half their time on discovery that should have been front-loaded.

We need a lightweight, client-facing intake specific to Demand OS that:

- Asks questions aimed at preparing a Demand OS kickoff call
- Lets the client upload artifacts (org chart, sales deck, 90-day pipeline export, etc.)
- Lives inside the existing `/client/*` portal so clients use one login
- Is **trivial to extend** — adding a question must not require a migration

## Goals

1. Client fills in a Demand-OS-specific intake before kickoff via their existing client portal login.
2. Adding, removing, or reordering questions is a one-file edit in TypeScript — no schema change.
3. Artifacts upload to Supabase Storage and are recallable by category.
4. The coach (Tim) can open a single read-only page and see every answer + artifact link in one place.
5. Reuses the existing portal's auth, enrollment scoping, and RLS patterns.

## Non-goals (v1)

- CRM integrations (HubSpot/Salesforce sync). Clients upload exports manually.
- Call-recording uploads. Call Lab remains a separate coach-facing product.
- Per-question conditional branching. Linear, sectioned form only.
- Multi-user collaborative editing. One enrolled contact per engagement fills it in.
- Auto-generated kickoff brief. Future work once real data is captured.
- Backfilling existing Demand OS enrollments into the new flow. New clients only.

## Architecture

### Reuse from existing portal

- `/client/*` route group, auth, and layout
- `client_enrollments` as the scoping unit (one enrollment = one user + one program)
- `client_programs` for feature gating
- Existing RLS model: client sees rows where `enrollment_id` matches their enrollment

### New infrastructure (generic, shared across programs)

**Table `client_documents`** — the page `apps/web/app/client/documents/page.tsx` already reads from this table but the migration has never shipped. We ship it now and everyone wins.

```sql
create table client_documents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references client_enrollments(id) on delete cascade,
  category text not null,            -- e.g. 'demandos-intake:org-chart'
  title text,                        -- client-supplied or auto-filename
  file_name text not null,
  storage_path text not null,        -- path in client-documents bucket
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index client_documents_enrollment_idx on client_documents(enrollment_id);
create index client_documents_category_idx on client_documents(enrollment_id, category);
```

RLS: enrolled client can select/insert/delete their own rows; service role can read all; coach access via existing admin pattern.

**Storage bucket `client-documents`** — private bucket. Object keys are `{enrollment_id}/{category}/{uuid}-{filename}`. RLS policy limits reads/writes to rows where the path's leading segment equals the caller's `enrollment_id` (or service role).

**Upload component** — single `<DocumentUploadSlot category="..." enrollmentId="..." />` component used throughout the portal. Drag-drop + click. Shows existing uploads for the category with delete. Enforces per-file max size (20MB) and per-category max count (10).

### New infrastructure (Demand-OS-specific)

**Table `demandos_intake`** — one row per enrollment, JSONB answers.

```sql
create table demandos_intake (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references client_enrollments(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,           -- null until client hits "Submit"
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index demandos_intake_enrollment_idx on demandos_intake(enrollment_id);
```

RLS: enrolled client reads/writes their own row (upsert on first visit); service role reads all.

`submitted_at` is the completion signal. Partial progress persists as autosaves on blur; submission flips the flag and triggers notification.

**Questions config** — `apps/web/lib/demandos-intake/questions.ts` is the single source of truth.

```ts
export type QuestionType =
  | 'short-text'
  | 'long-text'
  | 'single-select'
  | 'multi-select'
  | 'number'
  | 'url'
  | 'upload';

export type Question = {
  key: string;              // stable key, used as jsonb field; never rename
  section: string;          // section slug, controls grouping
  label: string;            // rendered question
  help?: string;            // optional helper text under the label
  type: QuestionType;
  required?: boolean;
  options?: string[];       // for select types
  placeholder?: string;
  uploadCategory?: string;  // for upload type → maps to client_documents.category
};

export const SECTIONS = [
  { slug: 'company', title: 'Company & offer' },
  { slug: 'icp', title: 'Your definition of ICP' },
  { slug: 'gtm', title: 'Current GTM motion' },
  { slug: 'pipeline', title: 'Pipeline snapshot — last 90 days' },
  { slug: 'content', title: 'Positioning & content' },
  { slug: 'stack', title: 'Tech stack' },
  { slug: 'team', title: 'Team & access' },
  { slug: 'goals', title: 'Goals & constraints' },
  { slug: 'history', title: 'What you\'ve tried' },
] as const;

export const QUESTIONS: Question[] = [
  // ...the 42 questions from the approved list, see Question Catalog below
];
```

**Adding a question after v1:** append one entry to `QUESTIONS`. No migration. No API change. No type plumbing beyond the `key` appearing in `answers`. Adding an upload slot uses a new `uploadCategory` string — `client_documents.category` is free-form text, so new categories are just new strings, not schema changes.

**Renaming/removing:** rename is a data migration (answers use old key). Removing is safe — the key just sits in `answers` unread. Treat `key` as immutable once shipped.

### Routes and components

- `/client/demandos-intake` — gated by `client_programs.has_demandos_intake`. Renders the form from the questions config. Client-facing, protected by existing client auth.
- `/client/demandos-intake/review` — same page in read-only mode. Client can reopen after submission.
- `/console/clients/[enrollmentId]/demandos-intake` — coach-facing read-only view. Uses the same read-only component. Lists all answers + signed-URL links to each uploaded artifact.
- `/api/client/demandos-intake` — `POST` for autosave (merges into `answers` JSONB), `POST /submit` flips `submitted_at`.
- `/api/client/documents` — `POST` signed-upload-URL generator, `DELETE` with id for removal.

Components:

- `apps/web/components/client/demandos-intake/IntakeForm.tsx` — orchestrates sections, autosave, submit
- `apps/web/components/client/demandos-intake/SectionNav.tsx` — left-rail progress
- `apps/web/components/client/demandos-intake/QuestionField.tsx` — one component, switches on `question.type`
- `apps/web/components/client/DocumentUploadSlot.tsx` — generic, reused outside intake
- `apps/web/components/client/demandos-intake/ReviewView.tsx` — read-only renderer

### Feature gating

Add column to `client_programs`:

```sql
alter table client_programs add column has_demandos_intake boolean not null default false;
update client_programs set has_demandos_intake = true where slug in ('demandos-studio', 'demandos-growth', 'demandos-team');
```

Dashboard (`/client/dashboard`) reads this flag and, when true + `demandos_intake.submitted_at is null`, surfaces a prominent "Complete your Demand OS intake" card linking to the form.

**Legacy wizard handling:** for any enrollment where `has_demandos_intake = true`, the existing `/client/onboarding` 10-step agency wizard is hidden (redirect from that route to `/client/demandos-intake` for those users). Completion semantics for DemandOS programs live in `demandos_intake.submitted_at`, not in the legacy `client_enrollments.onboarding_completed` flag. Agency Studio enrollments are unaffected and continue using the existing wizard.

### Notifications

On `POST /api/client/demandos-intake/submit`:

1. Flip `submitted_at = now()`.
2. Fire existing Loops helper (pattern from `onClientOnboarded`) — `onDemandosIntakeSubmitted(enrollmentId)`. One email to Tim with a link to the coach-facing review page.

## Question Catalog

All questions grouped by section. `key` values are stable — treat as immutable once merged. Questions that are a text answer + a matching upload are represented as two entries (one `long-text`, one `upload`) sharing a conceptual slot.

### company
- `company_name` — short-text, required
- `company_url` — url, required
- `company_one_liner` — long-text, required, "One sentence: what you do and for whom"
- `offer_description` — long-text, required, "What do you sell and how's it priced?"
- `deal_size_typical` — short-text, "Typical deal size (ACV or one-time)"
- `sales_cycle_length` — short-text, "Typical sales cycle length"
- `primary_buyer_role` — short-text, required, "Primary buyer's role/title"

### icp
- `icp_description` — long-text, required, "In your own words, who is your ideal customer?"
- `icp_industries` — long-text, "Industries / verticals you target"
- `icp_company_size` — short-text, "Company size range (employees or revenue)"
- `icp_geo` — short-text, "Geographies"
- `icp_disqualifiers` — long-text, "Who you explicitly do not want as a customer"
- `icp_best_fit_example` — long-text, required, "Name one current customer who's a perfect fit — and why"
- `icp_target_accounts_notes` — long-text, "Top 10–20 target accounts (paste a list or note that you've uploaded one)"
- `icp_target_accounts_upload` — upload, uploadCategory `demandos-intake:target-accounts`

### gtm
- `gtm_primary_motion` — single-select `['Outbound', 'Inbound', 'PLG', 'Events', 'Partner/Channel', 'Mixed']`, required
- `gtm_active_channels` — multi-select `['Cold email', 'LinkedIn outbound', 'Paid search', 'Paid social', 'SEO/content', 'Webinars', 'Events', 'Partnerships', 'Referrals', 'Other']`
- `gtm_internal_owner` — short-text, required, "Who owns demand gen internally (name, role)"
- `gtm_other_vendors` — long-text, "Other agencies/vendors working in this space with you, and what they do"

### pipeline
- `pipeline_monthly_lead_volume` — short-text, "Approx. monthly lead/MQL volume"
- `pipeline_win_rate` — short-text, "Approx. win rate (%)"
- `pipeline_biggest_pain` — long-text, required, "Biggest pipeline pain in one sentence"
- `pipeline_crm_export` — upload, uploadCategory `demandos-intake:pipeline-export`
- `pipeline_dashboard_screenshots` — upload, uploadCategory `demandos-intake:pipeline-export`

### content
- `content_positioning` — long-text, required, "Current positioning / tagline in your own words"
- `content_sales_deck` — upload, uploadCategory `demandos-intake:sales-deck`
- `content_case_studies` — upload, uploadCategory `demandos-intake:case-study`
- `content_brand_guidelines` — upload, uploadCategory `demandos-intake:brand-guidelines`
- `content_key_urls` — long-text, "Key page URLs (homepage, pricing, top blog post)"

### stack
- `stack_crm` — single-select `['HubSpot', 'Salesforce', 'Pipedrive', 'Close', 'Attio', 'Other', 'None']`
- `stack_marketing_automation` — single-select `['HubSpot', 'Marketo', 'Customer.io', 'ActiveCampaign', 'None', 'Other']`
- `stack_analytics` — single-select `['GA4', 'Mixpanel', 'Amplitude', 'PostHog', 'None', 'Other']`
- `stack_active_ad_accounts` — multi-select `['Google', 'LinkedIn', 'Meta', 'X', 'TikTok', 'None']`
- `stack_other_tools` — long-text, "Other tools worth knowing"

### team
- `team_org_chart_upload` — upload, uploadCategory `demandos-intake:org-chart`
- `team_primary_contact` — long-text, required, "Primary point of contact: name, role, email"
- `team_decision_maker` — long-text, "Decision maker if different from primary contact"
- `team_approvers` — long-text, "Who approves copy? Who approves budget?"

### goals
- `goals_90_day` — long-text, required, "90-day goal in one sentence"
- `goals_annual` — long-text, required, "Annual goal (revenue, pipeline, or logo target)"
- `goals_winning_picture` — long-text, "What 'winning in 6 months' looks like"
- `goals_biggest_concern` — long-text, required, "Biggest concern / what would make this a failure"
- `goals_seasonality` — long-text, "Upcoming launches, seasonality, blackout periods"

### history
- `history_what_worked` — long-text, "What's worked best in demand gen for you so far"
- `history_what_failed` — long-text, "What you've tried that didn't work, and why if you know"
- `history_internal_obstacles` — long-text, "Internal obstacles I should know about (e.g., sales skeptical of marketing, brand is precious, legal is slow)"

## Data flow

1. Client logs into `/client`. Dashboard sees `has_demandos_intake && !submitted_at`, renders CTA card.
2. Client lands on `/client/demandos-intake`. Page server-side upserts an empty `demandos_intake` row if none exists, returns existing `answers` and uploaded `client_documents` for categories in this intake.
3. Form renders section-by-section from `QUESTIONS`. On blur of any field, debounced `POST /api/client/demandos-intake` with `{key, value}`. API merges into `answers` via JSONB set.
4. Upload slots call `POST /api/client/documents` to get a signed upload URL, PUT the file directly to Storage, then `POST /api/client/documents` again to record the row.
5. Client clicks "Submit intake." `POST /api/client/demandos-intake/submit` flips `submitted_at`, triggers Loops.
6. Coach opens `/console/clients/[enrollmentId]/demandos-intake`. Server reads `demandos_intake.answers` + all `client_documents` where `enrollment_id = ? and category like 'demandos-intake:%'`. Renders read-only view with signed URLs valid for 1 hour.

## Error handling

- Autosave failure → toast "Save failed, will retry," queue retry on next blur. Never block typing.
- Upload failure → per-file error state, retry button. Orphaned Storage objects (row insert failed after successful PUT) accumulate as dead data; acceptable for v1. If volume becomes material, add a reconciliation job that deletes storage objects with no matching `client_documents` row older than 24h.
- Submission with required fields missing → inline validation blocks submission, scrolls to first missing field.
- Storage RLS denial → surfaces as a generic "Upload not permitted" error. If we see this in logs, it means the bucket policy is off.

## Security / RLS

- `demandos_intake` — select/insert/update allowed where `enrollment_id` belongs to `auth.uid()` via existing `client_enrollments` join pattern.
- `client_documents` — same scoping by `enrollment_id`.
- Storage bucket policy — path prefix must match an enrollment the caller owns.
- Coach-facing `/console/*` route uses the existing admin authorization pattern (service role or admin-flag on the user), same as other console pages.
- Never expose raw storage URLs to clients — always signed URLs with short TTL.

## Testing

- Unit: questions config validator (no duplicate keys, all upload types have `uploadCategory`, all select types have `options`).
- Integration: autosave endpoint merges JSONB without clobbering other keys when two fields save concurrently.
- Integration: upload flow end-to-end — signed URL issuance, PUT, row insert, RLS prevents cross-enrollment reads.
- E2E: enrolled DemandOS client completes intake including one upload; verify `submitted_at` set and Loops fired.
- Manual: coach opens review page, sees all answers + working signed links.

## Migration plan

Four migrations, can ship in one PR:

1. `create_client_documents.sql` — table + indexes + RLS.
2. `create_client_documents_bucket.sql` — Storage bucket + policies (or executed via Supabase CLI/dashboard, capture SQL here for repeatability).
3. `create_demandos_intake.sql` — table + indexes + RLS.
4. `alter_client_programs_add_demandos_intake_flag.sql` — column + backfill for the three DemandOS slugs.

## Rollout

1. Merge migrations + code behind `has_demandos_intake = false` initially (safety — flag defaults to false).
2. Toggle flag on for the three DemandOS program slugs.
3. Tim onboards the new client as the pilot. Capture pain points in a follow-up issue.
4. After 2–3 clients complete the intake, revisit question list. Promote any heavily-used JSONB fields to real columns if a dashboard needs them.

## Out of scope / future

- Auto-generated kickoff brief from answers + uploads (LLM summarization).
- Pulling CRM data directly via HubSpot/Salesforce APIs.
- Client-uploaded call recordings (lives with Call Lab's future roadmap).
- Multi-collaborator editing (buyer + RevOps filling different sections).
- Program-specific question variants for `demandos-studio` vs `demandos-growth` vs `demandos-team` — v1 treats them identically.
- Extending the Agency Studio portal to use the new documents tab in production (the page code already exists; just needs to be wired once this ships the table and bucket).
