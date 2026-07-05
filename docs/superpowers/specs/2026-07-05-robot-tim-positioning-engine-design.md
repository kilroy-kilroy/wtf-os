# Robot-Tim Positioning Engine — Design (v1)

**Date:** 2026-07-05
**Status:** Approved design, pre-implementation
**Owner:** Tim Kilroy
**Rung:** Product 2 (paid, $395) of the Self-Serve Positioning Engine funnel.

## Why this exists

Robot-Tim is the missing mid-rung between the free **Wah-Wah Detector** (Product 1, live in
`apps/web`) and human-delivered **DemandOS** ($10K+). The Detector gives away the *diagnosis*;
Robot-Tim charges $395 for the *prescription* — an async, self-serve version of Tim's live VVV
positioning teardown. Strategic goal: less Tim-dependent revenue. The AI runs the extraction;
Tim only enters at the DemandOS rung, reached via Node 7's ladder copy.

**Product rule that makes it uncopyable: extraction, not invention.** Robot-Tim surfaces the
language already operating inside the business; he never generates a philosophy from a prompt.
The per-node *live reaction* — classify the founder's answer, fire the matching branch — is the
moat. Source material: `docs/positioning/robot-tim-question-tree (1).md` and
`docs/positioning/2026-06-10-positioning-engine-design.md`.

## Decisions locked (this brainstorm)

1. **Interview UX:** node-by-node cards. One node at a time; founder types an answer → Claude
   classifies + fires the matching branch reaction → reaction shows → advance. No streaming
   chat. Answers persist per node; the session is resumable.
2. **Payment:** pay $395 **first**, then interview + crawl + deliverable. One-time payment
   (Stripe `mode: 'payment'`), reusing the existing Pro-checkout + webhook pattern.
3. **Scope:** full deliverable at launch — interview + full-site crawl + Narrative Spine Starter
   + before/after hero makeover + page-by-page punch list + Node 7 "Rip Me Apart."
4. **Resume model:** no forced login. Session id in the URL is the key; a resume link is emailed
   via Loops. (Confirmed over the account-portal alternative.)
5. **Deliverable export:** PDF of the finished Spine + makeover, reusing the `packages/pdf`
   HTML-report pattern. (Confirmed.)
6. **Model:** `claude-opus-4-8` for reactions and synthesis (matches the Detector; one-constant
   swap to a cheaper model is the cost lever).

## End-to-end flow

```
Detector report CTA ─┐
/robot-tim landing ──┴─► enter site URL + first name ─► Stripe checkout ($395, one-time)
   ─► webhook: create session (status=paid), START CRAWL (background),
        email resume link (Loops), fire customer pipeline
   ─► /robot-tim/[id]: node-by-node interview (7 nodes, live reactions) [status=interviewing]
   ─► crawl finishes in the background in parallel [crawl jsonb populated]
   ─► interview complete AND crawl complete ─► synthesis [status=synthesizing]:
        Narrative Spine → before/after makeover + page punch list → Node 7
   ─► deliverable page (resumable, PDF export) [status=complete]
```

The crawl runs **in parallel** with the interview so the founder never waits on it. Synthesis
fires only when interview **and** crawl are both complete.

## Architecture

All inside `apps/web`. The buyer is anonymous (no Supabase login); the paid session is
identified by an unguessable `robot_tim_sessions.id` in the URL. Middleware already excludes
`api/` and does not protect `/robot-tim`, so no middleware change is required (same as
`/wah-wah` and `/visibility-lab`).

### Routes

| Path | Purpose |
|---|---|
| `app/robot-tim/page.tsx` | Landing — pitch + enter site URL + first name → checkout |
| `app/robot-tim/checkout/page.tsx` | Server component: create Stripe session, redirect (mirrors `visibility-lab-pro/checkout`) |
| `app/robot-tim/pending/page.tsx` | Post-checkout resolver: polls by `stripe_session_id` until the webhook has created the row, then redirects to `/robot-tim/[id]` (handles the checkout→webhook race) |
| `app/robot-tim/[id]/page.tsx` | The one resumable page; routes by `status` (interview / building / deliverable) |
| `app/api/robot-tim/answer/route.ts` | POST a node answer → classify + react → persist → return `{reaction, satisfied, nextNode}` |
| `app/api/robot-tim/crawl/route.ts` | Background crawl job (Apify) → score pages → persist `crawl`; on both-done, trigger synthesis |
| `app/api/robot-tim/synthesize/route.ts` | Spine → makeover → Node 7; persist; `status=complete` |
| `app/robot-tim/[id]/export/route.ts` | PDF of the deliverable (reuse `packages/pdf` pattern) |

Stripe checkout + webhook reuse the **existing** `app/api/stripe/checkout/route.ts` and
`app/api/webhooks/stripe/route.ts` (extended with a `robot-tim` product branch), not new routes.

### Data model — one table

New migration `supabase/migrations/20260705_create_robot_tim_sessions.sql`:

```sql
create table robot_tim_sessions (
  id                uuid primary key default gen_random_uuid(),
  email             text,                 -- from Stripe checkout
  first_name        text,
  site_url          text not null,
  status            text not null default 'paid',
    -- paid | crawling | interviewing | synthesizing | complete | failed
  stripe_session_id text,
  current_node      int  not null default 0,
  answers           jsonb not null default '[]'::jsonb,
    -- [{ nodeId, raw, classification, reaction, pushedRaw? }]
  crawl             jsonb,                -- { pages:[{url, score, hits}], homepageText }
  spine             jsonb,                -- Narrative Spine Starter
  makeover          jsonb,                -- { beforeHero, afterHero, punchList:[{url, fixes[]}] }
  node7             jsonb,                -- rip-me-apart punch list + ladder copy
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);
alter table robot_tim_sessions enable row level security;
-- service-role full access; buyer reads their own row by id (mirrors wah_wah_reports policy)
```

`current_node` is the resume pointer. Everything for one purchase lives in one row.

### The interview engine (the moat)

- The 7-node tree lives as **data** in `packages/prompts/robot-tim/tree.ts` (canonical prompt
  home per `CLAUDE.md`). Each node: `{ id, ask, extractGoal, listenFor[], branches{} }`,
  transcribed verbatim from the question tree. The 6 guardrails become a shared system prompt
  (enemy is the broken idea never the people; push once per node with warmth; no bait-and-switch;
  swearing dial set by the founder; nothing may sound AI-written; never accept "results" or
  "process" as a differentiator).
- **One Claude call per submitted answer.** Input: the node's classify instructions + the
  founder's answer. Structured (Zod) output:
  `{ classification: "results" | "process" | "generic" | "real", reaction: string, satisfied: boolean }`.
- **State machine (`packages/prompts/robot-tim` pure helper, unit-tested):**
  - If `satisfied` → show `reaction`, advance to the next node.
  - If not `satisfied` **and** this node hasn't been pushed yet → show `reaction` as the single
    push, take one more answer (stored as `pushedRaw`), then advance **regardless** (the tree's
    "push once, then take what you get" rule).
  - Never push twice on the same node.
- ~7–14 small Opus calls per interview. Cheap. The pure advance logic (push-vs-advance,
  next-node selection) is the unit-test target, with the classifier mocked.
- **Synthesis trigger (coordination point):** synthesis needs both the interview and the crawl
  done. Both the `answer` route (when it advances past the last node) and the `crawl` route (when
  it persists results) end by calling a shared `maybeStartSynthesis(session)` guard that fires
  synthesis only if interview is complete **and** `crawl` is populated **and** `status` is not
  already past `interviewing`. Whichever finishes second wins; the check is idempotent.

### Crawl + synthesis

- **Crawl:** reuse the Apify `website-content-crawler` actor already driven in
  `packages/utils/research.ts` (`maxCrawlPages: 10`) and `app/api/one-shot/analyze`. Each page
  scored with the Detector's `findLexiconHits` (lexicon-only per-page score — no per-page Claude
  call, to control cost). Result stored in `crawl` jsonb. Kicked off from the Stripe webhook at
  payment time so it overlaps the interview.
- **Synthesis (two structured Opus calls, `synthesize` route):**
  1. **Spine** — from all answers → Narrative Spine Starter: who this is for (Node 1) / who it is
     NOT (Node 2); the problem they think they have vs the one they actually have (Nodes 3, 5);
     the value they didn't buy in the founder's own words (Node 3); three traps, each framed as a
     trap smart people fall into (Node 5); three "am I in the right place" headlines in the
     founder's real voice (Nodes 0, 1, 6); the VVV one-liner (Nodes 1, 6). Zod-validated.
  2. **Makeover** — from spine + crawl → before hero (pulled from the crawled homepage) / after
     hero (rewritten); page-by-page punch list mapping *what the founder said* vs *what each page
     actually says*. Zod-validated.

### Node 7 — Rip Me Apart

One more Opus call after synthesis. Robot-Tim reads the assembled positioning back as the
skeptical, busy, been-burned-before prospect → a short punch list, every soft spot framed as a
fix (never a failure) → closes on the verbatim DemandOS ladder copy ("you built it talking to a
robot version of me, and the robot can only take you so far…"). Generated as the deliverable's
closing section, not interactive (matches the spec's "reads it back" framing).

### Payment + customer lead pipeline

- **Checkout:** `/robot-tim/checkout` creates a Stripe session (`mode: 'payment'`,
  `STRIPE_PRICE_ROBOT_TIM`), with `site_url` + `first_name` in `metadata` and
  `product: 'robot-tim'`. Stripe collects the email. `success_url` →
  `/robot-tim/pending?session_id={CHECKOUT_SESSION_ID}` which resolves to the created session.
- **Webhook:** extend `app/api/webhooks/stripe/route.ts` with a `robot-tim` branch on
  `checkout.session.completed` → insert `robot_tim_sessions` (email + metadata), kick off the
  crawl, email the resume link, fire the customer pipeline, redirect target = `/robot-tim/[id]`.
- **Customer pipeline** — new `captureRobotTimCustomer` mirroring `captureWahWahLead`, but as a
  *customer*: Copper opportunity **$395** at a WON/customer stage, Loops `robot_tim_purchased`
  event (carrying the resume link), Slack alert, beehiiv. All best-effort / non-blocking via
  `waitUntil`; hostname of `site_url` is the company proxy where a name is missing.

### Deliverable & export

- `/robot-tim/[id]` is one resumable page in the console design system (`ConsolePanel` /
  `ConsoleButton` / `ConsoleInput` / `ConsoleHeading`, black bg, Anton/Poppins, rust `#D75A3F` +
  cyan `#00D4FF`). It routes on `status`: `interviewing` → node cards; `crawling`/`synthesizing`
  → a "building your Spine…" progress state; `complete` → the deliverable (Spine + makeover +
  Node 7 + DemandOS CTA).
- **PDF export** at `/robot-tim/[id]/export` — the finished Spine + makeover as a branded HTML
  report rendered to PDF, reusing the `packages/pdf` pattern the other Pro labs use.

### Admin portal

New **Robot-Tim tab** in `app/admin/reports/page.tsx` (email / site / status / overall crawl
score / date / view → `/robot-tim/[id]`), mirroring the Wah-Wah tab. "Overall crawl score" is
derived from the `crawl` jsonb (homepage score, or the mean across crawled pages) — there is no
separate score column on the row. Add a `robot_tim_sessions` query to the admin client-reports
API route. Product color tag: rust `#D75A3F`.

## Reused WTF infrastructure (not rebuilt)

- Stripe checkout + webhook (`lib/stripe.ts`, `app/api/stripe/checkout`, `app/api/webhooks/stripe`).
- Apify `website-content-crawler` (via `packages/utils/research.ts`).
- Detector `apps/web/lib/wah-wah/lexicon.ts` + `extract.ts` for per-page scoring.
- Lead fan-out: `lib/loops.ts`, `lib/beehiiv.ts`, `lib/copper.ts`, `lib/slack.ts`.
- Console design components; `packages/pdf` report pattern.
- The `apps/web` vitest setup stood up for `wah-wah`.

## Env / config

Reuses existing env plus one new price id:
`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `BEEHIIV_*`, `LOOPS_API_KEY`, `COPPER_*`, `SLACK_*`,
`NEXT_PUBLIC_APP_URL`, and **new** `STRIPE_PRICE_ROBOT_TIM`, `APIFY_*` (already used elsewhere).

## Testing

Reuse the `apps/web` vitest setup. Must-test units:
- Interview state machine: push-vs-advance, "push once then take what you get," never-push-twice,
  next-node selection (classifier mocked).
- Spine / makeover / Node 7 Zod schema parsing (fence-strip → `JSON.parse` → `.parse`), matching
  the Detector's Anthropic-call pattern.
- Prompt builders include the founder's answers and crawl context.

## Out of scope for v1 (fast-follows)

- Voice input ("talk to Robot-Tim") — expected to improve extraction, does not block v1.
- Re-run / refresh pricing for past buyers.
- Any interactive back-and-forth in Node 7 (v1 delivers a generated punch list).
- The Visibility Lab fold-in / retirement (separate effort).

## Success criteria

- A founder can go Detector CTA → pay $395 → complete the 7-node interview → receive a Narrative
  Spine + before/after makeover + Node 7, and export a PDF, self-serve, no Tim involvement.
- Purchase creates a tracked **customer** (Copper $395 WON, Loops event, Slack ping, admin row) —
  distinct from the Detector's free lead.
- Crawl overlaps the interview; the founder never waits on it.
- API cost per completed run well under $10 against the $395 price.
- Node 7 ends on the DemandOS ladder — at least the path to a human conversation is wired.
