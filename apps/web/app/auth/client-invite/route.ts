// apps/web/app/auth/client-invite/route.ts
// On-click sign-in for client onboarding invites.
//
// WHY THIS EXISTS:
// The invite email used to embed a raw Supabase magic-link OTP
// (`/auth/confirm?token_hash=...`). Supabase OTPs expire after ~1 hour and are
// single-use, so by the time a client actually clicked — often days later, or
// after an email-security scanner pre-fetched and consumed the link — auth
// failed with `otp_expired` ("email link has expired" in the auth logs).
//
// Instead we email the long-lived, app-controlled `client_invites.invite_token`
// (30-day `expires_at`, unique-indexed) to THIS route. On click we validate the
// token against our own table, then mint a FRESH Supabase OTP server-side and
// verify it within milliseconds — so Supabase's 1h OTP window is never a factor.
// A Route Handler (not a Server Component) is required so verifyOtp's auth
// cookies actually reach the browser. Mirrors apps/web/app/api/biz-dev/auth.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { generateOtpForUser } from '@/lib/passwordless-auth';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const nextParam = searchParams.get('next');

  // Only honor internal redirect targets; default to client onboarding.
  const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : '/client/onboarding';

  const loginError = (msg: string) =>
    NextResponse.redirect(`${origin}/client/login?error=${encodeURIComponent(msg)}`);

  if (!token) {
    return loginError('That invite link is malformed. Please contact your program administrator.');
  }

  // Validate the app-controlled invite token (service role — bypasses RLS).
  const admin = getSupabaseServerClient();
  const { data: invite } = await admin
    .from('client_invites')
    .select('id, email, expires_at, accepted_at')
    .eq('invite_token', token)
    .maybeSingle();

  if (!invite) {
    return loginError('That invite link is invalid. Please contact your program administrator.');
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return loginError('That invite link has expired. Please contact your program administrator for a new one.');
  }

  // Mint a fresh Supabase OTP and consume it immediately to establish the
  // session. The generated OTP lives for milliseconds, so its 1h expiry is moot.
  const auth = await createAuthClient();
  try {
    const { token_hash } = await generateOtpForUser(invite.email);
    const { error: verifyError } = await auth.auth.verifyOtp({ token_hash, type: 'magiclink' });
    if (verifyError) {
      console.error('[client-invite] verifyOtp failed:', verifyError);
      return loginError('We could not sign you in. Please request a new link from your program administrator.');
    }
  } catch (err) {
    console.error('[client-invite] OTP exchange failed:', err);
    return loginError('We could not sign you in. Please request a new link from your program administrator.');
  }

  // Record first acceptance. The token stays valid until expires_at so that an
  // email-security scanner pre-fetching the link can't lock the human out.
  if (!invite.accepted_at) {
    await admin
      .from('client_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
