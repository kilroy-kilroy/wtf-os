import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyWebhook, mapFirmaStatus, shouldApplyStatus, type ContractStatus } from '@/lib/firma';
import { syncStatus } from '@/lib/contracts/service';

// Confirmed in docs/firma-api-notes.md: header X-Firma-Signature, Stripe-style
// signing (t=<unix>,v1=<hex> over `${t}.${rawBody}`). Next lowercases header names.
const SIG_HEADER = 'x-firma-signature';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get(SIG_HEADER) || '';
  const secret = process.env.FIRMA_WEBHOOK_SECRET;
  if (!secret || !verifyWebhook(raw, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(raw);
  const status = mapFirmaStatus(body.type); // envelope uses `type`
  if (!status) return NextResponse.json({ ok: true }); // untracked event

  // The signing-request id lives in `data`; exact location is UNCONFIRMED in the
  // docs, so probe the likely shapes defensively.
  const requestId = body.data?.id ?? body.data?.signing_request?.id ?? body.data?.signing_request_id;
  if (!requestId) return NextResponse.json({ ok: true }); // can't correlate — ignore

  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('id, status').eq('firma_request_id', requestId).single();
  if (!contract) return NextResponse.json({ ok: true }); // unknown request — ignore

  if (status === 'completed') {
    await syncStatus(contract.id); // pulls signed PDF + audit trail
  } else if (shouldApplyStatus(contract.status as ContractStatus, status)) {
    // Webhooks can arrive out of order / be retried — never regress a richer state.
    await db.from('contracts').update({ status, updated_at: new Date().toISOString() }).eq('id', contract.id);
  }
  return NextResponse.json({ ok: true });
}
