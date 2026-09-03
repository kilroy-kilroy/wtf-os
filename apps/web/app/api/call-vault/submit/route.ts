// apps/web/app/api/call-vault/submit/route.ts
//
// Finalises a Call Vault submission. The fan-out below must fire at most
// once per contributor — a double-click must never send two thank-you
// emails, create two Copper leads, or post two Slack alerts for a
// contributor doing us a favour. Two layers enforce that:
//   1. A fast-path guard on the session's already-resolved `status` (read
//      before this request writes anything), which skips the common case
//      cheaply.
//   2. markSubmitted itself is a compare-and-swap on `status='draft'` in the
//      DB, which is what actually closes the race between two
//      near-simultaneous requests that both pass guard 1 before either
//      write lands — its `null` return means the CAS lost.
import { NextRequest, NextResponse } from 'next/server';
import { markSubmitted, countCalls } from '@/lib/call-vault/db';
import { captureCallVaultLead } from '@/lib/call-vault/lead';
import { contributorFromRequest } from '@/lib/call-vault/session';
import { mintAccessToken } from '@/lib/access-tokens';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  // Double-submit guard (see file header): already submitted -> nothing left
  // to do, and in particular no re-fired fan-out.
  if (contributor.status === 'submitted') {
    return NextResponse.json({ ok: true });
  }

  if ((await countCalls(contributor.id)) === 0) {
    return NextResponse.json({ error: 'Add at least one call before submitting' }, { status: 400 });
  }

  try {
    // Persist the submission FIRST — captureCallVaultLead does no persistence
    // of its own, so the record must be durable before we fan out about it.
    // markSubmitted is itself a compare-and-swap on status='draft': the fast
    // path above only catches the common case (this request's own session
    // read already showed 'submitted'), but two near-simultaneous requests
    // can both pass that check before either write lands. A `null` return
    // here means the CAS lost — someone else's request already flipped the
    // row — so treat it exactly like the fast path: acknowledge, don't fan out.
    const summary = await markSubmitted(contributor.id);
    if (!summary) return NextResponse.json({ ok: true });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const token = await mintAccessToken(contributor.id, { table: 'call_vault_contributors' });
    const resumeUrl = `${appUrl}/call-vault?token=${token}`;

    await captureCallVaultLead({
      contributorId: contributor.id,
      email: summary.email,
      name: summary.name,
      agencyName: summary.agencyName,
      callCount: summary.callCount,
      ndaSigned: summary.ndaSigned,
      resumeUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[call-vault] submit failed:', err);
    return NextResponse.json({ error: 'Could not complete your submission' }, { status: 500 });
  }
}
