# Self-Serve Positioning Engine — Design Spec

**Date:** 2026-06-10
**Status:** Approved direction, pre-implementation
**Owner:** Tim Kilroy

## Why this exists

The Labs proved that $29/mo standalone tools fail without traffic. Meanwhile real demand keeps showing up for the high-ticket programs — including buyers who want the outcome but balk at the price (the SalesOS lead who was "in until the pricing"). The gap in the ladder is between free and $10K. This product fills it with an AI-delivered version of the DemandOS positioning work, fronted by a free tool that manufactures its own distribution.

**Strategic goal:** less Tim-dependent revenue. The AI runs the extraction; Tim only enters the picture at the DemandOS rung.

## The funnel

| Rung | Product | Price | Job |
|------|---------|-------|-----|
| 1 | **Wah-Wah Detector** | Free (email gate on full report) | Viral top-of-funnel. Diagnosis. |
| 2 | **Robot-Tim Positioning Engine** | $395 one-time | The prescription. The missing mid-rung. |
| 3 | **DemandOS** (human Tim) | $10K–$75K | Full installation, reached via Node 7's ladder. |

Core rule: give away the diagnosis, charge for the prescription. Each rung's deliverable ends by selling the next rung — never skipping one.

## Product 1: Wah-Wah Detector (free)

Paste a homepage URL → get a **Wah-Wah Score** in ~30 seconds.

- Flags every wah-wah phrase ("results-driven," "full-service," "extension of your team," "data-driven," "customer-centric") in context.
- For each flagged phrase, one gut-punch line about what the agency is probably trying to say underneath.
- Score is public and screenshot-friendly — the screenshot is the distribution engine.
- Email gate on the full report; emails flow to AIC (beehiiv).
- Single page only, one Claude call. Cost: pennies per run.
- CTA at the end of the report: "You now know what's broken. Robot-Tim knows what you should say instead."

**Naming note:** "Charlie Brown Detector" stays internal only — Peanuts Worldwide IP risk. Public name is **Wah-Wah Detector**; "wah-wah" (the trombone sound) is generic and keeps the joke.

## Product 2: Robot-Tim Positioning Engine ($395)

The async extraction interview, built exactly from `robot-tim-question-tree (1).md`. Product rule: **extraction, not invention.** Robot-Tim surfaces language already operating in the business; he never generates a philosophy from a prompt.

### Components

1. **The interview (Nodes 0–6).** Conversational session. Per node, Claude does two jobs only: classify the answer into the LISTEN FOR buckets (results-speak / process-speak / generic / real) and fire the matching branch reaction. Push once per node, then move on. Guardrails from the question tree go into the system prompt verbatim: enemy is the broken idea never the people, swearing dial set by the founder, never accept "results" or "process" as a differentiator, nothing may sound AI-written.
2. **Full-site crawl.** Every page scored with the Detector engine; output maps the gap between what the founder told Robot-Tim and what the site actually says.
3. **Deliverables — Narrative Spine Starter:**
   - Who this is for / who this is NOT for (said out loud, on purpose)
   - The problem they think they have vs. the one they actually have
   - The value they didn't buy, in the founder's own words
   - Three traps, each framed as a trap smart people fall into
   - Three "am I in the right place" headlines in the founder's real voice
   - The VVV one-liner
4. **The visible makeover.** Rewritten homepage hero (before/after) plus a page-by-page punch list from the crawl.
5. **Node 7 — Rip Me Apart.** Robot-Tim reads the assembled positioning back as a skeptical, burned-before prospect and delivers the punch list, every soft spot framed as a fix. Ends on the ladder copy to DemandOS ("you built it talking to a robot version of me, and the robot can only take you so far").

### Sales page

The Northbound Creative makeover (`northbound-creative-makeover (1).md`) is the proof artifact: before hero (81% wah-wah) → interview excerpts → after hero. Use essentially as-is.

### v1 scope decisions

- **Text input first; voice is the fast-follow.** Voice ("talk to Robot-Tim") is expected to improve extraction quality materially — founders talk better than they type — but it does not block v1.
- One-time purchase, not subscription. Re-runs / refreshes can become a later offer.

## Build

- **Stack:** Next.js + Supabase (Tim's standard app stack — the Astro marketing site can't host this), Claude API, Stripe checkout, crawler (Firecrawl or fetch+parse), email capture → beehiiv/AIC.
- **Architecture:** the question tree is a state machine. Each node = a state; Claude's per-node work is classify-and-react. Synthesis (Spine Starter + makeover) is a separate generation pass over the accumulated extracted material plus the crawl.
- **Sequencing:** ship the Detector first — it starts collecting emails and proving the hook while Robot-Tim is still being built.
- **Source material for voice tuning:** `Position Exercise - Live` transcript (real Tim running the exercise) for few-shot voice reference.

## Portfolio decisions

- **Visibility Lab folds into this funnel.** Its site-analysis and scoring guts become Detector/crawl components. No fourth standalone lab.
- **Call Lab and Discovery Lab stay put** — they become bundled tooling inside SalesOS AI, which is round two after this funnel proves out.
- This product is the template: if Detector → Robot-Tim → DemandOS converts, the same shape repeats as (sales diagnostic) → Robot-Tim-Sales → SalesOS.

## Success criteria

- Detector: shares/screenshots happening organically; email capture rate from score → full report.
- Robot-Tim: first paid customers within launch month; API cost per completed run well under $10 against $395 price.
- Ladder: Node 7 → DemandOS conversations booked (even one per quarter changes the math at $10K+).

## Open items (not blocking)

- Exact Detector phrase lexicon (seed from the live transcript + Tim's greatest-hits list of wah-wah phrases).
- Whether the Detector lives at a standalone domain for shareability or under timkilroy.com (default: timkilroy.com first).
- Voice input implementation approach (browser speech-to-text vs. recorded audio + transcription).
- Refresh/re-run pricing for past Robot-Tim buyers.
