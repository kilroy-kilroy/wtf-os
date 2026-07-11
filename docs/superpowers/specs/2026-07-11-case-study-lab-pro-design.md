# Case Study Lab Pro — Design Spec

**Date:** 2026-07-11
**Status:** Draft for review
**Working name:** Case Study Lab Pro (route slug `/case-study-lab-pro`)
**Builds on (does not supersede):**
- `docs/superpowers/specs/2026-06-27-case-study-lab-design.md` (the shipped free tool)
- `docs/superpowers/specs/2026-07-09-case-study-lab-cobranding-design.md` (co-branded header)
- `docs/superpowers/plans/2026-07-10-case-study-lab-marketing-redesign.md` (light marketing report + PDF + crops)

Case Study Lab Pro is the **paid tier** of Case Study Lab. It reuses the free tool's
interviewer/composer split, brand grab, co-branded renderer, PDF/social crops, and lead
pipeline wholesale. It adds one thing the free tool deliberately lacks: **more than one
case-study shape.**

## Premise

The free Case Study Lab enforces exactly one format — numeric results as the hook,
client-as-hero, agency-as-bridge, ≤3 issue→process→result pairs (see
`CASE_STUDY_INTERVIEWER_PROMPT` in `packages/prompts/case-study-lab/index.ts`). That is the
**Proof Machine** archetype with a light transformation frame (the `beforeState` slot). It is
intentionally opinionated — that is what makes it finishable in seven minutes and perfect as a
lead magnet.

But research across 72 top agency case studies (see **Source of truth** below) shows Proof
Machine is only **24%** of how great agencies tell proof stories. The single format misfits
whole disciplines: Creative Advertising was **100% Big Idea or Craft Showcase**, and every one
of those wins would be *rejected* by the current interview for lacking numbers. Branding leads
with Big Idea 6-of-12; Web/Digital splits across Transformation, Big Idea, and Craft.

Case Study Lab Pro fixes that: it **routes each win to its best-fit archetype**, runs an
interview tuned to that archetype's real ingredient recipe, **scores the draft and coaches the
gaps**, and outputs a reusable multi-format kit into a saved, hostable **proof library**. Free
makes *a* case study; Pro makes the *right* one and tells you why it will (or won't) convert.

## Source of truth

Two sources, layered:

1. **The "7-Minute Case Study" methodology** (Tim's talk) — unchanged as the spine:
   results-first, client-as-hero, agency-as-bridge, ≤3 issues, issue→process→result, quote,
   CTA, no fabrication. This remains the **Proof Machine** archetype and the default.
2. **The 72-study archetype research** (2026-07-11) — the labeled dataset at
   `~/Desktop/agency-case-studies-72-labeled.csv` (recommend committing a copy to
   `docs/research/agency-case-studies-72-labeled.csv` as the canonical training/eval set).
   Every row carries a ground-truth Primary + Secondary archetype and per-component scores.
   This dataset defines the five archetypes and their **component recipes** (below) and is the
   **eval set for the router and the scorer**.

### The five archetypes (the hero of the page) + data-backed recipes

Recipe = observed component-presence rate across the 72 studies for that primary archetype;
these become each archetype's required-slot set and the scorer's rubric.

| Archetype | Hero | Mkt metric | Biz metric | Timeline | Quote | Before/After | Heavy visuals | Avg score | Share |
|---|---|---|---|---|---|---|---|---|---|
| **Proof Machine** | The result / numbers | 94% | 65% | 71% | 41% | 41% | 12% | 6.6 | 24% |
| **Transformation Story** | An arc over time | 88% | 62% | 88% | 62% | 62% | 50% | **7.5** | 11% |
| **Big Idea** | A strategic reframe / concept | 48% | 30% | 35% | 35% | 22% | 61% | 7.0 | 32% |
| **Craft Showcase** | The deliverable itself | 0% | 0% | 25% | 0% | 12% | 100% | 5.9 | 11% |
| **Method Demonstration** | A repeatable process/POV | 75% | 19% | 56% | 38% | 56% | 25% | 6.6 | 22% |

Two findings that drive product behavior:
- **Proof Machine is the #1 *secondary* archetype** (29 of 72). Metrics are the universal
  reinforcer. Pro always offers a Proof bolt-on.
- **Craft Showcase is the riskiest** (lowest score 5.9, 0% business metrics, lowest
  buying-committee relevance). Pro warns hard on Craft/Big-Idea-alone for B2B buyers.
- Studies carrying **both** a marketing and a business metric score **7.5 vs 6.4**. This is the
  scorer's headline nudge.

## Decisions (proposed — confirm in review)

1. **Pro extends the existing app, not a fork.** Same `packages/prompts/case-study-lab` home,
   same `apps/web/lib/case-study-lab/*` and `components/case-study-lab/*`, parameterized by an
   `archetype` field. No second codebase.
2. **Auth-gated, per-account.** Unlike the free tool (public, email-gated, anonymous rows), Pro
   sits behind auth and writes to the signed-in account. Add `/case-study-lab-pro` to
   `PROTECTED_PREFIXES` in `apps/web/middleware.ts`; gate on a paid entitlement.
3. **Archetype is chosen by a router, overridable by the user.** A pre-interview classifier
   recommends the archetype (with a one-line "why"); the user can accept or switch. Never
   silently lock them in.
4. **One parameterized interviewer + composer, five prompt variants.** Keep the
   interviewer/composer split; select the variant + required-slot set + render template by
   `archetype`. The no-fabrication rule is invariant across all five.
5. **Scoring is a first-class deliverable, not a hidden metric.** After compose, a scorer pass
   grades the draft 1-10 against the archetype recipe and returns the missing ingredients as
   plain-language coaching. Shown on the review screen.
6. **Output is a kit + a library.** Every win yields the web report, letter PDF, and social
   crops (reuse the marketing-redesign surfaces) **plus** a sales-deck slide, LinkedIn post copy
   in Tim's voice, and a homepage "proof bar" snippet. All saved to a per-account library with a
   hostable, branded **case-study wall**.
7. **White-label.** Pro removes the "Powered by Case Study Lab" mark and lets the agency run its
   own clients through it (co-brand primitives already exist). Team seats later.

## The archetype router (net-new IP)

Runs once, before the interview, on three inputs.

**Inputs:** (a) the agency's discipline/service (typed or scraped from the brand grab), (b) a
free-text paste of the raw win ("what happened"), (c) an optional "who reads this" (buyer vs
practitioner).

**Logic (data-backed defaults, then refine by asset + audience):**

| Question | Signal → archetype |
|---|---|
| What kind of work is this? | SEO/Paid → Proof or Method · Branding → Big Idea · Creative → Big Idea/Craft · Web/Digital → Transformation/Big Idea · Content → ask (genuinely splits) |
| What's your strongest asset? | Hard numbers → Proof · Long relationship / big before→after → Transformation · A clever reframe → Big Idea · Beautiful output → Craft · A repeatable system → Method |
| Who reads this? | B2B economic buyer → force a **Proof secondary**; warn if primary is Craft or Big-Idea-alone |

**Output:** `{ archetype, secondary, confidence, why, missing_ingredients[] }`. Rendered as a
recommendation card the user accepts or overrides.

**Eval:** classify all 72 labeled rows; target agreement with the ground-truth Primary
archetype. The router is only trustworthy if it reproduces the labeled set. Build this first —
it de-risks the whole product (see Build sequence).

## The five interviews (the rails, per archetype)

Each archetype selects a variant of the interviewer prompt that enforces *its* required slots.
Shared invariants across all five: one question at a time, no fabrication, ≤3 of any repeatable
item, client-as-hero / agency-as-bridge, a turn cap + "generate now" escape hatch.

| Archetype | Required slots the interview pushes for | Enforced nudge |
|---|---|---|
| **Proof Machine** | numeric results (hook), ≤3 issue→process pairs, before-state, quote | (unchanged from free) refuse qualitative results |
| **Transformation Story** | starting state, **phases/turning points over a timeline**, before→after pair, quote, end state | must produce distinct phases + a timeline, or it's just Proof |
| **Big Idea** | the **counterintuitive reframe/insight** (the hero), the tension it resolved, how it showed up, ≥1 proof point | extract the *idea in one sentence*; auto-suggest a Proof secondary (weakest buying-committee) |
| **Craft Showcase** | **multiple asset uploads** (the work), the brief, the craft decision, ≥1 business outcome | hard nudge: "0% of studied craft pages had a business metric — add one or a buyer won't move" |
| **Method Demonstration** | the **named, repeatable framework** (the hero), where it applied, the result it produced | force the process to be named and portable, not a one-off activity list |

**Technical shape (unchanged from free):** each turn returns `{ reply, slots, readyToGenerate }`
(Zod-validated in `interview.ts`); the composer variant turns slots → final copy in the
archetype's fixed structure. The slot schema is a superset — archetype-specific slots
(`phases`, `insight`, `assets`, `framework`) are nullable and only required by their variant.

## The scorer (net-new; the premium "coach")

A third AI pass after compose. Grades the draft **1-10 against the archetype's recipe** and
returns coaching keyed to the real benchmarks, e.g.:

- "You have a marketing metric but no business metric. Studies with both score 7.5 vs 6.4 — add
  the revenue or pipeline number." (both-metrics benchmark)
- "No client quote. Only 36% of studied pages had one; adding it is the cheapest credibility
  you can buy."
- "This is a Craft Showcase with no business outcome — the lowest-converting shape for a B2B
  buyer. Bolt on one number."

Output: `{ score, band, missing[], suggestions[] }`, rendered on the review screen with
one-click "fix this" prompts that reopen the relevant interview slot.

## Output generation (reuse + extend)

- **Reuse:** the light marketing web report, letter PDF (`@react-pdf/renderer`), and three
  social crops from the marketing-redesign plan; the co-branded `agency × client` header; the
  `buildCaseStudyView`/`cardModel` normalizer; accent theming from agency brand color.
- **Extend:**
  - **Per-archetype templates.** Proof Machine → stat-bar hero (current). Transformation →
    timeline/phase layout. Big Idea → the insight as the hero headline + supporting proof.
    Craft Showcase → **new visual-forward, multi-image template** (the biggest net-new render
    work). Method → framework-diagram-forward.
  - **The kit:** add sales-deck slide (16:9 crop), LinkedIn post copy (Tim-voice composer
    variant), and a homepage "proof bar" HTML/stat snippet, alongside report + PDF + crops.
  - **The wall:** a hostable, branded portfolio page aggregating the account's published case
    studies (client-as-hero grid → individual reports).
- **White-label:** Pro drops the "Powered by Case Study Lab" mark (free keeps it); the CTA
  points to the agency's booking link (`cta_url`, already added).

## Architecture (mirrors and extends existing `case-study-lab`)

```
packages/prompts/case-study-lab/
  index.ts            # + Archetype union, per-archetype interviewer+composer variants,
                      #   router prompt, scorer prompt, superset slot types
apps/web/lib/case-study-lab/
  router.ts           # NET-NEW: classify(discipline, rawWin, audience) -> {archetype, secondary, why, missing}
  interview.ts        # + select variant by archetype; superset SlotsSchema
  compose.ts          # + select composer variant + template by archetype
  score.ts            # NET-NEW: draft -> {score, missing, suggestions} vs recipe
  kit.ts              # NET-NEW: compose slide / linkedin / proof-bar variants
  extract.ts, db.ts, lead.ts, image.ts, view.ts   # reused; db.ts gains Pro table CRUD + library queries
apps/web/app/api/case-study-lab-pro/
  route.ts            # gated entry
  classify/route.ts   # router
  turn/route.ts       # archetype-aware interview turn
  generate/route.ts   # compose + score
  library/route.ts    # list/publish/unpublish account case studies
apps/web/app/case-study-lab-pro/
  page.tsx            # gated landing + router + chat (extends Flow.tsx)
  library/page.tsx    # the proof library
  wall/[slug]/page.tsx# hostable branded case-study wall
  r/[id]/page.tsx     # report + kit downloads (extends existing report)
apps/web/components/case-study-lab/
  RouterCard.tsx, ScoreCard.tsx, CraftShowcaseTemplate.tsx, TransformationTemplate.tsx,
  BigIdeaTemplate.tsx, MethodTemplate.tsx, LibraryGrid.tsx   # NET-NEW
  Flow.tsx, InterviewChat.tsx, DraftEditor.tsx, ReportBody.tsx, cardModel.ts  # reused/extended
supabase/migrations/<date>_create_case_study_lab_pro_reports.sql
docs/research/agency-case-studies-72-labeled.csv   # committed eval set
```

## Data model

A **new table** keyed to the account (keeps the free tool's anonymous lead table clean):

```sql
create table public.case_study_lab_pro_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  agency_url text,
  agency_brand jsonb,          -- reused shape { colors[], logoUrl, name }
  agency_name text,
  agency_logo_url text,
  accent text,
  archetype text,              -- proof | transformation | big_idea | craft | method
  secondary_archetype text,
  router jsonb,                -- { confidence, why, missing[] } from the classifier
  client_name text,
  client_anonymized boolean default false,
  client_logo_url text,
  asset_urls text[],           -- Craft Showcase multi-image uploads
  status text default 'routing', -- routing | interviewing | drafted | scored | published
  conversation jsonb,
  slots jsonb,                 -- superset slots
  result jsonb,                -- composed case study
  quality jsonb,               -- { score, missing[], suggestions[] } from the scorer
  cta_url text,
  published boolean default false,
  wall_slug text,              -- for the hostable wall
  created_at timestamptz default now()
);
```

- Read-own RLS (`user_id = auth.uid()`); published rows readable by slug for the public wall.
- Client + agency logos and Craft assets go to the existing **public**
  `case-study-lab-assets` bucket, always transcoded to PNG (co-branding decision), extended to
  hold multiple `asset` images per report.

## Lead pipeline / entitlement

- Pro is **behind a paid entitlement** — no anonymous lead capture; it converts existing free
  leads. On first Pro use, fire an upgrade/activation event (Loops lifecycle + Slack), reusing
  `lead.ts`. Free's up-front beehiiv/copper/slack/loops fan-out stays on the free tool.

## Free vs Pro boundary (protect the funnel)

| | Free (lead magnet) | Pro (paid) |
|---|---|---|
| Archetypes | 1 (Proof Machine) | 5 + router |
| Coaching/score | — | Yes |
| Output | report + crops + PDF | + slide + LinkedIn + proof-bar + **library + wall** |
| Ingest | interview only | interview or transcript/paste |
| Branding | "Powered by" mark | white-label, agency booking CTA |
| Gate | email | account + paid entitlement |

## Guardrails / edge cases

- **No fabrication** — invariant across router, all five interviews, composer, scorer, kit. The
  scorer flags *thin* proof; it never invents proof.
- Router low confidence → present top-2 archetypes and let the user pick.
- Craft Showcase with no assets → block generation (the work *is* the proof); nudge to upload.
- Qualitative-only results in Proof/Method → allow but score down and say why.
- Brand grab fails → neutral theme + manual pickers (existing behavior).
- Abuse/length/rate limits → reuse existing caps; Pro is auth-gated so IP limits relax.

## Model

Anthropic Opus (`CASE_STUDY_MODEL = "claude-opus-4-8"`), direct SDK + Zod, matching the free
tool. Four prompt roles now: **router · interviewer(×5 variants) · composer(×5 variants) ·
scorer**, all in `@repo/prompts`.

## Build sequence (de-risk first)

1. **Router + eval** against the 72 labeled rows. If it can't reproduce the labels, stop and
   fix the taxonomy before building anything else. (Cheapest, highest-signal.)
2. **Scorer** against the recipe table — standalone, testable on the labeled rows.
3. **One new archetype end-to-end** (Transformation — highest-scoring, closest to the existing
   flow via `beforeState`), proving the parameterized interviewer/composer/template pattern.
4. Remaining three archetypes (Big Idea, Method, then Craft — Craft last; it needs the new
   visual template).
5. Library + wall + kit outputs.
6. White-label + entitlement gating.

## Out of scope (v1)

Team seats/multi-user agencies · in-app editing beyond the review screen · auto-pulling client
metrics from analytics · the optional client-side interview branch · non-English output.

## Open items

- Final route slug / product name ("Case Study Lab Pro" vs a distinct brand).
- Pricing tier placement (alongside the $29 Labs vs Robot-Tim $395 vs DemandOS).
- Whether the free tool should tease the router ("this looks like a Big Idea story — Pro can
  tell it that way") as an upgrade prompt.
- Whether the wall lives on the agency's domain (custom domain) or a hosted subpath in v1.
