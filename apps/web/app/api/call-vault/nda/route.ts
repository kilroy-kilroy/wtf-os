// apps/web/app/api/call-vault/nda/route.ts
//
// Generates a Firma envelope for the Call Vault NDA and returns a signing URL
// for an inline iframe. Deliberately never calls sendSigningRequest — see
// generateForEmbeddedSign in lib/contracts/service.ts. Sending would email the
// envelope and spend a paid Firma credit; the whole point of this flow is that
// the contributor signs without leaving the page.
//
// Idempotent by contributor state: already signed -> no envelope is reopened;
// an envelope already in flight -> its existing signing URL is re-derived via
// getEmbeddedSigningUrl rather than minting a second (paid) envelope; only a
// contributor with neither reaches the create path below.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { createContract, generateForEmbeddedSign, getEmbeddedSigningUrl } from '@/lib/contracts/service';
import { CALL_VAULT_NDA_SLUG, CALL_VAULT_NDA_NAME } from '@/lib/call-vault/nda-template';
import { attachNda, saveNdaParty } from '@/lib/call-vault/db';
import { contributorFromRequest } from '@/lib/call-vault/session';

export const maxDuration = 60; // PDF render + Firma round trip

export async function POST(request: NextRequest) {
  const contributor = await contributorFromRequest(request);
  if (!contributor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  // Idempotency, ahead of everything else: a signed NDA must never be
  // reopened, and a reload/double-click on an in-progress NDA must never
  // mint a second paid Firma envelope — hand back the existing one instead.
  if (contributor.nda_signed_at) {
    return NextResponse.json({ alreadySigned: true });
  }
  if (contributor.nda_contract_id) {
    try {
      const { signingUrl } = await getEmbeddedSigningUrl(contributor.nda_contract_id);
      return NextResponse.json({ contractId: contributor.nda_contract_id, signingUrl });
    } catch (err) {
      console.error('[call-vault] NDA re-fetch failed:', err);
      return NextResponse.json(
        { error: 'Could not prepare the NDA. You can skip it and still contribute.' },
        { status: 500 },
      );
    }
  }

  const { legalName, address } = (await request.json().catch(() => ({}))) as {
    legalName?: string; address?: string;
  };
  const legal = (legalName || '').trim();
  const addr = (address || '').trim();
  if (!legal || !addr) {
    return NextResponse.json(
      { error: 'Legal entity name and business address are required for the NDA' },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseServerClient();
    const { data: template } = await db
      .from('contract_templates').select('id').eq('slug', CALL_VAULT_NDA_SLUG).single();
    if (!template) {
      return NextResponse.json(
        { error: 'NDA template not seeded — run scripts/seed-call-vault-nda.ts' }, { status: 500 },
      );
    }

    await saveNdaParty(contributor.id, legal, addr);

    const effectiveDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const contractId = await createContract({
      templateId: template.id,
      title: `${CALL_VAULT_NDA_NAME} — ${legal}`,
      fieldValues: {
        client_legal_name: legal,
        client_address: addr,
        effective_date: effectiveDate,
      },
      sowHtml: '',
      // One signer: KLRY is pre-executed in the template, so there is no counter role.
      signers: [{ role: 'client', name: contributor.name, email: contributor.email, order: 1 }],
      createdBy: null, // public flow — no admin user; contracts.created_by is nullable
    });

    await attachNda(contributor.id, contractId);

    const { signingUrl } = await generateForEmbeddedSign(contractId);
    return NextResponse.json({ contractId, signingUrl });
  } catch (err) {
    // The NDA is optional — a Firma or PDF-rendering outage must never block
    // a contributor from continuing without it.
    console.error('[call-vault] NDA generation failed:', err);
    return NextResponse.json(
      { error: 'Could not prepare the NDA. You can skip it and still contribute.' },
      { status: 500 },
    );
  }
}
