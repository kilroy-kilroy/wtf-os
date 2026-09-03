// apps/web/app/api/call-vault/calls/[callId]/route.ts
//
// Edit the dimensions of a call that already exists. Sibling of ../route.ts
// (POST /api/call-vault/calls), and gated identically: anonymous session
// header -> contributor, then an explicit ownership check on the call itself.
//
// This route is what makes the intake form's metadata editable. The call row
// is created on the contributor's FIRST FILE, which is necessarily before
// they have finished choosing stage/outcome/deal size/date — and those four
// dimensions are unrecoverable from a transcript afterwards, so "whatever was
// filled in at creation time" is not good enough. Without this route the
// selects had to be frozen the moment the row existed, which is precisely
// what shipped the corpus with NULL dimensions.
import { NextRequest, NextResponse } from 'next/server';
import { validateCallMeta } from '@/lib/call-vault/validate';
import { callBelongsTo, updateCall } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> },
) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const { callId } = await params;
  if (!callId) return NextResponse.json({ error: 'callId is required' }, { status: 400 });

  // Ownership before anything else touches the row — same posture as the
  // files route, which checks callBelongsTo before it looks at the payload.
  // 403 rather than 404 matches that route's wording too.
  if (!(await callBelongsTo(callId, contributor.id))) {
    return NextResponse.json({ error: 'Unknown call' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = validateCallMeta(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await updateCall(callId, parsed.value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Generic copy out, detail to the log — this endpoint is reachable by any
    // anonymous contributor, exactly like its siblings.
    console.error('[call-vault] updateCall failed:', err);
    return NextResponse.json({ error: 'Could not save those details' }, { status: 500 });
  }
}
