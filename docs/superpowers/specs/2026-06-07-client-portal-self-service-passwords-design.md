# Client Portal — Self-Service Passwords + Google (design)

**Date:** 2026-06-07
**Status:** Draft for review
**Author:** Tim Kilroy + Claude

## Problem

Client portal first-entry and password-reset depend on emailed Supabase
`verifyOtp` magic links hitting `/auth/confirm`. These links are flaky
(PKCE/implicit-hash collisions, redirect allow-list regressions — see commits
`4e27eca`, `cef1319`, and the `client_login_breakage` history). Clients get
stuck before they ever reach a password.

Password login itself already works (`/client/login` does `signInWithPassword`).
The gap is purely: **how does a new client set their first password, and reset
a forgotten one, without depending on a flaky email link?**

> Out of scope / already done: a middleware redirect loop on `/client/login`
> (it matched the `/client` protected prefix and redirected to itself) was the
> acute blocker and is already fixed and shipped (commit `ee09b01`). This spec
> is the durable onboarding/reset cleanup, not the emergency.

## Goals

1. New clients **create their own password** via a link we fully control — no
   Supabase magic link, no pre-existing session required.
2. **Forgot-password** uses the same self-controlled token mechanism, not
   Supabase's emailed reset link.
3. Add **"Sign in with Google"** to `/client/login`, reusing the existing,
   working OAuth path.
4. Retire magic-link generation from the client flow.

## Non-goals

- No change to the admin/legacy `/login` page or `/auth/callback`'s existing
  behavior beyond one small routing refinement (below).
- No new auth provider beyond Google (already configured in Supabase).
- No schema change to `client_invites` (we reuse its existing `invite_token`).

## Key existing building blocks (reuse, don't rebuild)

- `client_invites.invite_token` — already a unique 32-byte hex token with
  `expires_at` (30 days) and an index. **Already minted on every invite, just
  unused.** This becomes the activation token.
- `apps/web/app/client/set-password/page.tsx` — existing password-set UI;
  repurposed for activation (it currently assumes a live session, which we
  remove).
- `supabase.auth.admin.updateUserById()` via the service-role server client
  (`lib/supabase-server.ts`) — sets a password with no user session.
- `apps/web/app/auth/callback/route.ts` — existing OAuth/PKCE code-exchange that
  **already routes active-enrollment users to `/client/dashboard`**.
- `signInWithOAuth({ provider: 'google' })` — already used on `/login` and
  `/growthos`.

## Design

### 1. Invite flow → our own activation link
File: `apps/web/app/api/client/invite/route.ts`

- **Remove** the `admin.generateLink({ type: 'magiclink' })` call and the
  `/auth/confirm?token_hash=...` URL construction.
- Build the email link as `${APP_URL}/client/activate?token=${invite.invite_token}`
  (the token the row already has).
- Keep creating the passwordless auth user + enrollment exactly as today
  (still needed; user must exist before a password is set on it). Resolve
  `userId` from `createUser` or, for re-invites, a service-role email lookup
  (e.g. `admin.listUsers` filtered by email, or a direct `auth.users` query) —
  replacing the old `generateLink`-as-id-source trick.
- **Move** the `status: 'accepted'` marking OUT of this route. The invite stays
  `pending` until the client actually activates, so the token remains valid.
- `onClientInvited(...)` is called with the activation link in place of the
  magic link (same Loops event, new URL).

### 2. Activation page
File: `apps/web/app/client/activate/page.tsx` (new; lift UI from `set-password`)

- Reads `?token=` (invite) or `?reset=` (reset) from the URL.
- Renders the password + confirm form (min 8 chars, matching — same rules as
  today).
- On submit, `POST`s `{ token | reset, password }` to `/api/client/activate`.
- On success, calls `signInWithPassword(email, password)` client-side to
  establish the session (the route returns the email), then routes by
  enrollment: incomplete onboarding → `/client/onboarding`, else
  `/client/dashboard` (mirrors the existing `/client/login` logic).
- Friendly error states for invalid / expired / already-used tokens, each with
  a link to "Forgot password" so a dead link is never a dead end.

### 3. Activation API
File: `apps/web/app/api/client/activate/route.ts` (new)

- Server-only, uses the service-role client.
- **Invite token path:** look up `client_invites` by `invite_token`, require
  `status = 'pending'` and `expires_at > now()`. Resolve the auth user by the
  invite's email. `admin.updateUserById(userId, { password, email_confirm: true })`.
  Mark invite `accepted` + `accepted_at`.
- **Reset token path:** look up `client_password_resets` by token, require
  unused + unexpired. `admin.updateUserById`. Mark `used_at`.
- Return `{ email }` on success (for the client-side sign-in). Generic error
  messages; never reveal whether an email exists.
- Tokens are single-use (status / `used_at` flip) and time-boxed.

### 4. Forgot-password → our own reset token
Files: `apps/web/app/client/login/page.tsx` (forgot mode),
`apps/web/app/api/client/reset-request/route.ts` (new), new table.

- New table `client_password_resets`:
  `id, user_id (fk auth.users), token (unique, default 32-byte hex),
  expires_at (default now()+1 hour), used_at, created_at`. RLS enabled, no
  anon/authenticated policies (service-role only).
- `/client/login` forgot mode `POST`s `{ email }` to `/api/client/reset-request`
  instead of calling `supabase.auth.resetPasswordForEmail`.
- The route: if an active-enrollment user exists for that email, insert a reset
  row and email `${APP_URL}/client/activate?reset=${token}` via Loops.
  **Always** return generic success (no email enumeration).

### 5. Google on the client portal
File: `apps/web/app/client/login/page.tsx`

- Add a "Sign in with Google" button calling
  `signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })`.
- No backend work: `/auth/callback` already exchanges the code and routes
  active-enrollment users to `/client/dashboard`.
- **One refinement** in `/auth/callback`: before redirecting an enrolled user to
  `/client/dashboard`, check `client_enrollments.onboarding_completed` and send
  incomplete ones to `/client/onboarding`, matching the password path. (Small,
  isolated change.)

### 6. Cleanup
- `admin.generateLink` / magic-link construction removed from the invite route.
- `/auth/confirm` is left in place but dormant (harmless; can be removed in a
  later pass once we confirm nothing else links to it).

## Data flow summary

```
NEW CLIENT
  admin invite → invite row (pending, token) + passwordless auth user + enrollment
  email: /client/activate?token=…
  client sets password → POST /api/client/activate (invite)
    → admin.updateUserById(password) → invite=accepted
  → signInWithPassword → /client/onboarding | /client/dashboard

FORGOT PASSWORD
  /client/login (forgot) → POST /api/client/reset-request {email}
    → reset row (token, 1h) → email /client/activate?reset=…
  client sets password → POST /api/client/activate (reset)
    → admin.updateUserById(password) → reset used
  → signInWithPassword → portal

GOOGLE
  /client/login → signInWithOAuth(google) → /auth/callback
    → exchangeCodeForSession → enrollment? → /client/onboarding | /client/dashboard
```

## Security notes

- All password writes happen server-side with the service-role key; tokens are
  never exposed to client JS beyond the URL they arrive on.
- Tokens: high entropy (32-byte hex), single-use, expiring (invite 30d, reset 1h).
- Reset-request and activate return generic responses to prevent email
  enumeration.
- Do not log token values.
- `client_password_resets` has RLS enabled with no anon/authenticated policies.

## Testing / verification

- Invite → activate → land in onboarding (happy path).
- Re-invite of an existing user → activation sets password on existing account.
- Expired / already-used / malformed token → friendly error + reset link.
- Forgot-password for a real vs unknown email → identical generic response;
  real one receives an email and can reset.
- Google button → enrolled client lands in the portal (onboarding vs dashboard).
- Regression: `/client/login` still 200s (no loop), protected routes still
  redirect once.

## Rollout

1. Ship password self-service + reset + Google button together (all in-repo).
2. Confirm Google provider redirect URLs in the Supabase dashboard include the
   production `/auth/callback` (verification step, likely already set since
   `/login` uses it).
3. Monitor the first real new-client invite end-to-end before retiring
   `/auth/confirm`.

## Open questions

- None blocking. Loops template/event for the reset email: reuse a transactional
  send or add a dedicated `onClientPasswordReset` — decided at implementation.
