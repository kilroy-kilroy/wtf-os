import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { consumeAccessToken, generateOtpForUser } from '@/lib/biz-dev-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Magic-link entry point for biz-dev reports.
 *
 * The email link points here (not at the report page directly) because
 * Server Components cannot reliably set cookies — `cookies().set()` throws
 * during render and Supabase's SSR helper silently swallows the throw, so
 * `verifyOtp`-issued auth cookies never reach the browser. A Route Handler
 * is the correct place to mint the session, then 302 to the clean report URL.
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const accessToken = request.nextUrl.searchParams.get('access_token');
  const reportUrl = new URL(`/wtf-biz-dev-assessment/report/${id}`, request.url);
  const requestLinkUrl = new URL(
    `/wtf-biz-dev-assessment/report/${id}/request-link`,
    request.url,
  );

  if (!accessToken) {
    return NextResponse.redirect(requestLinkUrl);
  }

  const consumed = await consumeAccessToken(id, accessToken);
  if (!consumed) {
    return NextResponse.redirect(requestLinkUrl);
  }

  const auth = await createAuthClient();
  const { data: { user: existing } } = await auth.auth.getUser();
  if (existing && existing.id === consumed.userId) {
    return NextResponse.redirect(reportUrl);
  }

  try {
    const { token_hash } = await generateOtpForUser(consumed.email);
    const { data: verified, error: verifyError } = await auth.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    });
    if (verifyError || !verified.user) {
      console.error('[biz-dev:auth] verifyOtp failed:', verifyError);
      return NextResponse.redirect(requestLinkUrl);
    }
  } catch (err) {
    console.error('[biz-dev:auth] token exchange failed:', err);
    return NextResponse.redirect(requestLinkUrl);
  }

  return NextResponse.redirect(reportUrl);
}
