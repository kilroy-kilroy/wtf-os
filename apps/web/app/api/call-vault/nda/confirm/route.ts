// apps/web/app/api/call-vault/nda/confirm/route.ts
//
// The iframe's postMessage is a UI signal, not proof. Re-verify against Firma
// before stamping nda_signed_at — a page can post any message it likes.
import { NextRequest, NextResponse } from 'next/server';
import { syncStatus } from '@/lib/contracts/service';
import { markNdaSigned } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  if (!contributor.nda_contract_id) {
    return NextResponse.json({ error: 'No NDA in progress' }, { status: 400 });
  }

  try {
    // syncStatus polls Firma, stores the signed PDF into the contracts bucket
    // (which the admin page links to), and never regresses a richer status a
    // webhook already applied. Note getRequest maps through mapDownloadStatus,
    // which can only ever yield completed/sent/declined/voided — there is no
    // 'signed' value to test for here, so only 'completed' counts as signed.
    const status = await syncStatus(contributor.nda_contract_id);
    const signed = status === 'completed';
    if (signed) await markNdaSigned(contributor.id);
    return NextResponse.json({ signed });
  } catch (err) {
    // The webhook is the durable backstop — never block the contributor on this.
    console.error('[call-vault] NDA confirm failed:', err);
    return NextResponse.json({ signed: false });
  }
}
