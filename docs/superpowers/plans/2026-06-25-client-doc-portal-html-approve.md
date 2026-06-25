# Client Doc Portal — HTML Docs + In-Portal Approve — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the existing WTF-OS client portal (`apps/web/app/client/documents`) so clients can view self-contained **HTML documents** (alignment docs, proposals) and click **Approve/Accept** in-app, with the owner notified on first view and on approval.

**Architecture:** Add to the existing `client_documents` table (new `'html'` document_type + approval/view columns). Render HTML in a **sandboxed iframe** inside the current document modal. Approvals and view-logging happen through new **server routes** that mirror the existing `app/api/client/documents/[id]/file/route.ts` authorization pattern (cookie-auth the client → service-role load → verify enrollment ownership → write). Notifications mirror the existing `alertDocumentShared`. Firma e-signature is untouched.

**Tech Stack:** Existing — Next.js 16 App Router, React 19, TypeScript, `@supabase/ssr` + `@supabase/supabase-js`, Tailwind, Resend/Loops/Slack, Vitest 4 (`vitest run`).

## Global Constraints

- Build ONLY inside `apps/web` (+ one file in `supabase/migrations/`). Do not create a new app or touch the Firma/contracts code.
- Match existing conventions exactly: server routes import `{ createClient }` from `@/lib/supabase-auth-server` (cookie/RLS) AND `getSupabaseServerClient` from `@/lib/supabase-server` (service role); ownership is enforced in code via the `client_enrollments` join, NOT via new RLS.
- `client_documents.document_type` allowed values become exactly: `'file' | 'link' | 'text' | 'html'`.
- Approvals are WRITTEN SERVER-SIDE via the service-role client only — never from the browser — so they cannot be forged.
- Migration SQL uses the `client_documents` file's style: UPPERCASE SQL keywords, no schema prefix, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` then re-add. Filename `supabase/migrations/20260625_client_documents_html_approve.sql`.
- The migration is applied to the live linked Supabase project BY THE OWNER (via `supabase db push` or the SQL editor) — the plan does NOT run it.
- Tests follow repo convention: pure-function Vitest colocated as `*.test.ts`; routes/UI get manual verification steps (no route-integration tests exist to copy).
- Notifications mirror `alertDocumentShared` in `apps/web/lib/slack.ts` (fire-and-forget, `.catch`-swallowed, no-op when env unset).
- Owner-facing URL base: `process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'`.

---

### Task 1: Migration — html type + approval/view columns

**Files:**
- Create: `supabase/migrations/20260625_client_documents_html_approve.sql`

**Interfaces:**
- Produces (DB columns later tasks rely on): `client_documents.requires_approval boolean`, `.viewed_at timestamptz`, `.approved_at timestamptz`, `.approved_by uuid`, `.approved_name text`; `document_type` CHECK now includes `'html'`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260625_client_documents_html_approve.sql`:
```sql
-- 20260625_client_documents_html_approve.sql
-- Adds HTML document support + lightweight in-portal approval to client_documents.

-- 1. Allow document_type = 'html'
ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_document_type_check;
ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN ('file', 'link', 'text', 'html'));

-- 2. Approval + view-tracking columns
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_name TEXT;
```

- [ ] **Step 2: Lint the SQL by eye against the existing table style**

Confirm it matches `supabase/migrations/20260423_demandos_intake_db_fixup.sql` (UPPERCASE, no schema prefix, `IF EXISTS`/`IF NOT EXISTS`). No app code changes here, so no Vitest.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260625_client_documents_html_approve.sql
git commit -m "feat(db): client_documents html type + approval columns"
```

> **Owner action (out of band):** apply via `supabase db push` or paste into the Supabase SQL editor before live verification of later tasks.

---

### Task 2: Notification helpers (viewed / approved)

**Files:**
- Modify: `apps/web/lib/slack.ts`
- Create: `apps/web/lib/slack.test.ts`

**Interfaces:**
- Consumes: existing `sendSlackAlert(options)` in the same file.
- Produces:
  - `buildDocumentViewedText(clientName: string, docTitle: string): string`
  - `buildDocumentApprovedText(clientName: string, docTitle: string, approverName: string): string`
  - `alertDocumentViewed(clientName: string, docTitle: string): void`
  - `alertDocumentApproved(clientName: string, docTitle: string, approverName: string): void`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/slack.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildDocumentViewedText, buildDocumentApprovedText } from './slack'

describe('slack document notifications', () => {
  it('viewed text names the client and doc', () => {
    const t = buildDocumentViewedText('Huemor', 'The Path Forward')
    expect(t).toContain('Huemor')
    expect(t).toContain('The Path Forward')
    expect(t.toLowerCase()).toContain('view')
  })
  it('approved text names client, doc, and approver', () => {
    const t = buildDocumentApprovedText('Huemor', 'The Path Forward', 'Jeff Gapinski')
    expect(t).toContain('Huemor')
    expect(t).toContain('The Path Forward')
    expect(t).toContain('Jeff Gapinski')
    expect(t.toLowerCase()).toContain('approv')
  })
})
```

- [ ] **Step 2: Run (expect FAIL)** — in `apps/web`: `npm test -- slack` → FAIL (exports missing).

- [ ] **Step 3: Implement (append to `apps/web/lib/slack.ts`, mirroring `alertDocumentShared`)**
```ts
export function buildDocumentViewedText(clientName: string, docTitle: string): string {
  return `:eyes: *${clientName}* opened *${docTitle}*`
}
export function buildDocumentApprovedText(clientName: string, docTitle: string, approverName: string): string {
  return `:white_check_mark: *${clientName}* approved *${docTitle}* (signed: ${approverName})`
}
export function alertDocumentViewed(clientName: string, docTitle: string): void {
  sendSlackAlert({ text: buildDocumentViewedText(clientName, docTitle), color: 'info' })
    .catch(err => console.error('[Slack] Document viewed alert failed:', err))
}
export function alertDocumentApproved(clientName: string, docTitle: string, approverName: string): void {
  sendSlackAlert({ text: buildDocumentApprovedText(clientName, docTitle, approverName), color: 'success' })
    .catch(err => console.error('[Slack] Document approved alert failed:', err))
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- slack` → 2 passed.

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/slack.ts apps/web/lib/slack.test.ts
git commit -m "feat(notify): document viewed/approved slack alerts"
```

---

### Task 3: Shared authorize helper + view-logging route

**Files:**
- Create: `apps/web/lib/client-documents/authorize.ts`, `apps/web/lib/client-documents/approval.ts`, `apps/web/lib/client-documents/approval.test.ts`
- Create: `apps/web/app/api/client/documents/[id]/view/route.ts`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase-auth-server`), `getSupabaseServerClient` (`@/lib/supabase-server`), `alertDocumentViewed` (Task 2).
- Produces:
  - `authorizeClientDocument(id): Promise<{ ok: true; userId: string; enrollmentId: string; doc: ClientDocRow; clientName: string } | { ok: false; status: number; error: string }>` — loads the doc by id with the service role, confirms the caller is signed in and owns the doc's enrollment (mirrors `[id]/file/route.ts`).
  - `type ClientDocRow = { id: string; enrollment_id: string; title: string; document_type: string; requires_approval: boolean; viewed_at: string | null; approved_at: string | null }`
  - `isFirstView(doc: Pick<ClientDocRow,'viewed_at'>): boolean`
  - `POST /api/client/documents/[id]/view` → `{ firstView: boolean }`

- [ ] **Step 1: Write failing test for the pure helper**

Create `apps/web/lib/client-documents/approval.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isFirstView } from './approval'

describe('isFirstView', () => {
  it('true when viewed_at is null', () => { expect(isFirstView({ viewed_at: null })).toBe(true) })
  it('false when viewed_at is set', () => { expect(isFirstView({ viewed_at: '2026-06-25T00:00:00Z' })).toBe(false) })
})
```

- [ ] **Step 2: Run (expect FAIL)** — `npm test -- approval` → FAIL.

- [ ] **Step 3: Implement the pure helper**

Create `apps/web/lib/client-documents/approval.ts`:
```ts
export function isFirstView(doc: { viewed_at: string | null }): boolean {
  return doc.viewed_at === null
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- approval` → 2 passed.

- [ ] **Step 5: Implement the authorize helper (mirror `[id]/file/route.ts`)**

Create `apps/web/lib/client-documents/authorize.ts`:
```ts
import { createClient } from '@/lib/supabase-auth-server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export type ClientDocRow = {
  id: string; enrollment_id: string; title: string; document_type: string;
  requires_approval: boolean; viewed_at: string | null; approved_at: string | null
}
type AuthzOk = { ok: true; userId: string; enrollmentId: string; doc: ClientDocRow; clientName: string }
type AuthzErr = { ok: false; status: number; error: string }

export async function authorizeClientDocument(id: string): Promise<AuthzOk | AuthzErr> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const admin = getSupabaseServerClient()
  const { data: doc } = await admin
    .from('client_documents')
    .select('id, enrollment_id, title, document_type, requires_approval, viewed_at, approved_at')
    .eq('id', id)
    .single()
  if (!doc) return { ok: false, status: 404, error: 'Not found' }

  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('id', doc.enrollment_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!enrollment) return { ok: false, status: 404, error: 'Not found' }

  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const clientName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Client'
  return { ok: true, userId: user.id, enrollmentId: enrollment.id, doc: doc as ClientDocRow, clientName }
}
```

- [ ] **Step 6: Implement the view route**

Create `apps/web/app/api/client/documents/[id]/view/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeClientDocument } from '@/lib/client-documents/authorize'
import { isFirstView } from '@/lib/client-documents/approval'
import { alertDocumentViewed } from '@/lib/slack'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authz = await authorizeClientDocument(id)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const firstView = isFirstView(authz.doc)
  if (firstView) {
    const admin = getSupabaseServerClient()
    await admin.from('client_documents').update({ viewed_at: new Date().toISOString() }).eq('id', id)
    alertDocumentViewed(authz.clientName, authz.doc.title)
  }
  return NextResponse.json({ firstView })
}
```

- [ ] **Step 7: Manual verification (after owner applies migration)**

`npm run dev` in `apps/web`. As a logged-in client with an `html` doc, `POST /api/client/documents/<id>/view` (or open it in the UI once Task 6 lands). Confirm `viewed_at` is set once and a Slack alert fires on the first call only.

- [ ] **Step 8: Commit**
```bash
git add apps/web/lib/client-documents apps/web/app/api/client/documents/[id]/view
git commit -m "feat(portal): client document authorize helper + view logging route"
```

---

### Task 4: Approve route

**Files:**
- Create: `apps/web/app/api/client/documents/[id]/approve/route.ts`
- Modify: `apps/web/lib/client-documents/approval.ts`, `apps/web/lib/client-documents/approval.test.ts`

**Interfaces:**
- Consumes: `authorizeClientDocument` (Task 3), `getSupabaseServerClient`, `alertDocumentApproved` (Task 2).
- Produces:
  - `validateApprove(doc: { requires_approval: boolean; approved_at: string | null }, name: string): { ok: true } | { ok: false; error: string }`
  - `POST /api/client/documents/[id]/approve` body `{ name: string }` → `{ ok: true }`; 400 on bad input/state.

- [ ] **Step 1: Add failing tests for validateApprove**

Append to `apps/web/lib/client-documents/approval.test.ts`:
```ts
import { validateApprove } from './approval'

describe('validateApprove', () => {
  const base = { requires_approval: true, approved_at: null }
  it('ok with a name on an approvable doc', () => {
    expect(validateApprove(base, 'Jeff')).toEqual({ ok: true })
  })
  it('rejects empty name', () => {
    expect(validateApprove(base, '  ')).toEqual({ ok: false, error: 'name required' })
  })
  it('rejects when already approved', () => {
    expect(validateApprove({ requires_approval: true, approved_at: '2026-06-25T00:00:00Z' }, 'Jeff'))
      .toEqual({ ok: false, error: 'already approved' })
  })
  it('rejects when approval not requested', () => {
    expect(validateApprove({ requires_approval: false, approved_at: null }, 'Jeff'))
      .toEqual({ ok: false, error: 'approval not enabled' })
  })
})
```

- [ ] **Step 2: Run (expect FAIL)** — `npm test -- approval` → new tests FAIL.

- [ ] **Step 3: Implement validateApprove (append to `approval.ts`)**
```ts
export function validateApprove(
  doc: { requires_approval: boolean; approved_at: string | null },
  name: string,
): { ok: true } | { ok: false; error: string } {
  if (!doc.requires_approval) return { ok: false, error: 'approval not enabled' }
  if (doc.approved_at) return { ok: false, error: 'already approved' }
  if (!name.trim()) return { ok: false, error: 'name required' }
  return { ok: true }
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- approval` → all passed.

- [ ] **Step 5: Implement the approve route**

Create `apps/web/app/api/client/documents/[id]/approve/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeClientDocument } from '@/lib/client-documents/authorize'
import { validateApprove } from '@/lib/client-documents/approval'
import { alertDocumentApproved } from '@/lib/slack'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name : ''

  const authz = await authorizeClientDocument(id)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const check = validateApprove(authz.doc, name)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const admin = getSupabaseServerClient()
  const { error } = await admin.from('client_documents').update({
    approved_at: new Date().toISOString(),
    approved_by: authz.userId,
    approved_name: name.trim(),
  }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  alertDocumentApproved(authz.clientName, authz.doc.title, name.trim())
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Manual verification (after migration)** — POST `{ "name": "Jeff" }` to the approve route as the owning client → `{ok:true}`, columns set, Slack fires. Re-POST → 400 `already approved`. A foreign user → 404.

- [ ] **Step 7: Commit**
```bash
git add apps/web/lib/client-documents/approval.ts apps/web/lib/client-documents/approval.test.ts apps/web/app/api/client/documents/[id]/approve
git commit -m "feat(portal): in-portal document approve route"
```

---

### Task 5: Admin ingestion — accept html + requires_approval

**Files:**
- Modify: `apps/web/app/api/admin/documents/route.ts`
- Create: `apps/web/lib/client-documents/admin-validate.ts`, `apps/web/lib/client-documents/admin-validate.test.ts`

**Interfaces:**
- Produces:
  - `validateAdminDocPayload(p: { document_type: string; title: string | null; external_url: string | null; content_body: string | null }): { ok: true } | { ok: false; error: string }` — extends the route's current inline checks to require `content_body` for `'text' | 'html'` and to allow `'html'`.
- Modifies the JSON branch of the admin POST to: accept `document_type: 'html'`, read a `requires_approval` boolean from the body, and pass `requires_approval` into the insert.

- [ ] **Step 1: Failing test for validateAdminDocPayload**

Create `apps/web/lib/client-documents/admin-validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateAdminDocPayload } from './admin-validate'

describe('validateAdminDocPayload', () => {
  it('html requires content_body', () => {
    expect(validateAdminDocPayload({ document_type: 'html', title: 'T', external_url: null, content_body: null }))
      .toEqual({ ok: false, error: 'content_body is required for html documents' })
  })
  it('html ok with content_body', () => {
    expect(validateAdminDocPayload({ document_type: 'html', title: 'T', external_url: null, content_body: '<p>x</p>' }))
      .toEqual({ ok: true })
  })
  it('link still requires external_url', () => {
    expect(validateAdminDocPayload({ document_type: 'link', title: 'T', external_url: null, content_body: null }))
      .toEqual({ ok: false, error: 'external_url is required for link documents' })
  })
})
```

- [ ] **Step 2: Run (expect FAIL)** — `npm test -- admin-validate` → FAIL.

- [ ] **Step 3: Implement**

Create `apps/web/lib/client-documents/admin-validate.ts`:
```ts
export function validateAdminDocPayload(p: {
  document_type: string; title: string | null; external_url: string | null; content_body: string | null
}): { ok: true } | { ok: false; error: string } {
  if (p.document_type === 'link' && !p.external_url) {
    return { ok: false, error: 'external_url is required for link documents' }
  }
  if ((p.document_type === 'text' || p.document_type === 'html') && !p.content_body) {
    return { ok: false, error: `content_body is required for ${p.document_type} documents` }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- admin-validate` → 3 passed.

- [ ] **Step 5: Wire into the admin route's JSON branch**

In `apps/web/app/api/admin/documents/route.ts`, in the JSON (`else`) branch: after reading `contentBody`, also read `const requiresApproval = body.requires_approval === true`. Replace the two inline `if (documentType === 'link' ...)` / `if (documentType === 'text' ...)` validation blocks with a single call to `validateAdminDocPayload({ document_type: documentType, title, external_url: externalUrl, content_body: contentBody })`, returning its `error` with status 400 when not ok. Add `requires_approval: requiresApproval` to the `.insert({...})` object. Import `validateAdminDocPayload` from `@/lib/client-documents/admin-validate`. Leave the multipart/file branch unchanged.

- [ ] **Step 6: Type-check + manual curl (after migration)**

Run `npm run type-check` in `apps/web` (expect clean). Then:
```bash
curl -s -X POST localhost:3000/api/admin/documents -H "authorization: Bearer $ADMIN_API_KEY" -H 'content-type: application/json' \
  -d '{"enrollment_id":"<ENROLLMENT_ID>","title":"HTML Doc","document_type":"html","content_body":"<h1>Hi</h1>","requires_approval":true,"category":"proposal"}'
```
Expected: `{ document: { ... document_type: "html", requires_approval: true ... } }`.

- [ ] **Step 7: Commit**
```bash
git add apps/web/lib/client-documents/admin-validate.ts apps/web/lib/client-documents/admin-validate.test.ts apps/web/app/api/admin/documents/route.ts
git commit -m "feat(admin): accept html documents with requires_approval"
```

---

### Task 6: Client portal UI — render HTML + view ping + approve

**Files:**
- Modify: `apps/web/app/client/documents/page.tsx`
- Create: `apps/web/lib/client-documents/ui-state.ts`, `apps/web/lib/client-documents/ui-state.test.ts`

**Interfaces:**
- Consumes: the `view` + `approve` routes (Tasks 3/4).
- Produces:
  - `canApprove(doc: { requires_approval: boolean; approved_at: string | null }): boolean`
  - UI: HTML docs open in the existing modal rendering `content_body` in a sandboxed `<iframe srcDoc>`; opening a doc POSTs to the view route; an Approve control (typed name → approve route) shows when `canApprove`; an "Approved" badge shows when `approved_at` is set.

- [ ] **Step 1: Failing test for canApprove**

Create `apps/web/lib/client-documents/ui-state.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canApprove } from './ui-state'

describe('canApprove', () => {
  it('true when required and not yet approved', () => {
    expect(canApprove({ requires_approval: true, approved_at: null })).toBe(true)
  })
  it('false when already approved', () => {
    expect(canApprove({ requires_approval: true, approved_at: '2026-06-25T00:00:00Z' })).toBe(false)
  })
  it('false when not required', () => {
    expect(canApprove({ requires_approval: false, approved_at: null })).toBe(false)
  })
})
```

- [ ] **Step 2: Run (expect FAIL)** — `npm test -- ui-state` → FAIL.

- [ ] **Step 3: Implement**

Create `apps/web/lib/client-documents/ui-state.ts`:
```ts
export function canApprove(doc: { requires_approval: boolean; approved_at: string | null }): boolean {
  return doc.requires_approval && !doc.approved_at
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- ui-state` → 3 passed.

- [ ] **Step 5: Extend the portal page**

In `apps/web/app/client/documents/page.tsx`:
- Extend the local `ClientDocument` interface: `document_type: 'file' | 'link' | 'text' | 'html'` and add `requires_approval: boolean`, `approved_at: string | null`, `approved_name: string | null`.
- In `openDocument`, add a branch for `document_type === 'html'`: set the modal to this doc, and fire-and-forget `fetch(\`/api/client/documents/\${doc.id}/view\`, { method: 'POST' })`.
- In the modal render: when the open doc is `html`, render its `content_body` inside a sandboxed iframe:
  ```tsx
  <iframe sandbox="allow-scripts" srcDoc={doc.content_body ?? ''} title={doc.title}
    style={{ width: '100%', height: '70vh', border: 0, background: '#fff', borderRadius: 8 }} />
  ```
- Below the iframe, using `canApprove` from `@/lib/client-documents/ui-state`: if `canApprove(doc)`, render a typed-name input + an Approve button (brand red `#E51B23`) that POSTs `{ name }` to `/api/client/documents/${doc.id}/approve`; on `{ok:true}`, update local state so the doc shows `approved_at` and the button is replaced by an "✅ Approved" badge. If already approved, show the badge with `approved_name`.
- Keep existing `file`/`link`/`text` behavior unchanged.

- [ ] **Step 6: Manual verification (after migration)**

`npm run dev`. As a client with a `requires_approval` html doc: open it → renders in the iframe, owner gets a Slack "viewed" ping (first open only). Type a name, click Approve → badge flips to Approved, owner gets the "approved" ping. Reload → still Approved, no Approve button.

- [ ] **Step 7: Commit**
```bash
git add apps/web/lib/client-documents/ui-state.ts apps/web/lib/client-documents/ui-state.test.ts apps/web/app/client/documents/page.tsx
git commit -m "feat(portal): render html docs, log views, in-portal approve UI"
```

---

### Task 7: Branch verification

**Files:** none (verification only)

- [ ] **Step 1: Full checks** — in `apps/web`: `npm run type-check` (clean), `npm test` (all green), `npm run lint` (clean), `npm run build` (succeeds; or `cd ../.. && npx turbo build --filter=web`).
- [ ] **Step 2: Confirm Firma/contracts untouched** — `git diff main --stat` shows changes only under `apps/web/{lib/client-documents,lib/slack.ts,app/api/client/documents,app/api/admin/documents,app/client/documents}` and the one migration. No files under `apps/web/lib/contracts` or `app/api/contracts` changed.

---

## Self-Review (author check against the revised scope)

**Spec coverage:** html rendering (T1 type + T6 iframe) ✅ · in-portal approve (T1 columns + T4 route + T6 UI) ✅ · view + approve notifications (T2 + T3 + T4) ✅ · admin ingestion of html + requires_approval (T5) ✅ · Firma untouched (Global Constraints + T7 guard) ✅ · approvals written server-side only (T4) ✅.

**Placeholder scan:** every code step contains real code matching the verbatim patterns extracted from the repo; route/UI tasks use explicit manual-verification commands (repo has no route-integration tests to copy). ✅

**Type consistency:** `ClientDocRow`, `authorizeClientDocument`, `isFirstView`, `validateApprove`, `validateAdminDocPayload`, `canApprove` names match across defining and consuming tasks; `document_type` union `'file'|'link'|'text'|'html'` consistent (T1 CHECK, T5 validate, T6 interface). ✅

**Convention match:** server routes use the dual `createClient`(auth) + `getSupabaseServerClient`(service) pattern from `[id]/file/route.ts`; notifications mirror `alertDocumentShared`; migration style matches the `client_documents` table's own migration. ✅
