# Admin User Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified admin user directory and per-user profile pages with inline editing, activity feeds, and Loops event tracking.

**Architecture:** Two new pages (`/admin/users` list + `/admin/users/[id]` profile) backed by two API routes. A new `loops_events` table tracks every Loops event sent. The existing `/api/admin/users/route.ts` is replaced with a richer version; a new `/api/admin/users/[id]/route.ts` handles profile data and edits. All pages use client-side rendering with API key auth (same pattern as `/admin/clients`).

**Tech Stack:** Next.js App Router, Supabase (service role client), TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-01-admin-user-profiles-design.md`

---

## File Map

```
CREATE: supabase/migrations/20260401_add_loops_events_table.sql  — DB migration
MODIFY: apps/web/lib/loops.ts                                     — Add event logging to sendEvent()
CREATE: apps/web/app/api/admin/users/[id]/route.ts                — GET profile + PATCH update
MODIFY: apps/web/app/api/admin/users/route.ts                     — Replace with full user list API
CREATE: apps/web/app/admin/users/page.tsx                          — User list page
CREATE: apps/web/app/admin/users/[id]/page.tsx                     — User profile page
```

---

### Task 1: Create `loops_events` table migration

**Files:**
- Create: `supabase/migrations/20260401_add_loops_events_table.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Loops Event Audit Log
-- Tracks every event sent to Loops.so for per-user visibility

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

ALTER TABLE loops_events ENABLE ROW LEVEL SECURITY;

-- Only service role needs access (admin API uses service role)
CREATE POLICY "Service role full access" ON loops_events
  FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` or apply via Supabase dashboard.

- [ ] **Step 3: Commit**

```
git add supabase/migrations/20260401_add_loops_events_table.sql
git commit -m "feat: add loops_events table for email event audit trail"
```

---

### Task 2: Add event logging to Loops `sendEvent()`

**Files:**
- Modify: `apps/web/lib/loops.ts` — the `sendEvent()` function (~line 92-125)

- [ ] **Step 1: Add Supabase import at top of file**

At the top of `apps/web/lib/loops.ts`, add after existing imports:

```typescript
import { getSupabaseServerClient } from '@/lib/supabase-server';
```

- [ ] **Step 2: Add event logging after successful Loops API call**

In `sendEvent()`, after the `console.log` on line 119 and before `return { success: true }`, add:

```typescript
    // Log event to loops_events table for admin audit trail
    try {
      const supabase = getSupabaseServerClient();
      await (supabase as any).from('loops_events').insert({
        user_email: payload.email,
        user_id: payload.userId || null,
        event_name: payload.eventName,
        event_data: payload.eventProperties || {},
      });
    } catch {
      // Non-blocking — don't fail the event send if logging fails
    }
```

- [ ] **Step 3: Check that `LoopsEventPayload` includes `userId`**

Check the `LoopsEventPayload` interface. If it doesn't have a `userId` field, add one:

```typescript
interface LoopsEventPayload {
  email: string;
  userId?: string;  // Add this if missing
  eventName: string;
  eventProperties?: Record<string, unknown>;
}
```

Then grep for all `sendEvent(` call sites and add `userId` where available — many of the wrapper functions (like `onProUpgrade`, `onAssessmentCompleted`, etc.) already have access to the user email but may not pass userId. Pass it where available; omit where not.

- [ ] **Step 4: Commit**

```
git add apps/web/lib/loops.ts
git commit -m "feat: log Loops events to loops_events table for admin audit"
```

---

### Task 3: Build the admin users list API

**Files:**
- Modify: `apps/web/app/api/admin/users/route.ts` — replace existing file

- [ ] **Step 1: Replace the existing route with the full user list API**

Replace the entire contents of `apps/web/app/api/admin/users/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Parallel queries for all data sources
    const [
      usersResult,
      enrollmentsResult,
      instantLeadsResult,
      callScoresResult,
      discoveryResult,
      visibilityResult,
      assessmentsResult,
      subscriptionsResult,
      orgsResult,
      assignmentsResult,
      companiesResult,
    ] = await Promise.all([
      (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name, call_lab_tier, discovery_lab_tier, visibility_lab_tier, subscription_tier, org_id, created_at')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('client_enrollments')
        .select('user_id, status'),
      (supabase as any)
        .from('instant_leads')
        .select('email'),
      (supabase as any)
        .from('call_scores')
        .select('user_id'),
      (supabase as any)
        .from('discovery_briefs')
        .select('user_id'),
      (supabase as any)
        .from('visibility_lab_reports')
        .select('user_id'),
      (supabase as any)
        .from('assessments')
        .select('user_id')
        .eq('status', 'completed'),
      (supabase as any)
        .from('subscriptions')
        .select('user_id, status'),
      (supabase as any)
        .from('orgs')
        .select('id, name, website'),
      (supabase as any)
        .from('user_agency_assignments')
        .select('user_id, agency_id'),
      (supabase as any)
        .from('client_companies')
        .select('enrollment_id, company_name')
    ]);

    const users = usersResult.data || [];
    const enrollments = enrollmentsResult.data || [];
    const instantLeads = instantLeadsResult.data || [];
    const callScores = callScoresResult.data || [];
    const discoveryBriefs = discoveryResult.data || [];
    const visibilityReports = visibilityResult.data || [];
    const assessments = assessmentsResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const orgs = orgsResult.data || [];
    const assignments = assignmentsResult.data || [];
    const companies = companiesResult.data || [];

    // Build lookup sets/maps
    const clientUserIds = new Set(enrollments.map((e: any) => e.user_id));
    const leadEmails = new Set(instantLeads.map((l: any) => l.email));
    const orgMap = new Map(orgs.map((o: any) => [o.id, o]));
    const userOrgMap = new Map(assignments.map((a: any) => [a.user_id, a.agency_id]));
    const activeSubUserIds = new Set(
      subscriptions.filter((s: any) => s.status === 'active').map((s: any) => s.user_id)
    );

    // Build enrollment -> company map
    const enrollmentCompanyMap = new Map(companies.map((c: any) => [c.enrollment_id, c.company_name]));
    // Build user -> company name (from client_enrollments + client_companies)
    const userEnrollmentMap = new Map<string, string>();
    for (const e of enrollments) {
      const companyName = enrollmentCompanyMap.get(e.user_id); // enrollment_id stored differently
      if (companyName) userEnrollmentMap.set(e.user_id, companyName);
    }

    // Count reports per user
    function countByUser(rows: any[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const r of rows) {
        if (!r.user_id) continue;
        map.set(r.user_id, (map.get(r.user_id) || 0) + 1);
      }
      return map;
    }

    const callLabCounts = countByUser(callScores);
    const discoveryCounts = countByUser(discoveryBriefs);
    const visibilityCounts = countByUser(visibilityReports);
    const assessmentCounts = countByUser(assessments);

    // Build response
    const result = users.map((u: any) => {
      const isClient = clientUserIds.has(u.id);
      const isLead = !isClient && leadEmails.has(u.email);

      // Company: try client_companies first, then orgs
      let companyName: string | null = null;
      let companyUrl: string | null = null;

      if (u.org_id) {
        const org = orgMap.get(u.org_id);
        if (org) {
          companyName = org.name;
          companyUrl = org.website || null;
        }
      }

      const agencyId = userOrgMap.get(u.id);
      if (!companyName && agencyId) {
        const org = orgMap.get(agencyId);
        if (org) {
          companyName = org.name;
          companyUrl = org.website || null;
        }
      }

      const reportCounts = {
        call_lab: callLabCounts.get(u.id) || 0,
        discovery: discoveryCounts.get(u.id) || 0,
        visibility: visibilityCounts.get(u.id) || 0,
        assessment: assessmentCounts.get(u.id) || 0,
      };

      const productsUsed: string[] = [];
      if (reportCounts.call_lab > 0) productsUsed.push('call_lab');
      if (reportCounts.discovery > 0) productsUsed.push('discovery');
      if (reportCounts.visibility > 0) productsUsed.push('visibility');
      if (reportCounts.assessment > 0) productsUsed.push('assessment');

      const tiers = [u.call_lab_tier, u.discovery_lab_tier, u.visibility_lab_tier].filter(Boolean);
      const highestTier = tiers.includes('pro') ? 'pro' : tiers.length > 0 ? 'free' : 'lead';

      return {
        id: u.id,
        email: u.email,
        full_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
        type: isClient ? 'client' : isLead ? 'lead' : 'user',
        company_name: companyName,
        company_url: companyUrl,
        products_used: productsUsed,
        highest_tier: highestTier,
        has_active_subscription: activeSubUserIds.has(u.id),
        created_at: u.created_at,
        report_counts: reportCounts,
      };
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```
git add apps/web/app/api/admin/users/route.ts
git commit -m "feat: replace admin users API with full user list endpoint"
```

---

### Task 4: Build the admin user profile API

**Files:**
- Create: `apps/web/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create the profile GET + PATCH endpoint**

Create `apps/web/app/api/admin/users/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    // Get user record
    const { data: user, error: userError } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get auth metadata (last_sign_in_at)
    const { data: authData } = await supabase.auth.admin.getUserById(id);
    const lastSignIn = authData?.user?.last_sign_in_at || null;

    // Parallel queries for all related data
    const [
      enrollmentsResult,
      orgResult,
      callScoresResult,
      callLabReportsResult,
      discoveryResult,
      visibilityResult,
      assessmentsResult,
      coachingResult,
      fridaysResult,
      loopsEventsResult,
      subscriptionsResult,
      documentsResult,
    ] = await Promise.all([
      (supabase as any)
        .from('client_enrollments')
        .select(`
          id, user_id, status, onboarding_completed, leads_sales_calls, enrolled_at,
          program:client_programs(name, slug),
          company:client_companies(*)
        `)
        .eq('user_id', id),
      user.org_id
        ? (supabase as any).from('orgs').select('*').eq('id', user.org_id).single()
        : Promise.resolve({ data: null }),
      (supabase as any)
        .from('call_scores')
        .select('id, overall_score, overall_grade, version, diagnosis_summary, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('call_lab_reports')
        .select('id, buyer_name, company_name, overall_score, tier, call_type, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('discovery_briefs')
        .select('id, target_company, contact_name, contact_title, version, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('visibility_lab_reports')
        .select('id, brand_name, visibility_score, brand_archetype_name, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('assessments')
        .select('id, assessment_type, overall_score, intake_data, status, created_at')
        .eq('user_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10),
      (supabase as any)
        .from('coaching_reports')
        .select('id, report_type, period_start, period_end, calls_analyzed, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      (supabase as any)
        .from('five_minute_fridays')
        .select('id, week_of, submitted_at')
        .eq('user_id', id)
        .order('week_of', { ascending: false })
        .limit(20),
      (supabase as any)
        .from('loops_events')
        .select('id, event_name, event_data, sent_at')
        .or(`user_id.eq.${id},user_email.eq.${user.email}`)
        .order('sent_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      // Documents: need enrollment IDs first — handled below
      Promise.resolve({ data: null }),
    ]);

    const enrollments = enrollmentsResult.data || [];
    const org = orgResult.data || null;

    // Fetch documents for all enrollments
    const enrollmentIds = enrollments.map((e: any) => e.id);
    let documents: any[] = [];
    if (enrollmentIds.length > 0) {
      const { data: docs } = await (supabase as any)
        .from('client_documents')
        .select('id, enrollment_id, title, document_type, file_url, external_url, category, created_at')
        .in('enrollment_id', enrollmentIds)
        .order('created_at', { ascending: false });
      documents = docs || [];
    }

    // Find same-company users
    let sameCompanyUsers: any[] = [];
    if (user.org_id) {
      const { data: coworkers } = await (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('org_id', user.org_id)
        .neq('id', id)
        .limit(20);
      sameCompanyUsers = coworkers || [];
    }

    // Determine user type
    const isClient = enrollments.length > 0;
    const type = isClient ? 'client' : 'user';

    // Build activity feed (merge all items, sort by date)
    const activity: any[] = [];

    for (const r of (callScoresResult.data || [])) {
      activity.push({
        type: 'call_lab',
        id: r.id,
        label: r.diagnosis_summary?.substring(0, 80) || 'Call Analysis',
        score: r.overall_score,
        version: r.version,
        date: r.created_at,
        url: `/call-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (callLabReportsResult.data || [])) {
      // Avoid duplicates if call_lab_reports references same data
      if (activity.some(a => a.id === r.id)) continue;
      activity.push({
        type: 'call_lab',
        id: r.id,
        label: [r.buyer_name, r.company_name].filter(Boolean).join(' @ ') || 'Call Analysis',
        score: r.overall_score,
        version: r.tier,
        date: r.created_at,
        url: `/call-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (discoveryResult.data || [])) {
      activity.push({
        type: 'discovery',
        id: r.id,
        label: [r.target_company, r.contact_name].filter(Boolean).join(' / ') || 'Discovery Brief',
        version: r.version,
        date: r.created_at,
        url: `/discovery-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (visibilityResult.data || [])) {
      activity.push({
        type: 'visibility',
        id: r.id,
        label: r.brand_name || 'Visibility Report',
        score: r.visibility_score,
        date: r.created_at,
        url: `/visibility-lab/report/${r.id}?admin=1`,
      });
    }

    for (const r of (assessmentsResult.data || [])) {
      activity.push({
        type: 'assessment',
        id: r.id,
        label: r.intake_data?.agencyName || 'Assessment',
        score: r.overall_score,
        date: r.created_at,
        url: `/growthos/results/${r.id}?admin=1`,
      });
    }

    for (const r of (coachingResult.data || [])) {
      activity.push({
        type: 'coaching',
        id: r.id,
        label: `${r.report_type} coaching report (${r.calls_analyzed} calls)`,
        date: r.created_at,
      });
    }

    for (const r of (fridaysResult.data || [])) {
      activity.push({
        type: 'friday',
        id: r.id,
        label: `5-Minute Friday — Week of ${r.week_of}`,
        date: r.submitted_at || r.week_of,
      });
    }

    for (const r of (loopsEventsResult.data || [])) {
      activity.push({
        type: 'loops_event',
        id: r.id,
        label: r.event_name,
        date: r.sent_at,
      });
    }

    // Sort activity by date descending
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      user: {
        ...user,
        last_sign_in_at: lastSignIn,
        type,
      },
      org,
      enrollments,
      activity,
      subscriptions: subscriptionsResult.data || [],
      documents,
      same_company_users: sameCompanyUsers,
    });
  } catch (error) {
    console.error('[Admin Users] Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServerClient();

    // Update user fields
    const userFields: Record<string, any> = {};
    const directFields = ['first_name', 'last_name', 'email', 'subscription_tier', 'call_lab_tier', 'discovery_lab_tier', 'visibility_lab_tier', 'tags'];
    for (const field of directFields) {
      if (body[field] !== undefined) userFields[field] = body[field];
    }

    // Handle preferences (merge, don't replace)
    if (body.preferences) {
      const { data: current } = await (supabase as any)
        .from('users')
        .select('preferences')
        .eq('id', id)
        .single();
      userFields.preferences = { ...(current?.preferences || {}), ...body.preferences };
    }

    if (Object.keys(userFields).length > 0) {
      userFields.updated_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('users')
        .update(userFields)
        .eq('id', id);
      if (error) {
        console.error('[Admin Users] Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
    }

    // Update company fields
    if (body.company) {
      const { enrollment_id, org_id, ...companyFields } = body.company;

      if (enrollment_id) {
        // Client company — upsert client_companies
        const { data: existing } = await (supabase as any)
          .from('client_companies')
          .select('id')
          .eq('enrollment_id', enrollment_id)
          .single();

        if (existing) {
          await (supabase as any)
            .from('client_companies')
            .update({ ...companyFields, updated_at: new Date().toISOString() })
            .eq('enrollment_id', enrollment_id);
        } else {
          await (supabase as any)
            .from('client_companies')
            .insert({ enrollment_id, ...companyFields });
        }
      } else if (org_id) {
        // Self-serve org
        await (supabase as any)
          .from('orgs')
          .update({ ...companyFields, updated_at: new Date().toISOString() })
          .eq('id', org_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Users] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create the directory**

```bash
mkdir -p apps/web/app/api/admin/users/\[id\]
```

- [ ] **Step 3: Commit**

```
git add "apps/web/app/api/admin/users/[id]/route.ts"
git commit -m "feat: add admin user profile API (GET + PATCH)"
```

---

### Task 5: Build the admin users list page

**Files:**
- Create: `apps/web/app/admin/users/page.tsx`

- [ ] **Step 1: Create the user list page**

Create `apps/web/app/admin/users/page.tsx` — a `'use client'` component following the exact same auth pattern as `apps/web/app/admin/clients/page.tsx` (sessionStorage API key, auth gate form, fetch with Bearer token).

**Key implementation details:**

- Interface `AdminUserRow` matching the API response shape from Task 3
- State: `apiKey`, `authed`, `users`, `loading`, `search`, `typeFilter` ('all' | 'client' | 'user' | 'lead')
- Auth gate: same as `/admin/clients` — password input, stores in sessionStorage
- Data loading: `GET /api/admin/users` with Bearer token
- Search: client-side filter on `full_name`, `email`, `company_name`
- Type filter: buttons for All / Clients / Users / Leads
- Table with columns: Name, Email, Type (badge), Company, Products (small badges), Tier, Joined
- Click row → `window.location.href = /admin/users/${user.id}`
- Type badge colors: Client = `#00D4FF` (cyan), User = `#FFDE59` (yellow), Lead = `#666666` (gray)
- Product badges: Call Lab = `#E51B23`, Discovery = `#00D4FF`, Visibility = `#a855f7`, Assessment = `#f59e0b`
- Navigation links in header: back to Main Admin, link to Clients page
- Style: black bg, `font-anton` headings, `font-poppins` body, border-[#333] table borders — matching existing admin pages exactly

The page should be ~200-300 lines. Follow the structure of the clients page closely for auth, loading states, and table rendering.

- [ ] **Step 2: Verify it renders**

Run dev server, navigate to `/admin/users`, enter API key, verify the table loads with user data.

- [ ] **Step 3: Commit**

```
git add apps/web/app/admin/users/page.tsx
git commit -m "feat: add admin users list page with search and type filters"
```

---

### Task 6: Build the admin user profile page

**Files:**
- Create: `apps/web/app/admin/users/[id]/page.tsx`

- [ ] **Step 1: Create the profile page**

Create `apps/web/app/admin/users/[id]/page.tsx` — a `'use client'` component.

**Key implementation details:**

**Auth & data loading:**
- Same sessionStorage API key pattern
- Fetch `GET /api/admin/users/{id}` with Bearer token
- Store full profile response in state

**Layout:**
- Three-column grid on desktop: `grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-6`
- Stacks vertically on mobile

**Left column — Identity & Company (editable):**

Inline click-to-edit pattern (same as company name on `/admin/clients`):
- Each editable field: shows value as `<span>` with `cursor-pointer hover:text-[#00D4FF]`
- On click: replace with `<input>` with `autoFocus`, `border-[#00D4FF]`
- On Enter or blur: call `PATCH /api/admin/users/{id}` with the changed field, update local state
- On Escape: cancel edit

Fields to render:
- **User Card** (bg-[#1A1A1A] border border-[#333] p-5):
  - Type badge at top (Client/User/Lead)
  - First name, Last name (editable text)
  - Email (editable text)
  - Title, Phone (editable, stored in preferences JSONB)
  - Auth method (read-only, gray text)
  - Last sign-in (read-only, relative time)
  - Tier dropdowns: subscription_tier, call_lab_tier, discovery_lab_tier, visibility_lab_tier
    - Each is a `<select>` that fires PATCH on change
  - Loops link: `<a>` button opening `https://app.loops.so/contacts?email={email}` in new tab

- **Company Card** (bg-[#1A1A1A] border border-[#333] p-5 mt-4):
  - For clients: company_name, url, industry_niche, hq_location, founded, team_size, revenue_range
  - For self-serve: org name, website, target_industry, company_size, company_revenue
  - Revenue range: `<select>` dropdown with predefined ranges
  - If no company: show "No company" with muted text
  - PATCH sends `company: { enrollment_id, ...fields }` for clients or `company: { org_id, ...fields }` for self-serve

- **Same-company users** (below company card):
  - List of `same_company_users` from API
  - Each row: name + email, clickable link to `/admin/users/{id}`

**Center column — Activity Feed (read-only):**

- Header: "Activity" with count
- List of activity items from API `activity` array (already sorted by date)
- Each item is a row: `[ProductBadge] [Label] [Date] [ViewLink?]`
- Product badge colors: call_lab = red, discovery = cyan, visibility = purple, assessment = amber, coaching = yellow, friday = green, loops_event = gray
- Date: relative time format ("2d ago", "1w ago")
- View link: only for items with `url` field — opens in new tab with `?admin=1`
- Show first 50 items

**Right column — Context (read-only):**

- **For clients** (has enrollments):
  - Enrollment card: program name (from enrollment.program.name), status badge, enrolled date, onboarding status
  - Documents card: list from `documents` array — title, type icon, date, view link
  - Friday streak: count of submissions from `activity` items where type === 'friday' in last 8 weeks

- **For self-serve users**:
  - Subscription card (if any): plan_type, status, current_period_start/end
  - Assessment snapshot (if any): first assessment from activity — score, intake_data.agencyName
  - Quick stats: total report count, first activity date, most-used product

- **For leads**:
  - Minimal: "Lead — no account" with email and activity count

**The page will be ~500-700 lines.** Follow existing admin page patterns exactly for styling.

- [ ] **Step 2: Create the directory**

```bash
mkdir -p apps/web/app/admin/users/\[id\]
```

- [ ] **Step 3: Verify it renders**

Run dev server, navigate to `/admin/users`, click a user row, verify profile loads with all three columns.

- [ ] **Step 4: Test inline editing**

Edit a user's first name, verify it saves (check network tab for PATCH call, verify value persists on page refresh).

- [ ] **Step 5: Commit**

```
git add "apps/web/app/admin/users/[id]/page.tsx"
git commit -m "feat: add admin user profile page with inline editing and activity feed"
```

---

### Task 7: Add navigation links from existing admin pages

**Files:**
- Modify: `apps/web/app/admin/clients/page.tsx` — add link to Users page
- Modify: `apps/web/app/admin/reports/page.tsx` — add link to user profile from report rows

- [ ] **Step 1: Add Users link to clients page header**

In `apps/web/app/admin/clients/page.tsx`, in the header `<div className="flex gap-3">` section (~line 314), add a link:

```tsx
<a href="/admin/users" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
  All Users
</a>
```

- [ ] **Step 2: Add Users link to admin layout or main admin page**

Check if `apps/web/app/admin/page.tsx` has a navigation section. If so, add a card/link to `/admin/users` labeled "User Directory".

- [ ] **Step 3: Commit**

```
git add apps/web/app/admin/clients/page.tsx apps/web/app/admin/page.tsx
git commit -m "feat: add navigation links to admin user directory"
```

---

### Task 8: Final verification and cleanup

- [ ] **Step 1: End-to-end test**

1. Navigate to `/admin/users` — verify list loads with all users
2. Search for a known client by name — verify filter works
3. Click type filter buttons — verify they filter correctly
4. Click a client row — verify profile page loads with enrollment, company, activity
5. Click a self-serve user row — verify profile shows org data, subscription, stats
6. Edit a field (first name) — verify PATCH fires, value updates
7. Edit a tier dropdown — verify it saves
8. Check activity feed shows reports, assessments, Loops events
9. Click a View link in activity — verify it opens the report with admin access

- [ ] **Step 2: Commit any fixes**

```
git add -A
git commit -m "fix: address issues found in admin user profiles testing"
```

- [ ] **Step 3: Push to deploy**

```
git push
```
