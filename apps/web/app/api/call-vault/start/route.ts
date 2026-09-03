// apps/web/app/api/call-vault/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAboutYou } from '@/lib/call-vault/validate';
import { startContributor, countRecentByIp } from '@/lib/call-vault/db';

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

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null;

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

    const { contributorId, sessionToken } = await startContributor({ ...parsed.value, ip });
    return NextResponse.json({ contributorId, sessionToken });
  } catch (err) {
    console.error('[call-vault] start failed:', err);
    return NextResponse.json({ error: 'Could not start your submission' }, { status: 500 });
  }
}
