# Admin Command Center Design

**Goal:** Replace the fragmented admin experience with a unified command center that surfaces client health, automates notifications, and provides a general-purpose file sharing system for clients.

**Architecture:** Four independent features built incrementally on top of the existing admin pages. Slack webhooks first (highest pain relief), then client file drop, content library CRUD, and finally a client health dashboard. Each feature is standalone and delivers value immediately.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Storage), Slack Incoming Webhooks, Loops.so (client email notifications), Vercel Cron.

---

## Phase 1: Slack Integration Layer

### Purpose

Push admin-relevant events to a `#admin-alerts` Slack channel so Tim never has to remember to check the admin UI.

### Implementation

New module: `apps/web/lib/slack.ts`

```typescript
sendSlackAlert(text: string, blocks?: SlackBlock[]): Promise<void>
```

Single function, fire-and-forget pattern (same as Loops/Beehiiv calls). Uses `SLACK_WEBHOOK_URL` env var. Slack Block Kit for rich formatting.

### Events

| Event | Source File | Trigger |
|-------|-----------|---------|
| Friday check-in submitted | `/api/client/five-minute-friday` POST handler | After successful insert |
| Client ran a report | `/api/analyze/discovery/route.ts`, `/api/visibility-lab/analyze/route.ts`, `/api/visibility-lab-pro/analyze/route.ts`, Call Lab routes | After report saved to DB |
| Client first login | Auth callback or middleware detection | `last_sign_in_at` was null, now set |
| New Pro subscription | `/api/webhooks/stripe/route.ts` `checkout.session.completed` | After subscription saved |
| Subscription cancelled | `/api/webhooks/stripe/route.ts` `customer.subscription.deleted` | After status updated |
| Client inactive 7+ days | `/api/cron/admin-digest` | Daily cron check |
| Friday check-in overdue | `/api/cron/admin-digest` | Daily cron check |

### Daily Digest Cron

New route: `/api/cron/admin-digest`

Runs daily via Vercel Cron (`vercel.json` schedule). Queries:
- `client_enrollments` joined with `auth.users.last_sign_in_at` to find clients inactive 7+ days
- `five_minute_fridays` to find unanswered submissions (no response row)
- Posts a single summary message to Slack

### Env Vars

- `SLACK_WEBHOOK_URL` — Slack incoming webhook URL

### Excluded

- No slash commands (requires full Slack app)
- No two-way Slack interaction
- No per-channel routing (single channel)

---

## Phase 2: Client File Drop

### Purpose

Let Tim share any document (PDF, transcript, Loom link, Google Doc, text note) with a specific client. Client gets auto-notified.

### Database

New table: `client_documents`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| enrollment_id | uuid | FK to client_enrollments |
| uploaded_by | uuid | FK to auth.users |
| title | text | NOT NULL |
| description | text | Optional note shown to client |
| document_type | text | `file`, `link`, or `text` |
| file_url | text | Supabase Storage URL |
| file_name | text | Original filename |
| external_url | text | For links (Loom, Google Docs, etc.) |
| content_body | text | For inline text content |
| category | text | `roadmap`, `transcript`, `plan`, `resource`, `other` |
| created_at | timestamptz | default now() |

RLS: Clients can read their own documents (via enrollment_id match). Admins can read/write all.

### Storage

New Supabase Storage bucket: `client-documents` (same pattern as existing `client-roadmaps`).

### Admin Flow

1. `/admin/clients` → expand client row → "Documents" panel (replaces the narrow "Roadmap" button)
2. Upload form: file picker OR URL input OR text body, plus title, category dropdown, optional description
3. On submit:
   - If file: upload to `client-documents` bucket → get public URL
   - Insert row into `client_documents`
   - Fire Slack alert: ":page_facing_up: You shared **{title}** with **{client_name}**"
   - Fire Loops event `client_document_shared` → triggers email to client

### API

New route: `/api/admin/documents`
- GET: list documents for an enrollment (query param `enrollment_id`)
- POST: create document (multipart form for file upload, or JSON for link/text)
- DELETE: remove document and storage file

### Client Portal

- `/client/dashboard` gets a "Recent Documents" card showing last 3 uploads with links
- New page: `/client/documents` — full list with category filter tabs (All, Roadmaps, Transcripts, Plans, Resources)
- Files download/open directly, links open in new tab, text shows inline in a modal

### Notification

- Loops event: `client_document_shared` with properties: `documentTitle`, `clientName`, `documentUrl` (link to client portal)
- Slack alert to `#admin-alerts` confirming the share

### Excluded

- No versioning (new upload = new document)
- No client-to-admin uploads (one-way)
- No folder hierarchy (flat list with categories)
- No migration of existing roadmaps (old feature stays)

---

## Phase 3: Content Library Admin UI

### Purpose

Admin page to add, edit, delete, and reorder content library items without API calls.

### Admin Page

New page: `/admin/content`

Table view of all `client_content` rows, sorted by `sort_order`:
- Columns: Title, Type (badge), Programs, Published (toggle), Date, Actions (Edit, Delete)
- "Add Content" button opens inline form
- Row click opens edit form

### Add/Edit Form

| Field | Input | Required |
|-------|-------|----------|
| Title | Text | Yes |
| Description | Textarea | No |
| Content Type | Dropdown (video, deck, pdf, text, link) | Yes |
| URL | Text | Yes for video/deck/pdf/link |
| Body | Textarea | Yes for text type |
| Thumbnail URL | Text | No |
| Programs | Checkboxes | No (empty = all programs) |
| Published | Toggle | Default: true |

### API Changes

Modify existing `/api/client/content`:
- PATCH: update content item by ID
- DELETE: hard delete content item by ID
- GET already exists (returns all items)
- POST already exists (creates item)

### Excluded

- No file upload for content items (paste URLs to hosted content)
- No rich text editor
- No content view analytics
- No scheduling

---

## Phase 4: Client Health Dashboard

### Purpose

Per-client health cards at the top of the admin dashboard showing engagement status at a glance.

### Health Card Data

For each enrolled client, display:
- **Name, email, company, program** (from `client_enrollments` + `client_companies`)
- **Health indicator** (green/yellow/red dot)
- **Last login** (from `auth.users.last_sign_in_at`)
- **Reports this month** (count from `call_lab_reports`, `discovery_briefs`, `visibility_lab_reports`)
- **Friday check-in streak** (submitted / expected based on weeks since enrollment)
- **Documents shared** (count from `client_documents`)

### Health Indicator Rules

| Color | Condition |
|-------|-----------|
| Green | Logged in within 7 days AND current on Friday check-ins |
| Yellow | No login 7-14 days OR missed 1 Friday |
| Red | No login 14+ days OR missed 2+ Fridays OR zero reports ever |

### API

New route: `/api/admin/client-health`

Returns array of client health objects. Queries in parallel:
- `client_enrollments` with program and company joins
- `auth.users` for `last_sign_in_at`
- Report counts per user for current month
- `five_minute_fridays` counts per enrollment
- `client_documents` counts per enrollment

### Page Layout

Modify existing `/admin/page.tsx`:
- New default section at top: health cards grid (sorted red → yellow → green)
- Each card has action links: View Reports, Documents, Friday History
- Existing tabs (Overview, Recent Reports, Users) remain below, unchanged

### Sidebar Navigation

Add a sidebar to the admin layout:
- Dashboard (health cards + existing metrics)
- Clients (existing `/admin/clients`)
- Content (new `/admin/content`)
- Reports (existing `/admin/reports`)
- 5-Minute Friday (existing `/admin/five-minute-friday`)

### Excluded

- No historical health trends
- No automated outreach from dashboard (covered by Phase 1 Slack alerts)
- No client-facing health score
- No configurable thresholds (hardcoded for now)

---

## Build Order

1. **Phase 1: Slack Integration** — Immediate pain relief. You stop forgetting things.
2. **Phase 2: Client File Drop** — You can share OM Media's go-forward plan today.
3. **Phase 3: Content Library Admin** — You can manage the resource library without code.
4. **Phase 4: Client Health Dashboard** — The command center view that ties it all together.

Each phase is independently deployable and valuable on its own.
