# Wah-Wah Detector — Upfront Email Capture

**Date:** 2026-06-24
**Status:** Approved

## Goal

Capture the lead's email at the *start* of the Wah-Wah Detector flow (alongside the
URL) instead of gating the full report behind a second email step. After submit,
show the full report immediately on screen **and** fire the automated email (link to
the hosted report).

## Current flow (before)

1. `/wah-wah` → `UrlForm` captures **only the URL** → `POST /api/wah-wah/analyze`
   saves the analysis and returns `{ id, score, verdict, flagCount }` → redirects to
   `/wah-wah/r/[id]`.
2. Report page renders `ScoreCard`, then `ReportGate` **gates the full report behind
   an email** (second step).
3. Email submit → `POST /api/wah-wah/report` → `attachLead` + lead pipeline (Beehiiv,
   Copper, Slack, Loops `wah_wah_report_generated`) → returns full result, rendered
   inline.

## New flow (after)

1. `/wah-wah` → `UrlForm` captures **URL + email (required) + first name (optional)**
   in one submit → `POST /api/wah-wah/analyze`.
2. `analyze` validates the email, runs the analysis, saves it, then fires the **full
   lead pipeline** (extracted to `lib/wah-wah/lead.ts`). Returns `{ id }`.
3. Form redirects to `/wah-wah/r/[id]`, which renders the **full report directly** —
   no gate.
4. Loops `wah_wah_report_generated` fires automatically (already carries `reportUrl`),
   so the link-to-report email sends itself.

## Decisions

- **One combined submit.** URL and email are both required together; one click both
  scores the homepage and sends the report.
- **On-screen UX:** full report shown immediately, no gate.
- **Email content:** link to the hosted report (existing Loops event — no new
  template work).
- **Email is required to run the analysis at all** — it is the upfront price.
- IP rate-limit and best-effort / non-blocking (`waitUntil`) pipeline behavior are
  unchanged.

## Code changes

| File | Change |
|---|---|
| `components/wah-wah/UrlForm.tsx` | Add email (required) + first name (optional) fields; POST all three to analyze; update CTA + helper copy to reflect "score + send report". |
| `app/api/wah-wah/analyze/route.ts` | Accept + validate `email`/`firstName`; after `saveAnalysis`, call the shared lead pipeline with the analysis row. |
| `lib/wah-wah/lead.ts` *(new)* | Extract the lead pipeline (`attachLead` + Beehiiv + Copper + Slack + Loops) out of the `/report` route — same logic, one reusable function. |
| `app/wah-wah/r/[id]/page.tsx` | Render `ReportBody` (full report) unconditionally; drop the gate + `admin` searchParam. |
| `components/wah-wah/ReportGate.tsx` → `ReportBody.tsx` | Keep `ReportBody`; remove the gating form/component. |
| `app/api/wah-wah/report/route.ts` | Delete — dead code once the pipeline lives in `lead.ts`. |

## Out of scope

- No new email template / no embedding full report content in the email body.
- No change to the analysis engine, lexicon, or scoring.
- No change to the lead pipeline's downstream targets (Beehiiv/Copper/Slack/Loops).

## Risks

- `EMAIL_RE` validation must move to (or be duplicated in) `analyze` so a bad email is
  rejected before an analysis is wasted.
- Report URL is now ungated/shareable — acceptable; the report was already reachable
  by link and the OG image is public.
