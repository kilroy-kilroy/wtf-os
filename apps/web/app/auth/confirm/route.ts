// apps/web/app/auth/confirm/route.ts
// Server-side magic-link / OTP confirmation (Supabase SSR canonical pattern).
//
// Magic links and other email OTPs (invite, recovery, signup) are delivered to
// THIS route carrying a `token_hash`. We exchange it for a session server-side
// via verifyOtp(), which writes the auth cookies through the SSR client. This
// deliberately avoids the legacy implicit flow (tokens in the URL #hash), which
// a server route can never read and which collides with our PKCE browser client.
//
// Because the email link points straight at our own domain (not Supabase's
// /auth/v1/verify), this path does NOT depend on the Supabase redirect-URL
// allow-list — the source of the earlier silent breakage.

import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  // Only honor internal redirect targets; default to client onboarding.
  const safeNext = next && next.startsWith('/') ? next : '/client/onboarding';

  const loginError = (msg: string) =>
    NextResponse.redirect(`${origin}/client/login?error=${encodeURIComponent(msg)}`);

  if (!token_hash || !type) {
    return loginError('That login link is malformed. Please request a new one.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    // Most common cause: the link expired or was already used.
    return loginError('That login link has expired or was already used. Please request a new one.');
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
