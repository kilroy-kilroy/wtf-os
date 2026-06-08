# Lead-Tool Capture & Re-engagement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make lead-gen report links always work, add Create-account + Run-another CTAs to every report, and back-link anonymous reports to a user on signup — across all lead tools.

**Architecture:** Report pages read by link=key (service-role) so returns are frictionless; a shared `ReportEngagementFooter` drives the two CTAs; `/auth/callback` runs `claimReportsByEmail` to stamp `user_id` onto previously-anonymous rows; a light `report_revisited` Loops event feeds nurture.

**Tech Stack:** Next.js App Router (`apps/web`), Supabase (service-role admin), Loops.so.

**Spec:** `docs/superpowers/specs/2026-06-07-lead-tool-capture-reengagement-design.md`

**Testing note:** No unit-test framework in this repo. Verify with `npx tsc --noEmit` + runtime checks (dev server on `:3199`, `curl`/`node`, Supabase MCP). Do NOT add a test framework. Commit each task on `main` (no branch); do not push until Task 12.

---

### Task 1: `instant_reports.user_id` column

**Files:** Create `packages/db/instant-reports-user-id.sql`

- [ ] **Step 1: Write DDL file**
```sql
-- Make Call Lab Instant reports claimable by a user (account back-link).
ALTER TABLE instant_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_instant_reports_user ON instant_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_instant_reports_email ON instant_reports(email);
```
- [ ] **Step 2: Apply via Supabase MCP** `apply_migration` (project `sthtvkcdahgsltwukirl`, name `instant_reports_user_id`) with the SQL above. (The orchestrator runs this; a subagent without MCP access should report BLOCKED for this step.)
- [ ] **Step 3: Verify** — MCP `execute_sql`: `select column_name from information_schema.columns where table_name='instant_reports' and column_name='user_id';` → expect one row.
- [ ] **Step 4: Commit** `git add packages/db/instant-reports-user-id.sql && git commit -m "feat(lead-tools): add instant_reports.user_id for report claiming"`

---

### Task 2: `claimReportsByEmail` helper

**Files:** Create `apps/web/lib/claim-reports.ts`

- [ ] **Step 1: Write the file**
```ts
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Anonymous lead-report tables + their email column. user_id is back-filled
// when a user authenticates with a matching (verified) email.
const CLAIM_TABLES: { table: string; emailCol: string }[] = [
  { table: 'visibility_lab_reports', emailCol: 'email' },
  { table: 'discovery_briefs', emailCol: 'lead_email' },
  { table: 'instant_reports', emailCol: 'email' },
  { table: 'biz_dev_assessments', emailCol: 'email' },
];

// Claim every anonymous report whose email matches `email` for `userId`.
// Service-role, but only ever matches the authenticated user's own email.
// Idempotent; never throws (per-table failures are logged and skipped).
export async function claimReportsByEmail(
  email: string | null | undefined,
  userId: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (!email) return result;
  const supabase = getSupabaseServerClient();
  const target = email.toLowerCase();
  for (const { table, emailCol } of CLAIM_TABLES) {
    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .update({ user_id: userId })
        .ilike(emailCol, target) // no wildcards => case-insensitive exact match
        .is('user_id', null)
        .select('id');
      if (error) {
        console.error(`[claim] ${table} failed:`, error.message);
        result[table] = 0;
        continue;
      }
      result[table] = data?.length ?? 0;
    } catch (e) {
      console.error(`[claim] ${table} threw:`, e);
      result[table] = 0;
    }
  }
  return result;
}
```
- [ ] **Step 2: Type-check** from `apps/web`: `npx tsc --noEmit 2>&1 | grep "claim-reports" || echo "claim ok"` → `claim ok`.
- [ ] **Step 3: Commit** `git add apps/web/lib/claim-reports.ts && git commit -m "feat(lead-tools): claimReportsByEmail backfill helper"`

---

### Task 3: Back-link on auth — `app/auth/callback/route.ts`

**Files:** Modify `apps/web/app/auth/callback/route.ts`

- [ ] **Step 1:** Add import near the top:
```ts
import { claimReportsByEmail } from '@/lib/claim-reports';
```
- [ ] **Step 2:** Immediately AFTER the `exchangeCodeForSession` success check (where `exchanged.user` is known to exist) and BEFORE any redirect/enrollment logic, insert:
```ts
  // Claim any anonymous lead reports sharing this user's verified email.
  // Non-blocking: a claim failure must never break sign-in.
  try {
    if (exchanged.user.email) {
      await claimReportsByEmail(exchanged.user.email, exchanged.user.id);
    }
  } catch (e) {
    console.error('[auth/callback] report claim failed (non-blocking):', e);
  }
```
- [ ] **Step 3: Type-check** `npx tsc --noEmit 2>&1 | grep "auth/callback" || echo "callback ok"` → `callback ok`.
- [ ] **Step 4: Commit** `git add apps/web/app/auth/callback/route.ts && git commit -m "feat(lead-tools): claim anonymous reports on auth callback"`

---

### Task 4: Access fix — Visibility + Discovery read by link=key

**Files:** Modify `apps/web/app/visibility-lab/report/[id]/page.tsx`, `apps/web/app/discovery-lab/report/[id]/page.tsx`

Both pages already import `getSupabaseServerClient` (service-role) and use `createClient()` (anon) only for the normal read — which RLS blocks for logged-out leads. Switch the normal-flow REPORT READ to the service-role client (the UUID is the access key). Preserve everything else.

- [ ] **Step 1 (visibility):** Read the file. In the "Normal user flow" block, replace `const supabase = await createClient();` + its `.from('visibility_lab_reports').select('*').eq('id', id).single...` read so the SELECT uses `getSupabaseServerClient()` instead of the anon client. Concretely, change the block to:
```ts
  // Normal flow: read by link=key (the UUID is the access token). The shared
  // report page is a public lead magnet — service-role read bypasses the
  // owner-only RLS so a logged-out lead can open their report.
  if (!report) {
    const supabase = getSupabaseServerClient();
    const { data } = await (supabase as any)
      .from('visibility_lab_reports')
      .select('*')
      .eq('id', id)
      .single();
    if (data) report = data;
  }
```
- [ ] **Step 2 (discovery):** Read the file. Do the same for `discovery_briefs`. If the normal block also calls `supabase.auth.getUser()`, that call is no longer needed for the read — remove it ONLY if its result is unused; if `user` is used later, obtain it separately via `await createClient()` for auth purposes but keep the report SELECT on the service-role client. Replace the read block with:
```ts
  if (!report) {
    const supabase = getSupabaseServerClient();
    const { data } = await (supabase as any)
      .from('discovery_briefs')
      .select('*')
      .eq('id', id)
      .single();
    if (data) report = data;
  }
```
- [ ] **Step 3: Type-check** `npx tsc --noEmit 2>&1 | grep -E "visibility-lab/report|discovery-lab/report" || echo "report pages ok"` → `report pages ok`.
- [ ] **Step 4: Commit** `git add "apps/web/app/visibility-lab/report/[id]/page.tsx" "apps/web/app/discovery-lab/report/[id]/page.tsx" && git commit -m "fix(lead-tools): visibility+discovery reports readable by link (no 404 for leads)"`

---

### Task 5: Loops `report_revisited` event + doc

**Files:** Modify `apps/web/lib/loops.ts`, `docs/loops-events.md`

- [ ] **Step 1:** Append after the existing client-portal event functions in `lib/loops.ts`:
```ts
/**
 * Fire when a lead reopens a generated report (re-engagement signal).
 */
export async function onReportRevisited(
  email: string,
  tool: string,
  reportId: string,
  reportUrl: string
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    email,
    eventName: 'report_revisited',
    eventProperties: { tool, reportId, reportUrl },
  });
}
```
- [ ] **Step 2:** In `docs/loops-events.md`, under section 5, add a row: `| report_revisited | tool, reportId, reportUrl |`.
- [ ] **Step 3: Type-check** `npx tsc --noEmit 2>&1 | grep "lib/loops" || echo "loops ok"` → `loops ok`.
- [ ] **Step 4: Commit** `git add apps/web/lib/loops.ts docs/loops-events.md && git commit -m "feat(lead-tools): add report_revisited Loops event"`

---

### Task 6: Revisit API route

**Files:** Create `apps/web/app/api/lead-tools/revisit/route.ts`

- [ ] **Step 1: Write the file**
```ts
import { NextRequest, NextResponse } from 'next/server';
import { onReportRevisited } from '@/lib/loops';

// Best-effort re-engagement ping from the report page footer.
export async function POST(request: NextRequest) {
  try {
    const { email, tool, reportId, reportUrl } = await request.json();
    if (email && tool && reportId) {
      await onReportRevisited(email, tool, reportId, reportUrl || '');
    }
  } catch (err) {
    console.error('[revisit] failed (non-blocking):', err);
  }
  return NextResponse.json({ ok: true });
}
```
- [ ] **Step 2: Type-check** `npx tsc --noEmit 2>&1 | grep "lead-tools/revisit" || echo "revisit ok"` → `revisit ok`.
- [ ] **Step 3: Commit** `git add apps/web/app/api/lead-tools/revisit/route.ts && git commit -m "feat(lead-tools): /api/lead-tools/revisit re-engagement ping"`

---

### Task 7: Shared `ReportEngagementFooter` component

**Files:** Create `apps/web/components/ReportEngagementFooter.tsx`

- [ ] **Step 1: Write the file**
```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export type ToolKey = 'call-lab-instant' | 'visibility' | 'discovery' | 'biz-dev' | 'growthos';

const TOOLS: Record<ToolKey, { label: string; entry: string; blurb: string }> = {
  'call-lab-instant': { label: 'Call Lab', entry: '/call-lab-instant', blurb: 'Score a sales call instantly' },
  'visibility': { label: 'Visibility Lab', entry: '/visibility-lab', blurb: 'See how AI sees your brand' },
  'discovery': { label: 'Discovery Lab', entry: '/discovery-lab', blurb: 'Research any prospect' },
  'biz-dev': { label: 'Biz Dev Assessment', entry: '/wtf-biz-dev-assessment', blurb: 'Grade your growth engine' },
  'growthos': { label: 'GrowthOS', entry: '/growthos', blurb: 'Assess your agency' },
};

export default function ReportEngagementFooter({
  currentTool,
  email,
  reportId,
  reportUrl,
}: {
  currentTool: ToolKey;
  email?: string | null;
  reportId?: string;
  reportUrl?: string;
}) {
  const [authed, setAuthed] = useState(false);

  // Hide the account CTA for users who already have a session.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthed(!!data.user)).catch(() => {});
  }, []);

  // Best-effort re-engagement ping (once we know the lead's email).
  useEffect(() => {
    if (!email || !reportId) return;
    fetch('/api/lead-tools/revisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tool: currentTool, reportId, reportUrl }),
    }).catch(() => {});
  }, [email, reportId, reportUrl, currentTool]);

  const current = TOOLS[currentTool];
  const others = (Object.keys(TOOLS) as ToolKey[]).filter((k) => k !== currentTool && k !== 'growthos').slice(0, 3);
  const signupHref = `/login?mode=signup${email ? `&email=${encodeURIComponent(email)}` : ''}&next=/labs`;

  return (
    <div className="max-w-5xl mx-auto px-4 mt-12 mb-8 font-poppins">
      {!authed && (
        <div className="bg-[#1A1A1A] border border-[#333333] p-8 relative mb-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23]" />
          <h3 className="font-anton text-xl text-white mb-2">SAVE THIS REPORT — CREATE YOUR FREE ACCOUNT</h3>
          <p className="text-[#B3B3B3] text-sm mb-5">
            Keep all your reports in one place, track changes over time, and unlock the full platform.
          </p>
          <Link
            href={signupHref}
            className="inline-block bg-[#E51B23] text-white py-3 px-6 font-anton text-sm font-bold tracking-[2px] hover:bg-[#FFDE59] hover:text-black transition-all"
          >
            [ CREATE FREE ACCOUNT ]
          </Link>
        </div>
      )}

      <div className="bg-[#111] border border-[#333333] p-8">
        <h3 className="font-anton text-lg text-white mb-1">RUN ANOTHER ANALYSIS</h3>
        <p className="text-[#B3B3B3] text-sm mb-5">Keep the momentum going.</p>
        <Link
          href={current.entry}
          className="inline-block border border-[#FFDE59] text-[#FFDE59] py-2.5 px-5 font-anton text-sm tracking-[1px] hover:bg-[#FFDE59] hover:text-black transition-all mb-6"
        >
          [ RUN {current.label.toUpperCase()} AGAIN ]
        </Link>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {others.map((k) => (
            <Link
              key={k}
              href={TOOLS[k].entry}
              className="block border border-[#333333] p-4 hover:border-[#FFDE59] transition-colors group"
            >
              <div className="font-anton text-sm text-white group-hover:text-[#FFDE59]">{TOOLS[k].label}</div>
              <div className="text-[#888888] text-xs mt-1">{TOOLS[k].blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```
- [ ] **Step 2: Type-check** `npx tsc --noEmit 2>&1 | grep "ReportEngagementFooter" || echo "footer ok"` → `footer ok`.
- [ ] **Step 3: Commit** `git add apps/web/components/ReportEngagementFooter.tsx && git commit -m "feat(lead-tools): shared ReportEngagementFooter (account + run-another CTAs)"`

---

### Task 8: Signup email prefill — `app/login/page.tsx`

**Files:** Modify `apps/web/app/login/page.tsx`

- [ ] **Step 1:** Read the file. It already reads `searchParams` and has `email`/`mode` state. Add an effect that pre-fills email + mode from the URL. After the existing state/searchParams setup, insert:
```ts
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
    if (searchParams.get('mode') === 'signup') setMode('signup');
  }, [searchParams]);
```
(If `setMode`/`mode` uses different names, adapt to the actual state setter found in the file. If `email` state setter differs, adapt.)
- [ ] **Step 2: Type-check** `npx tsc --noEmit 2>&1 | grep "login/page" || echo "login ok"` → `login ok`.
- [ ] **Step 3: Commit** `git add apps/web/app/login/page.tsx && git commit -m "feat(lead-tools): prefill signup email/mode from query params"`

---

### Task 9: Inject footer — Visibility + Discovery report pages

**Files:** Modify `apps/web/app/visibility-lab/report/[id]/page.tsx`, `apps/web/app/discovery-lab/report/[id]/page.tsx`

- [ ] **Step 1 (visibility):** Read the file. Add import `import ReportEngagementFooter from '@/components/ReportEngagementFooter';`. Render the footer just before the page's outermost closing tag of the returned JSX:
```tsx
      <ReportEngagementFooter
        currentTool="visibility"
        email={(report as any).email ?? null}
        reportId={id}
        reportUrl={`/visibility-lab/report/${id}`}
      />
```
Place it inside the existing root container so layout/styles apply (it's a server component rendering a client child — that's fine).
- [ ] **Step 2 (discovery):** Same, with `currentTool="discovery"`, `email={(report as any).lead_email ?? null}`, `reportUrl={`/discovery-lab/report/${id}`}`.
- [ ] **Step 3: Type-check** `npx tsc --noEmit 2>&1 | grep -E "visibility-lab/report|discovery-lab/report" || echo "ok"` → `ok`.
- [ ] **Step 4: Commit** `git add "apps/web/app/visibility-lab/report/[id]/page.tsx" "apps/web/app/discovery-lab/report/[id]/page.tsx" && git commit -m "feat(lead-tools): engagement footer on visibility+discovery reports"`

---

### Task 10: Inject footer — Call Lab Instant report page

**Files:** Modify `apps/web/app/call-lab-instant/report/[id]/page.tsx`

- [ ] **Step 1:** Read the file. This page is a client component fetching the report (with `email` available on the report object/state). Add import `import ReportEngagementFooter from '@/components/ReportEngagementFooter';`. Render it near the bottom of the main returned JSX (after the existing "READY TO GET A FREE FULL CALL REVIEW?" CTA around lines 339-354), passing the report's email + id:
```tsx
      <ReportEngagementFooter
        currentTool="call-lab-instant"
        email={/* the report's email state/field, or null */ null}
        reportId={/* the report id from params/state */ ''}
        reportUrl={`/call-lab-instant/report/${/* id */ ''}`}
      />
```
Replace the comment placeholders with the actual `email`/`id` variables already in scope in this component (read the file to find their names). The existing CTA stays.
- [ ] **Step 2: Type-check** `npx tsc --noEmit 2>&1 | grep "call-lab-instant/report" || echo "ok"` → `ok`.
- [ ] **Step 3: Commit** `git add "apps/web/app/call-lab-instant/report/[id]/page.tsx" && git commit -m "feat(lead-tools): engagement footer on call-lab-instant report"`

---

### Task 11: Inject footer — Biz Dev + GrowthOS

**Files:** Modify `apps/web/app/wtf-biz-dev-assessment/report/[id]/page.tsx`, `apps/web/app/growthos/results/[id]/page.tsx`

These viewers are already authenticated, so the footer's account CTA auto-hides; they get the "run another" block.

- [ ] **Step 1 (biz-dev):** Read the file. Add the import and render `<ReportEngagementFooter currentTool="biz-dev" email={/* assessment.email */} reportId={id} reportUrl={`/wtf-biz-dev-assessment/report/${id}`} />` near the bottom of the returned JSX (find the assessment row variable + id in scope).
- [ ] **Step 2 (growthos):** Read the file. Render `<ReportEngagementFooter currentTool="growthos" email={/* result email if available, else null */ null} reportId={id} reportUrl={`/growthos/results/${id}`} />` near the bottom.
- [ ] **Step 3: Type-check** `npx tsc --noEmit 2>&1 | grep -E "wtf-biz-dev-assessment/report|growthos/results" || echo "ok"` → `ok`.
- [ ] **Step 4: Commit** `git add "apps/web/app/wtf-biz-dev-assessment/report/[id]/page.tsx" "apps/web/app/growthos/results/[id]/page.tsx" && git commit -m "feat(lead-tools): engagement footer on biz-dev + growthos reports"`

---

### Task 12: Full verification + push

- [ ] **Step 1: Full type-check** from `apps/web`: `npx tsc --noEmit` → only pre-existing Stripe + stale generated-route errors; nothing in our new/changed files.
- [ ] **Step 2: Runtime smoke** (dev server `:3199`): visibility + discovery report pages return 200 logged-out for a real report id (orchestrator supplies ids via MCP). Footer + revisit route compile.
- [ ] **Step 3: Claim verification** (orchestrator, via MCP/node): create a throwaway auth user with an email that matches an anonymous row in each table; call `claimReportsByEmail` (or drive `/auth/callback`); confirm matching rows get `user_id` set, non-matching rows untouched; clean up.
- [ ] **Step 4: Push** `git push origin main`.
- [ ] **Step 5: Post-deploy checklist (human):** add a Loops automation for `report_revisited` if you want nurture on it; confirm `/labs` is the right post-signup landing.

---

## Self-Review
- **Spec coverage:** access fix (T4), instant_reports.user_id (T1), claim helper (T2) + callback hook (T3), footer (T7) + injection (T9–11), revisit event (T5) + route (T6) + footer ping (T7), signup prefill (T8). All spec sections mapped.
- **Type consistency:** `claimReportsByEmail(email, userId)` used in T3 matches T2. `ReportEngagementFooter` props (`currentTool`, `email`, `reportId`, `reportUrl`) consistent across T7/T9/T10/T11. `onReportRevisited(email, tool, reportId, reportUrl)` matches T5/T6. Revisit route body `{email, tool, reportId, reportUrl}` matches the footer fetch in T7.
- **Placeholders:** per-page injection tasks (T9–11) intentionally require reading the file to bind the in-scope `email`/`id` variable names — flagged explicitly, not silent TODOs.
- **DB dependency:** T1 needs MCP (orchestrator). Subagents without MCP report BLOCKED on T1 Step 2 only.
