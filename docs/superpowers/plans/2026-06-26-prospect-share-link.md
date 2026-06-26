# Prospect Share-Link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Share an HTML document with a not-yet-client prospect via a public, unguessable link (`/d/<token>`) — no login — where they view the branded doc and Approve by typing name + email, and the owner is notified on first view and approval.

**Architecture:** Reuse `client_documents` (prospect doc = `enrollment_id` NULL + `share_token` set; invisible to client RLS). A public viewer route loads the doc by token via the service role; public view/approve routes mirror PR #182's client routes but authorize by token instead of enrollment. A dedicated admin route creates prospect docs and returns the share URL. Builds on PR #182 (branch `feat/client-doc-portal-html-approve`).

**Tech Stack:** Existing — Next.js 16 App Router, Supabase service-role client, Vitest 4 (`vitest run` in `apps/web`).

## Global Constraints

- Build only inside `apps/web` (+ one `supabase/migrations/` file). Do NOT modify the existing `/client/documents` page, the existing `/api/client/documents/*` routes, or the existing `/api/admin/documents` route — prospect ingestion is a NEW separate route.
- Public routes live OUTSIDE `/client` (so `middleware.ts` does not gate them): viewer at `app/d/[token]`, APIs at `app/api/share/[token]/*`.
- The share token is the only gate (obscurity). Tokens are long, URL-safe, unguessable. Revoke = delete the doc or clear `share_token`. `client_documents` has NO status column — do not reference one.
- Prospect approvals are written SERVER-SIDE via the service-role client, with an atomic `WHERE approved_at IS NULL` guard (mirror PR #182's client approve route).
- Reuse from PR #182: `validateApprove` (`@/lib/client-documents/approval`), `alertDocumentViewed`/`alertDocumentApproved` (`@/lib/slack`), the sandboxed-iframe rendering (`sandbox="allow-scripts"`, no `allow-same-origin`, `referrerPolicy="no-referrer"`).
- Migration applied to live Supabase BY THE OWNER. Tests = pure-function Vitest under `apps/web/lib/client-documents/` (already in `vitest.config.ts` include); routes/viewer verified manually.
- `share_token` URL base: `process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'`.
- Admin ingest auth: `Bearer ${ADMIN_API_KEY}` (mirror the existing `/api/admin/documents` `verifyAuth`).

---

### Task 1: Migration — nullable enrollment + share/prospect columns

**Files:** Create `supabase/migrations/20260626_client_documents_prospect_share.sql`

**Interfaces:** Produces columns later tasks rely on: `client_documents.share_token`, `.prospect_email`, `.prospect_name`, `.approved_email`; `enrollment_id` becomes nullable.

- [ ] **Step 1: Write the migration**
```sql
-- 20260626_client_documents_prospect_share.sql
-- Prospect (no-enrollment) document sharing via public share_token.

ALTER TABLE client_documents ALTER COLUMN enrollment_id DROP NOT NULL;

ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS prospect_email TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS prospect_name TEXT;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS approved_email TEXT;

DROP INDEX IF EXISTS client_documents_share_token_unique;
CREATE UNIQUE INDEX client_documents_share_token_unique
  ON client_documents(share_token) WHERE share_token IS NOT NULL;
```

- [ ] **Step 2: Confirm style matches `20260423_demandos_intake_db_fixup.sql` (UPPERCASE, IF EXISTS).** No app code, no Vitest.
- [ ] **Step 3: Commit** — `git add supabase/migrations/20260626_client_documents_prospect_share.sql && git commit -m "feat(db): prospect share_token + nullable enrollment on client_documents"`

> **Owner action:** apply via `supabase db push` / SQL editor before live verification.

---

### Task 2: Share-token generator

**Files:** Create `apps/web/lib/client-documents/share-token.ts`, `apps/web/lib/client-documents/share-token.test.ts`

**Interfaces:** Produces `generateShareToken(): string` — URL-safe, ≥ 22 chars.

- [ ] **Step 1: Failing test** — `apps/web/lib/client-documents/share-token.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateShareToken } from './share-token'
describe('generateShareToken', () => {
  it('is url-safe and long', () => { expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]{22,}$/) })
  it('differs each call', () => { expect(generateShareToken()).not.toBe(generateShareToken()) })
})
```
- [ ] **Step 2: Run (FAIL)** — `cd apps/web && npm test -- share-token`.
- [ ] **Step 3: Implement** — `apps/web/lib/client-documents/share-token.ts`:
```ts
import { randomBytes } from 'crypto'
export function generateShareToken(): string {
  return randomBytes(18).toString('base64url')
}
```
- [ ] **Step 4: Run (PASS)** — `npm test -- share-token` → 2 passed.
- [ ] **Step 5: Commit** — `git add apps/web/lib/client-documents/share-token.* && git commit -m "feat: share token generator"`

---

### Task 3: Share-authorize helper + public view route

**Files:** Create `apps/web/lib/client-documents/share-authorize.ts`, `apps/web/app/api/share/[token]/view/route.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient` (`@/lib/supabase-server`), `isFirstView` (`@/lib/client-documents/approval`, from PR #182), `alertDocumentViewed` (`@/lib/slack`).
- Produces:
  - `type ShareDocRow = { id: string; title: string; document_type: string; content_body: string | null; requires_approval: boolean; viewed_at: string | null; approved_at: string | null; approved_name: string | null; prospect_name: string | null }`
  - `authorizeShareDocument(token: string): Promise<{ ok: true; doc: ShareDocRow } | { ok: false; status: number }>`
  - `POST /api/share/[token]/view` → `{ firstView: boolean }`

- [ ] **Step 1: Implement the authorize helper** — `apps/web/lib/client-documents/share-authorize.ts`:
```ts
import { getSupabaseServerClient } from '@/lib/supabase-server'

export type ShareDocRow = {
  id: string; title: string; document_type: string; content_body: string | null;
  requires_approval: boolean; viewed_at: string | null; approved_at: string | null;
  approved_name: string | null; prospect_name: string | null
}

export async function authorizeShareDocument(
  token: string,
): Promise<{ ok: true; doc: ShareDocRow } | { ok: false; status: number }> {
  if (!token) return { ok: false, status: 404 }
  const admin = getSupabaseServerClient()
  const { data: doc } = await admin
    .from('client_documents')
    .select('id, title, document_type, content_body, requires_approval, viewed_at, approved_at, approved_name, prospect_name')
    .eq('share_token', token)
    .single()
  if (!doc) return { ok: false, status: 404 }
  return { ok: true, doc: doc as ShareDocRow }
}
```

- [ ] **Step 2: Implement the public view route** — `apps/web/app/api/share/[token]/view/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { isFirstView } from '@/lib/client-documents/approval'
import { alertDocumentViewed } from '@/lib/slack'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const authz = await authorizeShareDocument(token)
  if (!authz.ok) return NextResponse.json({ error: 'Not found' }, { status: authz.status })

  let firstView = isFirstView(authz.doc)
  if (firstView) {
    const admin = getSupabaseServerClient()
    const { data } = await admin.from('client_documents')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', authz.doc.id).is('viewed_at', null).select('id')
    if (data && data.length > 0) {
      alertDocumentViewed(authz.doc.prospect_name || 'Prospect', authz.doc.title)
    } else {
      firstView = false
    }
  }
  return NextResponse.json({ firstView })
}
```

- [ ] **Step 3: Type-check** — `cd apps/web && npm run type-check` (ignore the pre-existing `.next/types` wah-wah error). No unit test (no DB-touching test harness in repo).
- [ ] **Step 4: Commit** — `git add apps/web/lib/client-documents/share-authorize.ts "apps/web/app/api/share/[token]/view" && git commit -m "feat(share): token authorize helper + public view route"`

---

### Task 4: Public approve route

**Files:** Create `apps/web/app/api/share/[token]/approve/route.ts`

**Interfaces:**
- Consumes: `authorizeShareDocument` (Task 3), `validateApprove` (`@/lib/client-documents/approval`, PR #182), `getSupabaseServerClient`, `alertDocumentApproved`.
- Produces: `POST /api/share/[token]/approve` body `{ name: string; email?: string }` → `{ ok: true }`; 400 invalid; 409 already approved; 404 bad token.

- [ ] **Step 1: Implement** — `apps/web/app/api/share/[token]/approve/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { validateApprove } from '@/lib/client-documents/approval'
import { alertDocumentApproved } from '@/lib/slack'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  const authz = await authorizeShareDocument(token)
  if (!authz.ok) return NextResponse.json({ error: 'Not found' }, { status: authz.status })

  const check = validateApprove(authz.doc, name)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const admin = getSupabaseServerClient()
  const { data, error } = await admin.from('client_documents').update({
    approved_at: new Date().toISOString(),
    approved_name: name.trim(),
    approved_email: email || null,
  }).eq('id', authz.doc.id).is('approved_at', null).select('id')
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'already approved' }, { status: 409 })

  alertDocumentApproved(authz.doc.prospect_name || email || 'Prospect', authz.doc.title, name.trim())
  return NextResponse.json({ ok: true })
}
```
- [ ] **Step 2: Type-check** — `npm run type-check` in apps/web (ignore pre-existing wah-wah error).
- [ ] **Step 3: Commit** — `git add "apps/web/app/api/share/[token]/approve" && git commit -m "feat(share): public prospect approve route"`

---

### Task 5: Admin "create prospect doc" route

**Files:** Create `apps/web/app/api/admin/share-documents/route.ts`, `apps/web/lib/client-documents/share-validate.ts`, `apps/web/lib/client-documents/share-validate.test.ts`

**Interfaces:**
- Produces:
  - `validateShareDocPayload(p: { title: string | null; content_body: string | null }): { ok: true } | { ok: false; error: string }` — title + content_body required (these are always HTML).
  - `POST /api/admin/share-documents` (Bearer `ADMIN_API_KEY`) body `{ title, content_body, prospect_email?, prospect_name?, requires_approval? }` → `{ document, shareUrl }`.

- [ ] **Step 1: Failing test** — `apps/web/lib/client-documents/share-validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateShareDocPayload } from './share-validate'
describe('validateShareDocPayload', () => {
  it('ok with title + content_body', () => {
    expect(validateShareDocPayload({ title: 'T', content_body: '<p>x</p>' })).toEqual({ ok: true })
  })
  it('rejects missing title', () => {
    expect(validateShareDocPayload({ title: null, content_body: '<p>x</p>' })).toEqual({ ok: false, error: 'title is required' })
  })
  it('rejects missing content_body', () => {
    expect(validateShareDocPayload({ title: 'T', content_body: null })).toEqual({ ok: false, error: 'content_body is required' })
  })
})
```
- [ ] **Step 2: Run (FAIL)** — `npm test -- share-validate`.
- [ ] **Step 3: Implement validator** — `apps/web/lib/client-documents/share-validate.ts`:
```ts
export function validateShareDocPayload(p: { title: string | null; content_body: string | null }): { ok: true } | { ok: false; error: string } {
  if (!p.title || !p.title.trim()) return { ok: false, error: 'title is required' }
  if (!p.content_body || !p.content_body.trim()) return { ok: false, error: 'content_body is required' }
  return { ok: true }
}
```
- [ ] **Step 4: Run (PASS)** — `npm test -- share-validate` → 3 passed.
- [ ] **Step 5: Implement the admin route** — `apps/web/app/api/admin/share-documents/route.ts` (mirror the existing `/api/admin/documents` `verifyAuth` exactly):
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { generateShareToken } from '@/lib/client-documents/share-token'
import { validateShareDocPayload } from '@/lib/client-documents/share-validate'

function verifyAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  return apiKey === process.env.ADMIN_API_KEY
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const title: string | null = body.title || null
    const contentBody: string | null = body.content_body || null
    const check = validateShareDocPayload({ title, content_body: contentBody })
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

    const shareToken = generateShareToken()
    const admin = getSupabaseServerClient()
    const { data: document, error } = await admin.from('client_documents').insert({
      enrollment_id: null,
      document_type: 'html',
      title,
      description: body.description || null,
      content_body: contentBody,
      category: body.category || 'proposal',
      requires_approval: body.requires_approval === true,
      share_token: shareToken,
      prospect_email: body.prospect_email || null,
      prospect_name: body.prospect_name || null,
    }).select().single()
    if (error) {
      console.error('[Share Documents] Insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
    return NextResponse.json({ document, shareUrl: `${appUrl}/d/${shareToken}` })
  } catch (e) {
    console.error('[Share Documents] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```
- [ ] **Step 6: Type-check + manual curl (after migration)** — `npm run type-check`; then:
```bash
curl -s -X POST localhost:3000/api/admin/share-documents -H "authorization: Bearer $ADMIN_API_KEY" -H 'content-type: application/json' \
  -d '{"title":"Huemor Proposal","content_body":"<h1>Hi</h1>","prospect_name":"Jeff","prospect_email":"jeff@huemor.com","requires_approval":true}'
```
Expected: `{ "document": {...}, "shareUrl": "https://app.timkilroy.com/d/<token>" }`.
- [ ] **Step 7: Commit** — `git add apps/web/lib/client-documents/share-validate.* "apps/web/app/api/admin/share-documents" && git commit -m "feat(admin): create prospect share documents"`

---

### Task 6: Public viewer page `/d/[token]`

**Files:** Create `apps/web/app/d/[token]/page.tsx`, `apps/web/app/d/[token]/ApproveBox.tsx`

**Interfaces:** Consumes `authorizeShareDocument` (Task 3). Server component renders the doc; a small client component handles the view-ping + approve form.

- [ ] **Step 1: Server page** — `apps/web/app/d/[token]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { ApproveBox } from './ApproveBox'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const authz = await authorizeShareDocument(token)
  if (!authz.ok) notFound()
  const doc = authz.doc
  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#fff', fontFamily: 'var(--font-anton, sans-serif)', textTransform: 'uppercase', marginBottom: 16 }}>{doc.title}</h1>
        <iframe
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={doc.content_body ?? ''}
          title={doc.title}
          style={{ width: '100%', height: '78vh', border: 0, background: '#fff', borderRadius: 8 }}
        />
        <ApproveBox
          token={token}
          requiresApproval={doc.requires_approval}
          initiallyApproved={!!doc.approved_at}
          approvedName={doc.approved_name}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Client approve box** — `apps/web/app/d/[token]/ApproveBox.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'

export function ApproveBox({ token, requiresApproval, initiallyApproved, approvedName }:
  { token: string; requiresApproval: boolean; initiallyApproved: boolean; approvedName: string | null }) {
  const [approved, setApproved] = useState(initiallyApproved)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { fetch(`/api/share/${token}/view`, { method: 'POST' }) }, [token])

  if (approved) {
    return <div style={{ color: '#22c55e', marginTop: 16, fontWeight: 700 }}>✅ Approved{approvedName ? ` by ${approvedName}` : ''}. Thank you.</div>
  }
  if (!requiresApproval) return null
  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
      <input placeholder="Your full name" value={name} onChange={e => setName(e.target.value)}
        style={{ background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px' }} />
      <input placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
        style={{ background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px' }} />
      <button
        disabled={!name.trim()}
        onClick={async () => {
          const res = await fetch(`/api/share/${token}/approve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), email: email.trim() }),
          })
          const json = await res.json()
          if (json.ok) { setApproved(true); setError('') } else { setError(json.error || 'Approval failed') }
        }}
        style={{ background: '#E51B23', color: '#fff', padding: '10px 18px', border: 0, fontWeight: 700, textTransform: 'uppercase', opacity: name.trim() ? 1 : 0.4 }}>
        Approve
      </button>
      {error && <p style={{ color: '#E51B23', fontSize: 13 }}>{error}</p>}
    </div>
  )
}
```
- [ ] **Step 3: Type-check** — `npm run type-check` in apps/web (ignore pre-existing wah-wah error). Manual UI verification by owner after migration.
- [ ] **Step 4: Commit** — `git add "apps/web/app/d/[token]" && git commit -m "feat(share): public prospect viewer with approve"`

---

### Task 7: Branch verification

- [ ] **Step 1:** in `apps/web`: `npm test` (all green incl. new `share-token`/`share-validate`), `npm run type-check` (only the pre-existing `.next` wah-wah error), `npm run build` or `cd ../.. && npx turbo build --filter=web`.
- [ ] **Step 2:** `git diff main --stat` shows only: the new migration, `apps/web/lib/client-documents/share-*`, `apps/web/app/api/share/*`, `apps/web/app/api/admin/share-documents/*`, `apps/web/app/d/*` — plus the PR #182 files already on the branch. No change to existing `/client/documents`, `/api/client/documents/*`, `/api/admin/documents`, contracts, or firma.

---

## Self-Review

**Spec coverage:** public token viewer (T6) · public view+notify (T3) · public approve name+email (T4) · prospect ingest + shareUrl (T5) · nullable enrollment + token columns (T1) · token generator (T2). ✅
**Placeholder scan:** every code step is real, mirroring PR #182 patterns; routes/viewer use manual verification (repo convention). ✅
**Type consistency:** `ShareDocRow`, `authorizeShareDocument`, `generateShareToken`, `validateShareDocPayload` consistent across tasks; reuses `validateApprove`/`isFirstView`/`alertDocument*` verbatim from PR #182. ✅
**Safety:** existing client flows + contracts/firma untouched (separate routes/files); approvals server-side + atomic; null-enrollment keeps prospect docs out of client RLS. ✅
