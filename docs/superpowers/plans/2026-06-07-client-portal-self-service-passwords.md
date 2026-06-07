# Client Portal Self-Service Passwords + Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flaky Supabase magic-link invite/reset on the client portal with a self-controlled token flow where clients create their own password, unify password reset onto the same mechanism, and add a "Sign in with Google" button — reusing existing infrastructure.

**Architecture:** New clients receive a link to `/client/activate?token=<invite_token>` (the token `client_invites` already mints). They set a password; a server route writes it with the service-role key (no session needed). Forgot-password issues a short-lived token from a new `client_password_resets` table through the same activation route. Google reuses the existing `/auth/callback` OAuth path.

**Tech Stack:** Next.js App Router (apps/web), Supabase Auth (cloud), `@supabase/ssr`, service-role admin API, Loops.so for email.

**Testing note:** This repo has **no unit-test framework** (jest/vitest absent). Per the systematic verification used elsewhere in this codebase, each task is verified by running the dev server (`npx next dev -p 3199` from `apps/web`) and exercising routes with `curl`/`node`. Do **not** add a test framework as part of this plan.

**Spec:** `docs/superpowers/specs/2026-06-07-client-portal-self-service-passwords-design.md`

---

## File Structure

**New files:**
- `packages/db/client-password-resets.sql` — reset-token table DDL (for repo history).
- `apps/web/lib/auth-admin.ts` — resolve an auth user id by email (service-role REST).
- `apps/web/app/api/client/activate/route.ts` — set password from invite or reset token.
- `apps/web/app/api/client/reset-request/route.ts` — issue a reset token + email.
- `apps/web/app/client/activate/page.tsx` — "Create / reset your password" UI.

**Modified files:**
- `apps/web/lib/loops.ts` — `onClientInvited` now sends an activation URL; add `onClientPasswordReset`.
- `apps/web/app/api/client/invite/route.ts` — send activation link, drop magic link, defer `accepted`.
- `apps/web/app/client/login/page.tsx` — forgot-password via reset-request, Google button, success banner.
- `apps/web/app/auth/callback/route.ts` — route enrolled clients by `onboarding_completed`.

---

## Loops configuration (DO THIS IN THE LOOPS DASHBOARD)

These are the **only** Loops changes. I audited every onboarding/registration sender in `lib/loops.ts` — `call_lab_signup`, `assessment_completed`, `growthos_bundle_purchased`, `demandos_intake_submitted`, and `client_onboarded` are **unchanged**. Only the two below change.

**1. Event `client_invited` (existing) — data variables:**
- `firstName` (existing)
- `programName` (existing)
- **`activationUrl` (NEW)** — the "Create your password" link. *Replaces the old `loginUrl` magic link.* Update the email template to use `{{activationUrl}}` and change copy from "magic link" to "Create your password".

**2. Event `client_password_reset` (NEW EVENT) — create it with data variables:**
- **`firstName` (NEW)**
- **`resetUrl` (NEW)** — the password-reset link.
- **`expiresInMinutes` (NEW)** — integer, value `60`, for copy like "expires in 60 minutes".
- Build/enable a transactional email + automation triggered by this event.

**3. Contact property `clientLoginUrl` (existing) — behavior change:**
- It now holds the **stable portal URL** (`https://app.timkilroy.com/client/login`), no longer a one-time magic link. No field to create; just be aware templates referencing it now get the portal URL.

---

### Task 1: Reset-token table `client_password_resets`

**Files:**
- Create: `packages/db/client-password-resets.sql`

- [ ] **Step 1: Write the DDL file**

`packages/db/client-password-resets.sql`:
```sql
-- One-time, short-lived password reset tokens for the client portal.
-- Service-role only (RLS enabled, no anon/authenticated policies).
CREATE TABLE IF NOT EXISTS client_password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_password_resets_token ON client_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_client_password_resets_user ON client_password_resets(user_id);

ALTER TABLE client_password_resets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: only the service-role key (which bypasses RLS) touches this table.
```

- [ ] **Step 2: Apply it to the database**

Apply via the Supabase MCP `execute_sql` tool, or the Supabase dashboard SQL editor, or `supabase db query` (CLI v2.79.0+). Paste the DDL above.

- [ ] **Step 3: Verify the table exists and is RLS-enabled**

Run (node one-off from `apps/web`, reuses the env-reading pattern from this session):
```bash
node -e '
const fs=require("fs");const env=fs.readFileSync(".env.local","utf8");
const get=k=>{let v=(env.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]||"";return v.trim().replace(/^["\x27]|["\x27]$/g,"");};
const url=get("NEXT_PUBLIC_SUPABASE_URL"),key=get("SUPABASE_SERVICE_ROLE_KEY");
(async()=>{const r=await fetch(`${url}/rest/v1/client_password_resets?select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});console.log("status",r.status,await r.text());})();
'
```
Expected: `status 200 []` (table exists, empty).

- [ ] **Step 4: Commit**
```bash
git add packages/db/client-password-resets.sql
git commit -m "feat(client-auth): add client_password_resets token table"
```

---

### Task 2: `findAuthUserByEmail` helper

**Files:**
- Create: `apps/web/lib/auth-admin.ts`

- [ ] **Step 1: Write the helper**

`apps/web/lib/auth-admin.ts`:
```ts
// Resolve a Supabase auth user by email using the service-role admin REST API.
// GoTrue's admin list endpoint has no reliable email filter across versions, so
// we fetch a page and match in-process. Fine at our scale (low hundreds of users);
// add pagination if the audience grows past ~1000.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const target = email.toLowerCase();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    console.error('findAuthUserByEmail failed:', res.status);
    return null;
  }
  const data = await res.json();
  const users = Array.isArray(data) ? data : data.users || [];
  const match = users.find((u: any) => (u.email || '').toLowerCase() === target);
  return match ? { id: match.id, email: match.email } : null;
}
```

- [ ] **Step 2: Verify against a known user**

From `apps/web`:
```bash
node -e '
const fs=require("fs");const env=fs.readFileSync(".env.local","utf8");
const get=k=>{let v=(env.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]||"";return v.trim().replace(/^["\x27]|["\x27]$/g,"");};
process.env.NEXT_PUBLIC_SUPABASE_URL=get("NEXT_PUBLIC_SUPABASE_URL");
process.env.SUPABASE_SERVICE_ROLE_KEY=get("SUPABASE_SERVICE_ROLE_KEY");
(async()=>{const {findAuthUserByEmail}=await import("./lib/auth-admin.ts").catch(async()=>{
  // ts not directly importable via node; inline the fetch instead for this check
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(`${url}/auth/v1/admin/users?per_page=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  const d=await r.json();const u=(d.users||d).find(x=>(x.email||"").toLowerCase()==="a@madebydas.com");
  console.log("match:",u?u.id:"NONE");return {findAuthUserByEmail:null};
});})();
'
```
Expected: prints `match: ac01d04f-9aeb-4689-ad04-95e09115b246` (Amlan's id). This confirms the REST query + email match logic the helper uses.

- [ ] **Step 3: Commit**
```bash
git add apps/web/lib/auth-admin.ts
git commit -m "feat(client-auth): add findAuthUserByEmail service-role helper"
```

---

### Task 3: Loops — activation URL + reset event

**Files:**
- Modify: `apps/web/lib/loops.ts` (`onClientInvited` ~565-596; add `onClientPasswordReset` after it)

- [ ] **Step 1: Rewrite `onClientInvited` to send an activation URL**

Replace the existing `onClientInvited` function body with:
```ts
/**
 * Fire when a client is invited to a program.
 * Sends an email whose CTA links to /client/activate to create a password.
 */
export async function onClientInvited(
  email: string,
  firstName: string,
  programName: string,
  activationUrl: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  const contactResult = await createOrUpdateContact({
    email,
    firstName,
    source: 'client_invite',
    subscribed: true,
    userGroup: 'client',
    enrolledProgram: programName,
    clientLoginUrl: `${appUrl}/client/login`, // stable portal URL, not a one-time link
  });

  if (!contactResult.success) {
    return { success: false, error: `Loops contact upsert failed: ${contactResult.error}` };
  }

  return sendEvent({
    email,
    eventName: 'client_invited',
    eventProperties: {
      firstName: firstName || '',
      programName,
      activationUrl,
    },
  });
}
```

- [ ] **Step 2: Add `onClientPasswordReset` immediately after `onClientInvited`**
```ts
/**
 * Fire when a client requests a password reset.
 * Sends an email whose CTA links to /client/activate?reset=<token>.
 */
export async function onClientPasswordReset(
  email: string,
  firstName: string,
  resetUrl: string,
  expiresInMinutes = 60
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    email,
    eventName: 'client_password_reset',
    eventProperties: {
      firstName: firstName || 'there',
      resetUrl,
      expiresInMinutes,
    },
  });
}
```

- [ ] **Step 3: Type-check**

From `apps/web`: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "loops|invite" || echo "no loops/invite type errors"`
Expected: `no loops/invite type errors` (the invite route still passes a string 4th arg — fixed in Task 4; if tsc flags `invite/route.ts` here it is expected and resolved next task).

- [ ] **Step 4: Commit**
```bash
git add apps/web/lib/loops.ts
git commit -m "feat(client-auth): Loops sends activation URL + add password-reset event"
```

---

### Task 4: Invite route — activation link, no magic link, deferred accept

**Files:**
- Modify: `apps/web/app/api/client/invite/route.ts` (lines ~62-155)

- [ ] **Step 1: Replace the user-provision + link block**

Replace the block from `// Create user without password` (line ~62) through the `return NextResponse.json({ success: true, ... })` (line ~155) with:
```ts
    // Create the auth user without a password — they set one via /client/activate.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        invited_to_program: program.slug,
      },
    });

    const alreadyRegistered = authError?.message?.includes('already been registered');
    if (authError && !alreadyRegistered) {
      console.error('User creation error:', authError);
    }

    // Resolve the user id whether brand-new or pre-existing (re-invite).
    const userId =
      authData?.user?.id || (await findAuthUserByEmail(email.toLowerCase()))?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to provision client account', message: authError?.message || 'Could not resolve user' },
        { status: 500 }
      );
    }

    // Create enrollment (idempotent — a pre-existing user may already be enrolled).
    const { data: existingEnrollment } = await supabase
      .from('client_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('program_id', program.id)
      .maybeSingle();

    if (!existingEnrollment) {
      const { error: enrollError } = await supabase.from('client_enrollments').insert({
        user_id: userId,
        program_id: program.id,
        role,
        onboarding_completed: false,
      });
      if (enrollError) {
        return NextResponse.json(
          { error: 'Failed to enroll client', message: enrollError.message },
          { status: 500 }
        );
      }
    }

    // NOTE: invite stays `pending` until the client activates (sets a password).
    // The token must remain valid; /api/client/activate flips it to `accepted`.

    const activationUrl = `${appUrl}/client/activate?token=${invite.invite_token}`;
    const firstName = (full_name || '').split(' ')[0] || '';

    const emailResult = await onClientInvited(
      email.toLowerCase(),
      firstName,
      program.name,
      activationUrl
    );

    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      user_created: !!authData?.user,
      already_existed: !!alreadyRegistered,
      email_sent: emailResult.success,
      email_error: emailResult.success ? undefined : emailResult.error,
    });
```

- [ ] **Step 2: Add the import and ensure `appUrl` is defined**

At the top of the file, add:
```ts
import { findAuthUserByEmail } from '@/lib/auth-admin';
```
The old code defined `const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';` inside the removed block. Add it back near the top of the `POST` handler (after `const supabase = getSupabaseServerClient();`):
```ts
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
```
Confirm `invite.invite_token` is selected: the existing `.insert({...}).select().single()` returns all columns, so `invite.invite_token` is present. No change needed there.

- [ ] **Step 3: Confirm `admin.generateLink` is fully removed**

Run: `grep -n "generateLink\|magiclink\|magic_link\|/auth/confirm" apps/web/app/api/client/invite/route.ts || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Type-check the route**

From `apps/web`: `npx tsc --noEmit 2>&1 | grep "invite/route" || echo "invite route ok"`
Expected: `invite route ok`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/app/api/client/invite/route.ts
git commit -m "feat(client-auth): invite emails /client/activate link, defers accept"
```

---

### Task 5: Activation API route

**Files:**
- Create: `apps/web/app/api/client/activate/route.ts`

- [ ] **Step 1: Write the route**

`apps/web/app/api/client/activate/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { findAuthUserByEmail } from '@/lib/auth-admin';

// Sets a client's password from a one-time token. Two token sources:
//   - `token`  → client_invites.invite_token  (first-time activation)
//   - `reset`  → client_password_resets.token  (forgot-password)
// Service-role only; no user session required.
export async function POST(request: NextRequest) {
  try {
    const { token, reset, password } = await request.json();

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!token && !reset) {
      return NextResponse.json({ error: 'Missing activation token.' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();
    let email: string | null = null;

    if (reset) {
      const { data: row } = await supabase
        .from('client_password_resets')
        .select('id, user_id, expires_at, used_at')
        .eq('token', reset)
        .maybeSingle();

      if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This reset link is invalid or has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      const { error: pwErr } = await supabase.auth.admin.updateUserById(row.user_id, {
        password,
        email_confirm: true,
      });
      if (pwErr) {
        console.error('reset updateUserById failed:', pwErr.message);
        return NextResponse.json({ error: 'Could not set password.' }, { status: 500 });
      }

      await supabase.from('client_password_resets').update({ used_at: nowIso }).eq('id', row.id);
      const { data: u } = await supabase.auth.admin.getUserById(row.user_id);
      email = u.user?.email ?? null;
    } else {
      const { data: invite } = await supabase
        .from('client_invites')
        .select('id, email, status, expires_at')
        .eq('invite_token', token)
        .maybeSingle();

      if (!invite || invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This invite link is invalid, already used, or expired. Please reset your password instead.' },
          { status: 400 }
        );
      }

      const authUser = await findAuthUserByEmail(invite.email);
      if (!authUser) {
        return NextResponse.json({ error: 'Account not found for this invite.' }, { status: 404 });
      }

      const { error: pwErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });
      if (pwErr) {
        console.error('activate updateUserById failed:', pwErr.message);
        return NextResponse.json({ error: 'Could not set password.' }, { status: 500 });
      }

      await supabase
        .from('client_invites')
        .update({ status: 'accepted', accepted_at: nowIso })
        .eq('id', invite.id);
      email = invite.email;
    }

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error('Activate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify with a real pending invite token (end-to-end)**

Create a throwaway pending invite directly, activate it, confirm login works, then clean up. From `apps/web` with the dev server running (`npx next dev -p 3199` in another shell):
```bash
node -e '
const fs=require("fs");const env=fs.readFileSync(".env.local","utf8");
const get=k=>{let v=(env.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]||"";return v.trim().replace(/^["\x27]|["\x27]$/g,"");};
const url=get("NEXT_PUBLIC_SUPABASE_URL"),key=get("SUPABASE_SERVICE_ROLE_KEY"),anon=get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
(async()=>{
  // pick any program id
  const pr=await (await fetch(`${url}/rest/v1/client_programs?select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}})).json();
  const email="activate-test@example.com";
  // create auth user
  await fetch(`${url}/auth/v1/admin/users`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({email,email_confirm:true})});
  // create pending invite
  const inv=await (await fetch(`${url}/rest/v1/client_invites`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({email,program_id:pr[0].id,role:"primary"})})).json();
  const tok=inv[0].invite_token;
  // call activate
  const act=await fetch("http://localhost:3199/api/client/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:tok,password:"Test-Pass-99x"})});
  console.log("activate:",act.status,await act.text());
  // verify login
  const login=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password:"Test-Pass-99x"})});
  console.log("login ok:",login.status);
  // cleanup: delete invite + auth user
  await fetch(`${url}/rest/v1/client_invites?id=eq.${inv[0].id}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}});
  const list=await (await fetch(`${url}/auth/v1/admin/users?per_page=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}})).json();
  const u=(list.users||list).find(x=>x.email===email); if(u) await fetch(`${url}/auth/v1/admin/users/${u.id}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}});
  console.log("cleaned up");
})();
'
```
Expected: `activate: 200 {"success":true,"email":"activate-test@example.com"}`, `login ok: 200`, `cleaned up`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/app/api/client/activate/route.ts
git commit -m "feat(client-auth): /api/client/activate sets password from invite/reset token"
```

---

### Task 6: Activation page

**Files:**
- Create: `apps/web/app/client/activate/page.tsx`

- [ ] **Step 1: Write the page**

`apps/web/app/client/activate/page.tsx`:
```tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';

function ActivateContent() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const token = params.get('token');
  const reset = params.get('reset');
  const isReset = !!reset && !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/client/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reset, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setLoading(false); return; }

      const { data: auth, error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInErr || !auth.user) {
        router.push('/client/login?notice=password_set');
        return;
      }

      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('onboarding_completed')
        .eq('user_id', auth.user.id)
        .eq('status', 'active')
        .maybeSingle();

      router.push(enrollment && !enrollment.onboarding_completed ? '/client/onboarding' : '/client/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-poppins flex items-center justify-center px-5">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Image src="/logos/trios-logo-sq-transparent.png" alt="TriOS" width={120} height={120} className="mx-auto mb-4" />
          <div className="text-[clamp(12px,1.5vw,16px)] text-[#FFDE59] tracking-[2px] font-anton">CLIENT PORTAL</div>
          <p className="text-[#666666] text-sm mt-2">
            {isReset ? 'Choose a new password' : 'Create your password to access your dashboard'}
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#333333] p-8 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23]" />
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} autoComplete="new-password"
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">Confirm Password</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required minLength={8} autoComplete="new-password"
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                placeholder="Enter password again"
              />
            </div>
            {error && <div className="text-sm text-[#E51B23]">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#E51B23] text-white border-none py-4 px-6 font-anton text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:text-black disabled:opacity-50"
            >
              {loading ? '[ SAVING... ]' : isReset ? '[ RESET PASSWORD ]' : '[ CREATE PASSWORD ]'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <a href="/client/login" className="text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ActivateContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify the page renders (not caught by middleware)**

Note: `/client/activate` is under the `/client` protected prefix. **It must be reachable while logged out.** Add it to the middleware auth exemptions in Task 8's first step — verify there. For now confirm it compiles:
With dev server running: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3199/client/activate?token=x`
Expected (BEFORE Task 8 exemption): `307` (redirected — this is the bug Task 8 fixes for this path). AFTER Task 8: `200`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/app/client/activate/page.tsx
git commit -m "feat(client-auth): /client/activate page to create/reset password"
```

---

### Task 7: Reset-request API route

**Files:**
- Create: `apps/web/app/api/client/reset-request/route.ts`

- [ ] **Step 1: Write the route**

`apps/web/app/api/client/reset-request/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { findAuthUserByEmail } from '@/lib/auth-admin';
import { onClientPasswordReset } from '@/lib/loops';

// Issues a one-time reset token and emails a /client/activate?reset= link.
// ALWAYS returns a generic success to prevent email enumeration.
export async function POST(request: NextRequest) {
  const generic = NextResponse.json({ success: true });
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') return generic;

    const supabase = getSupabaseServerClient();
    const authUser = await findAuthUserByEmail(email.toLowerCase());
    if (!authUser) return generic;

    const { data: enrollment } = await supabase
      .from('client_enrollments')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!enrollment) return generic;

    const { data: resetRow, error } = await supabase
      .from('client_password_resets')
      .insert({ user_id: authUser.id })
      .select('token')
      .single();
    if (error || !resetRow) {
      console.error('reset-request insert failed:', error?.message);
      return generic;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const resetUrl = `${appUrl}/client/activate?reset=${resetRow.token}`;

    const { data: profile } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', authUser.id)
      .maybeSingle();

    await onClientPasswordReset(email.toLowerCase(), profile?.first_name || '', resetUrl, 60);
    return generic;
  } catch (err) {
    console.error('reset-request error:', err);
    return generic;
  }
}
```

- [ ] **Step 2: Verify end-to-end (token issued for an enrolled user)**

With dev server running, from `apps/web` — uses Amlan (enrolled). This inserts a real reset row; we read + delete it:
```bash
node -e '
const fs=require("fs");const env=fs.readFileSync(".env.local","utf8");
const get=k=>{let v=(env.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]||"";return v.trim().replace(/^["\x27]|["\x27]$/g,"");};
const url=get("NEXT_PUBLIC_SUPABASE_URL"),key=get("SUPABASE_SERVICE_ROLE_KEY");
(async()=>{
  const r=await fetch("http://localhost:3199/api/client/reset-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"a@madebydas.com"})});
  console.log("reset-request:",r.status,await r.text());
  const rows=await (await fetch(`${url}/rest/v1/client_password_resets?user_id=eq.ac01d04f-9aeb-4689-ad04-95e09115b246&select=id,token,used_at&order=created_at.desc&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}})).json();
  console.log("token issued:",rows.length===1 && !!rows[0].token);
  if(rows[0]) await fetch(`${url}/rest/v1/client_password_resets?id=eq.${rows[0].id}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}});
  // unknown email returns generic success and issues nothing
  const r2=await fetch("http://localhost:3199/api/client/reset-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"nobody-here@example.com"})});
  console.log("unknown email:",r2.status,await r2.text());
})();
'
```
Expected: `reset-request: 200 {"success":true}`, `token issued: true`, `unknown email: 200 {"success":true}`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/app/api/client/reset-request/route.ts
git commit -m "feat(client-auth): /api/client/reset-request issues own-token reset link"
```

---

### Task 8: Client login — reset-request, Google, exempt /client/activate

**Files:**
- Modify: `apps/web/middleware.ts` (AUTH_PAGES list)
- Modify: `apps/web/app/client/login/page.tsx`

- [ ] **Step 1: Exempt `/client/activate` from the unauthenticated redirect**

In `apps/web/middleware.ts`, `/client/activate` (under `/client`) must be reachable logged-out. Add it alongside the auth pages. Change:
```ts
const AUTH_PAGES = ['/login', '/client/login'];
```
to:
```ts
// Pages that must be reachable WITHOUT a session even though they sit under a
// protected prefix (/client). Listed here so the unauthenticated protected-route
// redirect skips them (see isAuthPage usage below).
const AUTH_PAGES = ['/login', '/client/login', '/client/activate'];
```
(The `isAuthPage` exemption added in commit `ee09b01` already routes this correctly — `/client/activate` will now 200 while logged out. The authenticated-redirect branch only special-cases `/client/login`, so an authenticated visitor to `/client/activate` falls through to `/dashboard`, which is acceptable.)

- [ ] **Step 2: Verify `/client/activate` is reachable logged-out**

With dev server running: `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3199/client/activate?token=x"`
Expected: `200`.

- [ ] **Step 3: Replace forgot-password handler + add Google handler**

In `apps/web/app/client/login/page.tsx`, inside `handleSubmit`, replace the `if (mode === 'forgot') { ... }` branch (the `resetPasswordForEmail` call) with:
```ts
      if (mode === 'forgot') {
        await fetch('/api/client/reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setResetSent(true);
        setError('If an account exists for that email, a password reset link is on its way. Check your inbox (and spam).');
        setIsLoading(false);
        return;
      }
```
Then add a Google handler function above the `return (`:
```ts
  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };
```

- [ ] **Step 4: Add the Google button + success notice to the markup**

Surface the `?notice=password_set` redirect from the activate page. In the existing `useEffect` that reads `searchParams` for `error`, add below it:
```ts
  useEffect(() => {
    if (searchParams.get('notice') === 'password_set') {
      setError('Your password has been set. Please sign in.');
    }
  }, [searchParams]);
```
Add the Google button right after the closing `</form>` (and before the "Forgot your password?" block), shown only in login mode:
```tsx
            {mode === 'login' && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#333333]" />
                  <span className="text-[11px] text-[#666666] tracking-[1px]">OR</span>
                  <div className="flex-1 h-px bg-[#333333]" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white text-black border-none py-3 px-6 font-poppins text-sm font-semibold tracking-[1px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
                  Sign in with Google
                </button>
              </>
            )}
```

- [ ] **Step 5: Verify the login page still renders and has no `resetPasswordForEmail` left**

Run: `grep -n "resetPasswordForEmail" apps/web/app/client/login/page.tsx || echo "removed"` → expected `removed`.
With dev server: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3199/client/login` → expected `200`.

- [ ] **Step 6: Commit**
```bash
git add apps/web/middleware.ts apps/web/app/client/login/page.tsx
git commit -m "feat(client-auth): client login uses own-token reset + adds Google button"
```

---

### Task 9: Route Google clients by onboarding state

**Files:**
- Modify: `apps/web/app/auth/callback/route.ts` (lines ~42-52)

- [ ] **Step 1: Add the onboarding check**

Replace the enrollment block:
```ts
  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('user_id', exchanged.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollment) {
    return NextResponse.redirect(`${origin}/client/dashboard`);
  }
```
with:
```ts
  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id, onboarding_completed')
    .eq('user_id', exchanged.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollment) {
    const dest = enrollment.onboarding_completed ? '/client/dashboard' : '/client/onboarding';
    return NextResponse.redirect(`${origin}${dest}`);
  }
```

- [ ] **Step 2: Type-check**

From `apps/web`: `npx tsc --noEmit 2>&1 | grep "auth/callback" || echo "callback ok"` → expected `callback ok`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "fix(client-auth): Google callback routes clients by onboarding state"
```

---

### Task 10: Full type-check, push, and Loops/dashboard checklist

- [ ] **Step 1: Full project type-check**

From `apps/web`: `npx tsc --noEmit`
Expected: no errors. Fix any before proceeding.

- [ ] **Step 2: Manual smoke (dev server)**

Confirm all four routes respond as expected while logged out:
```bash
for p in "/client/login" "/client/activate?token=x" "/login"; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3199$p";
done
```
Expected: each `200`.

- [ ] **Step 3: Push to main**
```bash
git push origin main
```

- [ ] **Step 4: Post-deploy human checklist (NOT code)**
  - Loops: add `activationUrl` to the `client_invited` template; switch CTA + copy to "Create your password".
  - Loops: create the `client_password_reset` event + email (`firstName`, `resetUrl`, `expiresInMinutes`).
  - Supabase dashboard → Authentication → URL Configuration: confirm the production `…/auth/callback` is in the redirect allow-list (Google). Almost certainly already present (the `/login` page uses it).
  - Run ONE real invite end-to-end to a test address; confirm the email links to `/client/activate` and activation → portal works.
  - Only after that: consider removing the now-dormant `/auth/confirm/route.ts` and the legacy `set-password` page in a follow-up (out of scope here).

---

## Self-Review

- **Spec coverage:** invite→activation (T4–6), reset unification (T1,3,7,8), Google button (T8), callback onboarding refinement (T9), magic-link removal (T4), `/auth/confirm` dormancy (T10 checklist), Loops variable changes (header + T3). All spec sections mapped.
- **Type consistency:** `findAuthUserByEmail` returns `{id,email}` and is consumed as such (T4,5,7). `onClientInvited(email,firstName,programName,activationUrl)` matches caller in T4. `onClientPasswordReset(email,firstName,resetUrl,expiresInMinutes)` matches caller in T7. Activate route accepts `{token,reset,password}`, page sends the same (T5,6). Reset row `.select('token')` matches usage (T7).
- **Placeholders:** none — every step has concrete code/commands and expected output.
- **Known scale caveat (logged, not silent):** `findAuthUserByEmail` reads up to 1000 users per call; documented in T2 with a pagination note.
