# Case Study Lab — Agency Co-Branding

**Date:** 2026-07-09
**Status:** Approved design (pending written-spec review)
**Supersedes a locked decision in** `docs/superpowers/specs/2026-06-27-case-study-lab-design.md`:
that spec locked *"agency brand auto-grabbed for styling only"* and *"the downloadable
card carries the agency's brand + the client logo only — NO Tim/Case Study Lab mark."*
This design **keeps** the no-Tim-mark rule but **overturns the agency-invisible rule**:
the agency now appears on the asset via a co-branded header, because the asset is the
agency's own lead-gen proof and a prospect must be able to see whose work it is.

## Problem

The generated case study shows only the client. The agency that did the work — and that
the "Book a call" CTA points to — is invisible on the shareable asset. Separately, three
things are broken or missing in the current build:

1. The scraped **agency logo** is stored (`agency_brand.logoUrl`) but never rendered.
2. **Agency colors** scrape unreliably (El Toro returned `[]` → default red accent).
3. Uploaded **webp** logos crash card generation: `next/og`'s `ImageResponse` (Satori)
   only decodes PNG/JPEG, so a webp client logo throws *"Unsupported image type:
   image/webp"* and the downloadable card fails (the browser web report renders it fine).

## Decisions (from brainstorming)

- **Placement:** co-branded header — **agency logo (left) · client logo (right)** — on
  **both** the hosted web report (`ReportBody`) and the downloadable card (`card/[id]`).
  The rest of the layout is unchanged and stays client-as-hero (stat bar → challenge→
  solution → quote → CTA).
- **Agency assets are manual**, not scraped-and-trusted. The **review screen**
  (`DraftEditor`) gains an agency logo upload, an agency-name field, and a brand-color
  picker. Scraping stays only as a **prefill convenience**; it is no longer load-bearing.
- **No agency logo → agency-name wordmark.** If the agency skips the logo upload, the
  header shows the agency **name** as text. Agency logo is therefore optional.
- **Team: dropped** (was a misspoke; explicitly out of scope).
- **Colors:** the agency's chosen brand color drives the **existing accent** (stat
  numbers, left rules, CTA). No new theming surface.
- **Logo pipeline normalizes every upload to PNG** (via `sharp`) so both the browser
  `<img>` and Satori can consume it — fixes the webp crash for client *and* agency logos.

## Data model

Add three columns to `public.case_study_lab_reports` (all nullable, back-compatible):

| Column | Type | Meaning |
| --- | --- | --- |
| `agency_name` | `text` | Display name for the header / wordmark fallback |
| `agency_logo_url` | `text` | Public URL of the uploaded agency logo (PNG) |
| `accent` | `text` | The agency's chosen brand color (hex), source of truth for the accent |

`AgencyBrand` (in `packages/prompts/case-study-lab/index.ts`) gains an optional
`name: string | null` so the `/start` scrape can prefill the agency name from
`og:site_name`/`<title>`. Existing rows have `NULL` in all three columns and fall back
cleanly (see Rendering).

Logos are stored in the existing **public** `case-study-lab-assets` bucket, now always as
`.png`: `{id}/client-logo.png` and `{id}/agency-logo.png`.

## Flow changes

1. **`/start`** (`start/route.ts`, `extract.ts`): extend the scrape to also read a site
   name (`og:site_name`, else `<title>`), returned on `AgencyBrand.name`. Stored in
   `agency_brand` as today. Non-blocking, best-effort — a miss is fine.
2. **Review screen** (`DraftEditor.tsx`): add, above the existing client-logo control —
   - **Agency name** text input, prefilled from `agency_brand.name`.
   - **Agency logo** file input (optional), same accept set, uploaded via the logo route.
   - **Brand color** `<input type="color">`, prefilled from `agency_brand.colors[0]` else
     `#E51B23`.
   `Flow.tsx` threads the captured `brand` (currently discarded) into `DraftEditor` for
   these prefills.
3. **Logo upload** (`logo/route.ts` + `db.ts`): accept a `kind` field (`"client"` |
   `"agency"`) to choose the storage path. **Transcode the uploaded bytes to PNG with
   `sharp`** before upload; store PNG; return the public URL. Keep the 2 MB cap and the
   PNG/JPG/WebP accept set (webp now transcoded, not rejected).
4. **`/generate`** (`generate/route.ts`): accept `agencyName`, `agencyLogoUrl`, `accent`
   from the review screen and persist them via `finalizeReport`.

## Rendering

`cardModel.ts` — `buildCardModel` gains `agencyName` and `agencyLogoUrl`, and resolves the
accent as: **`accent` column → `agency_brand.colors[0]` → `#E51B23`**.

Both `ReportBody.tsx` (web) and `card/[id]/route.tsx` (image) render the co-branded header:

- **Agency side (left):** agency logo if present, else the agency name as a text wordmark,
  else (no name either) omit the left side gracefully.
- **Separator:** a subtle `×` between the two marks.
- **Client side (right):** unchanged — client logo, or the anonymized monogram/label when
  the client is anonymized. **The agency is never anonymized**; anonymization only affects
  the client side.

`opengraph-image.tsx` is left minimal (headline + accent) — out of scope for co-branding.

## Non-goals

- Scraping the agency team, or any team display.
- Making scraping reliable enough to trust for the logo (we accept manual upload instead).
- Auto-generating an agency wordmark style beyond plain text.
- Reworking the OG social-preview image.

## Testing

- `extractBrand` returns a `name` from `og:site_name` and from `<title>` fallback.
- Logo transcode: a webp buffer in → a PNG buffer out (byte signature check); oversize and
  disallowed types still rejected.
- `buildCardModel` accent precedence (`accent` col > brand colors > default) and
  agency-name/logo passthrough, including the null-everything fallback.
- Card route returns 200 (not a Satori throw) when the stored logo is a transcoded PNG.

## Rollout

Additive migration (nullable columns) — no backfill. The existing El Toro/Splendid report
keeps rendering (agency side falls back to nothing/name); regenerating it through the
review screen adds the agency logo, name, and color.
