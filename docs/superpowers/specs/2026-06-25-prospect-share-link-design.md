# Prospect Share-Link — Design Spec

- **Date:** 2026-06-25
- **Status:** Approved (design)
- **Repo/branch:** `wtf-os`, `feat/client-doc-portal-html-approve` (extends PR #182)
- **Depends on:** PR #182 (HTML viewer, approval columns, `lib/client-documents/*`, slack alerts)

## Overview

Let an HTML document (proposal / alignment doc) be shared with a **not-yet-client prospect** who has no `client_enrollment`. The prospect opens a **public, unguessable share link** (`/d/<token>`) — no login, no account — views the branded doc in a sandboxed iframe, and can **Approve** by typing name + email. The owner is notified on first view and on approval. This is the prospect-facing half of the document portal; the existing `/client/documents` flow remains the client-facing half.

Access is **obscurity-gated** (the secret token is the gate) — the same model accepted for these low-stakes docs earlier. Revoke by unpublishing or deleting the doc.

## Data model — reuse `client_documents`

A prospect doc is a `client_documents` row with `enrollment_id` NULL and a `share_token` set. Such rows are **invisible to the client portal RLS** (the enrollment join never matches null), so they are reachable only via the token route through the service role — no leak risk.

Migration adds:
- `ALTER COLUMN enrollment_id DROP NOT NULL`
- `share_token TEXT UNIQUE`
- `prospect_email TEXT`, `prospect_name TEXT`
- `approved_email TEXT` (prospect approver email; `approved_by` stays NULL for prospects)
- partial unique index on `share_token WHERE share_token IS NOT NULL`

## Components

- **Public viewer** `app/d/[token]/page.tsx` — outside `/client` so middleware does not gate it. Loads the doc by `share_token` (service role); 404 if no row matches the token. (`client_documents` has no status column; a prospect doc is reachable iff its `share_token` matches — revoke by deleting the doc or clearing its `share_token`.) Renders `content_body` in a sandboxed iframe (`allow-scripts`, no `allow-same-origin`, `no-referrer`). `noindex`. On load, POSTs to the public view route.
- **Public view route** `app/api/share/[token]/view/route.ts` — validates token, sets `viewed_at` atomically (`WHERE viewed_at IS NULL`), fires `alertDocumentViewed` once. Returns `{ firstView }`.
- **Public approve route** `app/api/share/[token]/approve/route.ts` — validates token; requires `name` (and captures `email`); atomic `UPDATE ... WHERE approved_at IS NULL` setting `approved_at`/`approved_name`/`approved_email`; fires `alertDocumentApproved`; 409 if already approved. No auth.
- **Token authorize helper** `lib/client-documents/share-authorize.ts` — `authorizeShareDocument(token)` loads the doc by `share_token` via service role; returns `{ ok, doc }` or a 404 error. The token IS the authorization (no user identity).
- **Admin ingestion (prospect mode)** — extend `app/api/admin/documents/route.ts` JSON branch: when `enrollment_id` is absent but `prospect_email` (or an explicit `audience: 'prospect'`) is present, create a prospect doc — generate `share_token`, set `prospect_email`/`prospect_name`, require `content_body` for html, accept `requires_approval` — and return `{ document, shareUrl }` where `shareUrl = ${APP_URL}/d/${share_token}`. Existing client/file/link/text behavior unchanged.
- **Token generation** `lib/client-documents/share-token.ts` — `generateShareToken()` returns a long URL-safe random string (≥ 22 chars). Plain unguessable token; not the email-bound 24h `access-tokens` flow.

## Reused from PR #182

`validateApprove` / approval columns, the sandboxed-iframe rendering approach, `alertDocumentViewed` / `alertDocumentApproved`. The public routes mirror the client routes but authorize by token instead of by enrollment.

## Error handling

- Unknown token (no matching row) → 404 (no existence oracle).
- Approve without name → 400; already approved → 409.
- All `/d/*` pages `noindex`.

## Security

- Token is the gate (obscurity), consistent with the accepted model for these docs. Tokens are long/random/unguessable and not in any cert (path, not subdomain).
- Prospect docs excluded from client RLS by null enrollment.
- Approvals written server-side via service role; atomic guard prevents replay overwrite.
- No prospect Supabase user is created (anonymous model).

## Out of scope (v1) — seams left

- Token expiry / rotation (revoke = unpublish/delete for now).
- Email-gating sensitive docs (the "Both" option — later).
- Converting a prospect doc into a real client doc (link an enrollment later).
- `deliver-doc` CLI wiring to the prospect ingest endpoint (optional follow-up).

## Testing

Pure-function Vitest (repo convention): `generateShareToken` (format/uniqueness), prospect-payload validation in admin ingestion, reuse of `validateApprove`. Routes/viewer verified manually after the owner applies the migration.
