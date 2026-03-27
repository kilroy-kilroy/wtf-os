# Admin & Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken auth, register the 5-Minute Friday cron, patch the subscriptions schema, redesign `/admin` as a coaching workspace, and split the product dashboard into tier-aware views.

**Architecture:** Four independent workstreams executed sequentially: (1) auth middleware + magic link onboarding, (2) infrastructure patches, (3) admin coaching workspace, (4) user dashboard redesign. Each workstream produces a working commit before the next begins.

**Tech Stack:** Next.js 14 App Router, Supabase Auth (SSR), Tailwind CSS, shadcn/ui patterns, Loops email API, Vercel Cron Jobs.

**Spec:** `docs/superpowers/specs/2026-03-27-admin-dashboard-redesign.md`

---

## Task 1: Add Auth Middleware

**Files:**
- Create: `apps/web/middleware.ts`
- Modify: `apps/web/lib/supabase-auth-server.ts`

This task adds a Next.js middleware that refreshes Supabase auth tokens on every request, redirects unauthenticated users away from protected routes, redirects authenticated users away from login pages, and checks the `is_admin` flag for admin routes.

- [ ] **Step 1: Create middleware.ts**

```typescript
// apps/web/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/client', '/admin', '/settings'];

// Routes that authenticated users should be redirected away from
const AUTH_PAGES = ['/login', '/client/login'];

// Routes that require admin access
const ADMIN_PREFIX = '/admin';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This refreshes the auth token if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from login pages
  if (user && AUTH_PAGES.some((page) => pathname.startsWith(page))) {
    // Check if user has an active client enrollment
    if (pathname.startsWith('/client/login')) {
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (pathname.startsWith('/client')) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin route protection: check is_admin flag
  if (user && pathname.startsWith(ADMIN_PREFIX)) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled by their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
```

- [ ] **Step 2: Verify the middleware loads without errors**

Run: `cd apps/web && npx next build 2>&1 | head -30`

Look for: no TypeScript compilation errors related to middleware.ts. The build may fail for other reasons — we only care that middleware.ts compiles.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat: add auth middleware for route protection and token refresh"
```

---

## Task 2: Add is_admin Column to Users Table

**Files:**
- Create: `supabase/migrations/20260327_add_is_admin_column.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260327_add_is_admin_column.sql

-- Add is_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set Tim as admin (by email — update this if needed)
UPDATE users SET is_admin = true WHERE email = 'tim@timkilroy.com';

-- Create index for middleware lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (id) WHERE is_admin = true;
```

Note: The admin email may need to be verified. Check with `SELECT email FROM users WHERE email ILIKE '%kilroy%' LIMIT 5;` in Supabase SQL editor if the migration doesn't match.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260327_add_is_admin_column.sql
git commit -m "feat: add is_admin column to users table"
```

---

## Task 3: Replace Temp Passwords with Magic Links via Loops

**Files:**
- Modify: `apps/web/app/api/client/invite/route.ts`
- Modify: `apps/web/app/api/client/invite/resend/route.ts`
- Modify: `apps/web/lib/loops.ts`

- [ ] **Step 1: Update the invite API to use generateLink instead of createUser with password**

Replace the password generation and user creation in `apps/web/app/api/client/invite/route.ts`. Find the section that generates `tempPassword` and creates the user (around lines 62-85) and replace it:

```typescript
// OLD (remove):
// const tempPassword = `Welcome${Date.now().toString(36)}!`;
// const { data: authData, error: authError } = await supabase.auth.admin.createUser({
//   email: email.toLowerCase(),
//   password: tempPassword,
//   email_confirm: true,
//   ...
// });

// NEW:
// Create user without password — they'll use magic links
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  email_confirm: true,
  user_metadata: {
    full_name: full_name || '',
    invited_to_program: program.slug,
  },
});
```

Then, after the user is created and enrollment is set up, generate a magic link and send via Loops. Find where `onClientInvited` is called and replace:

```typescript
// OLD (remove):
// await onClientInvited(email, firstName, program.name, loginUrl, tempPassword);

// NEW: Generate magic link and send via Loops
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: email.toLowerCase(),
  options: {
    redirectTo: `${appUrl}/client/onboarding`,
  },
});

if (linkError) {
  console.error('Failed to generate magic link:', linkError);
  // User was created, enrollment exists — log but don't fail the whole invite
}

const magicLink = linkData?.properties?.action_link || `${appUrl}/client/login`;
const firstName = (full_name || '').split(' ')[0] || '';

await onClientInvited(email, firstName, program.name, magicLink);
```

- [ ] **Step 2: Update the resend API**

In `apps/web/app/api/client/invite/resend/route.ts`, replace the password reset + resend logic. Find the section that generates a new temp password (around lines 30-50) and replace:

```typescript
// OLD (remove):
// const tempPassword = `Welcome${Date.now().toString(36)}!`;
// await supabase.auth.admin.updateUserById(enrollment.user_id, { password: tempPassword });

// NEW: Generate a fresh magic link
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
const redirectTo = enrollment.onboarding_completed
  ? `${appUrl}/client/dashboard`
  : `${appUrl}/client/onboarding`;

const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: enrollment.users.email,
  options: { redirectTo },
});

if (linkError) {
  return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
}

const magicLink = linkData?.properties?.action_link || `${appUrl}/client/login`;
```

And update the onClientInvited call:

```typescript
// OLD (remove):
// await onClientInvited(enrollment.users.email, firstName, programName, loginUrl, tempPassword);

// NEW:
await onClientInvited(enrollment.users.email, firstName, programName, magicLink);
```

- [ ] **Step 3: Update onClientInvited in loops.ts**

In `apps/web/lib/loops.ts`, update the `onClientInvited` function signature and body (around lines 547-576):

```typescript
/**
 * Fire when a client is invited to a program
 * Sends welcome email with magic link login
 */
export async function onClientInvited(
  email: string,
  firstName: string,
  programName: string,
  magicLink: string
): Promise<{ success: boolean; error?: string }> {
  // Set contact properties for email templates
  await createOrUpdateContact({
    email,
    firstName,
    source: 'client_invite',
    subscribed: true,
    userGroup: 'client',
    enrolledProgram: programName,
    clientLoginUrl: magicLink,
  });

  return sendEvent({
    email,
    eventName: 'client_invited',
    eventProperties: {
      firstName: firstName || '',
      programName,
      loginUrl: magicLink,
    },
  });
}
```

Note: The `clientTempPassword` contact property and `tempPassword` event property are removed. The Loops email template for `client_invited` will need to be updated to use `loginUrl` (the magic link) instead of showing a temporary password. This is a Loops dashboard change, not a code change.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors in the modified files. If there are unrelated errors, ignore them.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/client/invite/route.ts apps/web/app/api/client/invite/resend/route.ts apps/web/lib/loops.ts
git commit -m "feat: replace temp passwords with magic links via Loops for client onboarding"
```

---

## Task 4: Remove Admin API Key Auth from Admin Pages and APIs

**Files:**
- Modify: `apps/web/app/admin/five-minute-friday/page.tsx`
- Modify: `apps/web/app/api/admin/five-minute-friday/route.ts`
- Modify: `apps/web/app/api/client/five-minute-friday/respond/route.ts`

The middleware now handles admin auth via `is_admin`. Remove the manual API key checks from admin pages and APIs.

- [ ] **Step 1: Remove API key gate from admin 5-Minute Friday page**

In `apps/web/app/admin/five-minute-friday/page.tsx`, the page currently shows an API key input form before loading data. Remove the `apiKey` state, the `authed` gate, the `sessionStorage` logic, and the `handleAuth` function. The page should load data directly on mount since middleware already ensures only admins can access `/admin/*`.

Remove the `Authorization` header from fetch calls — replace with cookie-based auth (the Supabase cookie is already sent automatically). The API routes will be updated in the next step to check `is_admin` via the user session instead of a bearer token.

```typescript
'use client';

import { useState, useEffect } from 'react';

// ... keep FridaySubmission interface as-is ...

export default function AdminFiveMinuteFridayPage() {
  const [fridays, setFridays] = useState<FridaySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriday, setSelectedFriday] = useState<FridaySubmission | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'needs_response'>('needs_response');

  useEffect(() => {
    loadFridays();
  }, []);

  async function loadFridays() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/five-minute-friday');
      if (res.ok) {
        const data = await res.json();
        setFridays(data.fridays || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  // ... rest of component, but remove Authorization headers from all fetch calls ...
```

- [ ] **Step 2: Update admin API routes to use session auth instead of API key**

In `apps/web/app/api/admin/five-minute-friday/route.ts`, replace the API key check with a Supabase session check:

```typescript
import { createClient } from '@/lib/supabase-auth-server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin flag
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... rest of the handler stays the same, but use the service role client for queries ...
```

Apply the same pattern to `apps/web/app/api/client/five-minute-friday/respond/route.ts` — replace the API key bearer token check with the session-based admin check.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/five-minute-friday/page.tsx apps/web/app/api/admin/five-minute-friday/route.ts apps/web/app/api/client/five-minute-friday/respond/route.ts
git commit -m "feat: replace admin API key auth with session-based is_admin check"
```

---

## Task 5: Infrastructure Patches

**Files:**
- Modify: `apps/web/vercel.json`
- Modify: `.env.example`
- Create: `supabase/migrations/20260327_add_subscriptions_product_column.sql`
- Modify: `apps/web/app/api/client/onboarding/route.ts`

- [ ] **Step 1: Add 5-Minute Friday cron to vercel.json**

In `apps/web/vercel.json`, add to the `crons` array:

```json
{ "path": "/api/cron/five-minute-friday", "schedule": "0 12 * * 5" }
```

This runs every Friday at noon UTC (7-8 AM Eastern depending on DST).

- [ ] **Step 2: Add CRON_SECRET to .env.example**

Add to `.env.example`:

```
# Cron Jobs
CRON_SECRET=your-cron-secret-here
```

- [ ] **Step 3: Create migration for subscriptions product column**

```sql
-- supabase/migrations/20260327_add_subscriptions_product_column.sql

-- Add product column to track which product the subscription is for
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS product text;

-- Add index for product lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON subscriptions (product);
```

- [ ] **Step 4: Wire up onClientOnboarded email**

In `apps/web/app/api/client/onboarding/route.ts`, after the line that sets `onboarding_completed = true` (around line 100), add:

```typescript
import { onClientOnboarded } from '@/lib/loops';

// ... existing code that marks onboarding complete ...

// Send welcome-to-dashboard email
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const firstName = (user.user_metadata?.full_name || '').split(' ')[0] || '';
  const programName = enrollment.program?.name || 'Your Program';
  const companyName = body.company?.company_name || '';

  await onClientOnboarded(user.email!, firstName, programName, companyName).catch((err) => {
    console.error('Failed to send onboarding email:', err);
    // Don't fail the onboarding submission over an email error
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/vercel.json .env.example supabase/migrations/20260327_add_subscriptions_product_column.sql apps/web/app/api/client/onboarding/route.ts
git commit -m "fix: register 5MF cron, add subscriptions product column, wire onboarding email"
```

---

## Task 6: Admin Dashboard — Data Layer

**Files:**
- Create: `apps/web/lib/admin/get-admin-dashboard-data.ts`

This creates the server-side data fetching for the new admin coaching workspace. All three zones (action queue, client cards, platform pulse) pull from this single function.

- [ ] **Step 1: Create the data fetching module**

```typescript
// apps/web/lib/admin/get-admin-dashboard-data.ts
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// TYPES
// ============================================

export interface ActionItem {
  id: string;
  type: 'friday_response' | 'client_inactive' | 'new_analysis' | 'new_signup';
  priority: number; // lower = more urgent
  clientName: string;
  clientEmail: string;
  description: string;
  timestamp: string;
  actionUrl: string;
  actionLabel: string;
}

export interface ClientCard {
  userId: string;
  name: string;
  email: string;
  programName: string;
  programSlug: string;
  enrolledAt: string;
  lastActivity: { description: string; timestamp: string } | null;
  fridayStatus: 'submitted' | 'pending' | 'overdue' | 'not_required';
  fridayId: string | null; // if submitted, for the respond link
  latestCallScoreId: string | null;
  coachingReportStatus: 'pending' | 'sent' | 'none';
  daysSinceLastLogin: number | null;
}

export interface PlatformPulse {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  coachingClients: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  callAnalysesThisWeek: number;
  discoveryReportsThisWeek: number;
}

export interface AdminDashboardData {
  actionItems: ActionItem[];
  clientCards: ClientCard[];
  pulse: PlatformPulse;
}

// ============================================
// DATA FETCHING
// ============================================

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Get current week's Friday date for 5MF check
  const currentFriday = getWeekFriday(now);

  // Parallel data fetches
  const [
    enrollmentsResult,
    fridaysResult,
    recentSignupsResult,
    userCountsResult,
    weeklyToolRunsResult,
  ] = await Promise.all([
    // Active enrollments with user and program info
    supabase
      .from('client_enrollments')
      .select(`
        id, user_id, enrolled_at, status,
        users (id, email, first_name, last_name, last_sign_in_at),
        client_programs (name, slug, has_five_minute_friday, has_call_lab_pro)
      `)
      .eq('status', 'active'),

    // This week's Friday submissions
    supabase
      .from('five_minute_fridays')
      .select('id, user_id, week_of, submitted_at')
      .eq('week_of', currentFriday),

    // Recent signups (this week)
    supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false }),

    // User tier counts
    supabase
      .from('users')
      .select('id, call_lab_tier, discovery_lab_tier, visibility_lab_tier, subscription_tier'),

    // Tool runs this week
    supabase
      .from('tool_runs')
      .select('id, tool_type')
      .gte('created_at', weekAgo.toISOString()),
  ]);

  const enrollments = enrollmentsResult.data || [];
  const fridays = fridaysResult.data || [];
  const recentSignups = recentSignupsResult.data || [];
  const allUsers = userCountsResult.data || [];
  const weeklyToolRuns = weeklyToolRunsResult.data || [];

  // Unresponded Friday submissions
  const fridayIds = fridays.map((f) => f.id);
  let respondedFridayIds = new Set<string>();
  if (fridayIds.length > 0) {
    const { data: responses } = await supabase
      .from('five_minute_friday_responses')
      .select('friday_id')
      .in('friday_id', fridayIds);
    respondedFridayIds = new Set((responses || []).map((r) => r.friday_id));
  }

  // Build action items
  const actionItems: ActionItem[] = [];

  // Action: Unresponded Friday submissions
  for (const friday of fridays) {
    if (!respondedFridayIds.has(friday.id)) {
      const enrollment = enrollments.find((e) => e.user_id === friday.user_id);
      const user = enrollment?.users as any;
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown';

      actionItems.push({
        id: `friday-${friday.id}`,
        type: 'friday_response',
        priority: 1,
        clientName: name,
        clientEmail: user?.email || '',
        description: `Submitted Friday check-in`,
        timestamp: friday.submitted_at,
        actionUrl: `/admin/five-minute-friday`,
        actionLabel: 'Respond',
      });
    }
  }

  // Action: Clients inactive for 7+ days
  for (const enrollment of enrollments) {
    const user = enrollment.users as any;
    if (!user?.last_sign_in_at) continue;
    const daysSince = Math.floor(
      (now.getTime() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince >= 7) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
      actionItems.push({
        id: `inactive-${enrollment.id}`,
        type: 'client_inactive',
        priority: daysSince >= 14 ? 2 : 3,
        clientName: name,
        clientEmail: user.email,
        description: `No login for ${daysSince} days`,
        timestamp: user.last_sign_in_at,
        actionUrl: `/admin/clients`,
        actionLabel: 'View Profile',
      });
    }
  }

  // Action: New signups (informational)
  for (const signup of recentSignups.slice(0, 5)) {
    const name = [signup.first_name, signup.last_name].filter(Boolean).join(' ') || signup.email;
    // Skip if this user is already a coaching client
    const isClient = enrollments.some((e) => e.user_id === signup.id);
    if (!isClient) {
      actionItems.push({
        id: `signup-${signup.id}`,
        type: 'new_signup',
        priority: 10,
        clientName: name,
        clientEmail: signup.email,
        description: 'New signup',
        timestamp: signup.created_at,
        actionUrl: `/admin/clients`,
        actionLabel: 'View',
      });
    }
  }

  // Sort by priority, then by timestamp (most recent first)
  actionItems.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Build client cards
  const clientCards: ClientCard[] = enrollments.map((enrollment) => {
    const user = enrollment.users as any;
    const program = enrollment.client_programs as any;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown';

    // Friday status
    const hasFriday = program?.has_five_minute_friday || false;
    const submission = fridays.find((f) => f.user_id === enrollment.user_id);
    let fridayStatus: ClientCard['fridayStatus'] = 'not_required';
    if (hasFriday) {
      if (submission) {
        fridayStatus = 'submitted';
      } else if (now.getDay() >= 5) {
        // It's Friday or later and no submission
        fridayStatus = 'overdue';
      } else {
        fridayStatus = 'pending';
      }
    }

    // Days since last login
    const daysSinceLastLogin = user?.last_sign_in_at
      ? Math.floor((now.getTime() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      userId: enrollment.user_id,
      name,
      email: user?.email || '',
      programName: program?.name || 'Unknown Program',
      programSlug: program?.slug || '',
      enrolledAt: enrollment.enrolled_at,
      lastActivity: user?.last_sign_in_at
        ? { description: 'Last login', timestamp: user.last_sign_in_at }
        : null,
      fridayStatus,
      fridayId: submission?.id || null,
      latestCallScoreId: null, // TODO in future: cross-reference call_scores
      coachingReportStatus: 'none' as const, // TODO in future: cross-reference coaching_reports
      daysSinceLastLogin,
    };
  });

  // Build platform pulse
  const proUsers = allUsers.filter(
    (u) => u.call_lab_tier === 'pro' || u.discovery_lab_tier === 'pro' || u.visibility_lab_tier === 'pro'
  ).length;
  const coachingClients = enrollments.length;
  const freeUsers = allUsers.length - proUsers - coachingClients;

  const monthSignups = allUsers.filter(
    (u) => new Date((u as any).created_at) >= monthAgo
  ).length;

  const callAnalyses = weeklyToolRuns.filter(
    (r) => r.tool_type === 'call_lab' || r.tool_type === 'call_lab_pro'
  ).length;
  const discoveryReports = weeklyToolRuns.filter(
    (r) => r.tool_type === 'discovery_lab' || r.tool_type === 'discovery_lab_pro'
  ).length;

  const pulse: PlatformPulse = {
    totalUsers: allUsers.length,
    freeUsers: Math.max(0, freeUsers),
    proUsers,
    coachingClients,
    signupsThisWeek: recentSignups.length,
    signupsThisMonth: monthSignups,
    callAnalysesThisWeek: callAnalyses,
    discoveryReportsThisWeek: discoveryReports,
  };

  return { actionItems, clientCards, pulse };
}

// ============================================
// HELPERS
// ============================================

function getWeekFriday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Get this week's Friday
  const diff = 5 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep 'admin/get-admin'`

Expected: No errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin/get-admin-dashboard-data.ts
git commit -m "feat: add admin dashboard data layer with action queue, client cards, and pulse"
```

---

## Task 7: Admin Dashboard — UI Components

**Files:**
- Create: `apps/web/components/admin/ActionQueue.tsx`
- Create: `apps/web/components/admin/ClientCards.tsx`
- Create: `apps/web/components/admin/PlatformPulse.tsx`

- [ ] **Step 1: Create ActionQueue component**

```typescript
// apps/web/components/admin/ActionQueue.tsx
'use client';

import type { ActionItem } from '@/lib/admin/get-admin-dashboard-data';
import Link from 'next/link';

interface ActionQueueProps {
  items: ActionItem[];
}

const TYPE_CONFIG: Record<ActionItem['type'], { icon: string; color: string }> = {
  friday_response: { icon: '5', color: 'bg-[#E51B23]' },
  client_inactive: { icon: '!', color: 'bg-yellow-500' },
  new_analysis: { icon: 'A', color: 'bg-[#00D4FF]' },
  new_signup: { icon: '+', color: 'bg-green-500' },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActionQueue({ items }: ActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-8 text-center">
        <p className="text-slate-400 text-sm">Nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const config = TYPE_CONFIG[item.type];
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 border border-slate-700/50 rounded-lg px-4 py-3 hover:border-slate-600/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-7 h-7 rounded-full ${config.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}
              >
                {config.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  <span className="font-medium">{item.clientName}</span>
                  <span className="text-slate-400"> — {item.description}</span>
                </p>
                <p className="text-xs text-slate-500">{timeAgo(item.timestamp)}</p>
              </div>
            </div>
            <Link
              href={item.actionUrl}
              className="shrink-0 px-3 py-1.5 rounded-md bg-slate-700 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
            >
              {item.actionLabel}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create ClientCards component**

```typescript
// apps/web/components/admin/ClientCards.tsx
'use client';

import type { ClientCard } from '@/lib/admin/get-admin-dashboard-data';
import Link from 'next/link';

interface ClientCardsProps {
  cards: ClientCard[];
}

const FRIDAY_STATUS_CONFIG: Record<ClientCard['fridayStatus'], { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'text-green-400' },
  pending: { label: 'Not yet', color: 'text-slate-400' },
  overdue: { label: 'Overdue', color: 'text-[#E51B23]' },
  not_required: { label: 'N/A', color: 'text-slate-500' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ClientCards({ cards }: ClientCardsProps) {
  if (cards.length === 0) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-8 text-center">
        <p className="text-slate-400 text-sm">No active coaching clients.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        const fridayConfig = FRIDAY_STATUS_CONFIG[card.fridayStatus];
        const isInactive = card.daysSinceLastLogin !== null && card.daysSinceLastLogin >= 7;

        return (
          <div
            key={card.userId}
            className={`border rounded-lg p-5 ${
              isInactive ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700/50'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">{card.name}</h3>
                <p className="text-xs text-slate-400">{card.programName}</p>
              </div>
              <Link
                href={`/admin/impersonate/${card.userId}`}
                className="text-xs text-[#00D4FF] hover:underline"
                target="_blank"
              >
                View as client
              </Link>
            </div>

            {/* Status rows */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Last activity</span>
                <span className={isInactive ? 'text-yellow-400' : 'text-slate-300'}>
                  {card.lastActivity
                    ? `${card.daysSinceLastLogin === 0 ? 'Today' : `${card.daysSinceLastLogin}d ago`}`
                    : 'Never logged in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">5-Minute Friday</span>
                <span className={fridayConfig.color}>{fridayConfig.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enrolled</span>
                <span className="text-slate-300">{formatDate(card.enrolledAt)}</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
              {card.fridayStatus === 'submitted' && (
                <Link
                  href="/admin/five-minute-friday"
                  className="px-3 py-1.5 rounded-md bg-[#E51B23] text-xs font-medium text-white hover:bg-[#E51B23]/80 transition-colors"
                >
                  Respond to Friday
                </Link>
              )}
              <Link
                href={`/admin/clients`}
                className="px-3 py-1.5 rounded-md bg-slate-700 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create PlatformPulse component**

```typescript
// apps/web/components/admin/PlatformPulse.tsx
'use client';

import { useState } from 'react';
import type { PlatformPulse as PulseData } from '@/lib/admin/get-admin-dashboard-data';

interface PlatformPulseProps {
  pulse: PulseData;
}

export function PlatformPulse({ pulse }: PlatformPulseProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-700/50 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-white uppercase tracking-wider">
            Platform Pulse
          </h2>
          <span className="text-xs text-slate-400">
            {pulse.totalUsers} users &middot; {pulse.signupsThisWeek} new this week
          </span>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Users" value={pulse.totalUsers} />
            <Stat label="Free" value={pulse.freeUsers} />
            <Stat label="Pro" value={pulse.proUsers} />
            <Stat label="Coaching" value={pulse.coachingClients} />
            <Stat label="Signups (week)" value={pulse.signupsThisWeek} />
            <Stat label="Signups (month)" value={pulse.signupsThisMonth} />
            <Stat label="Call Analyses (week)" value={pulse.callAnalysesThisWeek} />
            <Stat label="Discovery Reports (week)" value={pulse.discoveryReportsThisWeek} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/admin/ActionQueue.tsx apps/web/components/admin/ClientCards.tsx apps/web/components/admin/PlatformPulse.tsx
git commit -m "feat: add admin dashboard UI components (action queue, client cards, pulse)"
```

---

## Task 8: Admin Dashboard — Page Rewrite

**Files:**
- Modify: `apps/web/app/admin/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite admin page as server component**

Replace the entire contents of `apps/web/app/admin/page.tsx`:

```typescript
// apps/web/app/admin/page.tsx
import { getAdminDashboardData } from '@/lib/admin/get-admin-dashboard-data';
import { ActionQueue } from '@/components/admin/ActionQueue';
import { ClientCards } from '@/components/admin/ClientCards';
import { PlatformPulse } from '@/components/admin/PlatformPulse';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Zone 1: Action Queue */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Needs Your Attention
        </h2>
        <ActionQueue items={data.actionItems} />
      </section>

      {/* Zone 2: Client Cards */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Coaching Clients
        </h2>
        <ClientCards cards={data.clientCards} />
      </section>

      {/* Zone 3: Platform Pulse */}
      <section>
        <PlatformPulse pulse={data.pulse} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page builds**

Run: `cd apps/web && npx next build 2>&1 | grep -E '(admin|error|Error)' | head -10`

Expected: `/admin` route appears in the build output with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "feat: rewrite admin dashboard as coaching workspace with action queue and client cards"
```

---

## Task 9: View As Client Mode

**Files:**
- Create: `apps/web/app/admin/impersonate/[userId]/page.tsx`

- [ ] **Step 1: Create the impersonate page**

```typescript
// apps/web/app/admin/impersonate/[userId]/page.tsx
import { createClient } from '@/lib/supabase-auth-server';
import { redirect } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function ImpersonatePage({ params }: Props) {
  const { userId } = await params;

  // Verify current user is admin (middleware also checks, but double-check)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminCheck } = await serviceClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminCheck?.is_admin) redirect('/dashboard');

  // Fetch the target client's data
  const { data: targetUser } = await serviceClient
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-400">User not found.</p>
      </div>
    );
  }

  // Fetch their enrollment
  const { data: enrollment } = await serviceClient
    .from('client_enrollments')
    .select('*, program:client_programs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // Fetch their company
  const { data: company } = enrollment
    ? await serviceClient
        .from('client_companies')
        .select('company_name, industry_niche')
        .eq('enrollment_id', enrollment.id)
        .single()
    : { data: null };

  // Fetch their Friday submissions (last 4 weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const { data: fridays } = await serviceClient
    .from('five_minute_fridays')
    .select('id, week_of, worked_on, working_on_next, concerned_about, submitted_at')
    .eq('user_id', userId)
    .gte('submitted_at', fourWeeksAgo.toISOString())
    .order('submitted_at', { ascending: false });

  // Fetch their recent documents
  const { data: docs } = enrollment
    ? await serviceClient
        .from('client_documents')
        .select('id, title, category, created_at')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };

  const clientName = [targetUser.first_name, targetUser.last_name].filter(Boolean).join(' ') || targetUser.email;
  const program = enrollment?.program as any;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Admin banner */}
      <div className="bg-[#E51B23] text-white px-4 py-3 rounded-lg mb-8 flex items-center justify-between">
        <p className="text-sm font-medium">
          Viewing as <strong>{clientName}</strong> — this is what they see (read-only)
        </p>
        <a href="/admin" className="text-sm underline hover:no-underline">
          Back to Admin
        </a>
      </div>

      {/* Client dashboard preview */}
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{clientName}</h1>
          <p className="text-slate-400 text-sm">
            {program?.name || 'No program'} &middot; {company?.company_name || 'No company'} &middot; {targetUser.email}
          </p>
        </div>

        {/* Enrollment status */}
        {enrollment ? (
          <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Enrollment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Status</p>
                <p className="text-white capitalize">{enrollment.status}</p>
              </div>
              <div>
                <p className="text-slate-400">Onboarding</p>
                <p className="text-white">{enrollment.onboarding_completed ? 'Complete' : 'Incomplete'}</p>
              </div>
              <div>
                <p className="text-slate-400">5-Minute Friday</p>
                <p className="text-white">{program?.has_five_minute_friday ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-slate-400">Call Lab Pro</p>
                <p className="text-white">{program?.has_call_lab_pro ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-700/50 rounded-lg p-5">
            <p className="text-slate-400 text-sm">No active enrollment found.</p>
          </div>
        )}

        {/* Recent Friday submissions */}
        <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Recent Friday Check-ins
          </h2>
          {fridays && fridays.length > 0 ? (
            <div className="space-y-3">
              {fridays.map((f) => (
                <div key={f.id} className="border-l-2 border-slate-600 pl-3 py-1">
                  <p className="text-xs text-slate-500">{new Date(f.submitted_at).toLocaleDateString()}</p>
                  <p className="text-sm text-white mt-1"><strong>Worked on:</strong> {f.worked_on}</p>
                  <p className="text-sm text-slate-300"><strong>Next:</strong> {f.working_on_next}</p>
                  {f.concerned_about && (
                    <p className="text-sm text-yellow-400"><strong>Concerned:</strong> {f.concerned_about}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No submissions yet.</p>
          )}
        </div>

        {/* Recent documents */}
        <div className="border border-slate-700/50 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Recent Documents
          </h2>
          {docs && docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-white">{d.title}</span>
                  <span className="text-slate-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No documents shared yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/impersonate/\[userId\]/page.tsx
git commit -m "feat: add view-as-client mode for admin to see client experience"
```

---

## Task 10: Extract Dashboard Data Utilities

**Files:**
- Create: `apps/web/lib/dashboard/patterns.ts`
- Modify: `apps/web/app/dashboard/page.tsx` (remove extracted functions)

Before rewriting the dashboard page, extract the ~350 lines of utility functions into a separate module so the page can be kept thin.

- [ ] **Step 1: Create patterns utility module**

Copy the following functions from `apps/web/app/dashboard/page.tsx` into a new file. These are lines ~60-352 of the current page:

```typescript
// apps/web/lib/dashboard/patterns.ts
import {
  MACRO_PATTERNS,
  getPatternById,
  MacroPattern,
} from '@/lib/macro-patterns';

// Re-export for convenience
export { MACRO_PATTERNS, getPatternById };
export type { MacroPattern };

// Types for database results
export interface CallScoreRow {
  id: string;
  overall_score: number | null;
  overall_grade: string | null;
  diagnosis_summary: string | null;
  markdown_response: string | null;
  version: string;
  created_at: string;
  ingestion_items: {
    transcript_metadata: Record<string, unknown> | null;
    created_at: string;
  } | null;
}

export interface CallSnippetRow {
  id: string;
  call_score_id: string;
  snippet_type: string;
  transcript_quote: string;
  rep_behavior: string | null;
  coaching_note: string | null;
  impact: string | null;
}

export interface FollowUpRow {
  id: string;
  call_score_id: string;
  template_type: string;
  subject_line: string | null;
  body: string;
}

/**
 * Extract pattern names mentioned in a call analysis markdown response.
 */
export function extractPatternsFromMarkdown(markdown: string): string[] {
  const patterns: string[] = [];
  const lowerMarkdown = markdown.toLowerCase();
  MACRO_PATTERNS.forEach((pattern) => {
    if (lowerMarkdown.includes(pattern.name.toLowerCase())) {
      patterns.push(pattern.name);
    }
  });
  return [...new Set(patterns)];
}

/**
 * Map detected pattern name strings to canonical pattern IDs with counts.
 */
export function mapToCanonicalPatterns(
  detectedPatterns: string[]
): Map<string, number> {
  const patternCounts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => patternCounts.set(p.id, 0));

  const keywordMapping: Record<string, string> = {
    'cultural handshake': 'cultural_handshake',
    cultural: 'cultural_handshake',
    handshake: 'cultural_handshake',
    'peer validation': 'peer_validation_engine',
    peer: 'peer_validation_engine',
    'validation engine': 'peer_validation_engine',
    'vulnerability flip': 'vulnerability_flip',
    vulnerability: 'vulnerability_flip',
    flip: 'vulnerability_flip',
    'scenic route': 'scenic_route',
    scenic: 'scenic_route',
    'small talk': 'scenic_route',
    'business blitzer': 'business_blitzer',
    blitzer: 'business_blitzer',
    rushed: 'business_blitzer',
    'diagnostic reveal': 'diagnostic_reveal',
    diagnostic: 'diagnostic_reveal',
    'self diagnosis': 'self_diagnosis_pull',
    'diagnosis pull': 'self_diagnosis_pull',
    'generous professor': 'generous_professor',
    generous: 'generous_professor',
    professor: 'generous_professor',
    'advice avalanche': 'advice_avalanche',
    avalanche: 'advice_avalanche',
    'surface scanner': 'surface_scanner',
    surface: 'surface_scanner',
    scanner: 'surface_scanner',
    'framework drop': 'framework_drop',
    framework: 'framework_drop',
    'agenda abandoner': 'agenda_abandoner',
    abandoner: 'agenda_abandoner',
    passenger: 'passenger',
    'premature solution': 'premature_solution',
    premature: 'premature_solution',
    'pitched too early': 'premature_solution',
    'mirror close': 'mirror_close',
    mirror: 'mirror_close',
    'permission builder': 'permission_builder',
    permission: 'permission_builder',
    'micro-commitment': 'permission_builder',
    'soft close': 'soft_close_fade',
    'soft close fade': 'soft_close_fade',
    fade: 'soft_close_fade',
    'let me know': 'soft_close_fade',
    'over-explain': 'over_explain_loop',
    'over explain': 'over_explain_loop',
    loop: 'over_explain_loop',
    'talking past': 'over_explain_loop',
  };

  detectedPatterns.forEach((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    for (const [keyword, patternId] of Object.entries(keywordMapping)) {
      if (lowerPattern.includes(keyword)) {
        patternCounts.set(patternId, (patternCounts.get(patternId) || 0) + 1);
        break;
      }
    }
  });

  return patternCounts;
}

/**
 * Synthesize a one-liner coaching narrative from pattern frequency data.
 */
export function synthesizeCoachingNarrative(
  patternData: Array<{ patternId: string; frequency: number; totalCalls: number }>,
  patterns: typeof MACRO_PATTERNS
): string {
  const negativePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === 'negative' && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  const positivePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === 'positive' && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  const worstPattern = negativePatterns[0];
  const bestPattern = positivePatterns[0];

  if (!worstPattern && !bestPattern) {
    return 'Keep analyzing calls to build your pattern profile and get personalized coaching insights.';
  }

  let narrative = '';
  if (worstPattern) {
    const pattern = patterns.find((p) => p.id === worstPattern.patternId);
    if (pattern) {
      narrative += `You're using **${pattern.name}** in ${worstPattern.frequency}/${worstPattern.totalCalls} calls. `;
      narrative += `${pattern.description.slice(0, 100)}... `;
      if (pattern.correctiveMove) {
        narrative += `Try: ${pattern.correctiveMove.slice(0, 100)}`;
      }
    }
  } else if (bestPattern) {
    const pattern = patterns.find((p) => p.id === bestPattern.patternId);
    if (pattern) {
      narrative += `Strong use of **${pattern.name}** in ${bestPattern.frequency}/${bestPattern.totalCalls} calls. `;
      narrative += `Keep building on this strength.`;
    }
  }

  return narrative || 'Keep analyzing calls to build your pattern profile.';
}

/**
 * Extract buyer name and company from Fireflies transcript metadata.
 */
export function extractBuyerInfoFromMetadata(
  transcriptMetadata: Record<string, unknown> | null
): { buyerName: string; companyName: string } | null {
  if (!transcriptMetadata) return null;

  const participants = transcriptMetadata.participants as Array<{
    name?: string;
    email?: string;
    displayName?: string;
  }> | undefined;

  if (participants && participants.length > 0) {
    const prospect = participants.length > 1 ? participants[1] : participants[0];
    const prospectName = prospect?.displayName || prospect?.name || 'Prospect';
    let companyName = 'Unknown Company';
    if (prospect?.email) {
      const domain = prospect.email.split('@')[1];
      if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail')) {
        const domainName = domain.split('.')[0];
        companyName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
    return { buyerName: prospectName, companyName };
  }

  const prospectCompany = transcriptMetadata.prospect_company as string | undefined;
  const title = transcriptMetadata.title as string | undefined;
  if (prospectCompany || title) {
    return {
      buyerName: title?.split(' - ')[0]?.trim() || 'Prospect',
      companyName: prospectCompany || 'Unknown Company',
    };
  }

  return null;
}

/**
 * Extract buyer info from markdown (fallback when no metadata).
 */
export function extractBuyerInfoFromMarkdown(markdown: string): {
  buyerName: string;
  companyName: string;
} {
  const callMatch = markdown.match(/\*\*Call:\*\*\s*([^-\n]+)\s*-?\s*([^\n*]*)/i);
  if (callMatch) {
    return {
      buyerName: callMatch[1].trim(),
      companyName: callMatch[2]?.trim() || 'Unknown Company',
    };
  }
  const nameMatch = markdown.match(/(?:with|Call with)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  if (nameMatch) {
    return { buyerName: nameMatch[1], companyName: 'Unknown Company' };
  }
  return { buyerName: 'Prospect', companyName: 'Unknown Company' };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/dashboard/patterns.ts
git commit -m "refactor: extract dashboard pattern utilities into lib/dashboard/patterns.ts"
```

---

## Task 11: Rewrite User Dashboard as Tier-Aware Router

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx` (full rewrite)
- Create: `apps/web/components/dashboard/FreeDashboard.tsx`
- Create: `apps/web/components/dashboard/ProDashboard.tsx`

- [ ] **Step 1: Create FreeDashboard component**

```typescript
// apps/web/components/dashboard/FreeDashboard.tsx
'use client';

import Link from 'next/link';
import { ActivityHistory, type ActivityRecord } from './ActivityHistory';

interface FreeDashboardProps {
  records: ActivityRecord[];
  userName: string;
}

export function FreeDashboard({ records, userName }: FreeDashboardProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {userName ? `Welcome back, ${userName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your SalesOS toolkit</p>
      </div>

      {/* Quick Launch */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ToolCard
          name="Call Lab"
          description="Analyze a sales call transcript"
          href="/call-lab"
          color="#E51B23"
        />
        <ToolCard
          name="Discovery Lab"
          description="Research a prospect before the call"
          href="/discovery-lab"
          color="#FFDE59"
        />
        <ToolCard
          name="Visibility Lab"
          description="Audit your online presence"
          href="/visibility-lab"
          color="#00D4FF"
        />
      </div>

      {/* Recent Activity */}
      {records.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          <ActivityHistory records={records.slice(0, 5)} />
        </section>
      )}

      {/* Upgrade nudge */}
      <div className="border border-slate-700/50 rounded-lg p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <h3 className="text-white font-medium mb-2">Go Pro</h3>
        <p className="text-slate-400 text-sm mb-4">
          {records.length > 0
            ? `You've run ${records.length} ${records.length === 1 ? 'analysis' : 'analyses'}. Upgrade to Pro to unlock pattern tracking, coaching insights, and longitudinal trends.`
            : 'Upgrade to Pro for deeper call analysis, pattern tracking, and personalized coaching.'}
        </p>
        <Link
          href="/upgrade"
          className="inline-block px-4 py-2 rounded-md bg-[#E51B23] text-white text-sm font-medium hover:bg-[#E51B23]/80 transition-colors"
        >
          See Pro Plans
        </Link>
      </div>
    </div>
  );
}

function ToolCard({ name, description, href, color }: {
  name: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="border border-slate-700/50 rounded-lg p-5 hover:border-slate-600/50 transition-colors group"
    >
      <div
        className="w-2 h-2 rounded-full mb-3"
        style={{ backgroundColor: color }}
      />
      <h3 className="text-white font-medium group-hover:text-slate-200">{name}</h3>
      <p className="text-slate-400 text-xs mt-1">{description}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Create ProDashboard component**

```typescript
// apps/web/components/dashboard/ProDashboard.tsx
'use client';

import Link from 'next/link';
import { MacroPattern } from '@/lib/macro-patterns';
import { NextCallFocus } from './NextCallFocus';
import { ActivityHistory, type ActivityRecord } from './ActivityHistory';

interface PatternSummary {
  pattern: MacroPattern;
  frequency: number;
  totalCalls: number;
  isPositive: boolean;
}

interface ProDashboardProps {
  userName: string;
  // Next Call Focus
  focusPattern: MacroPattern | null;
  focusWhyCostingDeals: string;
  focusCorrectiveMove: string;
  // Activity
  records: ActivityRecord[];
  // Progress
  callCount: number;
  avgScore: number;
  scoreTrend: 'improving' | 'declining' | 'stable';
  topPatterns: PatternSummary[];
  // Products owned
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;
  hasVisibilityLabPro: boolean;
}

export function ProDashboard({
  userName,
  focusPattern,
  focusWhyCostingDeals,
  focusCorrectiveMove,
  records,
  callCount,
  avgScore,
  scoreTrend,
  topPatterns,
  hasCallLabPro,
  hasDiscoveryLabPro,
  hasVisibilityLabPro,
}: ProDashboardProps) {
  const trendIcon = scoreTrend === 'improving' ? '↑' : scoreTrend === 'declining' ? '↓' : '→';
  const trendColor = scoreTrend === 'improving' ? 'text-green-400' : scoreTrend === 'declining' ? 'text-[#E51B23]' : 'text-slate-400';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {userName ? `Welcome back, ${userName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your SalesOS Pro dashboard</p>
      </div>

      {/* Next Call Focus */}
      {focusPattern && (
        <NextCallFocus
          pattern={focusPattern}
          whyCostingDeals={focusWhyCostingDeals}
          correctiveMove={focusCorrectiveMove}
        />
      )}

      {/* Progress Summary */}
      <section className="border border-slate-700/50 rounded-lg p-5">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Last 30 Days
        </h2>
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <p className="text-2xl font-bold text-white">{callCount}</p>
            <p className="text-xs text-slate-400">Calls Analyzed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{Math.round(avgScore * 10)}</p>
            <p className="text-xs text-slate-400">Avg Score</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${trendColor}`}>{trendIcon}</p>
            <p className="text-xs text-slate-400">Trend</p>
          </div>
        </div>

        {/* Top patterns as compact tags */}
        {topPatterns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topPatterns.map((p) => (
              <span
                key={p.pattern.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.isPositive
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-[#E51B23]/10 text-[#E51B23]'
                }`}
              >
                {p.pattern.name}
                <span className="text-slate-500">{p.frequency}/{p.totalCalls}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Activity Feed */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Recent Activity
        </h2>
        {records.length > 0 ? (
          <ActivityHistory records={records.slice(0, 8)} />
        ) : (
          <div className="border border-slate-700/50 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-sm">No activity yet. Run your first analysis to get started.</p>
            <div className="flex justify-center gap-3 mt-4">
              {hasCallLabPro && (
                <Link href="/call-lab-pro" className="px-4 py-2 rounded-md bg-[#E51B23] text-white text-sm font-medium">
                  Call Lab Pro
                </Link>
              )}
              {hasDiscoveryLabPro && (
                <Link href="/discovery-lab-pro" className="px-4 py-2 rounded-md bg-[#FFDE59] text-black text-sm font-medium">
                  Discovery Lab Pro
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the dashboard page as a thin tier-aware router**

Replace the entire contents of `apps/web/app/dashboard/page.tsx`. This file goes from 1,258 lines to ~200:

```typescript
// apps/web/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase-auth-server';
import { redirect } from 'next/navigation';
import { getSubscriptionStatus } from '@/lib/subscription';
import { FreeDashboard } from '@/components/dashboard/FreeDashboard';
import { ProDashboard } from '@/components/dashboard/ProDashboard';
import type { ActivityRecord } from '@/components/dashboard/ActivityHistory';
import {
  MACRO_PATTERNS,
  getPatternById,
  extractPatternsFromMarkdown,
  mapToCanonicalPatterns,
  extractBuyerInfoFromMetadata,
  extractBuyerInfoFromMarkdown,
  type CallScoreRow,
} from '@/lib/dashboard/patterns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email, call_lab_tier, discovery_lab_tier, visibility_lab_tier')
    .eq('id', user.id)
    .single();

  const userName = profile?.first_name || '';
  const userEmail = profile?.email || user.email || '';

  // Check subscription status
  const subscription = await getSubscriptionStatus(userEmail);
  const isPro = subscription.hasCallLabPro || subscription.hasDiscoveryLabPro || subscription.hasVisibilityLabPro;

  // Fetch recent activity for all tiers
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: toolRuns } = await supabase
    .from('tool_runs')
    .select('id, tool_type, lead_email, ingestion_item_id, created_at, result_summary')
    .or(`lead_email.eq.${userEmail},user_id.eq.${user.id}`)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  // Build activity records
  const records: ActivityRecord[] = (toolRuns || []).map((run) => {
    const toolType = run.tool_type?.includes('call_lab') ? 'call_lab'
      : run.tool_type?.includes('discovery') ? 'discovery_lab'
      : run.tool_type?.includes('visibility') ? 'visibility_lab'
      : 'assessment';
    const version = run.tool_type?.includes('pro') ? 'pro' : 'lab';
    const summary = run.result_summary as Record<string, unknown> | null;

    return {
      id: run.id,
      toolType: toolType as ActivityRecord['toolType'],
      toolLabel: run.tool_type || 'Unknown',
      version: version as ActivityRecord['version'],
      title: (summary?.title as string) || run.tool_type || 'Analysis',
      subtitle: (summary?.subtitle as string) || null,
      score: (summary?.score as number) || null,
      status: 'complete',
      createdAt: run.created_at,
      href: run.tool_type?.includes('call_lab')
        ? `/call-lab-pro/report/${run.ingestion_item_id || run.id}`
        : run.tool_type?.includes('discovery')
        ? `/discovery-lab/report/${run.id}`
        : `/dashboard`,
    };
  });

  // Free user dashboard
  if (!isPro) {
    return <FreeDashboard records={records} userName={userName} />;
  }

  // Pro user: fetch call scores for pattern analysis
  const { data: callScores } = await supabase
    .from('call_scores')
    .select(`
      id, overall_score, overall_grade, diagnosis_summary,
      markdown_response, version, created_at,
      ingestion_items (transcript_metadata, created_at)
    `)
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  const scores = (callScores || []) as unknown as CallScoreRow[];

  // Pattern analysis
  const allPatternCounts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => allPatternCounts.set(p.id, 0));
  scores.forEach((score) => {
    if (score.markdown_response) {
      const patterns = extractPatternsFromMarkdown(score.markdown_response);
      const counts = mapToCanonicalPatterns(patterns);
      counts.forEach((count, patternId) => {
        allPatternCounts.set(patternId, (allPatternCounts.get(patternId) || 0) + count);
      });
    }
  });

  const windowSize = Math.min(8, scores.length) || 1;

  // Find worst negative pattern for Next Call Focus
  const negativePatterns = MACRO_PATTERNS
    .filter((p) => p.polarity === 'negative' && (allPatternCounts.get(p.id) || 0) > 0)
    .sort((a, b) => (allPatternCounts.get(b.id) || 0) - (allPatternCounts.get(a.id) || 0));

  const focusPattern = negativePatterns[0] || null;

  // Top 3 patterns (positive + negative)
  const topPatterns = MACRO_PATTERNS
    .filter((p) => (allPatternCounts.get(p.id) || 0) > 0)
    .sort((a, b) => (allPatternCounts.get(b.id) || 0) - (allPatternCounts.get(a.id) || 0))
    .slice(0, 3)
    .map((p) => ({
      pattern: p,
      frequency: allPatternCounts.get(p.id) || 0,
      totalCalls: windowSize,
      isPositive: p.polarity === 'positive',
    }));

  // Score trend
  const validScores = scores.filter((s) => s.overall_score !== null);
  const avgScore = validScores.length > 0
    ? validScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / validScores.length
    : 0;

  // Compare first half vs second half of scores
  const half = Math.floor(validScores.length / 2);
  let scoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (validScores.length >= 4) {
    const olderAvg = validScores.slice(half).reduce((s, c) => s + (c.overall_score || 0), 0) / (validScores.length - half);
    const newerAvg = validScores.slice(0, half).reduce((s, c) => s + (c.overall_score || 0), 0) / half;
    if (newerAvg > olderAvg + 0.3) scoreTrend = 'improving';
    else if (newerAvg < olderAvg - 0.3) scoreTrend = 'declining';
  }

  return (
    <ProDashboard
      userName={userName}
      focusPattern={focusPattern}
      focusWhyCostingDeals={focusPattern?.whyCostingDeals || ''}
      focusCorrectiveMove={focusPattern?.correctiveMove || ''}
      records={records}
      callCount={scores.length}
      avgScore={avgScore}
      scoreTrend={scoreTrend}
      topPatterns={topPatterns}
      hasCallLabPro={subscription.hasCallLabPro}
      hasDiscoveryLabPro={subscription.hasDiscoveryLabPro}
      hasVisibilityLabPro={subscription.hasVisibilityLabPro}
    />
  );
}
```

- [ ] **Step 4: Verify the page builds**

Run: `cd apps/web && npx next build 2>&1 | grep -E '(dashboard|error|Error)' | head -10`

Expected: `/dashboard` route appears in build output. There may be warnings about unused imports in the old dashboard components — that's fine.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/components/dashboard/FreeDashboard.tsx apps/web/components/dashboard/ProDashboard.tsx
git commit -m "feat: rewrite dashboard as tier-aware router with free and pro views"
```

---

## Task 12: Manual Verification Checklist

This task has no code changes — it's a verification pass to confirm everything works.

- [ ] **Step 1: Verify middleware protects routes**

Run `cd apps/web && npx next build` and confirm no build errors. Then manually test:
- Visit `/dashboard` while logged out → should redirect to `/login`
- Visit `/admin` while logged in as non-admin → should redirect to `/dashboard`
- Visit `/client/dashboard` while logged out → should redirect to `/client/login`

- [ ] **Step 2: Verify vercel.json has all 7 crons**

Run: `cat apps/web/vercel.json | grep 'five-minute-friday'`

Expected: The new cron entry is present.

- [ ] **Step 3: Verify migrations are ready**

Run: `ls supabase/migrations/ | grep 20260327`

Expected: Two migration files — `add_is_admin_column` and `add_subscriptions_product_column`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | tail -5`

Expected: No errors (or only pre-existing errors unrelated to our changes).

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git status
# Only commit if there are changes from verification fixes
```

---

## Implementation Notes

### Loops Email Template Update (Manual)
After deploying the magic link code (Task 3), update the `client_invited` email template in the Loops dashboard:
- Replace the temporary password display with a "Log In" button pointing to `{{loginUrl}}`
- Remove any reference to `tempPassword` from the template
- Test by inviting a test email address

### Database Migrations (Manual)
The two migrations need to be applied to Supabase:
1. `20260327_add_is_admin_column.sql` — adds `is_admin` column and sets Tim as admin
2. `20260327_add_subscriptions_product_column.sql` — adds `product` column to subscriptions

Apply via Supabase dashboard SQL editor or `supabase db push` if using the CLI.

### Post-Deploy Verification
After deploying to Vercel:
1. Check that `/api/cron/five-minute-friday` returns 200 when called with the correct `CRON_SECRET`
2. Check that the admin dashboard loads at `/admin` without the API key prompt
3. Invite a test client and verify they receive a magic link email
