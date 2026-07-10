# Case Study Lab — Marketing Redesign (voice + light one-pager + PDF)

**Date:** 2026-07-10
**Status:** Design for review
**Builds on:** the co-branding feature (2026-07-09). Supersedes the **dark-card** visual
direction and the "verbatim slots → card" output. The no-agency-mark rule is already
overturned; this also **adds a small "Powered by Case Study Lab" footer mark** (Tim's call).

## Problem

Two failures, confirmed by studying Tim's corpus of professional case studies:

1. **The language is a transcript, not marketing.** We render the owner's exact words —
   including a stat value like *"50% (1.8x to 2.9x over year 1)"* used as a giant number.
   The genuine case studies in the corpus (KlientBoost's Segment & Salesloft) read very
   differently (see Voice Guide). The four narrative-titled PDFs turned out to be internal
   Directive QBR decks — acronym data-dumps with no prose or quote — i.e. the **anti-pattern**
   our current output resembles.
2. **The export is an ugly dark card.** `justify-content: space-between` on a tall near-black
   card leaves sections **floating in voids**; there's no structure. Every premium example is
   **light, sectioned, and rhythmically spaced** — a KlientBoost-style one-pager with a thin
   branded band and a vertical "Results rail."

## Decisions (from brainstorming)

- **Delivery:** a downloadable **letter-size PDF one-pager** *plus* **redesigned light social
  crops** (square/portrait/landscape).
- **Voice depth by surface:** the **web report and PDF carry the full narrative**; the **social
  crops stay a tight lockup** (headline + 3 stat values + co-branded logos + powered-by).
- **Visual system:** **light** (white paper), one **agency-accent band** at top, accent used
  only on the band, stat arrows, and CTA. Client is the visual hero; agency + "Powered by
  Case Study Lab" are small (band + footer). Deliberately single-theme (case studies are light).
- **Scope containment:** the **interview is unchanged**. All marketing transformation happens in
  the **composer** — it turns the same gathered slots into tight stats + narrative.
- **Live CTA:** the agency can add a **booking/CTA link** on the review screen so the "Book a
  call" button actually goes somewhere. The web report and PDF link the CTA button to it;
  fallback is the agency's own site, then plain text. (Image crops can't be clickable — text only.)
- **Reference mock (approved direction):** the one-pager mockup shown in chat
  (light sheet, El Toro blue band, "What El Toro did" challenge→method column, Results rail,
  quote, CTA, powered-by footer).

## Voice Guide (encode into the composer prompt)

From the two genuine case studies; the QBR decks are the anti-pattern.

- **Headline = `[Client] [verb] [result] [method]`**, one sentence (~12–18 words). No throat-clearing.
- **Dek (2–3 sentences):** client credibility + a one-clause need + a line of tension
  (e.g., "The demand was there; the paid engine underneath it wasn't."). Not a dramatized
  problem section.
- **Approach = challenge → method pairs** (1–3). Each: a punchy one-line challenge, then the
  **named** process piece that solved it ("Meta Power 5 rebuild — …"). Specificity is the
  agency's only credibility; **zero self-praise**.
- **One bold bridge sentence** chains the methods to the outcome ("Rebuilding the account,
  catalog, and affiliate program flipped paid from a cost center into Splendid's profit driver.").
- **Tight stats:** the **value is short** ("2.9x", "35%"), the **context lives in the caption**
  ("Return on ad spend, up from 1.8x — a 50% lift"). Show start→end when given. A `direction`
  (up/down) drives a small arrow.
- **Quote:** verbatim, attributed **name + title + company**.
- **No fabrication** (unchanged hard rule): only facts from the gathered slots; the composer
  sharpens wording and structures, never invents numbers/quotes.

## Content model

The composer's output type `CaseStudy` gains marketing structure (all additive; old rows keep
rendering via fallbacks — see Back-compat):

```ts
interface CaseStudyResultV2 { value: string; caption: string; direction: "up" | "down" | "flat"; }
interface CaseStudyApproach  { challenge: string; method: string; }   // replaces issue/solution framing
interface CaseStudy {
  headline: string;
  clientName: string;
  clientDescriptor: string;
  kicker: string | null;          // e.g. "DTC Apparel · Paid Media & Growth"
  dek: string;                    // 2–3 sentence intro with tension
  approach: CaseStudyApproach[];  // 1–3
  bridge: string;                 // one bold sentence
  results: CaseStudyResultV2[];   // tight value + context caption + direction
  quote: { text: string; attribution: string } | null;
  cta: string;
}
```

The composer still consumes the **existing gathered slots** (descriptor, results[label/value],
issues[issue/solution], quote, cta). Its new job: tighten each result into `value`+`caption`+
`direction`, reframe issues into `approach`, and write `kicker`, `dek`, `bridge`.

## Surfaces

A shared **light design system** (tokens) drives all three:
`--paper #fff`, `--ink #16181d`, `--muted #5b6472`, `--hair #e4e7ec`, `--accent = agency color`.
Type: a serif display for the headline (premium/editorial), sans body, sans stat numbers (largest
element). Accent confined to band + stat arrows + CTA.

1. **Web report** `/case-study-lab/r/[id]` — the light one-pager, full narrative (kicker, headline,
   dek, "What [Agency] did" challenge→method column, bridge, Results rail, quote, CTA), co-branded
   band, "Powered by Case Study Lab" footer link. Replaces the dark `ReportBody`.
2. **PDF one-pager** `GET /api/case-study-lab/pdf/[id]` — letter-size (8.5×11) PDF via
   **`@react-pdf/renderer`**, same content + design language as the web report, downloadable /
   attachable. Fonts registered (bundled serif + sans). Returns `application/pdf`.
3. **Social crops** `GET /api/case-study-lab/card/[id]?size=` — re-skinned **light + tight**:
   co-branded band, headline, **3 tight stat values** (value + short caption + arrow), small
   powered-by. No dek/approach/bridge (that's the web/PDF job). Still Satori/`ImageResponse`,
   still PNG, still three sizes, logos rendered with explicit widths (from the co-branding fix).

The review screen's **Download** section gains a **"Download PDF"** button alongside the image
crops. The "Build another" and footer keep the powered-by link.

**Live CTA link.** The review screen gains a **CTA link** URL field (next to the existing CTA
text). Persisted as a new nullable column `cta_url` on `case_study_lab_reports` (set at
`/generate`, like the agency fields; additive migration, applied by Tim). Render: the CTA button
on the **web report** and **PDF** is an anchor to `cta_url` → falls back to `agency_url` → if
neither, plain non-linked text. The **social crops** render the CTA as text only (not clickable).

## Back-compat

New `CaseStudy` fields are additive. Renderers **fall back** when a field is absent on an old
row: `kicker`/`dek`/`bridge` → omit the block; `approach` → derive from legacy `issues`
(issue→challenge, solution→method); `results` → if legacy `{label,value}`, show `value` big and
`label` as caption (no arrow). So the existing El Toro/Splendid row still renders (in the new
light layout, minus the new prose) until regenerated. Regenerating through the review screen
produces the full new treatment. The only schema change is one additive nullable column
`cta_url text` (for the live CTA link); the redesigned content itself needs no migration
(`result` is jsonb).

## Non-goals

- Changing the interview flow or the gathered-slots schema.
- Multi-page PDFs or a PDF "brochure" — one letter page.
- Charts/graphs — typography-driven stats only (the corpus's charts read as the least premium).
- Re-scraping agency brand reliably (still manual per co-branding spec).

## Testing

- Composer: given a fixed slots fixture, output validates against the V2 schema; a verbose input
  value ("50% (1.8x to 2.9x over year 1)") yields a **tight** `value` + a context `caption`
  (assert `value.length` is short and the "1.8x"/"2.9x" context landed in `caption`).
- Back-compat mapper: a legacy `result` (old `issues`/`{label,value}`) maps to `approach` +
  `results` without throwing; renderers get renderable data.
- PDF route: returns `200 application/pdf`, non-empty, `%PDF` header, for a completed row.
- Card route: still `200 image/png` all three sizes; light template; logos have explicit widths.
- Powered-by link present on web report + PDF + card footer, pointing to
  `https://app.timkilroy.com/case-study-lab`.

## Rollout

Additive/back-compat. One additive nullable column (`cta_url`) — same apply-before-deploy
ordering as the co-branding migration (Tim applies the SQL first). Regenerate the El Toro/Splendid
row to showcase the full new treatment.
