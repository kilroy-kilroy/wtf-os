# The 7-Minute Case Study — Design

> **⚠️ SUPERSEDED (2026-06-27)** by `docs/superpowers/specs/2026-06-27-case-study-lab-design.md` and the plan `docs/superpowers/plans/2026-06-27-case-study-lab.md`. No code was ever written against this version. The successor keeps this spec's framework, no-fabrication hard rule, and "client-brand-only card (no Tim mark)" decision, but changes the input mode to a **conversational interview** (was a guided form), ships **three card sizes** (was square-only), names the tool **Case Study Lab** (slug `/case-study-lab`), and uses the table `case_study_lab_reports`. Kept for history.

**Date:** 2026-06-24
**Status:** Superseded — see banner above
**Origin:** Lead magnet derived from WTF Assessment issue #9 (Insufficient Social Proof), built to productize Tim's "7-Minute Case Study" framework (see transcript in conversation of 2026-06-24).

## One-line

A guided builder that turns the 7 ingredients of Tim's 7-Minute Case Study into a finished, post-ready image card in the user's own brand — under 10 minutes, no designer, no homework.

## Why this one

Filtered against the brief — *discrete, executable in <10 min, personalized, and a **complete solution to a narrow problem** that removes work rather than adding it.* That last constraint eliminates every diagnostic issue in the assessment (revenue/FTE, churn, founder-tax, pricing) — those are calculators that hand the user a new problem. Case studies are a pure writing+design task the tool can finish *for* them, and proof is the highest-leverage narrow asset an agency owns. It also does not overlap with the Wah-Wah Detector, which owns homepage positioning copy.

## The framework being enforced (the value)

From Tim's recording. The tool's job is to make these rules unavoidable:

- **Results are the hook, and must be numbers.** Qualitative results ("they did great") are rejected.
- **The client + results are the hero; the agency sits in the middle** of a before→after transformation. Not exposition, not an activity list, not "how hard we worked."
- **Max 3 issues** (2 is better). More is "messy, gross."
- **Every issue connects to a named piece of the agency's process, which connects to the result.** The connection is mandatory — this is the fix for Tim's "three crimes" (long narrative; activity list that makes the vendor the hero; no link between actions and results).

### The 7 ingredients (= the input fields)

1. Client name + logo + brand color
2. Result set, in numbers
3. 1–3 issues that existed at the start
4. The process piece that solved **each** issue (paired with the issue)
5. Client quote
6. CTA text + the user's calendar/link
7. *(optional)* Credit to the client team

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Which issue | #9 Social Proof → Case Study builder | Complete artifact, highest leverage, no Wah-Wah overlap |
| Input mode | Guided structured fields | The framework *requires* specific parts; a paste box can't enforce numbers/≤3-issues/issue→process pairing |
| Output | Rendered image card (PNG) | Solves the "I have zero design skills / need a designer" pain directly; biggest wow |
| Card branding | **Their branding only — no Tim mark** | It carries their client's logo and goes to their prospects; give them a genuinely clean, usable asset |
| Email capture | Upfront (name + email) | Matches the recent Wah-Wah change (`604ce10`); finished card auto-emailed |

## User flow

1. **Landing page** — promise: *"A post-ready case study in under 10 minutes. Your client's the hero, your results are the hook, and you don't need a designer."*
2. **Email + first name upfront** — lead captured immediately; finished card auto-emailed.
3. **Guided builder** — the 7 ingredients as structured fields, each with a friendly-bouncer validation nudge:
   - Client name · logo upload · brand color picker
   - Results — **numeric validation**; non-numeric input is pushed back ("Give me a number. '300% growth,' not 'they did great.'")
   - Issues — repeatable rows, **hard-capped at 3**
   - Process piece **paired with each issue** in the UI (issue → what-you-did)
   - Client quote · CTA text + link · optional team credit
4. **Generate** — one Claude call sharpens results into a hook, tightens each issue, frames each issue→process→result link, polishes the quote, enforces voice and "you in the middle."
5. **Result page** at shareable `/r/[id]` — renders the card, download-PNG button, "build another."

## AI layer

- **Deterministic pre-validation in code** before the model call: results contain digits/`%`; 1–3 issues; each issue has a paired process; required fields present. Friendly-bouncer error copy.
- **One Claude call**, `claude-opus-4-8`, zod structured output (same pattern as `apps/web/lib/wah-wah/analyze.ts`). System prompt + model live in `@repo/prompts` (canonical prompt home), mirroring `WAH_WAH_SYSTEM_PROMPT` / `WAH_WAH_MODEL` / `buildWahWahUserPrompt`.
- **Hard no-fabrication rule.** The model only reframes/sharpens what the user supplied — it never invents numbers, client names, quotes, or claims. (Recent commits `bda76bb`/`3f53e17` show fabrication was a real failure mode; this guardrail is explicit in the system prompt and the output schema echoes back only supplied facts.)
- **Output schema (draft):**
  ```ts
  z.object({
    hook: z.string(),            // the result-driven headline
    context: z.string(),         // one short framing line, client-as-hero
    points: z.array(z.object({   // 1–3, mirrors the issue→process→result chain
      issue: z.string(),
      process: z.string(),       // the named piece of the agency's process
      connection: z.string(),    // how the process resolved the issue / drove the result
    })),
    quote: z.string(),           // polished client quote (wording only, never invented)
    cta: z.string(),
    credit: z.string().optional(),
  })
  ```

## Rendering

- `next/og` `ImageResponse` (same engine as the Wah-Wah OG image).
- **1080×1080 square** for v1 (safe in LinkedIn/IG feeds; portrait later).
- One clean template, **auto-themed** from brand color + logo. Layout follows Tim's slide: logo → big result numbers (hook) → *The challenge* (≤3 issues) → *What we did* (process mapped per issue) → client quote → their CTA. **Their branding only.**
- Logo is fetched by `next/og` at render time from a **public** Storage bucket (logos aren't sensitive — distinct from the gated `client-documents` bucket).

## Data + pipeline (reuse, don't rebuild)

- **New table** `public.case_study_reports`, mirroring `wah_wah_reports`: `id`, `user_id`, `email`, `inputs jsonb`, `result jsonb`, `logo_path`, `created_at`, plus RLS policies copied from the Wah-Wah migration (service-role full access; users read own by `user_id`/jwt email).
- **New Storage bucket** (public) for uploaded logos.
- **Lead pipeline:** add `captureCaseStudyLead(...)` mirroring `captureWahWahLead` in `apps/web/lib/wah-wah/lead.ts` — fans out to Loops / beehiiv / Copper / Slack via `waitUntil` (best-effort, non-blocking). Reuse the existing `@/lib/beehiiv`, `@/lib/copper`, `@/lib/loops`, `@/lib/slack` helpers; add a case-study source/variant where each expects one.
- Auto-email the finished card (Loops), matching the Wah-Wah auto-send.

## File layout (mirrors the Wah-Wah port)

- `apps/web/app/case-study/` — landing + builder pages
- `apps/web/app/case-study/r/[id]/` — result page + `opengraph-image`/card route
- `apps/web/app/api/case-study/` — generate + lead routes
- `apps/web/lib/case-study/` — `generate.ts` (Claude call), `db.ts`, `lead.ts`, `validate.ts`
- `apps/web/components/case-study/` — builder form, card preview
- `packages/prompts/case-study/` — system prompt, model, user-prompt builder (exported via `@repo/prompts`)
- `supabase/migrations/<date>_create_case_study_reports.sql`

## Out of scope (v1)

Template gallery · multiple card sizes · in-place editing · saved history beyond the result URL · regenerate loop (resubmit to change).

## Open items (non-blocking)

- Public route path: `/case-study` vs. a branded slug — Tim's call at launch (mirror the Wah-Wah `/wah-wah` decision).
- Brand-color → readable-contrast handling in the card (auto-pick light/dark text from the chosen color).
