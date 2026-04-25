// apps/web/app/auth/callback/route.ts
// Server-side OAuth/PKCE callback. PKCE stores the code_verifier in an HttpOnly
// cookie that browser JS cannot read, so the code-for-session exchange MUST
// happen here on the server using @supabase/ssr's createServerClient.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Surface OAuth-provider errors directly to login.
  if (errorParam) {
    const msg = errorDescription || errorParam;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchanged?.user) {
    const msg = exchangeError?.message || 'exchange_failed';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  // If the caller specified a `next` destination (must be an internal path), honor it.
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Active client enrollments take precedence — send them to the client portal,
  // not the legacy product-discovery onboarding.
  const admin = getSupabaseServerClient();
  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('user_id', exchanged.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollment) {
    return NextResponse.redirect(`${origin}/client/dashboard`);
  }

  // No enrollment: fall back to onboarding-vs-labs based on profile state.
  const { data: userData } = await admin
    .from('users')
    .select('onboarding_completed')
    .eq('id', exchanged.user.id)
    .single();

  if (!userData || !userData.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding/profile`);
  }
  return NextResponse.redirect(`${origin}/labs`);
}
