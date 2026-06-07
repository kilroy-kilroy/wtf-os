# Lead-Tool Capture & Re-engagement — design

**Date:** 2026-06-07
**Status:** Draft for review

## Goal

Turn every lead-gen report page into a re-engagement + data-capture surface that
(1) **gets people back to the platform** and (2) **maximizes data capture** — by
making report links always work, driving two actions on every report (**create
an account** and **run another tool**), and converting anonymous report rows into
owned, tracked users when they sign up.

## Strategy (the inversion)

Instead of locking reports to owners (RLS currently 404s anonymous leads), we make
the **act of claiming a report create the owner**. The link gets them in the door;
the account CTA captures them; the "run another" CTA keeps them looping. Access
and data-capture become the same event.

## Scope

All lead tools:

| Tool | Table | email col | user_id col | Report page | Notes |
|---|---|---|---|---|---|
| Call Lab Instant | `instant_reports` (+ `instant_leads`) | `email` | **none — add it** | `app/call-lab-instant/report/[id]/page.tsx` | report already public via route handler |
| Visibility Lab (+Pro) | `visibility_lab_reports` | `email` | `user_id` | `app/visibility-lab/report/[id]/page.tsx` | anon read RLS-blocked → fix |
| Discovery Lab | `discovery_briefs` | `lead_email` | `user_id` | `app/discovery-lab/report/[id]/page.tsx` | anon read RLS-blocked → fix |
| Biz Dev Assessment | `biz_dev_assessments` | `email` | `user_id` | `app/wtf-biz-dev-assessment/report/[id]/page.tsx` | already token-logs-in (exemplar) — CTAs only |
| GrowthOS | `growthos_results` | (auth-only) | `user_id` | `app/growthos/results/[id]/page.tsx` | already authed — "run another" CTA only |

Front door stays **zero-friction** (email → instant report). Heavier capture
happens on return + at account creation.

## Components (units)

### 1. Report access fix (foundation) — Visibility + Discovery
The normal (non-admin) read in the two RLS-blocked report pages switches from the
anon `createClient()` to the service-role `getSupabaseServerClient()`. The
unguessable UUID is the access token (intended lead-magnet behavior). Call Lab
Instant (route-handler) and Biz Dev (token-login) already resolve — no change.

- Privacy note: this makes a report viewable by anyone holding its UUID link.
  That is the explicit intent ("get people back"); UUIDs are unguessable.

### 2. `instant_reports.user_id` column (DB migration)
Add nullable `user_id uuid references auth.users(id) on delete set null` +
index, so Call Lab Instant reports are claimable like the others.

### 3. Shared claim function — `apps/web/lib/claim-reports.ts`
`claimReportsByEmail(email, userId)`: service-role; for each lead table, set
`user_id = userId` where the email column matches (case-insensitive) and
`user_id is null`. Tables + email cols:
- `visibility_lab_reports.email`
- `discovery_briefs.lead_email`
- `instant_reports.email`
- `biz_dev_assessments.email`
Returns a per-table claimed count (for logging). Idempotent.

### 4. Post-auth backfill hook — `app/auth/callback/route.ts`
After `exchangeCodeForSession` succeeds (user now has email + id), call
`claimReportsByEmail(user.email, user.id)` before redirecting. This covers BOTH
Google OAuth and email-confirm signup (both land on `/auth/callback`). Non-blocking:
a claim failure must not break login.

### 5. Shared engagement footer — `apps/web/components/ReportEngagementFooter.tsx`
A client component injected at the bottom of every report page. Props:
`{ currentTool: ToolKey, email?: string, reportId?: string }`. Renders:
- **Create your free account** — primary CTA → `/login?mode=signup&email=<prefill>&next=/labs`
  (email prefilled from the report; after signup → callback backfills → `/labs`
  shows their now-claimed reports). Hidden if the viewer is already authenticated.
- **Run another analysis** — links to the *same* tool's entry URL.
- **Try another tool** — 2–3 cross-sell cards to the *other* tools' entry URLs.
Tool registry (entry URLs) lives in the component:
`call-lab-instant → /call-lab-instant`, `visibility → /visibility-lab`,
`discovery → /discovery-lab`, `biz-dev → /wtf-biz-dev-assessment`,
`growthos → /growthos`.

### 6. Inject the footer into each report page
Pass the row's email + id. For Call Lab Instant the email may be null until the
lead submits the existing capture form — pass what's available.

### 7. Re-engagement signal (light) — Loops `report_revisited`
Fire a `report_revisited` Loops event on report view when the row already has an
email, with `{ tool, reportId, reportUrl }`. Keep it best-effort/non-blocking.
(New event — add to `docs/loops-events.md`; needs a Loops automation later.)

### 8. Signup prefill
`app/login/page.tsx` signup mode reads `?email=` and pre-fills the email field
(and `?next=` already supported). Minor change.

## Data flow

```
Lead runs tool (email captured) → report saved (user_id null) → email w/ link
Lead clicks link → report renders (service-role/link=key) → fire report_revisited
  → footer: [Create account] [Run another] [Try another tool]
Lead clicks Create account → /login?mode=signup&email=…&next=/labs
  → signup (password/Google) → /auth/callback → claimReportsByEmail()
  → user_id backfilled across all tables → /labs shows their reports
```

## Non-goals (v2)
- Full Biz-Dev-style token *auto-login* on every report link (v1 = link works +
  account CTA; auto-login is an enhancement).
- Soft-gating Pro/deeper sections behind the account (kept as a pure invitation
  for v1, per decision).
- A bespoke leads dashboard (reuse `/labs`).

## Testing / verification
- Access: visibility + discovery report pages render for a logged-out visitor
  (currently 404). Call Lab Instant + Biz Dev unaffected.
- Claim: create an auth user with email X, ensure rows with email X / `user_id
  null` across all four tables get `user_id` set after auth; rows with other
  emails untouched; already-owned rows untouched.
- Footer: renders correct entry URLs; account CTA hidden when authenticated.
- Regression: existing report content/CTAs intact; `tsc` clean.
- Backfill is non-blocking (login still succeeds if claim errors).

## Security notes
- `claimReportsByEmail` runs service-role but only matches on the *authenticated
  user's own verified email* — a user can only claim rows bearing their email.
- Report pages become link-readable (UUID = bearer). Intended; documented.
- No new anon RLS policies added (we read via service-role in-page instead of
  opening the tables to the Data API).
