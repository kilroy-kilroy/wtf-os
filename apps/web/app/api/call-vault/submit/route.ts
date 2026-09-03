// apps/web/app/api/call-vault/submit/route.ts
//
// Finalises a Call Vault submission. markSubmitted is idempotent at the DB
// layer (it just re-writes status/submitted_at), but the fan-out below is
// NOT — a double-click must never send two thank-you emails, create two
// Copper leads, or post two Slack alerts for a contributor doing us a favour.
// The guard checks the contributor's CURRENT status (from the session, read
// before any write this request makes) and short-circuits before touching
// markSubmitted or captureCallVaultLead at all when they already submitted.
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
    const summary = await markSubmitted(contributor.id);

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
