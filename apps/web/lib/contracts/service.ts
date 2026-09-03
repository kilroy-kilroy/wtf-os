// apps/web/lib/contracts/service.ts
//
// Orchestration: DB + merge engine + PDF + Firma. Server-side only.

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { combineMergedHtml } from './template-engine';
import { renderContractPdf } from './contract-pdf';
import {
  createSigningRequest, sendSigningRequest, getRequest, shouldApplyStatus,
  getSigningUserIds, embeddedSigningUrl,
  type FirmaSigner, type ContractStatus,
} from '@/lib/firma';

const BUCKET = 'contracts';

export interface CreateContractInput {
  templateId: string;
  sowTemplateId?: string | null;
  title: string;
  fieldValues: Record<string, string>;
  sowHtml: string;
  signers: FirmaSigner[];
  createdBy: string | null;
}

/** Persist a draft contract + its signers. */
export async function createContract(input: CreateContractInput): Promise<string> {
  const db = getSupabaseServerClient();
  const row: Record<string, unknown> = {
    template_id: input.templateId,
    title: input.title,
    field_values: input.fieldValues,
    sow_html: input.sowHtml,
    status: 'draft',
    created_by: input.createdBy,
  };
  if (input.sowTemplateId) row.sow_template_id = input.sowTemplateId;
  const { data: contract, error } = await db
    .from('contracts')
    .insert(row)
    .select('id')
    .single();
  if (error || !contract) throw new Error(`createContract failed: ${error?.message}`);

  const rows = input.signers.map((s) => ({
    contract_id: contract.id,
    role: s.role,
    name: s.name,
    email: s.email,
    sign_order: s.order,
  }));
  const { error: sErr } = await db.from('contract_signers').insert(rows);
  if (sErr) throw new Error(`createContract signers failed: ${sErr.message}`);
  return contract.id;
}

/**
 * Render the immutable snapshot, generate the PDF, create + send the Firma
 * envelope, and advance the contract to `sent`.
 *
 * Safe against duplicate envelopes (real money):
 *  - The draft→sending transition is an ATOMIC conditional update, so two
 *    concurrent callers can't both pass the guard and create two envelopes.
 *  - The Firma request id is persisted BEFORE the envelope is sent, so a crash
 *    mid-send leaves a correlatable id. On retry, if firma_request_id already
 *    exists we resume at send instead of creating a second envelope.
 *  - On failure the contract rolls back to `draft` (keeping any firma_request_id)
 *    so it can be retried.
 */
export async function generateAndSend(contractId: string): Promise<void> {
  const db = getSupabaseServerClient();

  // Atomic claim: only the caller that flips draft→sending proceeds.
  const { data: claimed } = await db
    .from('contracts')
    .update({ status: 'sending', last_error: null, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('status', 'draft')
    .select('id, template_id, sow_template_id, title, field_values, sow_html, firma_request_id')
    .maybeSingle();
  if (!claimed) return; // not in draft (already sending/sent) — nothing to do

  try {
    // Resume path: a prior attempt created the envelope but failed during send.
    // Don't create a second one — just (re)send the existing request.
    if (claimed.firma_request_id) {
      await sendSigningRequest(claimed.firma_request_id);
      await db.from('contracts')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', contractId);
      return;
    }

    const { data: template } = await db
      .from('contract_templates').select('body_html').eq('id', claimed.template_id).single();
    if (!template) throw new Error('template not found');

    // Optional attached SOW schedule — appended after a page break into one doc.
    let sowBody: string | null = null;
    if (claimed.sow_template_id) {
      const { data: sowTpl } = await db
        .from('contract_templates').select('body_html').eq('id', claimed.sow_template_id).single();
      if (!sowTpl) throw new Error('attached SOW template not found');
      sowBody = sowTpl.body_html;
    }

    const { data: signers } = await db
      .from('contract_signers').select('*').eq('contract_id', contractId).order('sign_order');
    if (!signers?.length) throw new Error('no signers');

    const mergedHtml = combineMergedHtml(template.body_html, sowBody, claimed.field_values, claimed.sow_html);
    const pdf = await renderContractPdf(mergedHtml);

    const pdfPath = `${contractId}/contract.pdf`;
    const up = await db.storage.from(BUCKET).upload(pdfPath, pdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (up.error) throw new Error(`pdf upload failed: ${up.error.message}`);

    const firmaSigners: FirmaSigner[] = signers.map((s) => ({
      role: s.role as 'client' | 'counter', name: s.name, email: s.email, order: s.sign_order,
    }));

    // Only request per-page initials fields when the template actually carries
    // the {{init_*}} anchors, so signature-only templates aren't given them.
    const useInitials = mergedHtml.includes('{{init_');

    // Create the draft envelope, then persist its id BEFORE sending.
    const { requestId, signerIds } = await createSigningRequest(
      pdf, firmaSigners, claimed.title, { initials: useInitials },
    );
    await db.from('contracts').update({
      merged_html: mergedHtml, pdf_path: pdfPath, firma_request_id: requestId,
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    for (const s of signers) {
      const fid = signerIds[s.role];
      if (fid) await db.from('contract_signers').update({ firma_signer_id: fid }).eq('id', s.id);
    }

    await sendSigningRequest(requestId);
    await db.from('contracts')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', contractId);
  } catch (err) {
    await db.from('contracts').update({
      status: 'draft', last_error: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    throw err;
  }
}

/**
 * Generate the PDF, create a Firma envelope, and return a URL the signer can be
 * shown in an iframe — WITHOUT sending it.
 *
 * This is the Call Vault path. `sendSigningRequest` is deliberately never
 * called: sending would email an envelope and spend a credit, and the entire
 * point of the flow is that the contributor signs inline without waiting.
 *
 * Mirrors generateAndSend's safety properties: an atomic draft->sending claim so
 * concurrent callers can't create two envelopes, and the Firma request id
 * persisted before we return so a crash leaves a correlatable id.
 */
export async function generateForEmbeddedSign(
  contractId: string,
): Promise<{ requestId: string; signingUserId: string; signingUrl: string }> {
  const db = getSupabaseServerClient();

  const { data: claimed } = await db
    .from('contracts')
    .update({ status: 'sending', last_error: null, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('status', 'draft')
    .select('id, template_id, sow_template_id, title, field_values, sow_html, firma_request_id')
    .maybeSingle();
  if (!claimed) throw new Error('contract is not in draft — cannot generate for embedded signing');

  try {
    let requestId = claimed.firma_request_id as string | null;

    if (!requestId) {
      const { data: template } = await db
        .from('contract_templates').select('body_html').eq('id', claimed.template_id).single();
      if (!template) throw new Error('template not found');

      const { data: signers } = await db
        .from('contract_signers').select('*').eq('contract_id', contractId).order('sign_order');
      if (!signers?.length) throw new Error('no signers');

      const mergedHtml = combineMergedHtml(template.body_html, null, claimed.field_values, claimed.sow_html);
      const pdf = await renderContractPdf(mergedHtml);

      const up = await db.storage.from(BUCKET).upload(`${contractId}/contract.pdf`, pdf, {
        contentType: 'application/pdf', upsert: true,
      });
      if (up.error) throw new Error(`pdf upload failed: ${up.error.message}`);

      const firmaSigners: FirmaSigner[] = signers.map((s) => ({
        role: s.role as 'client' | 'counter', name: s.name, email: s.email, order: s.sign_order,
      }));

      const created = await createSigningRequest(
        pdf, firmaSigners, claimed.title,
        { initials: mergedHtml.includes('{{init_') },
      );
      requestId = created.requestId;

      // Persist BEFORE returning — a crash after this point is recoverable.
      await db.from('contracts').update({
        merged_html: mergedHtml,
        pdf_path: `${contractId}/contract.pdf`,
        firma_request_id: requestId,
        status: 'sent',
        updated_at: new Date().toISOString(),
      }).eq('id', contractId);
    }

    const recipients = await getSigningUserIds(requestId!);
    const first = recipients[0];
    if (!first) throw new Error('Firma returned no recipient for the signing request');

    return {
      requestId: requestId!,
      signingUserId: first.id,
      signingUrl: embeddedSigningUrl(first.id),
    };
  } catch (err) {
    await db.from('contracts').update({
      status: 'draft',
      last_error: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    throw err;
  }
}

/**
 * Re-derive the embedded signing URL for an envelope `generateForEmbeddedSign`
 * already created, WITHOUT touching status or creating anything new.
 *
 * Exists so a contributor who reloads the page or double-clicks "sign" gets
 * their EXISTING envelope back instead of `generateForEmbeddedSign` minting a
 * second one — `generateForEmbeddedSign`'s atomic claim requires
 * `status='draft'`, which the first call already advanced past, so re-calling
 * it throws rather than being safe to retry.
 */
export async function getEmbeddedSigningUrl(
  contractId: string,
): Promise<{ requestId: string; signingUserId: string; signingUrl: string }> {
  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('firma_request_id').eq('id', contractId).maybeSingle();
  if (!contract?.firma_request_id) {
    throw new Error('contract has no Firma request — cannot re-derive a signing URL');
  }

  const requestId = contract.firma_request_id as string;
  const recipients = await getSigningUserIds(requestId);
  const first = recipients[0];
  if (!first) throw new Error('Firma returned no recipient for the signing request');

  return {
    requestId,
    signingUserId: first.id,
    signingUrl: embeddedSigningUrl(first.id),
  };
}

/**
 * Get-or-generate: return the signing URL for a contract, generating its
 * envelope if one doesn't exist yet.
 *
 * A contract can be attached to a contributor (e.g. Call Vault's
 * `nda_contract_id`) before it has a Firma envelope, and the FIRST attempt to
 * generate one can fail — PDF render, storage upload, missing
 * template/signers, or a Firma error. `generateForEmbeddedSign`'s catch
 * resets the contract's `status` back to `'draft'` on failure but leaves
 * `firma_request_id` null, so the attach is not undone. That "attached but
 * never generated" state must be RECOVERABLE, not terminal: retrying must
 * retry generation on this same contract row (no second contract, no
 * orphan), while a contract that already has an envelope must only ever be
 * read, never regenerated or re-sent.
 *
 * `generateForEmbeddedSign`'s own atomic `draft -> sending` claim still
 * guards this: two concurrent retries on the same still-ungenerated contract
 * can't both create envelopes, since only one can win that claim.
 */
export async function ensureEmbeddedSigningUrl(
  contractId: string,
): Promise<{ requestId: string; signingUserId: string; signingUrl: string }> {
  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('firma_request_id').eq('id', contractId).maybeSingle();
  if (!contract) throw new Error(`contract ${contractId} not found`);

  if (contract.firma_request_id) {
    // Envelope already exists — pure read, no writes, no billing.
    return getEmbeddedSigningUrl(contractId);
  }
  // No envelope yet (first attempt, or a first attempt that failed before
  // creating one) — (re)generate it on this same contract row.
  return generateForEmbeddedSign(contractId);
}

/** Poll-backup: pull current state from Firma and persist it (incl. signed PDF). */
export async function syncStatus(contractId: string): Promise<ContractStatus> {
  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('firma_request_id, status, signed_pdf_path').eq('id', contractId).single();
  if (!contract?.firma_request_id) throw new Error('contract has no Firma request');

  const current = contract.status as ContractStatus;
  const state = await getRequest(contract.firma_request_id);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // The /download poll can only report coarse states (in_progress -> 'sent'), so
  // never let it regress a richer status a webhook already advanced us to.
  if (shouldApplyStatus(current, state.status)) update.status = state.status;

  // Store the signed PDF once, on first completion.
  if (state.status === 'completed' && state.signedPdf && !contract.signed_pdf_path) {
    const signedPath = `${contractId}/signed.pdf`;
    const up = await db.storage.from(BUCKET).upload(signedPath, state.signedPdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (!up.error) update.signed_pdf_path = signedPath;
  }
  await db.from('contracts').update(update).eq('id', contractId);
  return (update.status as ContractStatus) ?? current;
}
