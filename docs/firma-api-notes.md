# Firma API Notes — Confirmed Shapes for E-Sign Client

> Source: https://docs.firma.dev (fetched 2026-06-15)
> All "CONFIRMED" items come directly from Firma docs. Items we could not verify from the docs are marked "UNCONFIRMED".

---

## 1. Base URL and Authentication

**CONFIRMED — Base URL:**
```
https://api.firma.dev/functions/v1/signing-request-api
```
(trailing slash optional; docs show it both ways)

**CONFIRMED — Auth header:**
```
Authorization: <your-api-key>
```
The `Bearer` prefix is optional. Both of these are accepted:
```
Authorization: firma_api_abc123xyz
Authorization: Bearer firma_api_abc123xyz
```

---

## 2. Test vs. Live Environment

**CONFIRMED:** Environment is selected purely by which key you send — there is no separate flag or parameter, and **both environments share the same base URL**.

| Aspect | Test | Live |
|--------|------|------|
| Key field (from workspace) | `test_api_key` | `api_key` |
| Credits consumed | No | Yes (€0.029/envelope) |
| Output | Watermarked PDF | Production PDF |

**UNCONFIRMED — Key prefix format:** The docs show a live key example as `firma_api_abc123xyz...` in one regeneration-response example, but do not explicitly document whether test keys carry a `firma_test_` prefix (as assumed in the task brief). Only the workspace object field names (`api_key` vs `test_api_key`) are confirmed.

---

## 3. Creating a Signing Request

**CONFIRMED — Two-step flow (create then send):**

### Step 1: Create (draft)
```
POST https://api.firma.dev/functions/v1/signing-request-api/signing-requests
Content-Type: application/json
Authorization: <api-key>
```

The request body accepts one of two schemas (`oneOf`):

#### Option A — Document-based (PDF upload)
```json
{
  "document":          "<base64-encoded PDF or DOCX string>",
  "name":              "Service Agreement - Jane Smith",
  "description":       "Optional description",
  "expiration_hours":  168,
  "recipients":        [ ...see §4... ],
  "fields":            [ ...see §5... ],
  "anchor_tags":       [ ...see §6... ],
  "reminders":         [],
  "settings":          {}
}
```

**CONFIRMED — PDF attachment:** The field name is `document`, encoded as **base64** (format: byte). Multipart/form-data is NOT used. Max size: 20 MB. Supported formats: PDF and DOCX (DOCX is auto-converted to PDF server-side).

#### Option B — Template-based
```json
{
  "template_id": "<uuid>",
  "name":        "Service Agreement - Jane Smith",
  "recipients":  [ ...see §4... ],
  "fields":      [ ...see §5... ]
}
```

**CONFIRMED — Response:** HTTP 201, body is a `SigningRequestCreateResponse` with `status: "draft"` and all recipients/fields containing real UUIDs.

### Step 2: Send (triggers email delivery)
```
POST https://api.firma.dev/functions/v1/signing-request-api/signing-requests/{id}/send
Authorization: <api-key>
```
No request body required.

### Atomic alternative (create + send in one call)
```
POST https://api.firma.dev/functions/v1/signing-request-api/signing-requests
```
Same body as Option A or B above but includes `send: true` or uses the dedicated atomic endpoint. UNCONFIRMED — exact mechanism of the "atomic" variant (whether it's a body flag or a separate endpoint path like `/signing-requests/send`) was referenced in the docs index but the page content did not spell out the exact difference from the two-step flow.

---

## 4. Recipient / Signer Object

**CONFIRMED — Recipient fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | optional | UUID or temporary ID (`temp_1`, `temp_alice`). If omitted, server assigns UUID. |
| `first_name` | string (max 100) | **required** | |
| `last_name` | string (max 100) | optional | |
| `email` | string (email, max 255) | **required** | |
| `designation` | enum | **required** | `"Signer"` \| `"Approver"` \| `"CC"` |
| `order` | integer (min 1) | **required** | Sequential signing order; lower numbers sign first |
| `phone_number` | string (max 50) | optional | |
| `street_address` | string (max 255) | optional | |
| `city` | string (max 100) | optional | |
| `state_province` | string (max 100) | optional | |
| `postal_code` | string (max 20) | optional | |
| `country` | string (max 100) | optional | |
| `title` | string (max 100) | optional | |
| `company` | string (max 255) | optional | |
| `custom_fields` | object | optional | |

**CONFIRMED — Temporary ID system:** Before recipients are created (i.e., within the same creation request), use `"temp_X"` strings (e.g. `"temp_alice"`, `"temp_1"`) as the `id` to cross-reference recipients from `fields` and `anchor_tags`. The server resolves these to real UUIDs after creation; the response contains only real UUIDs.

---

## 5. Signature Field Placement — Coordinate-Based

**CONFIRMED:** Firma uses **percentage-based x/y coordinates**, NOT text anchors, for the `fields` array. Each field object:

```json
{
  "type":         "signature",
  "page_number":  1,
  "recipient_id": "temp_alice",
  "position": {
    "x":      10.5,
    "y":      80.0,
    "width":  25.0,
    "height": 5.0
  },
  "required":    true,
  "read_only":   false
}
```

**CONFIRMED — `type` enum** (partial list from docs):
`signature`, `initial` / `initials`, `text`, `date`, `checkbox`, `radio_buttons` / `radio`, `dropdown`, `textarea` / `text_area`, `url`, `approval_signature`, `approval_checkmark`, `approval_date`

**CONFIRMED — `position` fields:** all values are percentages 0–100, relative to the page dimensions.

**CONFIRMED — deprecated fields** (still accepted but avoid): `x_postion` (sic), `y_position`, `width`, `heigh` (sic) — note the original schema contains these typos.

---

## 6. Signature Field Placement — Text Anchor Alternative

**CONFIRMED:** Firma also supports text-anchor placement via an `anchor_tags` array in the signing request body (max 100 items). This is SEPARATE from the `fields` array and only available in document-based creation (not template-based).

Each anchor tag object:

```json
{
  "anchor_string":    "{{sig_client}}",
  "type":             "signature",
  "recipient_id":     "temp_alice",
  "case_sensitive":   false,
  "match_whole_word": true,
  "x_offset":         0,
  "y_offset":         0,
  "offset_units":     "percentage",
  "width":            25.0,
  "height":           5.0,
  "required":         true,
  "read_only":        false,
  "remove_anchor_text": true
}
```

**CONFIRMED — `anchor_string`:** The literal text string to search for in the PDF (1–200 chars). If the PDF embeds `{{sig_client}}`, set `"anchor_string": "{{sig_client}}"`.

**CONFIRMED — `remove_anchor_text`:** Defaults to `true` — the anchor string is removed from the final PDF. Set to `false` to preserve it.

**CONFIRMED — `type` enum:** Same values as `fields` above (`signature`, `date`, etc.).

**CONFIRMED — `recipient_id`:** Same temporary-ID or UUID system as `fields`. Use `"temp_alice"` to reference a recipient in the same request.

### Mapping our contract anchor strings

| PDF anchor string | `type` value | `recipient_id` |
|---|---|---|
| `{{sig_client}}` | `"signature"` | client signer temp ID |
| `{{sig_counter}}` | `"signature"` | counter-signer temp ID |
| `{{date_client}}` | `"date"` | client signer temp ID |
| `{{date_counter}}` | `"date"` | counter-signer temp ID |

**UNCONFIRMED — exact offset units values:** The `offset_units` field was referenced but the exact enum values (e.g. `"percentage"` vs `"pixels"` vs `"points"`) were not spelled out in the fetched content.

**UNCONFIRMED — whether `anchor_tags` and `fields` can be mixed** in a single request body: The docs show them as separate top-level arrays; it is likely they can co-exist but this was not explicitly confirmed.

---

## 7. Webhooks

### 7.1 Creating a Webhook

**CONFIRMED:**
```
POST https://api.firma.dev/functions/v1/signing-request-api/webhooks
Content-Type: application/json
Authorization: <api-key>

{
  "url":         "https://your-app.com/webhooks/firma",
  "events":      ["signing_request.completed", "signing_request.recipient.signed"],
  "description": "optional"
}
```
- URL must use HTTPS.
- A test event is sent to the URL at creation time for verification.
- Must respond with HTTP 200 within 5 seconds.

### 7.2 Event Names

**CONFIRMED — Signing request events:**
- `signing_request.created`
- `signing_request.sent`
- `signing_request.viewed`
- `signing_request.completed`
- `signing_request.expired`
- `signing_request.cancelled`
- `signing_request.updated`
- `signing_request.certificate.generated`
- `signing_request.reminder.sent`
- `signing_request.field.filled`
- `signing_request.document.updated`

**CONFIRMED — Recipient events:**
- `signing_request.recipient.added`
- `signing_request.recipient.signed`
- `signing_request.recipient.declined`
- `signing_request.recipient.updated`
- `signing_request.recipient.identity_changed`

**CONFIRMED — Other events (template, workspace, domain):** `template.created`, `template.updated`, `template.deleted`, `template.field.added`, `template.used`, `workspace.created`, `workspace.updated`, `workspace.deleted`, `domain.verified`, `domain.verification.failed`

### 7.3 Webhook Signature Verification

**CONFIRMED — Header name:** `X-Firma-Signature`

**CONFIRMED — Algorithm:** HMAC-SHA256

**CONFIRMED — Header format:**
```
X-Firma-Signature: t=1707500000,v1=abc123def456...
```
Where `t` = Unix timestamp (seconds) and `v1` = hex digest.

**CONFIRMED — Signed payload construction:**
```
{timestamp}.{raw_json_body}
```
i.e., concatenate the `t` value, a literal `.`, and the raw (un-parsed) JSON body bytes.

**CONFIRMED — Secret rotation:** During a 24-hour rotation window, Firma sends BOTH `X-Firma-Signature` (current secret) AND `X-Firma-Signature-Old` (previous secret).

**CONFIRMED — Retry schedule:** Up to 5 retries at 1 min, 5 min, 30 min, 2 h, 6 h. Webhook auto-disabled after 50 consecutive failures.

**CONFIRMED — Timing-safe comparison** recommended. Optionally reject events with timestamp >5 minutes old.

### 7.4 Payload Envelope

**CONFIRMED:**
```json
{
  "id":           "evt_1707500000_k8f2m9x3a",
  "type":         "signing_request.completed",
  "created_at":   "2025-10-03T14:30:00Z",
  "company_id":   "comp_123",
  "workspace_id": "ws_456",
  "data": {
    // event-specific: signing request object, recipients, workspace context
  }
}
```

**UNCONFIRMED — exact `data` shape per event type:** The docs describe the envelope but do not provide a complete schema for `data` for each event. The recipient sub-object in `data` includes at minimum `id`, `email`, `name`, `first_name`, `last_name`, `order`, `designation`, `signed_at`.

---

## 8. Retrieve Signed Document

### 8.1 Download signed PDF

**CONFIRMED:**
```
GET https://api.firma.dev/functions/v1/signing-request-api/signing-requests/{id}/download
Authorization: <api-key>
```

**CONFIRMED — Response body (JSON, not a binary stream):**
```json
{
  "status":       "finished",
  "is_partial":   false,
  "download_url": "https://...",
  "generated_at": "2025-10-03T15:00:00Z",
  "expires_at":   "2025-10-03T16:00:00Z"
}
```
`download_url` is a pre-signed URI to the actual PDF. It expires at `expires_at`; re-call the endpoint to get a fresh URL.

**CONFIRMED — `status` enum values:** `finished`, `in_progress`, `cancelled`, `declined`, `expired`

**CONFIRMED — `is_partial`:** `true` when the request is still in-progress but partial downloads are enabled.

**CONFIRMED — HTTP 409** is returned if the signing request has not been sent yet.

### 8.2 Audit trail

**CONFIRMED:**
```
GET https://api.firma.dev/functions/v1/signing-request-api/signing-requests/{id}/audit
Authorization: <api-key>
```

**CONFIRMED — Response:** JSON object with a `results` array of audit events, sorted chronologically. Each event has:
- `id` (UUID)
- `timestamp` (ISO 8601)
- `source` — `"admin"` or `"signer"`
- `event` (string) — event type
- `description` (string) — human-readable
- `actor` (object, nullable) — signer name/email or admin/API key
- `ip_address` (string, nullable) — signer events only
- `details` (object, nullable) — additional metadata

**CONFIRMED — Rate limit:** 200 requests/minute for both download and audit-trail endpoints.

---

## 9. Summary of UNCONFIRMED Items

1. **API key prefix format** — The task brief assumed `firma_test_*` / `firma_live_*` prefixes. The docs only show `firma_api_*` as an example live key; the test key prefix was not documented. The distinction is entirely by which workspace field (`api_key` vs `test_api_key`) you use.

2. **Atomic create-and-send endpoint** — Referenced in docs index as `create-and-send-signing-request-atomic` but the exact mechanism (body flag vs different path) was not confirmed from the fetched page content.

3. **`offset_units` enum values** for anchor tags — Field exists; exact allowed values (e.g. `"percentage"` vs `"pixels"` vs `"points"`) not spelled out in fetched content.

4. **Mixing `anchor_tags` and `fields`** in the same request — Structurally expected to work (both are top-level arrays) but not explicitly confirmed by the docs.

5. **Exact `data` payload shape per webhook event type** — The envelope is confirmed; per-event `data` schema was not fully documented in the fetched pages.
