# Session Transcripts: Synopsis + Teaching from VTT Uploads

**Date**: 2026-04-06
**Status**: Approved

## Problem

Office hours and monthly 1:1 calls produce VTT transcripts from Zoom. Raw VTT is noisy and most clients won't read it. We want to deliver two AI-generated artifacts from each transcript: a **synopsis** of what was discussed, and a **teaching** — a standalone lesson abstracted from the call, written in Tim's coaching voice.

## Two Session Types

| Type | Scope | Destination | Table |
|------|-------|-------------|-------|
| Monthly 1:1 | Single client | `/client/documents` | `client_documents` |
| Office Hours | All program members | `/client/content` (Resource Library) | `client_content` |

## Admin Workflow

1. Download VTT from Zoom, rename to a human-readable name:
   - 1:1s: `"Client Name 1 on 1 Month"` (e.g., `"Acme Co 1 on 1 March.vtt"`)
   - Office Hours: `"Office Hours Date"` (e.g., `"Office Hours 2026-04-03.vtt"`)
2. Go to `/admin/sessions` — new admin page
3. Upload VTT file
4. Select type: **Office Hours** or **Monthly 1:1**
5. If Office Hours → select program
6. If Monthly 1:1 → select enrollment (client)
7. Title auto-populated from filename (editable)
8. App parses VTT, sends to Claude for synopsis + teaching generation
9. Admin sees draft with three sections:
   - **Synopsis** (editable textarea)
   - **Teaching** (editable textarea)
   - **Download Call Transcript** link (the raw VTT)
10. Each AI field has a **Regenerate** button
11. Admin edits as needed, then clicks **Publish**
12. Content appears for the client(s)

## Data Model

### No new tables. Extend existing tables.

**For Monthly 1:1s → `client_documents`**

Add `'session'` to the category vocabulary. A session document uses:

| Field | Value |
|-------|-------|
| `enrollment_id` | The target client's enrollment |
| `title` | From filename (e.g., "Acme Co 1 on 1 March") |
| `document_type` | `'text'` |
| `category` | `'session'` |
| `content_body` | JSON string: `{ "synopsis": "...", "teaching": "...", "original_filename": "..." }` |
| `file_url` | Public URL to the uploaded VTT in Supabase Storage |
| `file_name` | Original VTT filename |
| `description` | Short description (optional, can be left null) |

**For Office Hours → `client_content`**

Add `'session'` to the `content_type` CHECK constraint via migration. A session content item uses:

| Field | Value |
|-------|-------|
| `title` | From filename (e.g., "Office Hours 2026-04-03") |
| `content_type` | `'session'` |
| `content_body` | JSON string: `{ "synopsis": "...", "teaching": "...", "original_filename": "..." }` |
| `content_url` | Public URL to the uploaded VTT in Supabase Storage |
| `program_ids` | Array with the selected program slug |
| `published` | `false` initially (draft), `true` after admin publishes |
| `description` | Short description (optional) |

### Migration

```sql
-- Add 'session' to client_content content_type CHECK constraint
ALTER TABLE client_content DROP CONSTRAINT IF EXISTS client_content_content_type_check;
ALTER TABLE client_content ADD CONSTRAINT client_content_content_type_check
  CHECK (content_type IN ('text', 'video', 'deck', 'pdf', 'link', 'session'));
```

No migration needed for `client_documents` — the `category` column has no CHECK constraint (it's enforced by convention in the UI).

## API Endpoints

### `POST /api/admin/sessions`

Accepts `multipart/form-data`:
- `file` — the VTT file
- `type` — `'office-hours'` or `'one-on-one'`
- `target_id` — program slug (for office hours) or enrollment ID (for 1:1)
- `title` — (optional, defaults to filename without extension)

**Processing steps:**
1. Upload VTT to Supabase Storage (`client-documents` bucket)
2. Parse VTT content into readable transcript text
3. Send transcript to Claude API with synopsis + teaching prompt
4. Return draft: `{ title, synopsis, teaching, vtt_url }`

Does NOT create the document/content record yet — that happens on publish.

### `POST /api/admin/sessions/publish`

Accepts JSON:
- `type` — `'office-hours'` or `'one-on-one'`
- `target_id` — program slug or enrollment ID
- `title` — final title
- `synopsis` — final synopsis text (admin may have edited)
- `teaching` — final teaching text (admin may have edited)
- `vtt_url` — URL from the upload step
- `original_filename` — original VTT filename

**For 1:1s:** Inserts into `client_documents` with category `'session'`, fires Slack + Loops notifications (reusing existing `alertDocumentShared` and `sendEvent` patterns from `/api/admin/documents`).

**For Office Hours:** Inserts into `client_content` with content_type `'session'`, `published: true`, and the target program in `program_ids`.

### `POST /api/admin/sessions/regenerate`

Accepts JSON:
- `transcript` — the parsed VTT text
- `field` — `'synopsis'` or `'teaching'` or `'both'`

Returns regenerated AI content for the requested field(s).

## AI Prompt Design

A single Claude API call generates both fields. The prompt structure:

**System prompt:**
```
You are Tim Kilroy, a sales coaching expert who uses the WTF (Why They Fund) methodology.
You are generating content for your client portal from a call transcript.
Generate two sections:

SYNOPSIS:
- 2-3 paragraphs summarizing what was discussed
- Third-person neutral tone ("Tim and the group discussed..." or "Tim and [Client] discussed...")
- Focus on topics covered, questions asked, decisions made, and key moments
- For office hours: capture the different topics/questions that came up from the group
- For 1:1s: capture what was specific to that client's situation

TEACHING:
- Written in Tim's voice as the coach (first person)
- Extract 1-2 standalone principles or lessons from the call
- Should be valuable even to someone who wasn't on the call
- Actionable — give the reader something to do or think about differently
- Think "newsletter insight" not "meeting minutes"
- Tone: direct, warm, no jargon, conversational

Return as JSON: { "synopsis": "...", "teaching": "..." }
```

**User prompt:**
```
Here is the transcript from a [office hours call / monthly 1:1 with {client name}]:

{parsed VTT text}
```

## Client-Facing Display

### Session documents on `/client/documents`

When a session-category document is clicked, instead of the current plain-text modal, render a structured view:

1. **Title** — bold, red, uppercase (existing `font-anton` style)
2. **Synopsis** section with a "What We Covered" heading
3. **Teaching** section with a "Key Takeaway" heading
4. **"Download Call Transcript"** button/link at the bottom — downloads the VTT file. Label is always "Download Call Transcript" (never mentions "VTT")

### Session content on `/client/content` (Resource Library)

Session items appear in the content grid with:
- Type icon: `📋` or similar
- Type label: "Session"
- Clicking opens the same structured view (synopsis → teaching → download link)

Both views render the synopsis and teaching as formatted text. Markdown rendering if the AI output includes it, otherwise `whitespace-pre-wrap` as the existing text modals do.

## Admin UI: `/admin/sessions`

**Page layout:**

1. **Auth gate** — same API key pattern as other admin pages
2. **List view** — shows all uploaded sessions with:
   - Title
   - Type (Office Hours / 1:1)
   - Target (program name or client name)
   - Status (Draft / Published)
   - Date
3. **Upload form** (toggled via button):
   - File input (accepts `.vtt`)
   - Type dropdown: Office Hours / Monthly 1:1
   - Target dropdown: populated based on type selection (programs or enrollments)
   - Title (auto-filled from filename, editable)
   - Upload button → triggers processing
4. **Review/edit screen** (shown after processing completes):
   - Title (editable)
   - Synopsis (editable textarea, ~6 rows)
   - Teaching (editable textarea, ~6 rows)
   - Regenerate button per field
   - "Download Call Transcript" preview link
   - **Publish** button

**Styling:** Match existing admin pages — black background, red accents, `font-anton` headings, `border-[#333333]` cards.

## File Storage

VTT files stored in Supabase Storage bucket `client-documents` at:
- 1:1s: `{enrollment_id}/{timestamp}-{filename}.vtt`
- Office Hours: `sessions/{timestamp}-{filename}.vtt`

## VTT Parsing

Reuse the existing `parseVttTranscript` function from `apps/web/lib/zoom.ts` which converts VTT to:
```
[MM:SS] Speaker Name: "transcript text"
```

This parsed format is what gets sent to Claude. The raw VTT file is what clients can download.

## Notifications

**1:1 sessions only** (office hours are passive — clients browse the library):
- Slack: reuse `alertDocumentShared(clientName, title)`
- Email: reuse Loops `client_document_shared` event

## Out of Scope

- Automatic Zoom integration (admin manually downloads VTT)
- Video/audio file handling (VTT only)
- Editing published sessions (can be added later)
- Batch uploads
