# Admin User Profiles — Design Spec

**Date:** 2026-04-01
**Status:** Draft

## Overview

Add a unified admin user directory (`/admin/users`) and per-user profile pages (`/admin/users/[id]`) that give full visibility into every person in the system — coaching clients, self-serve users, and leads alike. Profile fields are inline-editable; activity is read-only.

## Goals

1. See every user in one searchable, filterable list
2. View any user's full profile: identity, company, subscriptions, and all activity
3. Edit profile fields inline (click-to-edit pattern)
4. Track Loops email events per user for audit trail
5. Distinguish coaching clients from self-serve users with different profile layouts

## Non-Goals

- Bulk editing users
- Pulling open/click rates from Loops (API doesn't support it)
- Editing activity data (reports, assessments, etc.)
- Replacing `/admin/clients` — that page stays for client-specific workflows (invites, docs, tiers)

---

## 1. User List Page — `/admin/users`

### Route

`apps/web/app/admin/users/page.tsx` — client component with API key auth (same pattern as `/admin/clients`).

### API

`GET /api/admin/users` — returns all users with aggregated metadata.

**Data sources (parallel queries):**
- `users` table (public) — profile fields
- `auth.admin.listUsers()` — last_sign_in_at, email (canonical)
- `client_enrollments` — to determine "Client" type
- `client_companies` — company name for clients
- `orgs` + `user_agency_assignments` — company for self-serve users
- `call_scores` — count per user
- `discovery_briefs` — count per user
- `visibility_lab_reports` — count per user
- `assessments` — count per user
- `subscriptions` — active subscription info

**Response shape per user:**
```typescript
interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  type: 'client' | 'user' | 'lead';  // client = has enrollment, lead = instant_leads only
  company_name: string | null;
  company_url: string | null;
  products_used: string[];  // ['call_lab', 'discovery', 'visibility', 'assessment']
  highest_tier: string;     // 'pro' | 'free' | 'lead'
  last_sign_in_at: string | null;
  created_at: string;
  report_counts: {
    call_lab: number;
    discovery: number;
    visibility: number;
    assessment: number;
  };
}
```

### Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Name | `first_name + last_name` | Falls back to email |
| Email | `users.email` | |
| Type | Derived | Badge: Client (cyan) / User (yellow) / Lead (gray) |
| Company | `client_companies` or `orgs` | Domain inference fallback |
| Products | Derived from report counts | Small colored badges |
| Tier | Highest of call_lab/discovery/visibility tiers | |
| Last Active | `auth.users.last_sign_in_at` | Relative time ("2d ago") |
| Joined | `users.created_at` | Date |

### Interactions

- **Search**: filters by name, email, or company (client-side)
- **Filter buttons**: All / Clients / Users / Leads
- **Click row**: navigates to `/admin/users/[id]`

---

## 2. User Profile Page — `/admin/users/[id]`

### Route

`apps/web/app/admin/users/[id]/page.tsx` — client component with API key auth.

### API

`GET /api/admin/users/[id]` — returns full user profile + activity.

`PATCH /api/admin/users/[id]` — updates editable fields.

### Layout

Three-column on desktop (grid: 1fr 1.5fr 1fr). Stacks vertically on mobile.

---

### Left Column — Identity & Company (editable)

#### User Card

All fields are inline click-to-edit (same UX as company name on `/admin/clients`).

| Field | Source | Editable |
|-------|--------|----------|
| First name | `users.first_name` | Yes |
| Last name | `users.last_name` | Yes |
| Email | `users.email` | Yes |
| Title | `users.preferences.title` (JSONB) | Yes |
| Phone | `users.preferences.phone` (JSONB) | Yes |
| Auth method | `users.auth_method` | Read-only |
| Last sign-in | `auth.users.last_sign_in_at` | Read-only |
| Subscription tier | `users.subscription_tier` | Dropdown |
| Call Lab tier | `users.call_lab_tier` | Dropdown |
| Discovery Lab tier | `users.discovery_lab_tier` | Dropdown |
| Visibility Lab tier | `users.visibility_lab_tier` | Dropdown |
| Tags | `users.tags` | Editable (add/remove) |
| Type badge | Derived | Read-only |

**Loops link**: Button that opens `https://app.loops.so/contacts?email={email}` in a new tab.

#### Company Card

For **coaching clients** — data from `client_companies` (via enrollment):

| Field | Source | Editable |
|-------|--------|----------|
| Company name | `client_companies.company_name` | Yes |
| URL | `client_companies.url` | Yes |
| Industry | `client_companies.industry_niche` | Yes |
| HQ Location | `client_companies.hq_location` | Yes |
| Founded | `client_companies.founded` | Yes |
| Team size | `client_companies.team_size` | Yes |
| Revenue range | `client_companies.revenue_range` | Dropdown |

For **self-serve users** — data from `orgs` (via `user_agency_assignments` or `users.org_id`):

| Field | Source | Editable |
|-------|--------|----------|
| Company name | `orgs.name` | Yes |
| Website | `orgs.website` | Yes |
| Industry | `orgs.target_industry` | Yes |
| Company size | `orgs.company_size` | Yes |
| Revenue | `orgs.company_revenue` | Yes |

**Same-company users**: Below the company card, list other users sharing the same org/company. Each row shows name + email, clickable to their profile.

---

### Center Column — Activity Feed (read-only)

A unified reverse-chronological list of all user activity. Each item is a compact row:

```
[Icon] [Product Badge] [Description]                    [Date]
 📊    CALL LAB PRO    Score: 78 — Acme Corp / Jane Doe  2d ago   [View]
 🔍    DISCOVERY       Target: Widget Inc / Bob Smith     5d ago   [View]
 📡    VISIBILITY      Brand: FractionalCMO — Score: 62   1w ago   [View]
 📋    ASSESSMENT      Score: 3.8/5 — The Operator        2w ago   [View]
 📧    LOOPS EVENT     report_generated_pro               2d ago
 📧    LOOPS EVENT     call_lab_signup                     3w ago
```

**Data sources (all filtered to this user_id):**
- `call_scores` — Call Lab reports (all versions)
- `call_lab_reports` — Call Lab dashboard reports
- `discovery_briefs` — Discovery Lab briefs
- `visibility_lab_reports` — Visibility reports
- `assessments` — GrowthOS assessments
- `coaching_reports` — Coaching reports (clients only)
- `five_minute_fridays` — Friday check-ins (clients only)
- `loops_events` — Email events sent (new table)

All report items link to their report page with `?admin=1`.

Items are merged and sorted by date. Paginated or lazy-loaded (show last 50, "Load more" button).

---

### Right Column — Context (read-only)

**For coaching clients:**

- **Enrollment info**: Program name, status badge, enrolled date, onboarding status
- **Documents shared**: List of docs (title, type icon, date) with view/download links
- **Friday streak**: Visual indicator — submitted / missed / overdue count for last 8 weeks

**For self-serve users:**

- **Stripe subscription** (if any): Plan type, status, current period, cancel date
- **Assessment snapshot** (if taken): Overall score, archetype name, key zone scores
- **Quick stats**: Total reports generated, first report date, most-used product

**For leads (instant only):**

- **Lead info**: First report date, report count, welcome email sent, pro pitch sent
- **Conversion status**: Whether they upgraded, upgrade date

---

## 3. Loops Event Tracking — `loops_events` table

### Schema

```sql
CREATE TABLE IF NOT EXISTS loops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_id UUID,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loops_events_email ON loops_events(user_email);
CREATE INDEX idx_loops_events_user_id ON loops_events(user_id);
CREATE INDEX idx_loops_events_sent_at ON loops_events(sent_at DESC);
```

### RLS

```sql
ALTER TABLE loops_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON loops_events
  FOR ALL USING (true) WITH CHECK (true);
-- No user-facing access needed
```

### Integration

Modify the `sendEvent()` function in `apps/web/lib/loops.ts` to insert a row into `loops_events` after each successful Loops API call. The insert is fire-and-forget (non-blocking, catch errors silently).

```typescript
// After successful Loops event send:
supabase.from('loops_events').insert({
  user_email: email,
  user_id: userId || null,
  event_name: eventName,
  event_data: eventProperties,
}).then(() => {}).catch(() => {});
```

This adds ~1 line of code per event call site, or can be centralized in the `sendEvent` helper.

---

## 4. API Endpoints

### `GET /api/admin/users`

Returns the user list. Auth: `ADMIN_API_KEY` bearer token.

Queries run in parallel:
1. `users` table — all users
2. `auth.admin.listUsers()` — for last_sign_in_at (paginated, may need batching)
3. `client_enrollments` — to tag clients
4. `instant_leads` — to tag leads
5. Report count queries (grouped by user_id)

### `GET /api/admin/users/[id]`

Returns full profile + activity feed for one user. Auth: `ADMIN_API_KEY`.

Queries:
1. `users` record
2. `auth.admin.getUserById()` — auth metadata
3. `client_enrollments` + `client_companies` — client data
4. `orgs` — self-serve company data
5. All report tables filtered to user_id (limited to 50 most recent each)
6. `loops_events` filtered to user_id or email
7. `subscriptions` filtered to user_id
8. `five_minute_fridays` filtered to enrollment
9. `client_documents` filtered to enrollment
10. Other users in same company/org

### `PATCH /api/admin/users/[id]`

Updates editable fields. Auth: `ADMIN_API_KEY`.

Body can include any combination of:
```typescript
{
  // User fields (updates users table)
  first_name?: string;
  last_name?: string;
  email?: string;
  subscription_tier?: string;
  call_lab_tier?: string | null;
  discovery_lab_tier?: string | null;
  visibility_lab_tier?: string | null;
  tags?: string[];
  preferences?: Record<string, unknown>;  // title, phone, etc.

  // Company fields (updates client_companies or orgs)
  company?: {
    company_name?: string;
    url?: string;
    industry?: string;
    hq_location?: string;
    founded?: number;
    team_size?: number;
    revenue_range?: string;
  };
}
```

---

## 5. File Structure

```
apps/web/app/admin/users/
  page.tsx                    — User list page
  [id]/
    page.tsx                  — User profile page

apps/web/app/api/admin/users/
  route.ts                    — GET (list) + PATCH (update by user_id query param)
  [id]/
    route.ts                  — GET (profile) + PATCH (update)

supabase/migrations/
  2026XXXX_add_loops_events_table.sql
```

---

## 6. Design Language

Follows existing admin page patterns:
- Black background (`bg-black`), white text
- `font-anton` for headings (uppercase, tracking-wide)
- `font-poppins` for body text
- Red accent (`#E51B23`) for primary actions and Pro badges
- Yellow accent (`#FFDE59`) for section headings and highlights
- Cyan accent (`#00D4FF`) for interactive elements and links
- Gray borders (`border-[#333]`) for cards and dividers
- Inline click-to-edit: cyan border on focus, same pattern as `/admin/clients` company editing

---

## 7. Edge Cases

- **User with no company**: Company card shows "No company" with a "+" button to create one
- **User exists in auth but not in `users` table**: Create a minimal `users` row on first admin profile view
- **User is both a client AND a self-serve user**: Show as "Client" type (takes precedence), but show both enrollment context AND any self-serve activity
- **Lead with no `users` record**: Profile created from `instant_leads` data; limited fields
- **Multiple enrollments**: Show all enrollments in the right column, most recent first
- **Large user count**: `auth.admin.listUsers()` paginates at 1000. For the list page, use `users` table as primary source (already has email, name) and only call auth API on the profile page for `last_sign_in_at`. This avoids O(n) auth calls on the list.
