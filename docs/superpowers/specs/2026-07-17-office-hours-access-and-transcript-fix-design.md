# Office Hours Access, Admin Visibility & Transcript Download Fix — Design

**Date:** 2026-07-17
**Author:** Tim Kilroy (with Claude)
**Status:** Draft — awaiting review

## Problem

Four related gaps around session content (Five Minute Friday, 1:1 sessions, office hours):

1. **Tim can't reach the admin review views.** The 1:1 / office-hours admin page (`/admin/sessions`) is not linked in the admin nav and uses a manual `ADMIN_API_KEY` gate instead of the `is_admin` session gate every other admin page uses. The Five Minute Friday admin page works but defaults to a "Needs Response" filter that hides answered history.
2. **Office hours aren't reliably visible to the whole group.** Office-hours sessions are scoped by `client_content.program_ids[]`, set to a single program at publish time, so historical sessions may not be visible to all Agency Studio / Agency Studio+ members.
3. **No easy path from a member's document list to office hours,** and Tim (an admin with no client enrollment) can't see the client-style archive at all because row-level security returns nothing for him.
4. **Office-hours transcripts can't be downloaded** (reported by the client "Joe", she/her). The download link points directly at a public-format URL of the **private** `client-documents` bucket, which returns "object not found." 1:1 transcripts avoid this by routing through a gated file route; office hours have no equivalent.

## Current architecture (confirmed by code review)

| Concern | Storage | Scoping | Where rendered |
|---|---|---|---|
| Five Minute Friday | `five_minute_fridays` + `five_minute_friday_responses` | `user_id` (RLS) | client: `/client/five-minute-friday/history`; admin: `/admin/five-minute-friday` (all clients, `is_admin`) |
| 1:1 session | `client_documents` (`category='transcript'`, `document_type='text'`) | `enrollment_id` (RLS) | client: `/client/documents`; download via gated `/api/client/documents/[id]/file` |
| Office hours | `client_content` (`content_type='session'`) | `program_ids[]` (RLS) | client: `/client/content` (Resource Library); **download link is a raw public URL — broken** |
| Group / tier | `client_programs` + `client_enrollments` | — | slugs incl. `agency-studio`, `agency-studio-plus` |

- Admin routes are protected by `apps/web/middleware.ts` (checks `users.is_admin`).
- The private bucket is `client-documents`. The working gated pattern lives in `apps/web/app/api/client/documents/[id]/file/route.ts` (login → authorize admin-or-owner → 60s signed URL → 302; HTML streamed inline under CSP). It derives the object path from a stored public URL via `storagePathFromFileUrl()`.
- `/client/content/page.tsx` already fetches published `client_content` (RLS filters by program), already has a `session` type filter, and already renders a session's synopsis/teaching in a modal with a "Download Call Transcript" link.

## Decisions (from brainstorming)

- **5MF + 1:1 admin views:** existing pages are the right home; the problem is *access/discoverability*, not missing features.
- **Office-hours surfacing:** a single "Office Hours →" card in `/client/documents` that jumps to the Resource Library filtered to sessions (not one row per session).
- **Who sees office hours:** both **Agency Studio and Agency Studio+** — all history.
- **Tim's access:** the **same client-style archive view** members get (not just the admin table).
- **Joe's download:** must be fixed as part of this work.

## Design

### Part 1 — Restore admin access to 5MF + 1:1 / office-hours review

1. **Add `/admin/sessions` to the admin sidebar** (`apps/web/app/admin/layout.tsx` `NAV_LINKS`) — e.g. label "Sessions".
2. **Convert `/api/admin/sessions/*` auth** (`route.ts`, `publish/route.ts`, `regenerate/route.ts`) from the manual `ADMIN_API_KEY` Bearer check to the **`is_admin` session gate** — same pattern as `/api/admin/five-minute-friday/route.ts` (read the session user, look up `users.is_admin`, 403 otherwise). **Remove the `ADMIN_API_KEY` path entirely** — confirmed nothing external depends on it.
3. **Remove the API-key entry box** from `apps/web/app/admin/sessions/page.tsx`; the page loads directly for a logged-in admin (drop the `sessionStorage` `admin_api_key` flow and the `Authorization: Bearer` headers on its fetches).
4. **Five Minute Friday page:** default the view to **"All"** (or make the toggle clearly show answered history). Small change in `apps/web/app/admin/five-minute-friday/page.tsx`.
5. **Ensure both `tim@timkilroy.com` and `tk@timkilroy.com` have `users.is_admin = true`** (data update).

### Part 2 — Office-hours group scoping (Agency Studio + Studio+)

1. **Backfill existing office-hours rows.** For every `client_content` row with `content_type='session'`, ensure `program_ids` contains **both** the `agency-studio` and `agency-studio-plus` program IDs (union, don't clobber). A one-off SQL migration.
   - **No scope guard needed:** confirmed office hours have only ever been run for Agency Studio, so every session row is safe to make visible to both agency tiers.
2. **Going forward:** when publishing an office-hours session (`publish/route.ts`, office-hours branch), include **both** agency program IDs in `program_ids` (instead of the single selected program) — or add a note/UI making multi-program targeting explicit. Recommendation: for office hours specifically, always write both agency IDs.

### Part 3 — Surfacing + Tim's client-style access

1. **Member entry point:** add an "Office Hours →" card to `apps/web/app/client/documents/page.tsx` that links to `/client/content?type=session`.
2. **Preset filter:** `apps/web/app/client/content/page.tsx` reads an optional `?type=` query param (via `useSearchParams`) to initialize `filterType`, so the link lands pre-filtered to sessions.
3. **Tim's access (admin data path):** members get session rows via the existing RLS browser query. Because Tim has no enrollment, RLS returns nothing. So when the viewer is an admin, `/client/content` additionally loads **all** office-hours sessions from a new admin endpoint `GET /api/admin/office-hours` (`is_admin`-gated, service role, returns `client_content` where `content_type='session'`) and merges them in. Result: Tim sees the same client-style archive, fully populated. Tim reaches it from an "Office Hours" link added to the admin sidebar (pointing at `/client/content?type=session`).
   - *Alternative considered:* a dedicated `/client/office-hours` page + unified `/api/office-hours`. Rejected to avoid duplicating the session-card UI and to match the "card → Resource Library filtered to office hours" flow chosen in brainstorming.

### Part 4 — Fix office-hours transcript download (Joe's bug)

1. **New gated route** `apps/web/app/api/client/content/[id]/transcript/route.ts`, mirroring `client/documents/[id]/file/route.ts`:
   - Require a logged-in user.
   - Load the `client_content` row by `id` (service role).
   - **Authorize:** allow if `users.is_admin`, **or** the user has an active `client_enrollments` row whose `program_id` is in the content's `program_ids` (or `program_ids` is empty). This mirrors the `client_content` RLS policy.
   - Derive the storage path from `content_url` (strip the `/object/public/client-documents/` prefix — reuse the `storagePathFromFileUrl` logic), mint a 60s signed URL, and 302-redirect. VTT is `text/vtt` (not HTML), so no inline-streaming special case is needed.
2. **Point the link at it:** in `/client/content/page.tsx`, change the "Download Call Transcript" `href` from `selectedItem.content_url` to `/api/client/content/${selectedItem.id}/transcript`.
3. **Shared authorization helper:** extract the "admin or program-enrolled" check into `apps/web/lib/client-content/authorize.ts` and reuse it in both the transcript route (Part 4) and the admin office-hours endpoint (Part 3), mirroring the existing `lib/client-documents/authorize.ts`.

## Files touched (anticipated)

- `apps/web/app/admin/layout.tsx` — add Sessions + Office Hours nav links.
- `apps/web/app/admin/sessions/page.tsx` — drop API-key gate.
- `apps/web/app/api/admin/sessions/route.ts`, `publish/route.ts`, `regenerate/route.ts` — `is_admin` auth; office-hours publish writes both agency program IDs.
- `apps/web/app/admin/five-minute-friday/page.tsx` — default to full history.
- `apps/web/app/client/documents/page.tsx` — "Office Hours →" card.
- `apps/web/app/client/content/page.tsx` — `?type=` preset filter; admin merge of all sessions; fixed transcript link.
- `apps/web/app/api/admin/office-hours/route.ts` — **new**, admin list of all sessions.
- `apps/web/app/api/client/content/[id]/transcript/route.ts` — **new**, gated transcript download.
- `apps/web/lib/client-content/authorize.ts` — **new**, shared admin-or-enrolled check.
- `supabase/migrations/<date>_backfill_office_hours_agency_programs.sql` — **new**, backfill `program_ids`.

## Non-goals / YAGNI

- No new consolidated "archive of everything" page — existing admin pages cover 5MF and 1:1 review.
- No dedicated office-hours page or new content table — reuse `client_content` + Resource Library.
- No change to how 1:1 transcripts are served (already working).
- No change to Five Minute Friday storage or client submission flow.

## Testing / verification

- **Part 1:** log in as `tim@timkilroy.com` → sidebar shows Sessions; `/admin/sessions` loads without an API key; 5MF page shows answered history.
- **Part 2:** an Agency Studio member and an Agency Studio+ member each see all historical office-hours sessions in `/client/content`.
- **Part 3:** the `/client/documents` "Office Hours →" card lands on the session-filtered Resource Library; Tim (admin) sees the fully-populated archive.
- **Part 4:** as a member and as admin, "Download Call Transcript" downloads the VTT (200, not "object not found"); a logged-out or non-entitled user is rejected (401/403).

## Resolved decisions

1. Office hours have only ever been run for **Agency Studio** — the Part 2 backfill applies to every session row, no program exclusions.
2. Nothing external depends on `ADMIN_API_KEY` — it is **removed entirely** from the sessions API.
3. Both **`tim@timkilroy.com` and `tk@timkilroy.com`** must be set to `is_admin = true`.
