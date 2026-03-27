# Admin & Dashboard Redesign — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Approach:** B (Fix Foundation + Redesign Admin as Coaching Workspace)
**Future:** Approach C (unified auth, RBAC, client portal redesign) deferred to a later cycle

## Context

WTF Growth OS is a coaching and sales intelligence platform with three user types:
- **Admin (Tim)** — sole operator, coach, admin
- **Product users** — free and pro users of Call Lab, Discovery Lab, Visibility Lab
- **Coaching clients** — 4 active, enrolled in programs with 5-Minute Friday check-ins

### Current Problems

1. **Auth is broken** — no middleware, temp passwords fail for coaching clients, no route protection, three disconnected login surfaces (`/login`, `/client/login`, admin API key)
2. **5-Minute Fridays never trigger** — cron not registered in `vercel.json`
3. **Subscriptions table missing `product` column** — Stripe webhook silently fails
4. **Admin dashboard is useless** — wall of time-bucketed metrics, no action items, no coaching workflow
5. **User dashboard is a data dump** — 1,258-line monolith showing everything to everyone
6. **No visibility** — admin can't see user counts, can't see what clients experience

## Section 1: Auth & Onboarding Fix

### Middleware

Add `middleware.ts` at the app root:
- Refreshes Supabase auth tokens on every request (prevents silent session expiry)
- Protects `/dashboard/*`, `/client/*`, `/admin/*`, `/settings/*` — redirects unauthenticated users to `/login`
- Protects `/admin/*` additionally by checking an `is_admin` boolean column on the `users` table (replaces the current `ADMIN_API_KEY` header check). Tim's user record gets this flag set via migration.
- Allows public routes (`/`, `/login`, `/call-lab`, `/discovery-lab`, etc.) through

### Client Onboarding: Magic Links via Loops

Replace the temp password flow entirely:
- When admin adds a client in `/admin/clients`, the system calls `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to generate the magic link URL without sending any email
- The link is sent through **Loops** using a branded email template (Tim's logo, design, copy)
- Client clicks the link, lands in the app authenticated, proceeds to `/client/onboarding`
- After onboarding, prompt them to set their own password (optional — can keep using magic links)
- "Resend Invite" generates a fresh link and re-sends via Loops
- No Supabase email sending involved — zero rate limit concerns, fully branded

### Route Protection

| Route | Who can access | Redirect if not |
|-------|---------------|-----------------|
| `/dashboard/*` | Any authenticated user | `/login` |
| `/client/*` | Users with active enrollment | `/login` |
| `/admin/*` | `users.is_admin = true` | `/login` |
| `/settings/*` | Any authenticated user | `/login` |
| `/login` | Unauthenticated only | `/dashboard` if already logged in |

### Not in scope (Approach C)
- Merging `/login` and `/client/login` into a single login surface
- Full RBAC system
- Both login pages stay but both are protected by the same middleware

## Section 2: Infrastructure Fixes

### 5-Minute Friday Cron
- Add to `vercel.json`: `{ "path": "/api/cron/five-minute-friday", "schedule": "0 12 * * 5" }` (Friday noon UTC — 7-8 AM Eastern)
- The route handler already exists at `/api/cron/five-minute-friday/route.ts` and works — it was never registered

### Subscriptions Schema
- Add migration: `ALTER TABLE subscriptions ADD COLUMN product TEXT`
- This fixes the Stripe webhook silently failing when it tries to upsert with a `product` field

### Missing CRON_SECRET
- Add `CRON_SECRET` to `.env.example` so future deploys don't miss it

### Wire Up onClientOnboarded Email
- The `onClientOnboarded()` function exists in `/lib/loops.ts` (lines 582-606) but is never called
- Wire it into the onboarding submission API (`/api/client/onboarding/route.ts`) so clients get a "Welcome to your dashboard" email after completing onboarding

## Section 3: Admin Coaching Workspace

Replace the current admin dashboard with an action-first coaching workspace.

### Layout: Three Zones

#### Zone 1 — Action Queue (top)

A prioritized list of things needing attention right now, sorted by urgency:
- "Sarah submitted her Friday check-in 2 hours ago" -> [Respond] button
- "Mike hasn't logged in for 12 days" -> [View Profile] button
- "New Call Lab Pro analysis ready for Jake" -> [Review] button
- "1 new free signup this week (jane@acme.com)" -> informational

Each item: who, what happened, when, one action button. When responded/dismissed, it's gone. Zero inbox energy.

**Data sources:**
- `five_minute_fridays` table — unresponded submissions
- `client_enrollments` + user last activity — clients going dark
- `call_scores` — new analyses for enrolled clients
- `users` table — recent signups

#### Zone 2 — Client Cards (middle)

One card per coaching client (currently 4). Each card shows:
- Name, program, enrollment date
- Last activity (what they did, when)
- 5-Minute Friday status this week (submitted / not yet / overdue)
- Coaching report status (pending / sent / none)
- "View as Client" link (see below)
- Quick actions: respond to Friday, review latest call, send nudge

**Data sources:**
- `client_enrollments` joined with `users`, `client_programs`
- `five_minute_fridays` — this week's submission status
- `coaching_reports` — latest report status
- `call_scores` + `tool_runs` — latest activity

#### Zone 3 — Platform Pulse (bottom, collapsed by default)

Summary stats — opened when you want the business view:
- Total users: X free, Y pro, Z coaching clients
- Signups this week / this month
- Revenue this month (from Stripe via `subscriptions` table)
- Tool usage: X call analyses, Y discovery reports this week

**Data sources:**
- `users` table with tier counts
- `subscriptions` table for revenue
- `tool_runs` table for usage counts

### "View as Client" Mode

Route: `/admin/impersonate/[userId]`
- Renders the client dashboard/portal as that user would see it
- Bright banner at top: "Viewing as [Client Name] — this is what they see"
- Read-only — cannot submit forms or change data
- No actual auth impersonation — queries their data server-side and renders it
- Solves "I don't know what clients see" without security risk

### What Gets Removed
- Time-bucket metrics tables (day/week/month product performance)
- Product performance breakdowns
- Client health scoring matrix
- Admin API key auth (replaced by middleware role check)

## Section 4: User Dashboard Redesign

Replace the 1,258-line monolith with tier-aware views.

### Free User (no purchases, no enrollment)

- **Your Recent Activity**: Last 3-5 tool runs with links to results
- **Upgrade Nudge**: Single clear card — "You've analyzed 3 calls. Go Pro to unlock pattern tracking, coaching insights, and longitudinal trends."
- **Quick Launch**: Buttons to run each tool. This is a launchpad.

### Pro User (paid for one or more labs)

- **Next Call Focus** (kept from current dashboard): #1 pattern to work on, corrective move
- **Activity Feed**: Recent analyses as cards — call name, score, highlighted pattern, date. Click to view full report. Not the raw dump of "CALL LAB PRO — FULL INTELLIGENCE REPORT" entries.
- **Progress Summary**: Score trend (improving/declining/stable), clean call rate, top 3 patterns (positive and negative) as compact tags
- **Discovery & Visibility**: If they have those pro products, compact section showing recent briefs/reports

### Coaching Client
- Uses `/client/dashboard` (separate page) — no changes in this scope
- Client portal redesign is Approach C territory

### What Gets Removed
- Full Pattern Intelligence Grid (20+ patterns) — replaced by top 3 summary
- Raw call report list filling 70% of page — replaced by activity feed cards
- Momentum signals section — folded into progress summary
- Coaching narrative section — belongs in coaching client experience, not product dashboard
- Inline follow-up intelligence — accessible from individual report pages

### Technical: Break Up the Monolith
- Move ~350 lines of data processing (pattern extraction, keyword mapping, buyer info parsing) from `page.tsx` to `lib/dashboard/` utility modules
- Page becomes a thin server component: fetch data, detect tier, render tier-appropriate components
- Dashboard components stay in `components/dashboard/` but are composed differently per tier

## File Impact Summary

### New Files
- `middleware.ts` — auth middleware
- `app/admin/impersonate/[userId]/page.tsx` — view-as-client mode
- `lib/dashboard/patterns.ts` — pattern extraction utilities (extracted from page.tsx)
- `lib/dashboard/data.ts` — dashboard data fetching (extracted from page.tsx)
- `supabase/migrations/[timestamp]_add_subscriptions_product_column.sql`

### Modified Files
- `vercel.json` — add 5MF cron entry
- `.env.example` — add CRON_SECRET
- `app/api/client/invite/route.ts` — magic link via generateLink + Loops
- `app/api/client/invite/resend/route.ts` — magic link resend via Loops
- `app/api/client/onboarding/route.ts` — wire up onClientOnboarded email
- `lib/loops.ts` — update onClientInvited to accept magic link URL instead of temp password
- `app/admin/page.tsx` — full rewrite (action queue + client cards + platform pulse)
- `app/admin/layout.tsx` — remove API key auth (middleware handles it)
- `app/dashboard/page.tsx` — rewrite as thin tier-aware router
- `components/dashboard/*` — keep useful components, remove/consolidate others

### Removed Patterns
- Temp password generation (`Welcome${Date.now().toString(36)}!`)
- Admin API key auth (`ADMIN_API_KEY` header checks)
- Monolithic dashboard data processing in page.tsx
