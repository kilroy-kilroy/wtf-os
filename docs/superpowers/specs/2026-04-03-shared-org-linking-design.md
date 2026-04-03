# Shared Organization Linking for Clients

**Date:** 2026-04-03
**Status:** Design approved

## Problem

Company data for clients is stored per-enrollment in `client_companies`, so multiple users from the same company (e.g., Luis and Leticia at Social Imprint) each get isolated, empty company records. There's no way to share company data across users from the same organization.

Non-client users already share company data via the `orgs` table and `users.org_id`. Clients need the same treatment.

## Solution

Unify all users (clients and non-clients) on the `orgs` table for shared company identity. Auto-link users by email domain when company data is saved, with manual override for public email domains.

## Design

### API: PATCH `/api/admin/users/[id]` — Company Save Flow

When `body.company` is received:

1. **Extract email domain** from `user.email` (e.g., `luis@social-imprint.com` → `social-imprint.com`).
2. **Public domain check** — skip auto-linking for: gmail.com, yahoo.com, hotmail.com, outlook.com, aol.com, icloud.com, protonmail.com, hey.com, live.com, me.com, mac.com, msn.com.
3. **Manual override** — if `body.company.org_id` is explicitly passed, use that org directly (skip domain matching). Update the org's fields and set `user.org_id`.
4. **Find or create org:**
   - If user already has `org_id` → update that org's fields.
   - Else if an org exists with matching `primary_domain` → set `user.org_id` to that org, update its fields.
   - Else if domain is not public → create new org with `primary_domain` set, set `user.org_id`.
   - Else (public domain, no manual org_id) → create org without `primary_domain` (personal workspace), set `user.org_id`.
5. **Merge from `client_companies`** (on first link only): if user is a client with an enrollment that has `client_companies` data, copy non-empty fields into the org where org fields are currently null:
   - `company_name` → `name`
   - `url` → `website`
   - `industry_niche` → `target_industry`
   - `team_size` → `company_size`
   - `revenue_range` → `company_revenue`
6. **Auto-link coworkers** — find other users with the same email domain who don't have an `org_id` set (null) → set their `org_id` to the same org. Users who already have a different `org_id` are not touched.

### API: New endpoint `GET /api/admin/orgs/search`

Simple search endpoint for the manual org linking UI:
- Query param: `q` (search string)
- Returns: matching orgs by name (limit 10)
- Auth: admin API key

### API: GET `/api/admin/users/[id]` — No Changes

The existing GET already:
- Fetches `org` data when `user.org_id` exists
- Fetches `same_company_users` by matching `org_id`
- Returns `enrollments` with `company` data

Once users are linked via the PATCH flow, everything works automatically.

### Frontend: Company Card (`/admin/users/[id]/page.tsx`)

**Remove the `isClient` branch** in the Company card. New logic:

- **If `org` exists** → show org fields (name, website, target_industry, company_size, company_revenue). All editable. Saves go to the org via `{ company: { org_id: org.id, ...fields } }`.
- **If no `org`** → show the same org-style fields but empty/editable. Saves trigger the domain-linking + org creation flow described above.

Fields displayed (matching current org card layout):
- Name
- Website
- Industry
- Size
- Revenue (dropdown)

The `client_companies`-specific fields (HQ, Founded) are dropped from the UI.

### Frontend: Manual Org Search

Below the Company card header, add a "Link to org..." button/link:
- Clicking it shows an inline text input
- As user types, fetch `GET /api/admin/orgs/search?q=...` (debounced)
- Show matching orgs in a dropdown
- Selecting one sends `PATCH { company: { org_id: selectedOrgId } }` and reloads the profile
- This handles users with public email domains (gmail, etc.) who can't be auto-linked

### Frontend: Save Field Mapping

Update `saveField` and `saveCompanySelect` functions:
- All company field saves use the `{ company: { org_id, ...fields } }` shape when org exists
- When no org exists, send `{ company: { create_org: true, ...fields } }` — the API handles domain detection and org creation
- Remove the `enrollment_id`-based company save paths

### Data Model

No schema migrations needed. The `orgs` table already has all required fields. The change is behavioral:
- Clients get linked to orgs via `users.org_id` (previously only non-clients used this)
- `client_companies` data is preserved in DB but no longer displayed or written to from the admin UI

### Field Name Mapping (client_companies → orgs)

| client_companies | orgs             | UI Label  |
|-----------------|------------------|-----------|
| company_name    | name             | Name      |
| url             | website          | Website   |
| industry_niche  | target_industry  | Industry  |
| team_size       | company_size     | Size      |
| revenue_range   | company_revenue  | Revenue   |
| hq_location     | —                | Dropped   |
| founded         | —                | Dropped   |

## Files to Modify

1. `apps/web/app/api/admin/users/[id]/route.ts` — PATCH handler: add domain extraction, org find-or-create, merge, auto-link coworkers
2. `apps/web/app/api/admin/orgs/search/route.ts` — New file: org search endpoint
3. `apps/web/app/admin/users/[id]/page.tsx` — Company card: unify on org fields, add manual org search UI

## Out of Scope

- Client dashboard changes (still reads from `client_companies` for now)
- Client self-service company editing
- Bulk migration of existing clients to orgs (can be done as follow-up)
- Changes to client onboarding flow
