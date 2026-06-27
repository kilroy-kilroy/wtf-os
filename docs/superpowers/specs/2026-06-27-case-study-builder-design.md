# Case Study Builder — Design Spec

**Date:** 2026-06-27
**Status:** Approved (design); pending implementation plan
**Working name:** Case Study Builder (route slug `/case-study-builder`)

## Premise

An agency owner answers a short conversational interview about a client win; the
tool produces a shareable web report **and** a one-click branded image, styled in
the agency's brand colors. It is the "7-Minute Case Study" methodology, automated:
results-first, client-as-hero, agency-as-bridge, no design skills required.

This is a public lead-magnet tool in the same family as Discovery Lab, Visibility
Lab, Call Lab, and Wild Wild Detector. It follows the Wild Wild Detector (`wah-wah`)
architecture, which is the cleanest existing pattern.

## Source of truth: the "7-Minute Case Study" methodology

From Tim's "7-Minute Case Study" talk. The fixed ingredients of a good case study:

- A simple **result set expressed in numbers** (qualitative is "not good enough").
- A **client logo**.
- A short list of **issues that existed in the client** — **no more than 3**.
- **Parts of the agency's process** that solved each issue.
- A **client quote**.
- A **call to action**.
- (Bonus) **credit to the client team**.

The crimes a case study must avoid (these double as our guardrails):

- Long epic narrative / exposition.
- Activity lists ("we did this, that, the other thing").
- Making the **agency** the hero instead of the client + results.
- Failing to connect the agency's actions to the results.

The role of the case study: **transformation with the agency in the middle**
(before → after, agency is the bridge). Goal: move a viewer from audience to
prospect. Results are the hook; process points build credibility.

## Decisions (from brainstorming)

1. **Input model — lean, agency self-reports.** No 30-minute client interview.
   The agency owner answers from what they already know; the AI fills gaps.
2. **Deliverable — branded image + web report (both).** The web report is the
   lead-gen artifact; the downloadable branded image is the "promote it in 2
   minutes" artifact from the talk.
3. **Brand assets — agency brand auto-grabbed for styling only.** We scrape the
   agency's *own* site for brand colors + logo to style the output. The **client
   logo is a manual upload** (or anonymized); the client one-liner is typed. We do
   **not** scrape the client's site.
4. **Guided UX — conversational interview.** A chat that adapts to answers but is
   held to the 7-Minute rails. The AI plays Tim interviewing the owner.
5. **Email gating — up front, interview starts immediately.** Capture email +
   agency website on screen one ("where should we send your case study?"), fire the
   lead pipeline immediately, then flow straight into the chat. Captures the lead
   even on mid-interview abandonment.

## User flow

1. **Landing + start** (`/case-study-builder`): pitch + one screen capturing
   **email + agency website URL**. Fires lead capture, kicks off the interview.
2. **Brand grab (background, non-blocking):** scrape the agency's own site for
   brand colors + logo. Falls back to a neutral theme + manual color pickers on
   failure.
3. **Conversational interview:** AI walks problem → stakes → solution → results →
   quote, adapting to answers but enforcing the rails (below).
4. **Review & edit:** once the ingredients are gathered, generate a draft; show a
   **review screen** to tweak any field, upload the client logo (or keep
   anonymized), and confirm the CTA. Required because this is factual client data —
   the AI must never be the last word on a client's numbers.
5. **Reveal:** finished **web report** at `/case-study-builder/r/[id]` (shareable)
   + a **"Download image"** button producing the branded social card.

## The conversational interview engine (the rails)

The AI collects a fixed set of **slots** (the 7-Minute ingredients) while feeling
like a natural chat:

| Slot | Rule the AI enforces |
|---|---|
| Client one-liner (what they do) | One sentence; offers to anonymize ("a B2B SaaS company in fintech") if they can't name the client |
| **Results** | Pushes hard for **numbers**; refuses to let "improved sales" stand; prefers before→after pairs |
| **Issues (max 3)** | Hard cap; if they list more, makes them pick the 3 that mattered |
| **Solutions** | Each maps to a specific issue and names a part of the agency's process |
| Client quote | Asks for a real verbatim line; nudges if generic |
| CTA | Defaults to "want results like this? book a call", editable |
| Team credit (optional) | Signature closer crediting the client team |

**Technical shape:** each turn the model returns `{ reply, slots, readyToGenerate }`
validated with Zod. We render `reply`, persist `slots` + transcript. When
`readyToGenerate` is true (or the user clicks "generate now with what we have"),
move to composition. A turn cap + "generate now" escape hatch prevents endless
chat.

**Interviewer/composer split:** the interviewer gathers structured slots; a
separate composer pass writes the final copy. The chat may wander; the slots
cannot. This is what keeps a free-form chat producing a rigidly-structured
artifact.

## Output generation

- **Web report** (`/case-study-builder/r/[id]`): server component,
  `force-dynamic`, styled with the agency's brand colors. Layout from the talk:
  **stat bar of numbers up top** (the hook), client logo (or anonymized monogram),
  the ≤3 issue→solution pairs, the quote, the CTA button, the team-credit footer.
  Exports `generateMetadata` for a shareable title.
- **Branded image:** downloadable cards rendered with Next.js `ImageResponse` —
  the same engine the existing `opengraph-image.tsx` files use. Offered in **three
  aspect ratios** so the user grabs the right one per platform:
  - **Square 1080×1080** — Instagram feed, general-purpose
  - **Portrait 1080×1350** — LinkedIn / Facebook feed (default)
  - **Landscape 1200×675** — Twitter/X, link previews
  One shared card-rendering component drives all three; the route takes a `size`
  param. One click → download → post.
- **Composition:** a second AI pass turns slots into tight final copy in the fixed
  structure — client-as-hero, agency-as-bridge, no fluff.

## Architecture (mirrors `wah-wah`)

```
packages/prompts/case-study-builder/index.ts   # interviewer + composer system prompts, model const, input types, builders
apps/web/lib/case-study-builder/
  extract.ts     # agency brand grab (colors + logo); reuses normalizeUrl/fetchPage from wah-wah's extract
  interview.ts   # one conversational turn: messages -> { reply, slots, readyToGenerate } (Anthropic + Zod)
  compose.ts     # slots -> final case study copy (Anthropic + Zod)
  db.ts          # saveDraft / getReport / appendTurn / countRecentByIp
  lead.ts        # captureLead fan-out (beehiiv/copper/slack/loops) via waitUntil
apps/web/app/api/case-study-builder/
  start/route.ts     # email + agency url -> grab brand, create row, capture lead, return id + first message
  turn/route.ts      # message -> next reply + updated slots
  generate/route.ts  # compose final -> save -> return
apps/web/app/case-study-builder/
  page.tsx                    # landing + start form + chat UI
  r/[id]/page.tsx             # shareable web report + image download
  r/[id]/opengraph-image.tsx  # OG image + reused for the downloadable card
apps/web/components/case-study-builder/  # StartForm, InterviewChat, DraftEditor, CaseStudyCard, ReportBody
supabase/migrations/<date>_create_case_study_reports.sql
```

- **Brand extraction is net-new** (no logo/brand-color extractor exists in the repo
  yet): logo via `<link rel="icon">` / `og:image`; colors via
  `<meta name="theme-color">` + CSS. Reuse `normalizeUrl` / `fetchPage` (with SSRF
  guard) from `apps/web/lib/wah-wah/extract.ts` rather than rewriting them.
- **Client logo upload → a public Supabase storage bucket** (these are meant to be
  shared, unlike the private `client-documents` bucket).

## Data model

```sql
create table public.case_study_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),   -- back-filled if email matches an account
  email text,
  agency_url text,
  agency_brand jsonb,                        -- { colors[], logoUrl }
  client_name text,
  client_anonymized boolean default false,
  client_logo_url text,
  status text default 'interviewing',        -- interviewing | drafted | complete
  conversation jsonb,                        -- transcript
  slots jsonb,                               -- collected structured ingredients
  result jsonb,                              -- final composed case study
  ip text,
  created_at timestamptz default now()
);
```

- Service-role write policy + read-own RLS (`user_id = auth.uid() OR email =
  auth.jwt()->>'email'`), IP rate-limit index — matching existing tools.
- Stays **out of `PROTECTED_PREFIXES`** in `apps/web/middleware.ts` — public,
  IP-rate-limited via `countRecentByIp`.

## Lead pipeline

Fan-out fires **up front** on the `start` call so the lead is captured even on
mid-interview abandonment. Mirrors `captureWahWahLead`, best-effort and
non-blocking via `waitUntil`:

- `addCaseStudySubscriber` → Beehiiv (`apps/web/lib/beehiiv.ts`)
- `copperSyncLead` → Copper CRM (`apps/web/lib/copper.ts`)
- `alertReportGenerated` → Slack (`apps/web/lib/slack.ts`)
- `onCaseStudyReportGenerated` → Loops lifecycle (`apps/web/lib/loops.ts`)

## Guardrails / edge cases

- Brand grab fails → neutral theme + manual color pickers (never blocks).
- No client logo → anonymized monogram placeholder.
- Results stay qualitative despite pushing → allow, but warn the card is weaker.
- Abuse / off-topic chat → interviewer redirects; input length caps; IP rate
  limit; `maxDuration` on AI routes.
- Interview runs long → turn cap + "generate now with what we have" escape hatch.

## Model

Anthropic Opus (`claude-opus-4-8`), direct SDK + Zod validation — matching the
wah-wah pattern. Two system prompts: **interviewer** and **composer**.

## Open / deferred

- Final tool name (could rebrand to "Case Study Lab" to fit the Lab family).
- Whether to later add the optional client-interview branch (explicitly out of
  scope for v1).
