# Call Vault — Design

**Date:** 2026-09-03
**Status:** Approved for planning

## Purpose

Bootstrap a corpus of real agency sales calls for analysis. Clients and friends
contribute 3–5 call transcripts or recordings (any stage). In exchange they get an
individualized sales call improvement plan and a 30-minute review.

Two things must be true for the corpus to be worth building:

1. **Contributors must feel safe.** Sales calls read as proprietary. An NDA has to be
   available and has to execute *inline* — no envelope emailed, no waiting.
2. **The corpus must support aggregate analysis** ("only 25% of calls included X"),
   not just per-call review.

The second requirement drives the schema. An LLM can extract *what happened* from a
transcript later. It cannot reliably recover *whether the deal closed*, *what stage the
call was*, or *how big the deal was*. Those dimensions are the aggregation denominator
and must be captured at intake or they are gone.

## Scope

**In scope:** public intake form, contact + agency profile, per-call metadata, text and
audio uploads, optional embedded NDA, Supabase persistence, Beehiiv/Loops/Slack/Copper
fan-out, magic-link resume, admin review UI.

**Out of scope (deliberate):**
- **Transcription.** Files are stored raw. No Whisper, no chunking, no background jobs.
- **Video.** Text formats and audio only.
- **Per-call analysis.** No `call_vault_analysis` table. Speculative until the extraction
  schema is known; cheap to add later. The intake dimensions that *aren't* cheap to add
  later are captured now.
- **Deletion-clock automation.** NDA §6 (30-day deletion after the consultation concludes)
  is handled manually, outside the app, by explicit decision.

## Architecture

### Route surface

Public page at `/call-vault`. Single page, three phases, not a wizard:

```
About you  →  NDA (optional, modal)  →  Your calls  →  Submit
```

The contributor row is created when "About you" is completed. Everything after attaches
to it. This is what makes both the NDA (needs a named signer) and the resume link (needs
a row to mint a token against) work without extra machinery.

`/call-vault?token=<access_token>` is the resume entry point — same page, pre-populated,
NDA state carried over.

### Upload path

Browser → Supabase Storage directly, via signed upload URLs. Mirrors
`apps/web/app/api/client/documents/route.ts` (`sign` → direct PUT → `commit`). Large files
never traverse a Vercel function, so file size is a Supabase concern rather than a
request-body or timeout concern.

### Anonymous session authorization

The form is unauthenticated, so every request after `start` must prove it owns the
contributor row.

- `POST /api/call-vault/start` mints a `session_token` (32 random bytes, 24h TTL) onto the
  contributor row and returns it once. The client holds it in React state + `sessionStorage`.
- Every subsequent request carries it. Signed upload URLs are issued only against a valid
  session token, and `commit` rejects any `storage_path` outside the contributor's prefix.
- `session_token` is distinct from `access_token`. The access token is single-use and
  emailed (resume); the session token is short-lived and in-memory (this sitting).
  Consuming an access token mints a fresh session token.

**Abuse controls:** email required and format-validated before any upload URL is issued;
max 10 calls per contributor; max 5 files per call; 200MB per file; `ip` recorded on the
contributor row with a per-IP rate limit on `start` (pattern: `case_study_lab_reports`).

## Data model

Four new tables. Not extensions of `client_documents` — prod carries legacy CHECK
constraints that are absent from the repo migrations, and new values fail there with
PG 23514.

```sql
call_vault_contributors
  id                        uuid pk
  name, email (unique), agency_name, agency_url
  services                  text[]
  revenue_band, target_client
  terms_accepted_at         timestamptz not null   -- baseline consent, see below
  nda_contract_id           uuid → contracts(id)   -- null when skipped
  nda_signed_at             timestamptz
  client_legal_name, client_address                -- collected only if NDA opted into
  session_token, session_token_expires_at
  access_token, access_token_expires_at, access_token_used_at
  status                    text default 'draft'   -- draft | submitted
  ip, created_at, submitted_at

call_vault_calls              -- the unit of analysis
  id                        uuid pk
  contributor_id            uuid → call_vault_contributors on delete cascade
  stage                     text   -- discovery | pitch | proposal | negotiation | renewal | other
  outcome                   text   -- won | lost | no_decision | ghosted | na
  deal_size_band            text
  call_date                 date
  label, notes              text
  created_at

call_vault_files              -- 0+ per call
  id                        uuid pk
  call_id                   uuid → call_vault_calls on delete cascade
  storage_path              text not null
  kind                      text   -- transcript | audio | pdf | other
  file_name, mime_type      text
  size_bytes                bigint
  created_at
```

Storage bucket `call-vault`, **private**, 200MB `file_size_limit`. RLS: service-role only
on all four tables and the bucket. Files are reachable only through an admin-gated route
that mints short-TTL signed URLs (pattern: `apps/web/app/api/contracts/[id]/file/route.ts`).

### Why calls and files are separate

One call can arrive as a recording *and* its transcript. Flattening them makes the
aggregate denominator wrong the first time someone uploads both — a two-file call would
count twice in "X% of calls."

### Accepted file types

Text: `.txt .md .docx .pdf .rtf .csv .vtt .srt`
Audio: `.mp3 .m4a .wav .aac .ogg .flac`

Video is rejected client-side and server-side. Since nothing is transcribed, a 2GB MP4 is
storage cost with no path to value. UI copy nudges toward "export the audio or the transcript."

### Intake vocabularies

Fixed option sets, stored as slugs, so aggregate queries group cleanly:

- **Services** (multi): paid_media, seo, content, web_dev, branding, email, social, pr,
  strategy, full_service, other
- **Revenue band:** under_500k, 500k_1m, 1m_3m, 3m_5m, 5m_10m, 10m_plus
- **Stage:** discovery, pitch, proposal, negotiation, renewal, other
- **Outcome:** won, lost, no_decision, ghosted, na
- **Deal size band:** under_2_5k_mo, 2_5k_5k_mo, 5k_10k_mo, 10k_25k_mo, 25k_plus_mo,
  one_time_project, unsure

## Consent and the NDA

### Baseline consent (everyone)

A required checkbox, independent of the NDA, compressing NDA §5(b) and §7:

> I have the rights and consents necessary to share these calls, and I grant KLRY LLC the
> right to create and use anonymized, aggregated insights from them.

Stamped as `terms_accepted_at`. **This is load-bearing.** NDA §5(b) is what grants the
perpetual anonymized-data license that authorizes the aggregate analysis; without a
baseline equivalent, contributors who *skip* the NDA would be the legally murkier ones —
inverted from how it feels. The NDA is an upgrade (full document, deletion obligation,
signed artifact), not the sole source of rights.

### NDA source and edits

Source: `docs/call-review-nda-massachusetts.md` (Confidentiality and Data Use Agreement,
KLRY LLC, Massachusetts / Middlesex County).

Three edits when converting to a `contract_templates` row:

1. **Party clause.** `**[CLIENT LEGAL NAME]**, a [state] [entity type], with an address at
   [address] ("Client")` becomes `**{{client_legal_name}}**, with an address at
   {{client_address}} ("Client")`. Name + address identifies a party sufficiently; §12
   already fixes Massachusetts law and venue regardless of state of incorporation. Avoids
   two extra form fields on a favor-ask.
2. **Signature block.** The markdown table becomes a `sig-block` div.
   `packages/pdf/contract-report.tsx` handles `h1–h4, p, ul, ol, div` only — there is no
   `<table>` case, so a table renders as nothing. Follows the existing convention in
   `scripts/seed-contract-template.ts`.
3. **Typo.** `thirty (30)days` → `thirty (30) days`.

Merge fields: `{{client_legal_name}}`, `{{client_address}}`, `{{effective_date}}`.
Firma anchors: `{{sig_client}}`, `{{date_client}}` only.

### Pre-signed counter-signature

KLRY's side is pre-executed in the template — no `{{sig_counter}}` anchor, so Firma creates
a single-recipient envelope and the document is fully executed the moment the contributor
signs.

```html
<div class="sig-block">
  <p><strong>For {{client_legal_name}}</strong><br/>
     Signature: {{sig_client}}<br/>
     Name: ____________________<br/>
     Title: ____________________<br/>
     Date: {{date_client}}</p>
  <p><strong>For KLRY LLC</strong><br/>
     Signature: <em>Tim Kilroy</em><br/>
     Name: Tim Kilroy<br/>Title: CEO<br/>Date: {{effective_date}}</p>
</div>
```

Signature is typed — Times-Italic. `packages/pdf` registers only the react-pdf built-ins
(Times-Roman/Bold/Italic). Registering a script TTF would mean fetching it at render time
like the logo, adding a failure mode that breaks *all* contract generation. Not worth it.

No `{{init_*}}` anchors, so the existing `useInitials = mergedHtml.includes('{{init_')`
check resolves false and no initials fields are requested.

### Embedded signing

Firma supports embedded signing. Confirmed against docs.firma.dev:

1. `POST /signing-requests` — create the envelope (existing `createSigningRequest`)
2. `GET /signing-requests/{id}/users` — each recipient object's `id` is the
   `signing_request_user_id`
3. Iframe `https://app.firma.dev/signing/{signing_request_user_id}` with
   `allow="camera;microphone;clipboard-write"`
4. `postMessage` events: `signing.started`, `signing.completed`, `signing.declined`,
   `signing.error`

**`/send` is never called**, so no email is ever dispatched. This is the entire point and
must be asserted in tests.

New code:

- `lib/firma.ts` → `getSigningUserIds(requestId): Promise<Array<{ id: string; email?: string; order?: number }>>`
  Returns recipients in order. Only the `id` field is confirmed by the docs, so the
  caller matches on `order` then `email` — the same defensive pattern
  `createSigningRequest` already uses. The NDA has one signer, so it is `[0]`.
- `lib/contracts/service.ts` → `generateForEmbeddedSign(contractId)`: identical to
  `generateAndSend` through envelope creation and id persistence, then stops. Status
  advances `draft → sent` without a send call.

Client-side: validate `event.origin === 'https://app.firma.dev'` before processing any
message. On `signing.completed`, POST to `/api/call-vault/nda/confirm`, which
**re-verifies server-side via `getRequest(requestId)`** rather than trusting the
postMessage, then stamps `nda_signed_at`. The existing `/api/firma/webhook` route already
correlates by `firma_request_id` and is the durable backstop; postMessage only drives UI.

### Opt-in flow

Choosing "I'd like an NDA" reveals exactly two extra fields — **legal entity name**
(prefilled from Agency Name) and **business address** — then opens the modal.
`nda_contract_id` is written at envelope-creation time, before signing, so a contributor
who abandons mid-signature is still correlatable to their envelope. `nda_signed_at` is
stamped only after server-side re-verification.

Skipping the NDA is one click and blocks nothing.

## Submit fan-out

Mirrors `apps/web/lib/wah-wah/lead.ts`. Everything third-party runs under `waitUntil` and
is individually caught — a Loops or Copper hiccup never fails the contributor's submission.

- `addCallVaultSubscriber()` → Beehiiv / Agency Inner Circle
- `onCallVaultSubmitted()` → Loops event `call_vault_submitted`, properties:
  `firstName`, `agencyName`, `callCount`, `ndaSigned`, `bookingUrl`, `resumeUrl`
- `alertReportGenerated()` → Slack
- `copperSyncLead()` → Copper, stage LEAD, consistent with every other public tool

`bookingUrl` comes from `NEXT_PUBLIC_CALL_VAULT_BOOKING_URL`, defaulting to
`https://meet.timkilroy.com/sales-call-survey`; the Loops template may override it.

**Manual follow-up required:** the Loops automation for `call_vault_submitted` must be
built in the Loops dashboard. Firing the event does not by itself send mail. (Same
outstanding gap as `prospect_doc_shared`.)

## Resume flow

On submit, `mintAccessToken()` (`lib/access-tokens.ts`, 24h single-use) writes a token to
the contributor row; the thank-you email carries `/call-vault?token=…`. Landing there
consumes the token, mints a fresh session token, and returns the contributor with the NDA
already signed. A new token is minted on every submit.

The three required columns (`access_token`, `access_token_expires_at`,
`access_token_used_at`) plus the partial index are in the migration.

## Admin

`/admin/call-vault`, gated by `requireAdminRequest`:

- **List:** contributor, agency, revenue band, call count, file count, NDA status,
  submitted date.
- **Detail:** full profile, per-call metadata, per-file download via short-TTL signed URLs,
  link to the signed NDA PDF in the `contracts` bucket.

In scope, not a follow-up — without it the corpus is unreadable.

## Error handling

- **Upload failure:** per-file retry in the UI; a failed file simply has no committed row.
  Orphaned storage objects are acceptable and invisible.
- **NDA generation failure:** surfaced inline with a retry, plus a "skip the NDA" escape.
  Baseline consent already covers the corpus rights, so a Firma outage never blocks
  contribution.
- **`signing.error` / `signing.declined`:** modal closes, contributor continues without an
  NDA; nothing is stamped.
- **Fan-out failure:** logged, non-blocking, never surfaced to the contributor.
- **Duplicate email:** upsert on `email`. A returning contributor attaches new calls to
  their existing row.

## Testing

- `lib/firma.test.ts` — `getSigningUserIds` returns recipient ids from the `/users`
  response, and tolerates objects carrying only `id` (no `order`/`email`).
- `lib/call-vault/nda.test.ts` — `generateForEmbeddedSign` creates an envelope and
  **never calls `sendSigningRequest`**; persists `firma_request_id` before returning.
- NDA template merge — rendered HTML contains no residual `[BRACKET]` placeholders and no
  unreplaced `{{…}}` outside the Firma anchors.
- `lib/call-vault/db.test.ts` — `commit` rejects a `storage_path` outside the contributor's
  prefix; file-type validation rejects video and unknown extensions.
- Session token — expired or mismatched token yields 401 from the signed-URL route.

## Files

**New**
```
supabase/migrations/20260903_create_call_vault.sql
scripts/seed-call-vault-nda.ts
apps/web/app/call-vault/page.tsx
apps/web/app/call-vault/CallVaultForm.tsx
apps/web/app/call-vault/AboutYouStep.tsx
apps/web/app/call-vault/NdaModal.tsx
apps/web/app/call-vault/CallUploader.tsx
apps/web/lib/call-vault/db.ts
apps/web/lib/call-vault/nda.ts
apps/web/lib/call-vault/lead.ts
apps/web/lib/call-vault/vocabularies.ts
apps/web/app/api/call-vault/start/route.ts
apps/web/app/api/call-vault/nda/route.ts
apps/web/app/api/call-vault/nda/confirm/route.ts
apps/web/app/api/call-vault/calls/route.ts
apps/web/app/api/call-vault/files/route.ts
apps/web/app/api/call-vault/submit/route.ts
apps/web/app/admin/call-vault/page.tsx
apps/web/app/admin/call-vault/[id]/page.tsx
apps/web/app/api/admin/call-vault/files/[fileId]/route.ts
```

**Modified**
```
apps/web/lib/firma.ts               + getSigningUserIds
apps/web/lib/contracts/service.ts   + generateForEmbeddedSign
apps/web/lib/loops.ts               + onCallVaultSubmitted
apps/web/lib/beehiiv.ts             + addCallVaultSubscriber
```

## Environment

- `NEXT_PUBLIC_CALL_VAULT_BOOKING_URL` — review-call booking link (new; optional,
  defaults to `https://meet.timkilroy.com/sales-call-survey`)
- `FIRMA_ENV`, `FIRMA_API_KEY_TEST`, `FIRMA_API_KEY_LIVE`, `FIRMA_WEBHOOK_SECRET` — existing
- `LOOPS_API_KEY`, `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`, `SUPABASE_SERVICE_ROLE_KEY` — existing

## Open items for Tim

1. **Loops automation** for `call_vault_submitted` — must be built in the dashboard.
   Confirmed 2026-09-03: the app fires the event only; Tim wires the automation later.
2. **Route name.** `/call-vault` is a placeholder; rename is a one-line change.
3. **Firma env.** Ship against `FIRMA_ENV=test` (watermarked PDFs, no credits) and flip to
   `live` after an end-to-end signing pass.
