# Discovery Lab → Copper CRM Integration: MVP Spec

**Author:** Tim Kilroy
**Date:** April 2026
**Status:** MVP / Proof of Concept

---

## What This Is

A headless AI agent that automatically runs prospect research (Discovery Lab) whenever a new opportunity is created in Copper CRM, then writes the research output back to the deal record and notifies the user. No UI. No dashboard. The product is invisible. The output lives where you already work.

This is the first module in a planned sales workflow chain:

1. **Discovery Lab** → prospect research on new deals ← THIS MVP
2. **Call Lab** → call transcript coaching notes
3. **Follow-Up Lab** → context-aware follow-up drafts
4. **Proposal Lab** → full proposal generation
5. **SOW Maker** → scope of work from proposal elements
6. **Case Study Builder** → post-win case study generation

Each module feeds the next. All output writes back to CRM records. The methodology baked into each agent is the moat.

---

## Architecture Overview

```
Copper CRM (new Opportunity created)
    → Webhook fires to Supabase Edge Function
        → Edge Function fetches contact + company data from Copper API
        → Edge Function calls Claude API with Discovery Lab prompt + contact/company data
        → Edge Function writes research output back to Copper custom fields
        → Edge Function sends notification (email or Slack)
```

### Tech Stack

| Component | Technology | Why |
|---|---|---|
| CRM | Copper | Tim's existing CRM, strong API, ICP alignment |
| Webhook listener / orchestrator | Supabase Edge Function (Deno/TypeScript) | Already connected, free DB, edge deployment |
| AI engine | Claude API (Anthropic) | Discovery Lab prompt logic lives here |
| Notification | Email (Loops or Resend) or Slack webhook | Simple push notification |
| Config storage | Supabase Postgres table | Store prompt templates, user settings, API keys |

---

## Copper CRM Setup

### Custom Fields to Create

Create these custom fields on the **Opportunity** entity in Copper:

| Field Name | Data Type | Purpose |
|---|---|---|
| `Discovery Brief` | Text Area | Main research output (company overview, recent news, strategic context) |
| `Key Contacts` | Text Area | Decision makers, roles, LinkedIn URLs, relevance notes |
| `Conversation Starters` | Text Area | Personalized talking points, pain point hypotheses, trigger events |
| `Discovery Status` | Dropdown | Values: `Pending`, `Running`, `Complete`, `Error` |
| `Discovery Run Date` | Date | Timestamp of last research run |

### Webhook Configuration

Register a webhook subscription via Copper API:

```
POST https://api.copper.com/developer_api/v1/webhooks

{
  "target": "https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/discovery-webhook",
  "type": "opportunity",
  "event": "new",
  "secret": { "key": "[SHARED_SECRET]" }
}
```

**Headers required for all Copper API calls:**
- `X-PW-AccessToken`: API key (from Copper Settings → API Keys)
- `X-PW-Application`: `developer_api`
- `X-PW-UserEmail`: Account email
- `Content-Type`: `application/json`

---

## Supabase Edge Function: `discovery-webhook`

### Trigger

Copper fires a POST to this function whenever a new Opportunity is created. The payload contains an array of Opportunity IDs.

### Flow

```
1. Receive webhook payload → extract opportunity ID(s)
2. Validate webhook secret
3. For each opportunity ID:
   a. GET opportunity from Copper API (includes company_id, primary_contact_id)
   b. GET company details from Copper API
   c. GET primary contact (person) details from Copper API
   d. GET any related people from Copper API
   e. Set Discovery Status = "Running" on the opportunity
   f. Build prompt payload:
      - Company name, website, industry
      - Contact name(s), title(s), email(s)
      - Opportunity name and details
      - Discovery Lab system prompt (from config table)
   g. Call Claude API with assembled prompt
   h. Parse Claude response into three sections:
      - Discovery Brief
      - Key Contacts
      - Conversation Starters
   i. PUT update opportunity with research output + status "Complete" + run date
   j. Send notification: "Discovery brief ready for [Company Name] - [Opportunity Name]"
4. If any step fails: set Discovery Status = "Error", log error, notify
```

### Copper API Endpoints Used

| Action | Method | Endpoint |
|---|---|---|
| Get opportunity | GET | `/developer_api/v1/opportunities/{id}` |
| Get company | GET | `/developer_api/v1/companies/{id}` |
| Get person | GET | `/developer_api/v1/people/{id}` |
| Get related items | POST | `/developer_api/v1/related_items` |
| Update opportunity | PUT | `/developer_api/v1/opportunities/{id}` |
| List custom field defs | POST | `/developer_api/v1/custom_field_definitions` |

### Writing Custom Fields Back

To update custom fields on an opportunity:

```json
PUT /developer_api/v1/opportunities/{id}

{
  "custom_fields": [
    {
      "custom_field_definition_id": DISCOVERY_BRIEF_FIELD_ID,
      "value": "Research output text here..."
    },
    {
      "custom_field_definition_id": KEY_CONTACTS_FIELD_ID,
      "value": "Contact details here..."
    },
    {
      "custom_field_definition_id": CONVERSATION_STARTERS_FIELD_ID,
      "value": "Talking points here..."
    },
    {
      "custom_field_definition_id": DISCOVERY_STATUS_FIELD_ID,
      "value": COMPLETE_OPTION_ID
    }
  ]
}
```

**Note:** Dropdown fields require the option ID (integer), not the label string. After creating the Discovery Status dropdown, call `GET /developer_api/v1/custom_field_definitions` to retrieve the option IDs for Pending, Running, Complete, Error.

---

## Supabase Database Tables

### `config`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key |
| `key` | text | Config key name |
| `value` | text | Config value |
| `created_at` | timestamptz | Auto |

**Required config rows:**

| Key | Value |
|---|---|
| `copper_api_key` | Copper API key |
| `copper_user_email` | Copper account email |
| `webhook_secret` | Shared secret for webhook validation |
| `claude_api_key` | Anthropic API key |
| `notification_email` | Where to send completion notifications |
| `discovery_prompt` | The Discovery Lab system prompt (see below) |

### `discovery_log`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key |
| `opportunity_id` | bigint | Copper opportunity ID |
| `company_name` | text | For easy reference |
| `status` | text | pending / running / complete / error |
| `input_payload` | jsonb | What was sent to Claude |
| `output_payload` | jsonb | What Claude returned |
| `error_message` | text | If failed |
| `duration_ms` | integer | How long the Claude call took |
| `created_at` | timestamptz | Auto |

---

## Discovery Lab Prompt Structure

The system prompt should be stored in the `config` table so it can be iterated without redeploying code. Structure:

```
SYSTEM PROMPT:
You are Discovery Lab, a prospect research agent for professional services firms.
Given a company and contact, produce three sections of research:

1. DISCOVERY BRIEF
   - Company overview (what they do, size, stage, recent funding/news)
   - Industry context and trends affecting them
   - Recent news, press releases, leadership changes
   - Strategic challenges they likely face
   - Their competitive landscape

2. KEY CONTACTS
   - Primary contact: role analysis, likely priorities, decision-making authority
   - Other stakeholders likely involved in buying decisions
   - LinkedIn profile insights if available
   - Reporting structure hypotheses

3. CONVERSATION STARTERS
   - 3-5 personalized talking points tied to their specific situation
   - Pain point hypotheses based on company/industry research
   - Trigger events that make outreach timely
   - Questions that demonstrate you did your homework
   - What NOT to say (common mistakes for this type of prospect)

USER MESSAGE:
Company: {company_name}
Website: {company_website}
Industry: {industry}
Company Details: {company_details}

Primary Contact: {contact_name}
Title: {contact_title}
Email: {contact_email}

Opportunity: {opportunity_name}
Details: {opportunity_details}

Additional Contacts: {related_people}
```

**Enhancement for later:** Add web search tool to Claude API call so the agent can look up real-time company info, news, LinkedIn profiles, etc. This is the difference between "AI that rearranges what you already know" and "AI that actually does research." For MVP, start without it and add when the basic flow is proven.

---

## Notification

Keep it dead simple for MVP. One of:

**Option A: Email (via Resend or Loops)**
```
Subject: Discovery brief ready: {company_name}
Body: Research is complete for {opportunity_name} with {company_name}.
      Open the deal in Copper to review: https://app.copper.com/...
```

**Option B: Slack webhook**
```
POST to Slack incoming webhook URL:
{
  "text": "🔬 Discovery brief ready for *{company_name}* — {opportunity_name}. <copper_url|Open in Copper>"
}
```

Slack is probably better for MVP because it is one HTTP POST with zero dependencies.

---

## Error Handling

| Scenario | Action |
|---|---|
| Copper API rate limited | Retry with exponential backoff (max 3 attempts) |
| Copper API auth failure | Log error, set status "Error", notify |
| Claude API failure | Log error, set status "Error", notify with error detail |
| Claude response doesn't parse cleanly | Write raw response to Discovery Brief field anyway, set status "Complete" with a note |
| Webhook payload missing opportunity ID | Log and ignore |
| Duplicate webhook fires | Check discovery_log for existing run on same opportunity_id in last 5 min, skip if found |

---

## Security Considerations

- Store all API keys in Supabase environment variables (secrets), not in the config table. The config table is for non-sensitive settings.
- Validate webhook secret on every incoming request.
- Supabase Edge Functions run in Deno isolates (sandboxed by default).
- Copper API keys are per-account. For multi-tenant later, each customer provides their own key.

---

## MVP Scope (What to Build First)

### In Scope
- Single Copper account (Tim's)
- Single trigger: new opportunity created
- Single agent: Discovery Lab research
- Write output to 3 custom fields + status + date
- Send Slack notification on completion
- Log all runs to discovery_log table
- Basic error handling and retry

### Out of Scope (Future Modules)
- Multi-tenant / multi-CRM support
- Call Lab (requires call transcript ingestion, e.g., Fireflies integration)
- Follow-Up Lab (requires call data + discovery data + email context)
- Proposal Lab (requires all upstream data + offer parameters)
- SOW Maker (requires proposal data + MSA templates)
- Case Study Builder (requires closed-won deal data + project outcomes)
- Web search enhancement on Claude calls
- Manual trigger ("run discovery on this existing deal")
- Re-run trigger ("refresh research for this deal")
- User-facing config UI (onboarding, prompt editing)
- CRM app store listing
- Billing / subscription management

---

## Future: Full Sales Chain Data Flow

For reference, this is the full vision. Each module adds to the CRM record, and downstream modules read from upstream fields:

```
Lead arrives (inbound/outbound)
  → [Discovery Lab] prospect research → writes to contact + deal
  → Call scheduled
    → [Call Lab] transcript + coaching → writes to deal
    → [Follow-Up Lab] research + call + history → writes to deal
  → Additional call? New players?
    → Repeat Discovery Lab for new contacts
    → Repeat Call Lab + Follow-Up Lab
  → Ready to pitch?
    → [Proposal Lab] all upstream data + offer params → writes to deal + generates doc
    → Intro email to decision makers → drafts email
  → Verbal agreement?
    → [SOW Maker] proposal elements → generates SOW + MSA → attaches to deal
    → Human review and send
  → Signed?
    → Trigger sales-to-delivery handoff process
  → Delivered + successful?
    → [Case Study Builder] deal data + outcomes → generates case study
```

---

## Success Criteria for MVP

1. Create a new opportunity in Copper → research appears on the record within 2 minutes
2. Research output is actually useful (not generic AI slop)
3. Notification arrives reliably
4. Errors are logged and surfaced, not silent
5. Tim uses it on 10 real deals and doesn't want to turn it off
