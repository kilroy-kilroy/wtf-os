# Wah-Wah Detector — Port into WTF Monorepo (Phase 1)

**Date:** 2026-06-13
**Status:** Approved design, pre-implementation
**Owner:** Tim Kilroy
**Source:** `~/Projects/positioning-engine` (standalone Next.js app built by Claude Fable)

## Why

The Wah-Wah Detector is Product 1 (free, top-of-funnel) of the Self-Serve Positioning
Engine. It was built and shipped as a standalone Next.js 16 app. It works, but it (a)
runs on its own Supabase project and its own miniature lead plumbing instead of the
WTF lead pipeline, (b) does not appear in the admin portal, and (c) wears the generic
create-next-app look instead of the WTF brand. This port brings it into `apps/web` so
it shares the same Loops → beehiiv → Copper → Slack lead pipeline as every other lab,
shows up in `/admin/reports`, and matches the WTF "console" design system.

**What it does (unchanged):** paste a homepage URL → in ~30s get a public, screenshot-
friendly **Wah-Wah Score** (0–100) with a one-line verdict in Tim's voice → email-gate
the full report (every flagged "wah-wah" phrase, what the prospect actually hears
underneath, and a one-line rewrite teaser) → lead flows into the pipeline → report CTA
ladders up to DemandOS.

Phase 2 (Robot-Tim $395 interview, full-site crawl, voice, Stripe) is **out of scope**
here; its design + plan + source material are preserved under `docs/positioning/`.

## Decisions locked

- **Lead routing:** full parity with Visibility Lab — Loops event + beehiiv/AIC +
  Copper LEAD + Slack alert on every gated email.
- **Design:** match the existing console system (`ConsolePanel` / `ConsoleButton` /
  `ConsoleInput` / `ConsoleHeading`, black bg, Anton/Poppins, rust-red `#D75A3F` +
  cyan `#00D4FF`, score colors from `--score-fail/warn/pass`).
- **Anthropic call:** keep the Zod schema for validation, but issue the call with the
  repo's existing pattern (`anthropic.messages.create` on SDK `0.91`, JSON instruction,
  strip fences, `WahWahAnalysisSchema.parse(JSON.parse(...))`). **No shared SDK bump.**
- **Model:** `claude-opus-4-8` (one-constant swap to `claude-sonnet-4-6` is the cost lever).
- **Standalone repo:** left intact after the port; not deleted.
- **Copper opportunity value for a free Wah-Wah lead:** `$0`.

## Architecture

All inside `apps/web`. Public/anonymous — no login. The middleware `matcher` already
excludes `api/`, and `/wah-wah` is not a protected prefix, so **no middleware change is
required** (identical to how `/visibility-lab` is reachable).

### Routes

| Path | Purpose |
|---|---|
| `app/wah-wah/page.tsx` | Landing — paste URL (console redesign) |
| `app/wah-wah/r/[id]/page.tsx` | Public score + email-gated full report |
| `app/wah-wah/r/[id]/opengraph-image.tsx` | Dynamic OG share image (viral mechanic) |
| `app/api/wah-wah/analyze/route.ts` | fetch→extract→lexicon→Claude→save; returns gated `{id, score, verdict, flagCount}` |
| `app/api/wah-wah/report/route.ts` | email gate → persist email → fire full pipeline → return full report |

### Ported code (the IP)

- **`packages/prompts/wah-wah/`** — `SYSTEM_PROMPT`, `buildUserPrompt`,
  `WahWahAnalysisSchema` (Zod), `MODEL`. Registered in `packages/prompts/index.ts`.
  (Canonical prompt home per `CLAUDE.md`.)
- **`apps/web/lib/wah-wah/lexicon.ts`** — `WAHWAH_PHRASES`, `findLexiconHits`. Verbatim.
- **`apps/web/lib/wah-wah/extract.ts`** — `normalizeUrl`, `extractPageText`, `fetchPage`.
  The SSRF guard (manual redirect loop re-validating the private-host check on every hop,
  browser UA, 10s timeout) ports verbatim. `cheerio` added to `apps/web` deps.
- **`apps/web/lib/wah-wah/analyze.ts`** — rewritten Claude call (see "Anthropic call").

### Reused WTF infrastructure (not re-ported)

- `getSupabaseServerClient()` replaces the standalone `db.ts`.
- `lib/loops.ts`: add `onWahWahReportGenerated(email, reportId, score, hostname)`
  mirroring `onVisibilityReportGenerated` (event `wah_wah_report_generated`, reportUrl
  `${APP_URL}/wah-wah/r/${id}`).
- `lib/beehiiv.ts`: add `addWahWahSubscriber(email, hostname?)` mirroring
  `addVisibilityLabSubscriber`.
- `lib/copper.ts`: reuse `copperSyncLead({ productName: 'Wah-Wah Detector',
  opportunityValue: 0, stageId: COPPER_STAGES.LEAD, note })`.
- `lib/slack.ts`: extend `alertReportGenerated` tier union with `'wah-wah'`.
- The standalone `beehiiv.ts` and `db.ts` are dropped.

Since Wah-Wah collects only an email (no name/brand), **the submitted URL's hostname is
the brand/company proxy** in Copper, Loops, and Slack.

## Data model (WTF Supabase)

New migration `supabase/migrations/20260613_create_wah_wah_reports.sql`:

```sql
create table wah_wah_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  email       text,
  url         text not null,
  score       int  not null,
  result      jsonb not null,
  ip          text,
  created_at  timestamptz not null default now()
);
create index wah_wah_reports_ip_created_idx on wah_wah_reports (ip, created_at);
alter table wah_wah_reports enable row level security;
-- service-role full access; users read their own by user_id or jwt email
-- (mirrors the visibility_lab_reports policy)
```

- `email` / `user_id` are written onto the row at report-gate time (matches Visibility).
- No separate `leads` table — the pipeline owns leads.
- IP rate limit (5/hour) reads `count(*)` from this table over the last hour, same logic
  as the standalone `countRecentByIp`.

## Data flow

**`POST /api/wah-wah/analyze`** (anonymous):
1. `normalizeUrl(body.url)` (SSRF guard) → 400 on bad input.
2. IP rate-limit check (5/hour) → 429.
3. `fetchPage` → `findLexiconHits` → `analyzeCopy` (Claude) → `WahWahAnalysisSchema`.
4. Insert into `wah_wah_reports` (no email yet).
5. Return gated `{ id, score, verdict, flagCount }` (no flag details).

**`POST /api/wah-wah/report`** (email gate):
1. Validate `id` + email.
2. Load report; 404 if missing.
3. `update wah_wah_reports set email = … where id = …`.
4. Fire pipeline (all non-blocking via `waitUntil`, except the email persist):
   - `addWahWahSubscriber(email, hostname)`
   - `copperSyncLead({ productName: 'Wah-Wah Detector', opportunityValue: 0,
     stageId: COPPER_STAGES.LEAD, note: 'Ran Wah-Wah Detector — Score X/100. <link>' })`
   - `alertReportGenerated(hostname, 'wah-wah', hostname)`
   - `onWahWahReportGenerated(email, id, score, hostname)`
5. Return `{ url, result, created_at }` (full report).

**Error handling:** human-readable, Tim-voice errors preserved from the standalone
(bot-protection 403/503 message, too-many-redirects, generic 502). Pipeline calls are
best-effort and never fail the user's request.

## Redesign (console system)

- **Landing:** `ToolPageHeader` (DemandOS logo + Wah-Wah tool lockup — text lockup if no
  logo asset exists), black bg, Anton headline keeping current copy ("Your homepage is
  probably going wah wah, wah wah wah."), `ConsoleInput` for URL, `ConsoleButton`
  → `▶ SCORE MY HOMEPAGE` / `⟳ LISTENING FOR WAH-WAH…`.
- **Score page:** console `ScoreCard` — large `tabular-nums` score colored by
  `--score-fail` (≥70) / `--score-warn` (40–69) / `--score-pass` (<40), verdict in Anton,
  hostname label, screenshot-friendly. Gated `ReportGate` uses `ConsoleInput` /
  `ConsoleButton`; revealed flags render as console panels (phrase in mono/rust, context
  dim, `underneath` in body). Closing CTA panel ladders to DemandOS. `?admin=1` bypasses
  the gate (mirrors Visibility).
- **OG image:** kept; restyled to brand colors (satori-safe text nodes preserved).

## Admin portal

- New **"Wah-Wah" tab** in `app/admin/reports/page.tsx` following the Visibility pattern:
  table = Score / Site (hostname) / Email / Date / View. View → `/wah-wah/r/[id]?admin=1`.
- Add a `wah_wah_reports` query to the admin client-reports API route
  (`id, url, score, email, user_id, created_at`, ordered desc, limit 1000).
- Product color tag for the dashboard (rust `#D75A3F`).

## Tests

`apps/web` has **no test runner** today. Port the lexicon / extract / prompt-build unit
tests as a self-contained `apps/web/lib/wah-wah/*.test.ts` plus a `vitest` devDep and a
minimal `apps/web/vitest.config.ts`, scoped so it does not disturb the existing build.
(If standing up vitest in `apps/web` proves invasive, fall back to a `packages/`-level
test for the pure functions — the lexicon and `normalizeUrl` guard are the must-test units.)

## Env / config

Reuses existing env only: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `BEEHIIV_*`, `LOOPS_API_KEY`, `COPPER_*`, `SLACK_*`,
`NEXT_PUBLIC_APP_URL`. No new Supabase project. No Stripe (Phase 1 is free).

## Out of scope (Phase 2 — preserved in `docs/positioning/`)

Robot-Tim async interview (the question-tree state machine), full-site crawl, Narrative
Spine Starter + visible makeover deliverables, Node 7 "Rip Me Apart," Stripe $395
checkout, voice input.

## Success criteria

- Detector reachable at `app.timkilroy.com/wah-wah`, anonymous, ~30s to score.
- Gated email creates a tracked lead identically to Visibility Lab (verified in Loops +
  Copper + a Slack ping + admin tab row).
- Submissions visible in `/admin/reports` under the Wah-Wah tab.
- Visual parity with the other labs (console system).
- Phase-2 material intact under `docs/positioning/`.
