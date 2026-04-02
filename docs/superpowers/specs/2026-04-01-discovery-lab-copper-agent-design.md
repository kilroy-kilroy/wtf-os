# Discovery Lab → Copper CRM Agent — Design Spec

**Date:** 2026-04-01
**Status:** Draft

## Overview

A headless AI agent that automatically runs Discovery Lab prospect research when a new opportunity is created in Copper CRM. It writes a condensed summary to Copper custom fields, saves the full report to the app database, and links to the rich report from Copper. Notification via Slack.

## Goals

1. New Copper opportunity → full Discovery Lab research runs automatically
2. Condensed 3-section summary written to Copper custom fields (scannable in CRM)
3. Full report saved to `discovery_briefs` table with link back from Copper
4. Slack notification on completion
5. Error logging and status tracking

## Non-Goals

- Multi-tenant / multi-CRM support
- User-facing config UI
- Web search enhancement (future)
- Manual re-run trigger (future)
- Downstream modules (Call Lab, Follow-Up Lab, etc.)

---

## 1. Architecture

```
Copper CRM (new Opportunity created)
    → Webhook POST to /api/webhooks/copper
        → Validate webhook secret
        → Fetch opportunity + company + contact from Copper API
        → Set Discovery Status = "Running"
        → Run Discovery Lab analysis (Perplexity via existing prompt)
        → Save full report to discovery_briefs table
        → Write condensed summary to Copper custom fields
        → Add note with link to full report
        → Set Discovery Status = "Complete"
        → Send Slack notification
```

Lives in the existing Next.js app on Vercel. Reuses existing infrastructure:
- `apps/web/lib/copper.ts` — Copper API utilities
- `packages/prompts/` — Discovery Lab prompt logic
- `apps/web/lib/slack.ts` — Slack notifications
- Perplexity API — same model used by existing Discovery Lab

---

## 2. Copper Custom Fields (on Opportunity)

Five custom fields to create on the Opportunity entity:

| Field Name | Data Type | Purpose |
|---|---|---|
| Discovery Brief | Text Area | Company overview, industry context, strategic challenges |
| Key Contacts | Text Area | Decision makers, roles, relevance notes |
| Conversation Starters | Text Area | Talking points, pain hypotheses, trigger events |
| Discovery Status | Dropdown | Pending / Running / Complete / Error |
| Discovery Run Date | Date | Timestamp of last research run |

These are created via a one-time setup script that calls `POST /custom_field_definitions`.

---

## 3. Webhook Endpoint

**Route:** `apps/web/app/api/webhooks/copper/route.ts`

**Trigger:** Copper fires POST when a new Opportunity is created. Payload contains opportunity IDs.

**Copper webhook payload format:**
```json
{
  "ids": [12345, 67890],
  "subscription_id": "abc123",
  "event": "new",
  "type": "opportunity",
  "updated_attributes": {}
}
```

**Validation:** Copper webhooks include a secret in the registration. We validate by checking the webhook was registered with our endpoint (Copper doesn't sign payloads — we rely on the secret being in our registration and the HTTPS endpoint being private).

Add `COPPER_WEBHOOK_SECRET` env var for optional header validation if Copper sends it.

**Flow per opportunity ID:**

1. Fetch opportunity from Copper: `GET /opportunities/{id}`
2. Extract `company_id` and `primary_contact_id`
3. Fetch company: `GET /companies/{company_id}` (if present)
4. Fetch primary contact: `GET /people/{primary_contact_id}` (if present)
5. Check for duplicate: query `discovery_log` for this opportunity_id in last 5 minutes — skip if found
6. Update opportunity: set Discovery Status = "Running"
7. Build prompt from company + contact data
8. Call Perplexity API with Discovery Lab prompt (same pattern as `/api/analyze/discovery`)
9. Parse response into 3 sections + full markdown
10. Save full report to `discovery_briefs` table
11. Update opportunity custom fields: Discovery Brief, Key Contacts, Conversation Starters, Status = "Complete", Run Date = now
12. Add note to opportunity: "Discovery Lab research complete. Full report: {url}"
13. Send Slack alert: "Discovery brief ready for {company} — {opportunity name}"
14. Log to `discovery_log` table

If any step fails: set Discovery Status = "Error", log error, send Slack error alert.

---

## 4. Prompt Strategy (Hybrid)

Use Perplexity (same as existing Discovery Lab) with a prompt that produces **two outputs**:

**Output 1 — Copper Summary (3 sections, concise):**
- Discovery Brief: 3-5 bullet points, max 500 chars
- Key Contacts: Primary contact analysis + stakeholder hypotheses, max 500 chars
- Conversation Starters: 3-5 personalized talking points, max 500 chars

**Output 2 — Full Report (rich markdown):**
- Same depth as existing Discovery Lab Pro output
- Saved to `discovery_briefs` table
- Accessible at `/discovery-lab/report/{id}?admin=1`

The prompt asks Claude/Perplexity to return JSON with both `summary` (3 fields) and `full_report` (markdown). The summary gets written to Copper; the markdown gets saved to the database.

---

## 5. Database

### `discovery_log` table (new)

Tracks every automated discovery run for deduplication and debugging.

```sql
CREATE TABLE IF NOT EXISTS discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id BIGINT NOT NULL,
  opportunity_name TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_payload JSONB,
  output_summary JSONB,
  discovery_brief_id UUID,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discovery_log_opp ON discovery_log(opportunity_id);
CREATE INDEX idx_discovery_log_created ON discovery_log(created_at DESC);

ALTER TABLE discovery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON discovery_log
  FOR ALL USING (true) WITH CHECK (true);
```

### Reuse `discovery_briefs` table

The full report is saved as a normal discovery brief with:
- `user_id`: null (automated, not user-initiated)
- `lead_email`: contact email from Copper
- `lead_name`: contact name
- `lead_company`: company name
- `version`: 'pro' (full depth)
- `target_company`: company name
- `target_contact_name`: primary contact name
- `target_contact_title`: primary contact title
- `markdown_response`: full report
- `metadata`: `{ source: 'copper_webhook', opportunity_id, copper_company_id }`

---

## 6. Copper Webhook Registration

One-time setup: register the webhook via Copper API.

```
POST /developer_api/v1/webhooks
{
  "target": "https://app.timkilroy.com/api/webhooks/copper",
  "type": "opportunity",
  "event": "new",
  "secret": { "key": "{COPPER_WEBHOOK_SECRET}" }
}
```

This is done via a setup script, not part of the runtime code.

---

## 7. Custom Field Setup

One-time setup script creates the 5 custom fields and stores their IDs as env vars:

- `COPPER_FIELD_DISCOVERY_BRIEF` — custom_field_definition_id for Discovery Brief
- `COPPER_FIELD_KEY_CONTACTS` — custom_field_definition_id for Key Contacts  
- `COPPER_FIELD_CONVERSATION_STARTERS` — custom_field_definition_id for Conversation Starters
- `COPPER_FIELD_DISCOVERY_STATUS` — custom_field_definition_id for Discovery Status dropdown
- `COPPER_FIELD_DISCOVERY_DATE` — custom_field_definition_id for Discovery Run Date
- `COPPER_STATUS_PENDING` — dropdown option ID for "Pending"
- `COPPER_STATUS_RUNNING` — dropdown option ID for "Running"
- `COPPER_STATUS_COMPLETE` — dropdown option ID for "Complete"
- `COPPER_STATUS_ERROR` — dropdown option ID for "Error"

These IDs are returned when the fields are created. Store them as Vercel env vars.

---

## 8. File Structure

```
CREATE: apps/web/app/api/webhooks/copper/route.ts       — Webhook handler
CREATE: apps/web/lib/copper-discovery.ts                  — Discovery-specific Copper logic (fetch opp/company/contact, write fields)
CREATE: apps/web/lib/discovery-agent.ts                   — Orchestrator: prompt building, API call, response parsing
CREATE: supabase/migrations/20260401_add_discovery_log.sql — discovery_log table
CREATE: scripts/copper-setup.ts                           — One-time setup: create custom fields + register webhook
```

---

## 9. Error Handling

| Scenario | Action |
|---|---|
| Copper API rate limited | Retry with backoff (max 3 attempts) |
| Copper API auth failure | Log error, set status "Error", Slack alert |
| Perplexity API failure | Log error, set status "Error", Slack alert |
| Response doesn't parse | Write raw response to Discovery Brief field anyway, status "Complete" with note |
| Duplicate webhook fire | Check discovery_log for same opportunity_id in last 5 min, skip if found |
| Missing company/contact | Run with whatever data is available, note gaps in output |

---

## 10. Vercel Configuration

The webhook handler may take 30-60 seconds (Perplexity research). Set:

```typescript
export const maxDuration = 120; // 2 minutes max
```

This matches the existing Discovery Lab and Visibility Lab endpoints.
