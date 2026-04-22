# Demand OS Client Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a client-facing Demand OS intake at `/client/demandos-intake` that captures ~45 questions and ~6 file-upload artifacts, backed by JSONB storage so adding a question is a one-file edit.

**Architecture:** One new JSONB-backed table (`demandos_intake`), one new generic documents table (`client_documents`), one new private Storage bucket (`client-documents`), and a questions config file that drives form rendering. Reuses the existing `/client/*` portal auth, `client_enrollments` scoping, and `client_programs` feature flags. Coach-review lives under the existing `/admin/*` `ADMIN_API_KEY` pattern.

**Tech Stack:** Next.js App Router (Pages Router not in use), Supabase Postgres + Storage + Auth, `@supabase/ssr`, Tailwind CSS. No unit test framework in this repo — plan uses runtime assertions + a manual verification checklist as the final task.

**Spec:** `docs/superpowers/specs/2026-04-22-demandos-client-intake-design.md`

---

## Local Conventions (must follow)

- **Migrations:** plain SQL in `supabase/migrations/YYYYMMDD_<slug>.sql`. RLS policies defined inline. Example: `supabase/migrations/20260212_create_client_roadmaps.sql`.
- **Supabase clients:**
  - Browser (client components): `import { createClient } from '@/lib/supabase-browser'` → `const supabase = createClient()`
  - Auth server (API routes needing the calling user): `import { createClient } from '@/lib/supabase-auth-server'` → `const supabase = await createClient()`
  - Service role (bypass RLS): `import { getSupabaseServerClient } from '@/lib/supabase-server'` → `const admin = getSupabaseServerClient()`
- **API route auth pattern:** call `authClient.auth.getUser()`, 401 if no user, then verify the `enrollment_id` in the body belongs to `user.id` via `client_enrollments` query (service-role ok for the check).
- **Pages:** `'use client'`, data fetched in `useEffect` via browser Supabase. Loading state = `<div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />`.
- **Admin pages:** `'use client'`, prompt user for API key into local state, send as `Authorization: Bearer ${apiKey}` on admin API calls. Admin API routes validate `apiKey === process.env.ADMIN_API_KEY`.
- **Error UX:** use `alert('Error: ' + message)` (no toast library installed). For now, follow convention.
- **Colors/fonts:** black bg (`bg-black`), border `#333333`, accent red `#E51B23`, headers `font-anton uppercase`.
- **Path aliases:** `@/*` resolves to `apps/web/*`.
- **Loops helper:** `apps/web/lib/loops.ts`. Sibling to `onClientOnboarded`.
- **Run dev server:** `cd apps/web && npm run dev` from repo root (or however the engineer normally does). Supabase CLI runs `supabase db push` from repo root.

---

## File Structure

### New files
```
supabase/migrations/20260422_create_client_documents.sql
supabase/migrations/20260422_create_client_documents_bucket.sql
supabase/migrations/20260422_create_demandos_intake.sql
supabase/migrations/20260422_add_has_demandos_intake_flag.sql

apps/web/lib/demandos-intake/questions.ts
apps/web/app/api/client/demandos-intake/route.ts
apps/web/app/api/client/demandos-intake/submit/route.ts
apps/web/app/api/client/documents/route.ts
apps/web/app/api/admin/demandos-intake/[enrollmentId]/route.ts

apps/web/components/client/DocumentUploadSlot.tsx
apps/web/components/client/demandos-intake/QuestionField.tsx
apps/web/components/client/demandos-intake/SectionNav.tsx
apps/web/components/client/demandos-intake/IntakeForm.tsx

apps/web/app/client/demandos-intake/page.tsx
apps/web/app/client/demandos-intake/review/page.tsx
apps/web/app/admin/demandos-intake/[enrollmentId]/page.tsx
```

### Modified files
```
apps/web/lib/loops.ts                         (add onDemandosIntakeSubmitted)
apps/web/app/client/onboarding/page.tsx       (redirect DemandOS enrollments)
apps/web/app/client/dashboard/page.tsx        (surface intake CTA)
```

---

## Task 1: Migration — `client_documents` table

Generic per-enrollment documents table. Schema is a superset of what the existing (but unmigrated) `/admin/clients/page.tsx` expects, so one table serves DemandOS intake now and the broader documents feature later.

**Files:**
- Create: `supabase/migrations/20260422_create_client_documents.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260422_create_client_documents.sql

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES client_enrollments(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'file'
    CHECK (document_type IN ('file', 'link', 'text')),
  file_name TEXT,
  storage_path TEXT UNIQUE,
  file_url TEXT,
  external_url TEXT,
  content_body TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_documents_enrollment_idx
  ON client_documents(enrollment_id);
CREATE INDEX IF NOT EXISTS client_documents_category_idx
  ON client_documents(enrollment_id, category);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON client_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own documents"
  ON client_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own documents"
  ON client_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = client_documents.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: migration applies without error. If using Supabase remote, run against the linked project.

- [ ] **Step 3: Verify the table**

Run in Supabase SQL editor (or `psql`):
```sql
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'client_documents' ORDER BY ordinal_position;
```
Expected: 16 columns listed, matching the CREATE TABLE above.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422_create_client_documents.sql
git commit -m "feat(db): add client_documents table for generic client uploads"
```

---

## Task 2: Migration — `client-documents` Storage bucket + policies

Private bucket. Object path convention: `{enrollment_id}/{category}/{uuid}-{filename}`. Storage RLS checks that the first path segment matches an enrollment the caller owns.

**Files:**
- Create: `supabase/migrations/20260422_create_client_documents_bucket.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260422_create_client_documents_bucket.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload own client documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id::text = (storage.foldername(name))[1]
        AND client_enrollments.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: success. If the storage policies fail because earlier similar-named policies exist, adjust the `CREATE POLICY` names to be unique.

- [ ] **Step 3: Verify the bucket exists**

Run in SQL:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'client-documents';
```
Expected: one row, `public = false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422_create_client_documents_bucket.sql
git commit -m "feat(storage): add private client-documents bucket with enrollment-scoped RLS"
```

---

## Task 3: Migration — `demandos_intake` table

One row per enrollment. JSONB `answers` holds all question values keyed by `key`. `submitted_at` is the completion signal.

**Files:**
- Create: `supabase/migrations/20260422_create_demandos_intake.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260422_create_demandos_intake.sql

CREATE TABLE IF NOT EXISTS demandos_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL UNIQUE REFERENCES client_enrollments(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demandos_intake_enrollment_idx
  ON demandos_intake(enrollment_id);

ALTER TABLE demandos_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intake"
  ON demandos_intake FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own intake"
  ON demandos_intake FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own intake"
  ON demandos_intake FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_enrollments
      WHERE client_enrollments.id = demandos_intake.enrollment_id
        AND client_enrollments.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION set_demandos_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demandos_intake_updated_at_trigger ON demandos_intake;
CREATE TRIGGER demandos_intake_updated_at_trigger
  BEFORE UPDATE ON demandos_intake
  FOR EACH ROW EXECUTE FUNCTION set_demandos_intake_updated_at();
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push`
Expected: success.

- [ ] **Step 3: Verify**

Run in SQL:
```sql
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'demandos_intake' ORDER BY ordinal_position;
```
Expected: 6 columns (id, enrollment_id, answers, submitted_at, updated_at, created_at).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422_create_demandos_intake.sql
git commit -m "feat(db): add demandos_intake table with JSONB answers"
```

---

## Task 4: Migration — `has_demandos_intake` flag on `client_programs`

Gates which programs show the DemandOS intake. Backfills true for the three DemandOS slugs.

**Files:**
- Create: `supabase/migrations/20260422_add_has_demandos_intake_flag.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260422_add_has_demandos_intake_flag.sql

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS has_demandos_intake BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE client_programs
   SET has_demandos_intake = TRUE
 WHERE slug IN ('demandos-studio', 'demandos-growth', 'demandos-team');
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push`

- [ ] **Step 3: Verify**

```sql
SELECT slug, has_demandos_intake FROM client_programs
 WHERE has_demandos_intake = TRUE;
```
Expected: 3 rows for the three DemandOS slugs. If fewer, check which slugs exist in `client_programs` and adjust.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422_add_has_demandos_intake_flag.sql
git commit -m "feat(db): gate DemandOS intake behind has_demandos_intake program flag"
```

---

## Task 5: Questions config module

Single source of truth for the form. Self-validates on import so bad configs fail fast.

**Files:**
- Create: `apps/web/lib/demandos-intake/questions.ts`

- [ ] **Step 1: Create the config file**

```typescript
// apps/web/lib/demandos-intake/questions.ts

export type QuestionType =
  | 'short-text'
  | 'long-text'
  | 'single-select'
  | 'multi-select'
  | 'number'
  | 'url'
  | 'upload';

export type Question = {
  key: string;
  section: string;
  label: string;
  help?: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  uploadCategory?: string;
};

export type SectionDef = {
  slug: string;
  title: string;
};

export const SECTIONS: ReadonlyArray<SectionDef> = [
  { slug: 'company', title: 'Company & offer' },
  { slug: 'icp', title: 'Your definition of ICP' },
  { slug: 'gtm', title: 'Current GTM motion' },
  { slug: 'pipeline', title: 'Pipeline snapshot — last 90 days' },
  { slug: 'content', title: 'Positioning & content' },
  { slug: 'stack', title: 'Tech stack' },
  { slug: 'team', title: 'Team & access' },
  { slug: 'goals', title: 'Goals & constraints' },
  { slug: 'history', title: "What you've tried" },
];

export const QUESTIONS: ReadonlyArray<Question> = [
  // company
  { key: 'company_name', section: 'company', type: 'short-text', required: true, label: 'Company name' },
  { key: 'company_url', section: 'company', type: 'url', required: true, label: 'Website URL' },
  { key: 'company_one_liner', section: 'company', type: 'long-text', required: true, label: 'One sentence: what you do and for whom' },
  { key: 'offer_description', section: 'company', type: 'long-text', required: true, label: 'What do you sell and how is it priced?' },
  { key: 'deal_size_typical', section: 'company', type: 'short-text', label: 'Typical deal size (ACV or one-time)' },
  { key: 'sales_cycle_length', section: 'company', type: 'short-text', label: 'Typical sales cycle length' },
  { key: 'primary_buyer_role', section: 'company', type: 'short-text', required: true, label: "Primary buyer's role / title" },

  // icp
  { key: 'icp_description', section: 'icp', type: 'long-text', required: true, label: 'In your own words, who is your ideal customer?' },
  { key: 'icp_industries', section: 'icp', type: 'long-text', label: 'Industries / verticals you target' },
  { key: 'icp_company_size', section: 'icp', type: 'short-text', label: 'Company size range (employees or revenue)' },
  { key: 'icp_geo', section: 'icp', type: 'short-text', label: 'Geographies' },
  { key: 'icp_disqualifiers', section: 'icp', type: 'long-text', label: 'Who you explicitly do NOT want as a customer' },
  { key: 'icp_best_fit_example', section: 'icp', type: 'long-text', required: true, label: "Name one current customer who's a perfect fit — and why" },
  { key: 'icp_target_accounts_notes', section: 'icp', type: 'long-text', label: 'Top 10–20 target accounts (paste a list, or note that you uploaded one)' },
  { key: 'icp_target_accounts_upload', section: 'icp', type: 'upload', label: 'Upload target account list (optional)', uploadCategory: 'demandos-intake:target-accounts' },

  // gtm
  { key: 'gtm_primary_motion', section: 'gtm', type: 'single-select', required: true, label: 'Primary go-to-market motion', options: ['Outbound', 'Inbound', 'PLG', 'Events', 'Partner/Channel', 'Mixed'] },
  { key: 'gtm_active_channels', section: 'gtm', type: 'multi-select', label: 'Active channels today', options: ['Cold email', 'LinkedIn outbound', 'Paid search', 'Paid social', 'SEO/content', 'Webinars', 'Events', 'Partnerships', 'Referrals', 'Other'] },
  { key: 'gtm_internal_owner', section: 'gtm', type: 'short-text', required: true, label: 'Who owns demand gen internally (name, role)' },
  { key: 'gtm_other_vendors', section: 'gtm', type: 'long-text', label: 'Other agencies / vendors working in this space with you, and what they do' },

  // pipeline
  { key: 'pipeline_monthly_lead_volume', section: 'pipeline', type: 'short-text', label: 'Approx. monthly lead / MQL volume' },
  { key: 'pipeline_win_rate', section: 'pipeline', type: 'short-text', label: 'Approx. win rate (%)' },
  { key: 'pipeline_biggest_pain', section: 'pipeline', type: 'long-text', required: true, label: 'Biggest pipeline pain in one sentence' },
  { key: 'pipeline_crm_export', section: 'pipeline', type: 'upload', label: 'Upload CRM export or pipeline report (last 90 days)', uploadCategory: 'demandos-intake:pipeline-export' },
  { key: 'pipeline_dashboard_screenshots', section: 'pipeline', type: 'upload', label: 'Upload dashboard screenshots or metrics docs', uploadCategory: 'demandos-intake:pipeline-export' },

  // content
  { key: 'content_positioning', section: 'content', type: 'long-text', required: true, label: 'Current positioning / tagline in your own words' },
  { key: 'content_sales_deck', section: 'content', type: 'upload', label: 'Upload main sales deck', uploadCategory: 'demandos-intake:sales-deck' },
  { key: 'content_case_studies', section: 'content', type: 'upload', label: 'Upload case studies / one-pagers', uploadCategory: 'demandos-intake:case-study' },
  { key: 'content_brand_guidelines', section: 'content', type: 'upload', label: 'Upload brand guidelines (if any)', uploadCategory: 'demandos-intake:brand-guidelines' },
  { key: 'content_key_urls', section: 'content', type: 'long-text', label: 'Key page URLs (homepage, pricing, top blog post)' },

  // stack
  { key: 'stack_crm', section: 'stack', type: 'single-select', label: 'CRM', options: ['HubSpot', 'Salesforce', 'Pipedrive', 'Close', 'Attio', 'Other', 'None'] },
  { key: 'stack_marketing_automation', section: 'stack', type: 'single-select', label: 'Marketing automation', options: ['HubSpot', 'Marketo', 'Customer.io', 'ActiveCampaign', 'None', 'Other'] },
  { key: 'stack_analytics', section: 'stack', type: 'single-select', label: 'Analytics', options: ['GA4', 'Mixpanel', 'Amplitude', 'PostHog', 'None', 'Other'] },
  { key: 'stack_active_ad_accounts', section: 'stack', type: 'multi-select', label: 'Active ad accounts', options: ['Google', 'LinkedIn', 'Meta', 'X', 'TikTok', 'None'] },
  { key: 'stack_other_tools', section: 'stack', type: 'long-text', label: 'Other tools worth knowing' },

  // team
  { key: 'team_org_chart_upload', section: 'team', type: 'upload', label: 'Upload org chart (PDF, image, or link)', uploadCategory: 'demandos-intake:org-chart' },
  { key: 'team_primary_contact', section: 'team', type: 'long-text', required: true, label: 'Primary point of contact: name, role, email' },
  { key: 'team_decision_maker', section: 'team', type: 'long-text', label: 'Decision maker if different from primary contact' },
  { key: 'team_approvers', section: 'team', type: 'long-text', label: 'Who approves copy? Who approves budget?' },

  // goals
  { key: 'goals_90_day', section: 'goals', type: 'long-text', required: true, label: '90-day goal in one sentence' },
  { key: 'goals_annual', section: 'goals', type: 'long-text', required: true, label: 'Annual goal (revenue, pipeline, or logo target)' },
  { key: 'goals_winning_picture', section: 'goals', type: 'long-text', label: "What 'winning in 6 months' looks like" },
  { key: 'goals_biggest_concern', section: 'goals', type: 'long-text', required: true, label: 'Biggest concern / what would make this a failure' },
  { key: 'goals_seasonality', section: 'goals', type: 'long-text', label: 'Upcoming launches, seasonality, blackout periods' },

  // history
  { key: 'history_what_worked', section: 'history', type: 'long-text', label: "What's worked best in demand gen for you so far" },
  { key: 'history_what_failed', section: 'history', type: 'long-text', label: "What you've tried that didn't work, and why if you know" },
  { key: 'history_internal_obstacles', section: 'history', type: 'long-text', label: 'Internal obstacles I should know about (e.g., sales skeptical of marketing, brand is precious, legal is slow)' },
];

// Runtime self-validation — throws on import if config is malformed.
function validateQuestions(): void {
  const sectionSlugs = new Set(SECTIONS.map((s) => s.slug));
  const keys = new Set<string>();
  for (const q of QUESTIONS) {
    if (keys.has(q.key)) throw new Error(`Duplicate question key: ${q.key}`);
    keys.add(q.key);
    if (!sectionSlugs.has(q.section)) {
      throw new Error(`Question ${q.key} references unknown section ${q.section}`);
    }
    if ((q.type === 'single-select' || q.type === 'multi-select') && (!q.options || q.options.length === 0)) {
      throw new Error(`Question ${q.key} is ${q.type} but has no options`);
    }
    if (q.type === 'upload' && !q.uploadCategory) {
      throw new Error(`Question ${q.key} is upload but has no uploadCategory`);
    }
  }
}
validateQuestions();

export function questionsBySection(slug: string): ReadonlyArray<Question> {
  return QUESTIONS.filter((q) => q.section === slug);
}

export function requiredKeys(): string[] {
  return QUESTIONS.filter((q) => q.required).map((q) => q.key);
}
```

- [ ] **Step 2: Verify the module compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no type errors. If there are errors unrelated to this file, note them but don't fix them here.

- [ ] **Step 3: Verify validation runs**

Create a temp script at repo root: `node -e "require('./apps/web/lib/demandos-intake/questions.ts')"` won't work (TS). Instead, add a one-off import in any existing client component temporarily OR trust that `tsc` + the subsequent tasks that import this file will surface errors. Skip verification step if `tsc` passed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/demandos-intake/questions.ts
git commit -m "feat(demandos-intake): add questions config with runtime validation"
```

---

## Task 6: API route — GET + POST `/api/client/demandos-intake`

GET loads the intake (upserts an empty row on first hit) plus this enrollment's documents filtered to `demandos-intake:*` categories. POST merges a single `{key, value}` into the `answers` JSONB without clobbering other keys.

**Files:**
- Create: `apps/web/app/api/client/demandos-intake/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// apps/web/app/api/client/demandos-intake/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

async function resolveEnrollment() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const admin = getSupabaseServerClient();
  const { data: enrollment, error } = await admin
    .from('client_enrollments')
    .select('id, user_id, program_id, client_programs:program_id ( slug, has_demandos_intake )')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (error || !enrollment) return { error: 'Enrollment not found' as const, status: 404 };

  const program = Array.isArray(enrollment.client_programs)
    ? enrollment.client_programs[0]
    : enrollment.client_programs;
  if (!program?.has_demandos_intake) {
    return { error: 'Program does not have DemandOS intake enabled' as const, status: 403 };
  }

  return { user, enrollmentId: enrollment.id, admin };
}

export async function GET() {
  const resolved = await resolveEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  // Upsert an empty intake row if missing.
  await admin
    .from('demandos_intake')
    .upsert({ enrollment_id: enrollmentId }, { onConflict: 'enrollment_id', ignoreDuplicates: true });

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('id, answers, submitted_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .single();

  const { data: documents } = await admin
    .from('client_documents')
    .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
    .eq('enrollment_id', enrollmentId)
    .like('category', 'demandos-intake:%')
    .order('uploaded_at', { ascending: false });

  return NextResponse.json({
    enrollmentId,
    intake: intake ?? { answers: {}, submitted_at: null },
    documents: documents ?? [],
  });
}

export async function POST(request: NextRequest) {
  const resolved = await resolveEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'Body must be { key: string, value: unknown }' }, { status: 400 });
  }
  const { key, value } = body as { key: string; value: unknown };

  // Read current, merge, write.
  const { data: current } = await admin
    .from('demandos_intake')
    .select('answers')
    .eq('enrollment_id', enrollmentId)
    .single();

  const merged = { ...(current?.answers ?? {}), [key]: value };

  const { error } = await admin
    .from('demandos_intake')
    .update({ answers: merged })
    .eq('enrollment_id', enrollmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Start dev server**

Run: `cd apps/web && npm run dev`
Leave running in background.

- [ ] **Step 3: Smoke-test as an authenticated DemandOS client**

Open a browser tab, log in as a user enrolled in a DemandOS program. In devtools console:

```javascript
await fetch('/api/client/demandos-intake').then(r => r.json())
```
Expected: `{ enrollmentId, intake: { answers: {}, ... }, documents: [] }`.

Then:
```javascript
await fetch('/api/client/demandos-intake', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'company_name', value: 'Acme' }) }).then(r => r.json())
```
Expected: `{ success: true }`.

Re-fetch GET and verify `answers.company_name === 'Acme'`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/client/demandos-intake/route.ts
git commit -m "feat(demandos-intake): add GET/POST /api/client/demandos-intake for load + autosave"
```

---

## Task 7: API route — `POST /api/client/demandos-intake/submit` + Loops hook

Flips `submitted_at` and fires a Loops email to Tim. Also extends `apps/web/lib/loops.ts` with a new helper.

**Files:**
- Modify: `apps/web/lib/loops.ts` (append `onDemandosIntakeSubmitted`)
- Create: `apps/web/app/api/client/demandos-intake/submit/route.ts`

- [ ] **Step 1: Append `onDemandosIntakeSubmitted` to `apps/web/lib/loops.ts`**

The file already exports `sendEvent({ email, eventName, eventProperties })` and a series of `on*` helpers (e.g., `onCallLabSignup`) that all delegate to `sendEvent`. Follow that exact pattern. Append this at the end of the file:

```typescript
// apps/web/lib/loops.ts  (append)

/**
 * Fire when a DemandOS client submits their intake form.
 */
export async function onDemandosIntakeSubmitted(
  email: string,
  companyName: string,
  programName: string,
  enrollmentId: string,
  reviewUrl: string
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    email,
    eventName: 'demandos_intake_submitted',
    eventProperties: {
      companyName: companyName || '',
      programName: programName || '',
      enrollmentId,
      reviewUrl,
    },
  });
}
```

- [ ] **Step 2: Verify the import path from `loops.ts` used elsewhere**

Run: `grep -rn "from '@/lib/loops'" apps/web/app | head -3`
Expected: see at least one existing import (e.g., from `apps/web/app/api/client/onboarding/route.ts`). Confirm the alias `@/lib/loops` is correct — use the same in Step 3.

- [ ] **Step 3: Create the submit route**

```typescript
// apps/web/app/api/client/demandos-intake/submit/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { onDemandosIntakeSubmitted } from '@/lib/loops';
import { requiredKeys } from '@/lib/demandos-intake/questions';

export async function POST() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseServerClient();

  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id, program_id, client_programs:program_id ( name, has_demandos_intake ), user_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

  const program = Array.isArray(enrollment.client_programs)
    ? enrollment.client_programs[0]
    : enrollment.client_programs;
  if (!program?.has_demandos_intake) {
    return NextResponse.json({ error: 'Not a DemandOS enrollment' }, { status: 403 });
  }

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('answers')
    .eq('enrollment_id', enrollment.id)
    .single();

  const answers = (intake?.answers ?? {}) as Record<string, unknown>;
  const missing = requiredKeys().filter((k) => {
    const v = answers[k];
    return v === undefined || v === null || v === '';
  });
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Required fields missing', missingKeys: missing },
      { status: 400 }
    );
  }

  const { error: updateErr } = await admin
    .from('demandos_intake')
    .update({ submitted_at: new Date().toISOString() })
    .eq('enrollment_id', enrollment.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const companyName = typeof answers.company_name === 'string' ? answers.company_name : '';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.wtf-os.com';
  const reviewUrl = `${baseUrl}/admin/demandos-intake/${enrollment.id}`;

  await onDemandosIntakeSubmitted(
    user.email ?? '',
    companyName,
    program?.name ?? '',
    enrollment.id,
    reviewUrl,
  ).catch((err) => console.error('Loops notification failed:', err));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Smoke-test**

With dev server running, as the same DemandOS-enrolled user:

```javascript
await fetch('/api/client/demandos-intake/submit', { method: 'POST' }).then(r => r.json())
```
Expected on a fresh intake with missing required fields: `{ error: 'Required fields missing', missingKeys: [...] }` with status 400.

Fill in all required fields via autosave POSTs (Task 6's test), then re-submit. Expected: `{ success: true }`.

Verify in SQL: `SELECT submitted_at FROM demandos_intake WHERE enrollment_id = '...';` → non-null timestamp.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/loops.ts apps/web/app/api/client/demandos-intake/submit/route.ts
git commit -m "feat(demandos-intake): add submit endpoint + Loops notification helper"
```

---

## Task 8: API route — POST + DELETE `/api/client/documents`

POST issues a signed upload URL and persists a `client_documents` row. DELETE removes both the row and the Storage object.

**Files:**
- Create: `apps/web/app/api/client/documents/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// apps/web/app/api/client/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

const BUCKET = 'client-documents';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

async function getAuthedEnrollment() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: 'Unauthorized' as const, status: 401 };

  const admin = getSupabaseServerClient();
  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!enrollment) return { error: 'Enrollment not found' as const, status: 404 };
  return { user, enrollmentId: enrollment.id, admin };
}

/**
 * POST — two modes:
 *   1. { mode: 'sign', category, fileName, mimeType, sizeBytes }
 *      → returns { storagePath, uploadUrl, token } for direct-to-storage PUT.
 *   2. { mode: 'commit', storagePath, category, fileName, mimeType, sizeBytes }
 *      → after successful PUT, inserts the row in client_documents.
 */
export async function POST(request: NextRequest) {
  const resolved = await getAuthedEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { user, enrollmentId, admin } = resolved;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const mode = (body as { mode?: string }).mode;

  if (mode === 'sign') {
    const { category, fileName, sizeBytes } = body as {
      category?: string; fileName?: string; sizeBytes?: number;
    };
    if (!category || !fileName) {
      return NextResponse.json({ error: 'category and fileName required' }, { status: 400 });
    }
    if (typeof sizeBytes === 'number' && sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_BYTES} bytes` }, { status: 400 });
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${enrollmentId}/${category}/${randomUUID()}-${safeName}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
    }
    return NextResponse.json({ storagePath, uploadUrl: data.signedUrl, token: data.token });
  }

  if (mode === 'commit') {
    const { storagePath, category, fileName, mimeType, sizeBytes, title } = body as {
      storagePath?: string; category?: string; fileName?: string;
      mimeType?: string; sizeBytes?: number; title?: string;
    };
    if (!storagePath || !category || !fileName) {
      return NextResponse.json({ error: 'storagePath, category, fileName required' }, { status: 400 });
    }
    if (!storagePath.startsWith(`${enrollmentId}/`)) {
      return NextResponse.json({ error: 'storagePath does not belong to your enrollment' }, { status: 403 });
    }

    const { data: inserted, error } = await admin
      .from('client_documents')
      .insert({
        enrollment_id: enrollmentId,
        category,
        title: title ?? fileName,
        document_type: 'file',
        file_name: fileName,
        storage_path: storagePath,
        mime_type: mimeType ?? null,
        size_bytes: sizeBytes ?? null,
        uploaded_by: user.id,
      })
      .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: inserted });
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}

/**
 * DELETE /api/client/documents?id=<uuid>
 */
export async function DELETE(request: NextRequest) {
  const resolved = await getAuthedEnrollment();
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { enrollmentId, admin } = resolved;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { data: doc } = await admin
    .from('client_documents')
    .select('id, enrollment_id, storage_path')
    .eq('id', id)
    .single();

  if (!doc || doc.enrollment_id !== enrollmentId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.storage_path) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]);
  }
  const { error } = await admin.from('client_documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Smoke-test sign flow**

In the devtools console of a logged-in DemandOS client:

```javascript
const sign = await fetch('/api/client/documents', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ mode: 'sign', category: 'demandos-intake:org-chart', fileName: 'test.pdf', sizeBytes: 1234 })
}).then(r => r.json());
console.log(sign);
```
Expected: `{ storagePath: "<enrollmentId>/demandos-intake:org-chart/<uuid>-test.pdf", uploadUrl: "<url>", token: "<token>" }`.

- [ ] **Step 3: Smoke-test PUT to signed URL + commit**

```javascript
const blob = new Blob(['hello'], { type: 'application/pdf' });
await fetch(sign.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'application/pdf' } });
const committed = await fetch('/api/client/documents', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ mode: 'commit', storagePath: sign.storagePath, category: 'demandos-intake:org-chart', fileName: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 5 })
}).then(r => r.json());
console.log(committed);
```
Expected: `{ document: { id, category, ... } }`.

- [ ] **Step 4: Smoke-test delete**

```javascript
await fetch(`/api/client/documents?id=${committed.document.id}`, { method: 'DELETE' }).then(r => r.json());
```
Expected: `{ success: true }`. Confirm the row is gone in SQL.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/client/documents/route.ts
git commit -m "feat(client-documents): add signed-upload + commit + delete endpoints"
```

---

## Task 9: `DocumentUploadSlot` component

Reusable upload slot. Drag-drop + click, calls the documents API, lists existing uploads, allows delete.

**Files:**
- Create: `apps/web/components/client/DocumentUploadSlot.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/client/DocumentUploadSlot.tsx
'use client';

import { useState } from 'react';

export type ExistingDoc = {
  id: string;
  category: string;
  title: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

type Props = {
  category: string;
  label: string;
  existing: ExistingDoc[];
  readOnly?: boolean;
  onChange?: (docs: ExistingDoc[]) => void;
  helpText?: string;
};

const MAX_MB = 20;

export default function DocumentUploadSlot({
  category, label, existing, readOnly, onChange, helpText,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localDocs, setLocalDocs] = useState<ExistingDoc[]>(existing);

  function push(docs: ExistingDoc[]) {
    setLocalDocs(docs);
    onChange?.(docs);
  }

  async function uploadOne(file: File): Promise<void> {
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`File too large: ${file.name} exceeds ${MAX_MB} MB`);
      return;
    }
    const sign = await fetch('/api/client/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sign', category, fileName: file.name, sizeBytes: file.size }),
    }).then((r) => r.json());
    if (!sign.uploadUrl) {
      alert('Upload failed: ' + (sign.error ?? 'unknown'));
      return;
    }
    const put = await fetch(sign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!put.ok) {
      alert('Upload to storage failed: ' + put.statusText);
      return;
    }
    const commit = await fetch('/api/client/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'commit',
        storagePath: sign.storagePath,
        category,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    }).then((r) => r.json());
    if (!commit.document) {
      alert('Upload record failed: ' + (commit.error ?? 'unknown'));
      return;
    }
    push([commit.document, ...localDocs]);
  }

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await uploadOne(f);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this file?')) return;
    const res = await fetch(`/api/client/documents?id=${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) {
      push(localDocs.filter((d) => d.id !== id));
    } else {
      alert('Delete failed: ' + (res.error ?? 'unknown'));
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-300">{label}</div>
      {helpText && <div className="text-xs text-gray-500">{helpText}</div>}

      {!readOnly && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          className={`block w-full border-2 border-dashed p-6 cursor-pointer text-center transition-colors ${
            dragOver ? 'border-[#E51B23] bg-[#E51B23]/10' : 'border-[#333333] bg-black'
          }`}
        >
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.currentTarget.value = ''; }}
          />
          <div className="text-sm text-gray-400">
            {uploading ? 'Uploading…' : 'Drop files here or click to choose'}
          </div>
          <div className="text-xs text-gray-600 mt-1">Max {MAX_MB} MB per file</div>
        </label>
      )}

      {localDocs.length > 0 && (
        <ul className="divide-y divide-[#333333] border border-[#333333]">
          {localDocs.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm text-gray-200">
              <div className="truncate">
                <div>{d.file_name}</div>
                <div className="text-xs text-gray-500">
                  {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="text-xs uppercase tracking-wider text-[#E51B23] hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `tsc --noEmit` passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/client/DocumentUploadSlot.tsx
git commit -m "feat(client-documents): add generic DocumentUploadSlot component"
```

---

## Task 10: `QuestionField` component

Single component that dispatches on `question.type`. Emits `onChange(value)` to the parent.

**Files:**
- Create: `apps/web/components/client/demandos-intake/QuestionField.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/client/demandos-intake/QuestionField.tsx
'use client';

import type { Question } from '@/lib/demandos-intake/questions';
import DocumentUploadSlot, { type ExistingDoc } from '@/components/client/DocumentUploadSlot';

type Props = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  documents?: ExistingDoc[];
  onDocumentsChange?: (docs: ExistingDoc[]) => void;
};

const inputClass =
  'w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none text-sm';

export default function QuestionField({
  question, value, onChange, onBlur, readOnly, documents, onDocumentsChange,
}: Props) {
  const { type, label, help, options, placeholder } = question;

  if (type === 'upload') {
    return (
      <DocumentUploadSlot
        category={question.uploadCategory!}
        label={label}
        helpText={help}
        existing={documents ?? []}
        readOnly={readOnly}
        onChange={onDocumentsChange}
      />
    );
  }

  const fieldLabel = (
    <>
      <label className="block text-sm text-gray-300 mb-1">
        {label}
        {question.required && <span className="text-[#E51B23] ml-1">*</span>}
      </label>
      {help && <p className="text-xs text-gray-500 mb-2">{help}</p>}
    </>
  );

  if (readOnly) {
    const display = (() => {
      if (Array.isArray(value)) return value.join(', ');
      if (value === undefined || value === null || value === '') return <span className="text-gray-600">—</span>;
      return String(value);
    })();
    return (
      <div>
        {fieldLabel}
        <div className="text-sm text-gray-200 whitespace-pre-wrap">{display}</div>
      </div>
    );
  }

  if (type === 'short-text' || type === 'url') {
    return (
      <div>
        {fieldLabel}
        <input
          type={type === 'url' ? 'url' : 'text'}
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'long-text') {
    return (
      <div>
        {fieldLabel}
        <textarea
          className={inputClass}
          rows={4}
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div>
        {fieldLabel}
        <input
          type="number"
          className={inputClass}
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'single-select') {
    return (
      <div>
        {fieldLabel}
        <select
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => { onChange(e.target.value); onBlur?.(); }}
        >
          <option value="">— choose —</option>
          {(options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  if (type === 'multi-select') {
    const current = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      onChange(next);
      onBlur?.();
    };
    return (
      <div>
        {fieldLabel}
        <div className="flex flex-wrap gap-2">
          {(options ?? []).map((opt) => {
            const on = current.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className={`px-3 py-1.5 border text-xs uppercase tracking-wider transition-colors ${
                  on
                    ? 'border-[#E51B23] bg-[#E51B23]/20 text-white'
                    : 'border-[#333333] bg-black text-gray-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: `tsc --noEmit` passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/client/demandos-intake/QuestionField.tsx
git commit -m "feat(demandos-intake): add QuestionField dispatcher component"
```

---

## Task 11: `SectionNav` component

Left rail with section titles, highlights current, shows a check when section's required fields are complete.

**Files:**
- Create: `apps/web/components/client/demandos-intake/SectionNav.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/client/demandos-intake/SectionNav.tsx
'use client';

import { SECTIONS, QUESTIONS } from '@/lib/demandos-intake/questions';

type Props = {
  activeSlug: string;
  onSelect: (slug: string) => void;
  answers: Record<string, unknown>;
};

function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export default function SectionNav({ activeSlug, onSelect, answers }: Props) {
  const completion = SECTIONS.map((s) => {
    const required = QUESTIONS.filter((q) => q.section === s.slug && q.required);
    if (required.length === 0) return { slug: s.slug, complete: true };
    const complete = required.every((q) => isAnswered(answers[q.key]));
    return { slug: s.slug, complete };
  });
  const statusBySlug = Object.fromEntries(completion.map((c) => [c.slug, c.complete]));

  return (
    <nav className="space-y-1">
      {SECTIONS.map((s) => {
        const active = s.slug === activeSlug;
        const complete = statusBySlug[s.slug];
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onSelect(s.slug)}
            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between border-l-2 ${
              active
                ? 'border-[#E51B23] bg-white/5 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>{s.title}</span>
            {complete && <span className="text-[#E51B23] text-xs">✓</span>}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: `tsc --noEmit` passes**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/client/demandos-intake/SectionNav.tsx
git commit -m "feat(demandos-intake): add SectionNav with required-field completion check"
```

---

## Task 12: `IntakeForm` orchestrator

Assembles SectionNav + QuestionField grid. Handles autosave on blur, submit button, read-only mode.

**Files:**
- Create: `apps/web/components/client/demandos-intake/IntakeForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/client/demandos-intake/IntakeForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { SECTIONS, QUESTIONS, requiredKeys, questionsBySection } from '@/lib/demandos-intake/questions';
import QuestionField from './QuestionField';
import SectionNav from './SectionNav';
import type { ExistingDoc } from '@/components/client/DocumentUploadSlot';

type Props = {
  initialAnswers: Record<string, unknown>;
  initialDocuments: ExistingDoc[];
  submittedAt: string | null;
  readOnly?: boolean;
};

export default function IntakeForm({
  initialAnswers, initialDocuments, submittedAt, readOnly,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [documents, setDocuments] = useState<ExistingDoc[]>(initialDocuments);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].slug);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(submittedAt !== null);

  const questionsInSection = useMemo(() => questionsBySection(activeSection), [activeSection]);

  async function saveOne(key: string, value: unknown) {
    if (readOnly || submitted) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function persistBlur(key: string) {
    if (readOnly || submitted) return;
    const value = answers[key];
    const res = await fetch('/api/client/demandos-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      console.error('Autosave failed for', key);
    }
  }

  function onDocumentsChange(next: ExistingDoc[]) {
    setDocuments(next);
  }

  async function handleSubmit() {
    const missing = requiredKeys().filter((k) => {
      const v = answers[k];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length > 0) {
      const firstMissing = QUESTIONS.find((q) => q.key === missing[0]);
      if (firstMissing) setActiveSection(firstMissing.section);
      alert(`${missing.length} required question${missing.length === 1 ? '' : 's'} still open. Please complete all required fields (marked with *).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/client/demandos-intake/submit', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        alert('Submit failed: ' + (body.error ?? 'unknown'));
        return;
      }
      setSubmitted(true);
      alert('Thank you. Your intake has been submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeSectionMeta = SECTIONS.find((s) => s.slug === activeSection)!;
  const docsForCategory = (cat: string) => documents.filter((d) => d.category === cat);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[#333333] px-6 py-5">
        <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Demand OS Intake</h1>
        <p className="text-xs text-gray-500 mt-1">
          {submitted ? 'Submitted — view only' : 'Your answers save automatically as you go.'}
        </p>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-[#333333] min-h-[calc(100vh-80px)] py-6">
          <SectionNav activeSlug={activeSection} onSelect={setActiveSection} answers={answers} />
        </aside>

        <main className="flex-1 px-10 py-8 max-w-3xl">
          <h2 className="text-xl font-anton uppercase mb-6">{activeSectionMeta.title}</h2>

          <div className="space-y-6">
            {questionsInSection.map((q) => (
              <QuestionField
                key={q.key}
                question={q}
                value={answers[q.key]}
                onChange={(v) => saveOne(q.key, v)}
                onBlur={() => persistBlur(q.key)}
                readOnly={readOnly || submitted}
                documents={q.uploadCategory ? docsForCategory(q.uploadCategory) : undefined}
                onDocumentsChange={q.type === 'upload' ? onDocumentsChange : undefined}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#333333]">
            <button
              type="button"
              disabled={SECTIONS.findIndex((s) => s.slug === activeSection) === 0}
              onClick={() => {
                const i = SECTIONS.findIndex((s) => s.slug === activeSection);
                if (i > 0) setActiveSection(SECTIONS[i - 1].slug);
              }}
              className="text-xs uppercase tracking-wider text-gray-400 disabled:opacity-30"
            >
              ← Prev
            </button>

            {activeSection === SECTIONS[SECTIONS.length - 1].slug ? (
              !submitted && !readOnly && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="bg-[#E51B23] text-white px-6 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Intake'}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.slug === activeSection);
                  if (i < SECTIONS.length - 1) setActiveSection(SECTIONS[i + 1].slug);
                }}
                className="text-xs uppercase tracking-wider text-white"
              >
                Next →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `tsc --noEmit` passes**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/client/demandos-intake/IntakeForm.tsx
git commit -m "feat(demandos-intake): add IntakeForm orchestrator with autosave + submit"
```

---

## Task 13: Page — `/client/demandos-intake`

Client-facing entry point. Auth-checks, fetches intake + docs, renders `IntakeForm`.

**Files:**
- Create: `apps/web/app/client/demandos-intake/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// apps/web/app/client/demandos-intake/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import IntakeForm from '@/components/client/demandos-intake/IntakeForm';
import type { ExistingDoc } from '@/components/client/DocumentUploadSlot';

export default function DemandosIntakePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    answers: Record<string, unknown>;
    documents: ExistingDoc[];
    submittedAt: string | null;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      const res = await fetch('/api/client/demandos-intake');
      if (res.status === 401) { router.push('/client/login'); return; }
      if (res.status === 403) {
        // Not a DemandOS enrollment — send to dashboard.
        router.push('/client/dashboard');
        return;
      }
      if (res.status === 404) { router.push('/client/login'); return; }

      const body = await res.json();
      setData({
        answers: body.intake?.answers ?? {},
        documents: body.documents ?? [],
        submittedAt: body.intake?.submitted_at ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <IntakeForm
      initialAnswers={data.answers}
      initialDocuments={data.documents}
      submittedAt={data.submittedAt}
    />
  );
}
```

- [ ] **Step 2: Manually verify**

Log in as a DemandOS-enrolled test user. Navigate to `http://localhost:3000/client/demandos-intake`. Expected: form renders with empty fields, section nav on left. Fill in `company_name`, move to another section (or blur) — verify in SQL `SELECT answers FROM demandos_intake WHERE enrollment_id = '...';` that the value persisted.

Log in as a non-DemandOS client (e.g. agency-studio). Navigate to the same URL. Expected: redirected to `/client/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/client/demandos-intake/page.tsx
git commit -m "feat(demandos-intake): add /client/demandos-intake page"
```

---

## Task 14: Page — `/client/demandos-intake/review` (read-only)

Same data, read-only view. Reuses `IntakeForm` with `readOnly`.

**Files:**
- Create: `apps/web/app/client/demandos-intake/review/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// apps/web/app/client/demandos-intake/review/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import IntakeForm from '@/components/client/demandos-intake/IntakeForm';
import type { ExistingDoc } from '@/components/client/DocumentUploadSlot';

export default function DemandosIntakeReviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    answers: Record<string, unknown>;
    documents: ExistingDoc[];
    submittedAt: string | null;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      const res = await fetch('/api/client/demandos-intake');
      if (!res.ok) { router.push('/client/dashboard'); return; }

      const body = await res.json();
      setData({
        answers: body.intake?.answers ?? {},
        documents: body.documents ?? [],
        submittedAt: body.intake?.submitted_at ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <IntakeForm
      initialAnswers={data.answers}
      initialDocuments={data.documents}
      submittedAt={data.submittedAt}
      readOnly
    />
  );
}
```

- [ ] **Step 2: Verify manually**

Navigate to `/client/demandos-intake/review`. Expected: same data, but inputs are replaced with rendered text values, no upload dropzones, no submit button.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/client/demandos-intake/review/page.tsx
git commit -m "feat(demandos-intake): add /client/demandos-intake/review read-only view"
```

---

## Task 15: Admin API + page — `/admin/demandos-intake/[enrollmentId]`

Coach-facing read-only view using the repo's existing `ADMIN_API_KEY` Bearer pattern.

**Files:**
- Create: `apps/web/app/api/admin/demandos-intake/[enrollmentId]/route.ts`
- Create: `apps/web/app/admin/demandos-intake/[enrollmentId]/page.tsx`

- [ ] **Step 1: Write the admin API route**

```typescript
// apps/web/app/api/admin/demandos-intake/[enrollmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const BUCKET = 'client-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enrollmentId } = await params;
  const admin = getSupabaseServerClient();

  const { data: enrollment, error: enrollErr } = await admin
    .from('client_enrollments')
    .select('id, user_id, program_id, client_programs:program_id ( slug, name )')
    .eq('id', enrollmentId)
    .single();

  if (enrollErr || !enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  const { data: intake } = await admin
    .from('demandos_intake')
    .select('answers, submitted_at, updated_at')
    .eq('enrollment_id', enrollmentId)
    .single();

  const { data: rawDocs } = await admin
    .from('client_documents')
    .select('id, category, title, file_name, storage_path, mime_type, size_bytes, uploaded_at')
    .eq('enrollment_id', enrollmentId)
    .like('category', 'demandos-intake:%');

  const docsWithUrls = await Promise.all(
    (rawDocs ?? []).map(async (d) => {
      let signedUrl: string | null = null;
      if (d.storage_path) {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(d.storage_path, SIGNED_URL_TTL_SECONDS);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...d, signedUrl };
    })
  );

  return NextResponse.json({
    enrollment,
    intake: intake ?? null,
    documents: docsWithUrls,
  });
}
```

- [ ] **Step 2: Write the admin page**

```tsx
// apps/web/app/admin/demandos-intake/[enrollmentId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SECTIONS, QUESTIONS } from '@/lib/demandos-intake/questions';

type AdminDoc = {
  id: string; category: string; title: string | null; file_name: string;
  storage_path: string; mime_type: string | null; size_bytes: number | null;
  uploaded_at: string; signedUrl: string | null;
};

type AdminResponse = {
  enrollment: { id: string; user_id: string; client_programs: { slug: string; name: string } | { slug: string; name: string }[] };
  intake: { answers: Record<string, unknown>; submitted_at: string | null; updated_at: string } | null;
  documents: AdminDoc[];
};

export default function AdminDemandosIntakePage() {
  const params = useParams<{ enrollmentId: string }>();
  const enrollmentId = params.enrollmentId;
  const [apiKey, setApiKey] = useState('');
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/demandos-intake/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? 'Failed'); return; }
      setData(body);
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <h1 className="text-xl font-bold mb-4">DemandOS Intake — Admin View</h1>
        <p className="text-sm text-slate-400 mb-4">Enter admin API key:</p>
        <div className="flex gap-2 max-w-md">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          />
          <button
            onClick={load}
            disabled={!apiKey || loading}
            className="bg-[#E51B23] px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
      </div>
    );
  }

  const answers = data.intake?.answers ?? {};
  const program = Array.isArray(data.enrollment.client_programs)
    ? data.enrollment.client_programs[0]
    : data.enrollment.client_programs;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">DemandOS Intake</h1>
      <p className="text-sm text-slate-400 mb-6">
        Program: {program?.name} · Enrollment: {enrollmentId}<br/>
        {data.intake?.submitted_at
          ? `Submitted: ${new Date(data.intake.submitted_at).toLocaleString()}`
          : 'Not yet submitted'}
      </p>

      {SECTIONS.map((s) => {
        const qs = QUESTIONS.filter((q) => q.section === s.slug);
        return (
          <section key={s.slug} className="mb-8 border-t border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-[#E51B23] uppercase tracking-wider mb-4">{s.title}</h2>
            <div className="space-y-4">
              {qs.map((q) => {
                if (q.type === 'upload') {
                  const docs = data.documents.filter((d) => d.category === q.uploadCategory);
                  return (
                    <div key={q.key}>
                      <div className="text-xs text-slate-400 mb-1">{q.label}</div>
                      {docs.length === 0 ? (
                        <div className="text-slate-600 text-sm">— no files —</div>
                      ) : (
                        <ul className="space-y-1">
                          {docs.map((d) => (
                            <li key={d.id} className="text-sm">
                              {d.signedUrl
                                ? <a href={d.signedUrl} target="_blank" rel="noreferrer" className="text-[#E51B23] underline">{d.file_name}</a>
                                : d.file_name}
                              {d.size_bytes ? <span className="text-slate-600 ml-2">({(d.size_bytes / 1024).toFixed(1)} KB)</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                }
                const v = answers[q.key];
                const display = Array.isArray(v) ? v.join(', ') : (v === undefined || v === null || v === '') ? '—' : String(v);
                return (
                  <div key={q.key}>
                    <div className="text-xs text-slate-400 mb-1">{q.label}</div>
                    <div className="text-sm whitespace-pre-wrap">{display}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/admin/demandos-intake/<real-enrollment-id>`. Paste `ADMIN_API_KEY` from `.env`. Expected: all sections render, answers show, uploaded files have clickable signed URLs that open the file.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/demandos-intake/[enrollmentId]/route.ts \
        apps/web/app/admin/demandos-intake/[enrollmentId]/page.tsx
git commit -m "feat(admin): add DemandOS intake review page for coach"
```

---

## Task 16: Dashboard CTA + legacy onboarding redirect

Two small edits to existing pages. Dashboard surfaces the intake CTA. `/client/onboarding` redirects DemandOS enrollments to `/client/demandos-intake` instead of showing the agency wizard.

**Files:**
- Modify: `apps/web/app/client/dashboard/page.tsx`
- Modify: `apps/web/app/client/onboarding/page.tsx`

- [ ] **Step 1: Read the current dashboard page to find the right insertion spot**

Run: `head -120 apps/web/app/client/dashboard/page.tsx`

Look for where `enrollment` is loaded and where cards/CTAs are rendered. Note the pattern in use — likely maps over features based on enrollment flags.

- [ ] **Step 2: Modify `/client/onboarding` to redirect DemandOS enrollments**

In `apps/web/app/client/onboarding/page.tsx`, replace the existing `checkEnrollment` function's enrollment query to also select `program_id, client_programs:program_id ( has_demandos_intake )` and add a redirect branch.

Locate this block (around lines 18-30):

```typescript
const { data: enrollment } = await supabase
  .from('client_enrollments')
  .select('id, onboarding_completed')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .single();

if (!enrollment) {
  router.push('/client/login');
  return;
}

if (enrollment.onboarding_completed) {
  router.push('/client/dashboard');
  return;
}
```

Replace with:

```typescript
const { data: enrollment } = await supabase
  .from('client_enrollments')
  .select('id, onboarding_completed, program_id, client_programs:program_id ( has_demandos_intake )')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .single();

if (!enrollment) {
  router.push('/client/login');
  return;
}

const program = Array.isArray(enrollment.client_programs)
  ? enrollment.client_programs[0]
  : enrollment.client_programs;
if (program?.has_demandos_intake) {
  router.push('/client/demandos-intake');
  return;
}

if (enrollment.onboarding_completed) {
  router.push('/client/dashboard');
  return;
}
```

- [ ] **Step 3: Modify `/client/dashboard` to surface the DemandOS intake CTA**

Inside the dashboard page where enrollment is loaded, add a parallel query for the intake state and conditionally render a CTA near the top.

Add near the existing data loading:

```typescript
// inside the dashboard's load effect, after you have `enrollment`:
const program = Array.isArray(enrollment.client_programs)
  ? enrollment.client_programs[0]
  : enrollment.client_programs;

let demandosIntakeStatus: 'none' | 'in-progress' | 'submitted' = 'none';
if (program?.has_demandos_intake) {
  const { data: intake } = await supabase
    .from('demandos_intake')
    .select('submitted_at, answers')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle();
  if (intake?.submitted_at) {
    demandosIntakeStatus = 'submitted';
  } else if (intake && intake.answers && Object.keys(intake.answers).length > 0) {
    demandosIntakeStatus = 'in-progress';
  } else {
    demandosIntakeStatus = 'none';
  }
}
setDemandosIntakeStatus(demandosIntakeStatus);
```

Add the state declaration at the top of the component: `const [demandosIntakeStatus, setDemandosIntakeStatus] = useState<'none' | 'in-progress' | 'submitted' | null>(null);`.

Also extend the enrollment select to include the program flag: `.select('..., client_programs:program_id ( ..., has_demandos_intake )')` (extend the existing select — do not replace it; keep any columns the dashboard already uses).

Add this card at the top of the dashboard render, above existing cards:

```tsx
{demandosIntakeStatus === 'none' || demandosIntakeStatus === 'in-progress' ? (
  <a
    href="/client/demandos-intake"
    className="block bg-[#E51B23] text-white px-6 py-4 mb-6 hover:bg-red-700 transition-colors"
  >
    <div className="text-xs uppercase tracking-wider opacity-80">
      {demandosIntakeStatus === 'in-progress' ? 'Continue' : 'Required'}
    </div>
    <div className="text-lg font-bold">
      {demandosIntakeStatus === 'in-progress' ? 'Finish your Demand OS intake' : 'Complete your Demand OS intake'}
    </div>
    <div className="text-sm opacity-80 mt-1">
      ~20 minutes. Your answers help me prepare for our kickoff.
    </div>
  </a>
) : null}
```

If `demandosIntakeStatus === 'submitted'` you can optionally render a small "View your intake" link pointing to `/client/demandos-intake/review`. Not required for v1.

- [ ] **Step 4: Verify both flows**

1. Log in as a DemandOS-enrolled user who has NOT completed intake. Navigate to `/client/onboarding`. Expected: redirects to `/client/demandos-intake`.
2. Navigate to `/client/dashboard`. Expected: big red "Complete your Demand OS intake" card is visible at the top.
3. Log in as an agency-studio enrollment. Navigate to `/client/onboarding`. Expected: the original 10-step wizard still renders (unchanged behavior). No intake card on dashboard.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/client/onboarding/page.tsx apps/web/app/client/dashboard/page.tsx
git commit -m "feat(demandos-intake): surface dashboard CTA + redirect legacy onboarding for DemandOS programs"
```

---

## Task 17: Manual verification checklist

No unit tests in repo. This task is a gated QA pass on a live dev server plus any small fixes surfaced.

**Files:** none to create. Record any fixes as individual commits.

- [ ] **Step 1: Boot dev server fresh**

Run: `cd apps/web && npm run dev`
Open: `http://localhost:3000`

- [ ] **Step 2: Pilot flow — DemandOS client happy path**

Pre-req: an active enrollment exists for a test user linked to a DemandOS program (`demandos-studio`, `demandos-growth`, or `demandos-team`).

Checklist:
- [ ] Log in as that user.
- [ ] Navigate to `/client/dashboard` → CTA card is visible and red.
- [ ] Click the card → lands at `/client/demandos-intake`.
- [ ] Fill in a short-text field → blur → verify in SQL the `answers` JSONB picked it up.
- [ ] Fill in a multi-select (toggle 2 chips) → verify array saved.
- [ ] Upload a file to `demandos-intake:org-chart` slot → appears in the list → refresh page → still there.
- [ ] Delete the uploaded file → disappears → row gone from `client_documents`.
- [ ] Attempt to submit with required fields missing → `alert` prompts to finish, sets active section to first-missing.
- [ ] Fill all required fields → Submit Intake → success alert.
- [ ] Verify `demandos_intake.submitted_at` is set.
- [ ] Verify the Loops event fired (check Loops dashboard or server logs for the `demandos_intake_submitted` event).
- [ ] Verify `/client/demandos-intake/review` shows the same data in read-only mode.
- [ ] Re-visit `/client/demandos-intake` → form is read-only (submitted).

- [ ] **Step 3: Coach-side verification**

- [ ] Navigate to `/admin/demandos-intake/<enrollment-id-from-step-2>`.
- [ ] Paste `ADMIN_API_KEY`.
- [ ] Every section renders; every filled answer is visible; uploaded file appears with a clickable signed URL that actually opens the file.
- [ ] Bad key → 401.
- [ ] Bad enrollment id → 404.

- [ ] **Step 4: Negative paths**

- [ ] Log in as a user with an **agency-studio** enrollment. Hit `/client/demandos-intake` → redirects to `/client/dashboard`.
- [ ] Hit `/client/onboarding` → original 10-step agency wizard renders (unchanged).
- [ ] As an unauthenticated user, hit `/client/demandos-intake` → redirects to `/client/login`.
- [ ] From the DemandOS client, attempt to POST to `/api/client/documents` with a `storagePath` beginning with a different enrollment id → 403.

- [ ] **Step 5: Record any fixes**

If a step above fails, create a focused commit fixing only that issue. Do not pile fixes.

- [ ] **Step 6: Final commit if any checklist docs were added**

If a `docs/demandos-intake-qa.md` was created to capture QA notes, commit it now. Otherwise skip.

---

## Rollout notes

- Feature is gated by `client_programs.has_demandos_intake`. Agency Studio is unaffected.
- No backfill for existing DemandOS enrollments — they'll see the intake next time they hit `/client/dashboard`.
- If something breaks in prod, flip `has_demandos_intake = FALSE` for all rows to disable the feature without a code deploy.

## Out-of-scope reminders

- No CRM integrations.
- No client-uploaded call recordings.
- No Playwright E2E setup (repo's Playwright is unconfigured; bootstrapping test infra is a separate effort).
- No toast library (uses `alert`).
- No auto-generated kickoff brief from answers.
