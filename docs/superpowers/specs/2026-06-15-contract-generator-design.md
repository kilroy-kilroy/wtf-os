# Contract Generator + E-Sign (Firma) — Design Spec

**Date:** 2026-06-15
**Status:** Approved, ready for implementation plan
**Home:** Internal gated page in WTF Growth OS (`apps/web`), `/console/contracts`

## Goal

A simple internal tool to generate contracts from templates, draft a Statement of
Work (SOW) on the fly, render a PDF, and send it for e-signature via the Firma API
(client signs first, WTF countersigns). Track status to completion and store the
signed document privately.

## Decisions (locked)

- **Single source of truth = our HTML templates.** Firma is purely the e-sign layer
  (Approach A). We do NOT author contracts inside Firma's template editor.
- **Internal only**, reuses existing auth, Supabase, `@repo/pdf`, `runModel`/prompts.
- **Templates** originate from existing Word/Google Docs, converted once into
  `contract_templates` rows (HTML + `{{placeholders}}`).
- **SOW** = AI draft from rough particulars (via `runModel`) + a reusable snippet
  library.
- **Client data** entered manually now; "Pull from Copper" autofill is a later phase.
- **Signers** = two, fixed roles: client (`order 1`) then counter/WTF (`order 2`).
- **Delivery** = Firma emails signers (not embedded signing).
- **Status** = webhook-first with a manual "Refresh status" poll backup.

## Data model (Supabase)

- **`contract_templates`** — `id`, `name`, `slug`, `body_html` (with `{{placeholders}}`
  and a `{{sow}}` slot), `variables` (jsonb: expected fields), `signer_config` (jsonb),
  `is_active`, timestamps.
- **`sow_snippets`** — `id`, `label`, `category` (deliverable | clause | timeline | …),
  `body_html`, `is_active`, timestamps.
- **`contracts`** — `id`, `template_id`, `field_values` (jsonb snapshot), `sow_html`,
  `merged_html` (immutable rendered snapshot), `pdf_path`, `signed_pdf_path`,
  `status` (`draft` → `sent` → `viewed` → `signed` → `completed` / `declined` /
  `voided`), `firma_request_id`, `created_by`, timestamps.
- **`contract_signers`** — `id`, `contract_id`, `role` (`client` | `counter`), `name`,
  `email`, `order`, `status`, `signed_at`, `firma_signer_id`.

**Why `merged_html` + `field_values` are stored:** once sent, a contract must be
immutable. Editing a template later must not change in-flight contracts. The rendered
snapshot guarantees that.

## Flow / UX

Single page `/console/contracts`: list view + "New contract" wizard (one screen, 4 steps).

1. **Pick template** — dropdown of active templates; selection reveals required fields.
2. **Client details** — form auto-generated from the template's `variables` jsonb.
   Manual entry now; "Pull from Copper" button slots in here later.
3. **Build SOW** — "particulars" box → **Draft with AI** (`runModel`) → editable
   rich text; plus a snippet picker filtered by `sow_snippets.category`.
4. **Preview & send** — live HTML render of the merged contract (HTML preview is
   sufficient; no separate PDF preview step). Buttons: **Save draft** and
   **Generate & Send**.

List view: status badge per contract, client name, date, row action to view signed
PDF via a gated route (same pattern as the `client-documents` private bucket).

PDF generation + Firma request creation happen **server-side** in one action; the
Firma API key never reaches the browser.

## Modules & boundaries

- **`packages/contracts/template-engine.ts`** — pure `merge(bodyHtml, fieldValues,
  sowHtml) → mergedHtml`. No I/O. Unit-testable.
- **`packages/prompts/contracts/sow-draft.ts`** — SOW prompt + `draftSow(particulars,
  context)` via `runModel`. **Must be registered in `MODEL_CONFIGS`** (unregistered
  keys silently route to OpenAI with `model=undefined`).
- **`@repo/pdf` (reuse)** — feed `merged_html` to existing `html-to-pdf.ts`; add a thin
  `contract-pdf.ts` wrapper for contract page styling + signature anchors.
- **`apps/web/lib/firma.ts`** — sole seam to Firma: `createSigningRequest({ pdf,
  signers })`, `getRequest(id)`, `voidRequest(id)`, `verifyWebhook(payload, sig)`.
- **`apps/web/lib/contracts/`** — `createContract`, `generateAndSend`, `syncStatus`.
- **Routes** — `POST /api/contracts/[id]/send`, `GET /api/contracts/[id]/file`
  (gated), `POST /api/firma/webhook`.

## Firma integration

Send route (server-side):
1. Render `merged_html` → PDF via `@repo/pdf` → private Supabase bucket (`pdf_path`).
2. `firma.createSigningRequest()` with PDF + two signers (client order 1, counter
   order 2).
3. **Signature field placement — OPEN ITEM to confirm against Firma API docs during
   implementation:** embed anchor strings (`{{sig_client}}`, `{{sig_counter}}`,
   `{{date_client}}`) in the template and map to Firma fields. Confirm whether Firma
   supports text-anchor detection on uploaded PDFs or requires x/y coordinates BEFORE
   building the send route.
4. Store `firma_request_id` + `firma_signer_id`s; flip status to `sent`.

Status sync:
- `POST /api/firma/webhook` — verify signature (`firma.verifyWebhook`), update
  `contracts.status` + `contract_signers`. On `completed`, pull signed PDF + audit
  trail into private bucket (`signed_pdf_path`).
- Backup: "Refresh status" button → `syncStatus()` → `firma.getRequest()`.

## Error handling

- PDF render fails → stays `draft`, error surfaced, nothing sent.
- Firma create fails → `draft` + stored error; idempotent retry (advance to `sent`
  only on success, no duplicate envelope).
- Invalid webhook signature → 401 + log.
- `FIRMA_ENV` env var gates test vs live so dev never burns real envelopes.

## Testing

- **Unit:** `template-engine` merge (placeholders, missing vars, `{{sow}}` slot),
  webhook signature verification, status-mapping.
- **Integration:** `send` route against Firma **test mode** end-to-end (create →
  simulate webhook → assert `completed` + stored signed PDF).
- **Manual:** one real test-mode contract through the UI before going live.

## Prerequisites / env

- Firma account + API key (test mode free). **Live key pasted in chat 2026-06-15 must
  be rotated.**
- Env vars (values in `.env.local` / Vercel, never committed):
  `FIRMA_API_KEY_TEST`, `FIRMA_API_KEY_LIVE`, `FIRMA_ENV`, `FIRMA_WEBHOOK_SECRET`.

## Out of scope (later phases)

- Copper autofill of client data.
- Multi-party / variable signer counts (current model: fixed client + counter).
- In-app embedded signing (using email delivery instead).
