// apps/web/app/api/call-vault/calls/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateCallMeta, MAX_CALLS_PER_CONTRIBUTOR } from '@/lib/call-vault/validate';
import { createCall, countCalls } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = validateCallMeta(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if ((await countCalls(contributor.id)) >= MAX_CALLS_PER_CONTRIBUTOR) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_CALLS_PER_CONTRIBUTOR} calls. Reply to the email to send more.` },
      { status: 400 },
    );
  }

  try {
    const callId = await createCall(contributor.id, parsed.value);
    return NextResponse.json({ callId });
  } catch (err) {
    console.error('[call-vault] createCall failed:', err);
    return NextResponse.json({ error: 'Could not add that call' }, { status: 500 });
  }
}
