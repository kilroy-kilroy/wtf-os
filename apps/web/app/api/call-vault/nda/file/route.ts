// apps/web/app/api/call-vault/nda/file/route.ts
//
// Lets a contributor download THEIR OWN executed NDA.
//
// Deliberately a POST returning a short-lived signed URL rather than a GET that
// redirects: a download is an <a href> navigation, which cannot carry the
// `x-call-vault-session` header, and passing the session token in the query
// string would park a bearer credential in browser history and referrers. The
// client posts with the header, gets a 120s single-file URL, and opens that.
//
// The contract id is NEVER taken from the client — it is read from the
// contributor's own row, so one contributor can never fetch another's NDA.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { contributorFromRequest } from '@/lib/call-vault/session';

const CONTRACTS_BUCKET = 'contracts';
const TTL_SECONDS = 120;

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  if (!contributor.nda_contract_id || !contributor.nda_signed_at) {
    // Nothing signed yet — not an error worth alarming anyone about.
    return NextResponse.json({ error: 'No signed NDA yet' }, { status: 404 });
  }

  try {
    const db = getSupabaseServerClient();
    const { data: contract } = await db
      .from('contracts')
      .select('signed_pdf_path')
      .eq('id', contributor.nda_contract_id)
      .maybeSingle();

    // syncStatus stores the executed PDF on completion. If the webhook has not
    // landed yet the path can still be null — that is a "come back shortly",
    // not a failure.
    if (!contract?.signed_pdf_path) {
      return NextResponse.json(
        { error: 'Your signed copy is still being prepared. Try again in a moment.' },
        { status: 409 },
      );
    }

    const { data: signed, error } = await db.storage
      .from(CONTRACTS_BUCKET)
      .createSignedUrl(contract.signed_pdf_path, TTL_SECONDS);
    if (error || !signed) throw new Error(error?.message ?? 'could not sign url');

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    console.error('[call-vault] NDA download failed:', err);
    return NextResponse.json({ error: 'Could not fetch your signed NDA' }, { status: 500 });
  }
}
