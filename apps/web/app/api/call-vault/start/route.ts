// apps/web/app/api/call-vault/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { validateAboutYou } from '@/lib/call-vault/validate';
import { startContributor, countRecentByIp, findContributorIdByEmail } from '@/lib/call-vault/db';
import { mintAccessToken } from '@/lib/access-tokens';
import { onCallVaultResumeLink } from '@/lib/loops';

// Public unauthenticated endpoint. Generous enough that a household or office
// behind one NAT is never blocked, tight enough that a script cannot seed
// hundreds of rows and burn signed upload URLs.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_IP = 5;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = validateAboutYou(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // `x-forwarded-for`'s first hop can be spoofed by the caller (it's just a
  // request header); Vercel's own `x-vercel-forwarded-for` is set by the edge
  // network and can't be. Prefer it, and fall back for local/non-Vercel runs.
  const ip =
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null;
  if (!ip) {
    console.warn('[call-vault] start: no client IP resolved, rate limit skipped');
  }

  try {
    if (ip) {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      if ((await countRecentByIp(ip, since)) >= RATE_MAX_PER_IP) {
        return NextResponse.json(
          { error: 'Too many submissions from this network. Try again later.' },
          { status: 429 },
        );
      }
    }

    // Email is never verified, so a session can never be minted inline for an
    // email that already has a contributor row — otherwise anyone who knows a
    // victim's email could POST it here and receive a live session bound to
    // the victim's existing row. Known emails are routed to a single-use
    // resume link sent to that address instead, which only its owner can act
    // on. Within THIS branch the response is deliberately uniform — always
    // `{ resumeEmailed: true }` at 200, never surfacing whether the mint or
    // the outbound email actually succeeded — so a caller probing this branch
    // can't distinguish "known email, link sent" from "known email, send
    // failed". (A caller can still tell a known email from a brand-new one by
    // the differing response shape below; that distinction is inherent to a
    // new contributor needing real credentials back to proceed, and is a
    // known residual side-channel — flagged to the coordinator rather than
    // silently accepted.)
    const existingId = await findContributorIdByEmail(parsed.value.email);
    if (existingId) {
      const token = await mintAccessToken(existingId, { table: 'call_vault_contributors' });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
      const resumeUrl = `${appUrl}/call-vault?token=${token}`;
      const firstName = parsed.value.name.trim().split(/\s+/)[0] || '';

      waitUntil(
        onCallVaultResumeLink({ email: parsed.value.email, firstName, resumeUrl }).catch((err) =>
          console.error('[call-vault] resume link email failed:', err),
        ),
      );

      return NextResponse.json({ resumeEmailed: true });
    }

    const { contributorId, sessionToken } = await startContributor({ ...parsed.value, ip });
    return NextResponse.json({ contributorId, sessionToken });
  } catch (err) {
    console.error('[call-vault] start failed:', err);
    return NextResponse.json({ error: 'Could not start your submission' }, { status: 500 });
  }
}
