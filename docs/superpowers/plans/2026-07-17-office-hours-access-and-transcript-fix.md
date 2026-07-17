# Office Hours Access, Admin Visibility & Transcript Download Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins reliable access to the 5MF and session review pages, make all office-hours history visible to both agency tiers, surface it from the member document list, and fix office-hours transcript downloads.

**Architecture:** Reuse the existing `client_content` (`content_type='session'`) office-hours storage and the `/client/content` Resource Library. Mirror the proven gated-file pattern (`/api/client/documents/[id]/file`) for office-hours transcripts. Convert the sessions admin API from a manual `ADMIN_API_KEY` gate to the standard `requireAdmin()` session gate. A one-off SQL migration backfills program scoping and admin flags.

**Tech Stack:** Next.js App Router (React client components), TypeScript, Supabase (Postgres + private Storage bucket `client-documents`), vitest.

## Global Constraints

- Private Storage bucket is `client-documents`; never hand out `getPublicUrl` links to clients — always route through a gated route that mints a short-lived signed URL.
- Signed-URL TTL for gated downloads: **60 seconds** (matches `/api/client/documents/[id]/file`).
- Session auth client: `createClient` from `@/lib/supabase-auth-server`. Service-role client: `getSupabaseServerClient` from `@/lib/supabase-server`.
- Admin gate helper: `requireAdmin()` from `@/lib/contracts/require-admin` (returns admin user id or `null`).
- Agency program slugs: `agency-studio`, `agency-studio-plus`.
- Office-hours visibility rule (mirrors `client_content` RLS): visible if the viewer is admin, OR `program_ids` is empty, OR the viewer has an active enrollment whose `program_id` is in `program_ids`.
- Commit after every task. Run `cd apps/web && npx tsc --noEmit` before committing any task that changes `.ts`/`.tsx`.

## File map

| File | Responsibility | Task |
|---|---|---|
| `apps/web/lib/client-content/office-hours-access.ts` | **New.** Pure logic: visibility decision + storage-path derivation | 1 |
| `apps/web/lib/client-content/office-hours-access.test.ts` | **New.** Unit tests for the pure logic | 1 |
| `apps/web/lib/client-content/authorize.ts` | **New.** DB-coupled authorize wrapper for a transcript request | 2 |
| `apps/web/app/api/client/content/[id]/transcript/route.ts` | **New.** Gated transcript download (login → authorize → 302 signed URL) | 3 |
| `apps/web/app/client/content/page.tsx` | Fix download link; preset `?type=` filter; admin merge of all sessions | 4, 6 |
| `apps/web/app/api/admin/office-hours/route.ts` | **New.** Admin list of all office-hours sessions (service role) | 6 |
| `apps/web/app/api/admin/sessions/route.ts` | Swap `ADMIN_API_KEY` → `requireAdmin()` | 5 |
| `apps/web/app/api/admin/sessions/publish/route.ts` | Swap auth; write both agency program IDs for office hours | 5 |
| `apps/web/app/api/admin/sessions/regenerate/route.ts` | Swap auth | 5 |
| `apps/web/app/admin/sessions/page.tsx` | Remove the API-key entry box; load directly for admins | 5 |
| `apps/web/app/admin/layout.tsx` | Add "Sessions" + "Office Hours" nav links | 7 |
| `apps/web/app/admin/five-minute-friday/page.tsx` | Default the view to full history | 8 |
| `apps/web/app/client/documents/page.tsx` | Add "Office Hours →" card | 9 |
| `supabase/migrations/20260717_office_hours_agency_backfill_and_admins.sql` | **New.** Backfill program scoping + set admin flags | 10 |

---

### Task 1: Pure office-hours access logic (+ unit tests)

**Files:**
- Create: `apps/web/lib/client-content/office-hours-access.ts`
- Test: `apps/web/lib/client-content/office-hours-access.test.ts`

**Interfaces:**
- Produces:
  - `OFFICE_HOURS_BUCKET: string` (= `'client-documents'`)
  - `canViewOfficeHours(isAdmin: boolean, userProgramIds: string[], contentProgramIds: string[] | null | undefined): boolean`
  - `storagePathFromContentUrl(contentUrl: string | null | undefined): string | null`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/client-content/office-hours-access.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canViewOfficeHours, storagePathFromContentUrl } from './office-hours-access'

describe('canViewOfficeHours', () => {
  it('admins can always view', () => {
    expect(canViewOfficeHours(true, [], ['p1'])).toBe(true)
  })
  it('empty program_ids is visible to everyone', () => {
    expect(canViewOfficeHours(false, [], [])).toBe(true)
    expect(canViewOfficeHours(false, [], null)).toBe(true)
  })
  it('visible when the user shares a program', () => {
    expect(canViewOfficeHours(false, ['agency', 'other'], ['agency'])).toBe(true)
  })
  it('hidden when there is no program overlap', () => {
    expect(canViewOfficeHours(false, ['other'], ['agency'])).toBe(false)
  })
  it('hidden when the user has no programs', () => {
    expect(canViewOfficeHours(false, [], ['agency'])).toBe(false)
  })
})

describe('storagePathFromContentUrl', () => {
  it('derives the object path from a public-format URL', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/public/client-documents/sessions/123-call.vtt'
    expect(storagePathFromContentUrl(url)).toBe('sessions/123-call.vtt')
  })
  it('decodes percent-encoding', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/public/client-documents/sessions/a%20b.vtt'
    expect(storagePathFromContentUrl(url)).toBe('sessions/a b.vtt')
  })
  it('returns null for a non-matching URL', () => {
    expect(storagePathFromContentUrl('https://example.com/nope.vtt')).toBeNull()
  })
  it('returns null for null/empty', () => {
    expect(storagePathFromContentUrl(null)).toBeNull()
    expect(storagePathFromContentUrl('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run lib/client-content/office-hours-access.test.ts`
Expected: FAIL — cannot resolve `./office-hours-access`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/client-content/office-hours-access.ts`:

```ts
export const OFFICE_HOURS_BUCKET = 'client-documents'

/**
 * Mirrors the client_content RLS policy: an office-hours session is visible if
 * the viewer is an admin, OR the session targets everyone (empty program_ids),
 * OR the viewer is enrolled in one of the session's programs.
 */
export function canViewOfficeHours(
  isAdmin: boolean,
  userProgramIds: string[],
  contentProgramIds: string[] | null | undefined,
): boolean {
  if (isAdmin) return true
  const ids = contentProgramIds ?? []
  if (ids.length === 0) return true
  return ids.some((id) => userProgramIds.includes(id))
}

/**
 * Derive the in-bucket object path from a stored public-format Storage URL, e.g.
 *   https://<ref>.supabase.co/storage/v1/object/public/client-documents/<path>
 *   → <path>
 * client_content rows store this public URL in `content_url`; the bucket is
 * private, so downloads must be signed on demand — this recovers the path to sign.
 */
export function storagePathFromContentUrl(contentUrl: string | null | undefined): string | null {
  if (!contentUrl) return null
  const marker = `/object/public/${OFFICE_HOURS_BUCKET}/`
  const i = contentUrl.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(contentUrl.slice(i + marker.length))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run lib/client-content/office-hours-access.test.ts`
Expected: PASS (9 assertions across 2 suites).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/client-content/office-hours-access.ts apps/web/lib/client-content/office-hours-access.test.ts
git commit -m "feat(office-hours): pure visibility + storage-path helpers"
```

---

### Task 2: DB-coupled transcript authorization wrapper

**Files:**
- Create: `apps/web/lib/client-content/authorize.ts`

**Interfaces:**
- Consumes: `canViewOfficeHours`, `storagePathFromContentUrl` (Task 1)
- Produces: `authorizeOfficeHoursTranscript(id: string): Promise<{ ok: true; row: OfficeHoursRow; storagePath: string } | { ok: false; status: number; error: string }>`

- [ ] **Step 1: Write the implementation**

Create `apps/web/lib/client-content/authorize.ts`:

```ts
import { createClient } from '@/lib/supabase-auth-server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { canViewOfficeHours, storagePathFromContentUrl } from './office-hours-access'

export type OfficeHoursRow = {
  id: string
  content_type: string
  content_url: string | null
  program_ids: string[] | null
}

type Ok = { ok: true; row: OfficeHoursRow; storagePath: string }
type Err = { ok: false; status: number; error: string }

/**
 * Authorize a request to download an office-hours transcript.
 * login required → row must be a session → viewer must be admin or program-enrolled
 * → returns the derived in-bucket storage path for signing.
 */
export async function authorizeOfficeHoursTranscript(id: string): Promise<Ok | Err> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const admin = getSupabaseServerClient()
  const { data: row } = await admin
    .from('client_content')
    .select('id, content_type, content_url, program_ids')
    .eq('id', id)
    .single()
  if (!row || row.content_type !== 'session') {
    return { ok: false, status: 404, error: 'Not found' }
  }

  const { data: userRow } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = !!userRow?.is_admin

  let userProgramIds: string[] = []
  if (!isAdmin) {
    const { data: enrollments } = await admin
      .from('client_enrollments')
      .select('program_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
    userProgramIds = (enrollments ?? []).map((e) => e.program_id as string)
  }

  if (!canViewOfficeHours(isAdmin, userProgramIds, row.program_ids)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  const storagePath = storagePathFromContentUrl(row.content_url)
  if (!storagePath) {
    return { ok: false, status: 404, error: 'No transcript is associated with this session' }
  }

  return { ok: true, row: row as OfficeHoursRow, storagePath }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors referencing `lib/client-content/authorize.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/client-content/authorize.ts
git commit -m "feat(office-hours): transcript authorization wrapper"
```

---

### Task 3: Gated transcript download route

**Files:**
- Create: `apps/web/app/api/client/content/[id]/transcript/route.ts`

**Interfaces:**
- Consumes: `authorizeOfficeHoursTranscript` (Task 2), `OFFICE_HOURS_BUCKET` (Task 1)
- Produces: `GET /api/client/content/{id}/transcript` → 302 to a 60s signed URL, or 401/403/404/500 JSON.

- [ ] **Step 1: Write the implementation**

Create `apps/web/app/api/client/content/[id]/transcript/route.ts`:

```ts
// apps/web/app/api/client/content/[id]/transcript/route.ts
//
// Permanent, login-gated download link for an office-hours session transcript.
// The client_content.content_url stores a public-format URL, but the
// `client-documents` bucket is PRIVATE — so on every click we authorize the
// viewer (admin or program-enrolled) and 302 to a throwaway 60s signed URL.
// This mirrors app/api/client/documents/[id]/file/route.ts for client_content.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeOfficeHoursTranscript } from '@/lib/client-content/authorize'
import { OFFICE_HOURS_BUCKET } from '@/lib/client-content/office-hours-access'

const SIGNED_URL_TTL_SECONDS = 60

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authz = await authorizeOfficeHoursTranscript(id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }

  const admin = getSupabaseServerClient()
  const { data: signed, error } = await admin.storage
    .from(OFFICE_HOURS_BUCKET)
    .createSignedUrl(authz.storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !signed) {
    console.error('[content/transcript] sign failed', {
      id,
      storagePath: authz.storagePath,
      error: error?.message,
    })
    return NextResponse.json({ error: 'Could not generate transcript link' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/client/content/[id]/transcript/route.ts
git commit -m "feat(office-hours): gated transcript download route"
```

---

### Task 4: Fix the download link + preset the session filter

**Files:**
- Modify: `apps/web/app/client/content/page.tsx`

**Interfaces:**
- Consumes: `GET /api/client/content/{id}/transcript` (Task 3)

- [ ] **Step 1: Point the transcript link at the gated route**

In `apps/web/app/client/content/page.tsx`, find the "Download Call Transcript" anchor (currently `href={selectedItem.content_url}`) and change only the `href`:

```tsx
<a
  href={`/api/client/content/${selectedItem.id}/transcript`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 text-sm text-[#00D4FF] hover:underline"
>
  Download Call Transcript
  <span className="text-[#666666] text-xs">(timestamped transcript)</span>
</a>
```

- [ ] **Step 2: Preset the filter from the URL**

In the same file, add a one-time effect that reads `?type=` and sets `filterType`. Place it right after the existing `const supabase = createClient();` line, before the content-loading `useEffect`:

```tsx
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type');
    if (t) setFilterType(t);
  }, []);
```

(Reading `window.location.search` inside `useEffect` avoids Next's `useSearchParams` Suspense-boundary requirement.)

- [ ] **Step 3: Verify build + type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Start dev (`npm run dev` at repo root), log in as an Agency Studio member, open `/client/content?type=session`, open a session, click "Download Call Transcript".
Expected: the `.vtt` downloads (302 → signed URL), not an "object not found" error. Page loads pre-filtered to Sessions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/client/content/page.tsx
git commit -m "fix(office-hours): download transcript via gated route; preset session filter"
```

---

### Task 5: Convert sessions admin API to the standard admin gate

**Files:**
- Modify: `apps/web/app/api/admin/sessions/route.ts`
- Modify: `apps/web/app/api/admin/sessions/publish/route.ts`
- Modify: `apps/web/app/api/admin/sessions/regenerate/route.ts`
- Modify: `apps/web/app/admin/sessions/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin()` from `@/lib/contracts/require-admin`

- [ ] **Step 1: Replace the API-key gate in each route file**

In each of `route.ts`, `publish/route.ts`, `regenerate/route.ts`:

1. Add the import near the top:

```ts
import { requireAdmin } from '@/lib/contracts/require-admin';
```

2. Delete the local `verifyAuth` function:

```ts
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  return apiKey === process.env.ADMIN_API_KEY;
}
```

3. Replace every guard of the form:

```ts
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
```

with:

```ts
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
```

(If a handler no longer references its `request`/`NextRequest` param after this change, leave the param in place — the App Router still passes it — but you may prefix it `_request` to satisfy lint.)

- [ ] **Step 2: Office-hours publish targets both agency tiers**

In `apps/web/app/api/admin/sessions/publish/route.ts`, the office-hours branch currently resolves one program slug and inserts `program_ids: [program.id]`. Replace that single-program resolution + insert value so office hours are always visible to both agency tiers. Change the program lookup to fetch both agency IDs and use them for `program_ids`:

```ts
    } else if (type === 'office-hours') {
      // Office hours are an Agency Studio artifact — always visible to both agency tiers.
      const { data: agencyPrograms } = await supabase
        .from('client_programs')
        .select('id')
        .in('slug', ['agency-studio', 'agency-studio-plus']);

      const programIds = (agencyPrograms ?? []).map((p) => p.id);
      if (programIds.length === 0) {
        return NextResponse.json({ error: 'Agency programs not found' }, { status: 404 });
      }

      const { data: content, error } = await supabase
        .from('client_content')
        .insert({
          title,
          content_type: 'session',
          content_body: contentBody,
          content_url: vtt_url,
          program_ids: programIds,
          published: true,
          published_at: new Date().toISOString(),
          sort_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[Sessions] Publish office hours error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Notify all clients enrolled in either agency program.
      const { data: enrollments } = await supabase
        .from('client_enrollments')
        .select('user_id')
        .in('program_id', programIds)
        .eq('status', 'active');
```

Leave the rest of the notification loop and the `return NextResponse.json({ success: true, content, notifiedCount })` unchanged. (The `target_id` form field for office hours is now ignored — that's fine; the admin UI still sends it.)

- [ ] **Step 3: Remove the API-key box from the admin page**

In `apps/web/app/admin/sessions/page.tsx`:
1. Delete the `apiKey`, `authed` state and the `handleAuth` function.
2. Delete the auth-gate JSX branch that renders the API-key `<form>` when `!authed`.
3. Change the mount effect so it loads unconditionally:

```tsx
  useEffect(() => {
    loadSessions();
    loadEnrollments();
  }, []);
```

4. In `loadSessions`, `loadEnrollments`, upload, publish, and regenerate fetches, remove the `Authorization: Bearer ${apiKey}` header and drop the `apiKey` argument from those functions' signatures/call sites. The route is now cookie-authenticated, so no header is needed. Example — a fetch that was:

```tsx
const res = await fetch('/api/admin/sessions', {
  headers: { Authorization: `Bearer ${key}` },
});
```

becomes:

```tsx
const res = await fetch('/api/admin/sessions');
```

Apply the same header removal to the `POST` upload, `publish`, and `regenerate` fetches (keep their `method`, `body`, and any `Content-Type` headers).

- [ ] **Step 4: Verify type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors, no remaining references to `apiKey`, `authed`, `verifyAuth`, or `ADMIN_API_KEY` in these four files.

Run: `grep -rn "ADMIN_API_KEY\|admin_api_key" apps/web/app/api/admin/sessions apps/web/app/admin/sessions`
Expected: no matches.

- [ ] **Step 5: Manual verification**

Logged in as admin, visit `/admin/sessions` directly.
Expected: the session list loads immediately with no API-key prompt.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/admin/sessions apps/web/app/admin/sessions/page.tsx
git commit -m "refactor(sessions): use requireAdmin session gate; publish office hours to both agency tiers"
```

---

### Task 6: Admin archive access (all sessions in the client-style view)

**Files:**
- Create: `apps/web/app/api/admin/office-hours/route.ts`
- Modify: `apps/web/app/client/content/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin()`
- Produces: `GET /api/admin/office-hours` → `{ sessions: ClientContent[] }`

- [ ] **Step 1: Create the admin list endpoint**

Create `apps/web/app/api/admin/office-hours/route.ts`:

```ts
// Admin-only: return every published office-hours session, bypassing RLS, so an
// admin (who has no client enrollment) sees the full archive in the client view.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseServerClient();
  const { data } = await admin
    .from('client_content')
    .select('*')
    .eq('content_type', 'session')
    .eq('published', true)
    .order('sort_order', { ascending: true });

  return NextResponse.json({ sessions: data ?? [] });
}
```

- [ ] **Step 2: Merge admin sessions into the content page load**

In `apps/web/app/client/content/page.tsx`, inside `loadContent`, after the existing `client_content` query resolves into `data` and before `setContent(...)`, add an admin merge:

```tsx
      let rows = data || [];

      // Admins have no enrollment, so RLS hides program-scoped sessions from them.
      // Pull the full office-hours archive via the admin endpoint and merge it in.
      const { data: userRow } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (userRow?.is_admin) {
        try {
          const res = await fetch('/api/admin/office-hours');
          if (res.ok) {
            const { sessions } = await res.json();
            const seen = new Set(rows.map((r) => r.id));
            rows = [...rows, ...sessions.filter((s: { id: string }) => !seen.has(s.id))];
          }
        } catch {
          /* non-fatal: fall back to RLS-visible content */
        }
      }

      setContent(rows);
```

Remove the old `setContent(data || []);` line it replaces.

- [ ] **Step 3: Verify type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Logged in as admin (with no client enrollment), visit `/client/content?type=session`.
Expected: all office-hours sessions appear; opening one and clicking "Download Call Transcript" downloads the VTT.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/admin/office-hours/route.ts apps/web/app/client/content/page.tsx
git commit -m "feat(office-hours): admin sees full archive in the client view"
```

---

### Task 7: Admin nav links (Sessions + Office Hours)

**Files:**
- Modify: `apps/web/app/admin/layout.tsx`

- [ ] **Step 1: Add the two links**

In `apps/web/app/admin/layout.tsx`, add two entries to `NAV_LINKS` (after the `five-minute-friday` entry):

```tsx
  { href: '/admin/sessions', label: 'Sessions', icon: '◉' },
  { href: '/client/content?type=session', label: 'Office Hours', icon: '◈' },
```

Note: `isActive` uses `pathname.startsWith(href)`. Because the Office Hours link carries a query string, its `href` won't match a pathname; that's acceptable — it simply never shows the active highlight. Leave `isActive` unchanged.

- [ ] **Step 2: Verify type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

As admin, confirm the sidebar now shows "Sessions" (→ `/admin/sessions`) and "Office Hours" (→ the populated client archive).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/layout.tsx
git commit -m "feat(admin): add Sessions and Office Hours nav links"
```

---

### Task 8: Five Minute Friday admin page defaults to full history

**Files:**
- Modify: `apps/web/app/admin/five-minute-friday/page.tsx`

- [ ] **Step 1: Change the default filter**

In `apps/web/app/admin/five-minute-friday/page.tsx`, change the filter state initializer from:

```tsx
  const [filter, setFilter] = useState<'all' | 'needs_response'>('needs_response');
```

to:

```tsx
  const [filter, setFilter] = useState<'all' | 'needs_response'>('all');
```

- [ ] **Step 2: Verify type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

As admin, open `/admin/five-minute-friday`.
Expected: all submissions (answered and unanswered) show by default; the "Needs Response" toggle still narrows the list.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/five-minute-friday/page.tsx
git commit -m "feat(5mf): default admin view to full history"
```

---

### Task 9: "Office Hours →" card in the member document list

**Files:**
- Modify: `apps/web/app/client/documents/page.tsx`

- [ ] **Step 1: Add the card**

In `apps/web/app/client/documents/page.tsx`, add a link card near the top of the documents list area (above the mapped document rows, inside the main content container). Use the page's existing dark theme classes:

```tsx
      <a
        href="/client/content?type=session"
        className="block border border-[#333333] hover:border-[#E51B23] transition-colors p-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#666666] mb-1">
              Group Sessions
            </div>
            <div className="font-bold text-white text-sm">Office Hours</div>
            <div className="text-[#999999] text-xs mt-1">
              Watch or read every office-hours session in the Resource Library
            </div>
          </div>
          <span className="text-[#E51B23] text-lg">&rarr;</span>
        </div>
      </a>
```

If the file's list is wrapped in a fragment/grid, place this card immediately before that block so it reads as the first item. Match the surrounding indentation.

- [ ] **Step 2: Verify type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

As an Agency member, open `/client/documents`.
Expected: an "Office Hours" card appears; clicking it lands on `/client/content?type=session`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/client/documents/page.tsx
git commit -m "feat(documents): add Office Hours card linking to the session archive"
```

---

### Task 10: Backfill migration + admin flags

**Files:**
- Create: `supabase/migrations/20260717_office_hours_agency_backfill_and_admins.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260717_office_hours_agency_backfill_and_admins.sql`:

```sql
-- Office Hours access backfill + admin flags (2026-07-17)
--
-- 1) Office hours have only ever been run for Agency Studio, so every office-hours
--    session (client_content.content_type = 'session') is safe to expose to BOTH
--    agency-studio and agency-studio-plus. Union the agency program IDs into each
--    row's program_ids without clobbering any existing IDs.
-- 2) Ensure both of Tim's addresses are admins.

WITH agency AS (
  SELECT array_agg(id) AS ids
  FROM client_programs
  WHERE slug IN ('agency-studio', 'agency-studio-plus')
)
UPDATE client_content c
SET program_ids = ARRAY(
  SELECT DISTINCT x
  FROM unnest(COALESCE(c.program_ids, '{}'::uuid[]) || (SELECT ids FROM agency)) AS x
)
WHERE c.content_type = 'session';

UPDATE users
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('tim@timkilroy.com', 'tk@timkilroy.com')
);
```

- [ ] **Step 2: Apply the migration**

Apply it through the project's normal Supabase flow (e.g. `supabase db push`, or paste the SQL into the Supabase SQL editor for the production project). Confirm with the project owner which path to use if unsure.

- [ ] **Step 3: Verify the data**

Run these read-back queries (SQL editor or `supabase db` shell):

```sql
-- Every office-hours session should now include both agency program IDs.
SELECT c.id, c.title, c.program_ids
FROM client_content c
WHERE c.content_type = 'session';

-- Both addresses should be admins.
SELECT u.is_admin, au.email
FROM users u
JOIN auth.users au ON au.id = u.id
WHERE lower(au.email) IN ('tim@timkilroy.com', 'tk@timkilroy.com');
```

Expected: each session's `program_ids` contains the two agency IDs; both rows show `is_admin = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717_office_hours_agency_backfill_and_admins.sql
git commit -m "feat(office-hours): backfill agency program scoping + admin flags"
```

---

## Final verification (after all tasks)

- [ ] `cd apps/web && npx vitest run lib/client-content/` — pure logic passes.
- [ ] `cd apps/web && npx tsc --noEmit` — clean.
- [ ] `npm run build` at repo root — production build succeeds.
- [ ] Logged in as `tim@timkilroy.com` (and separately `tk@timkilroy.com`): sidebar shows Sessions + Office Hours; `/admin/sessions` loads with no key prompt; `/admin/five-minute-friday` shows full history; `/client/content?type=session` shows the full archive and transcripts download.
- [ ] Logged in as an Agency Studio and an Agency Studio+ member: `/client/documents` shows the Office Hours card; the archive shows all historical sessions; "Download Call Transcript" downloads the VTT.
