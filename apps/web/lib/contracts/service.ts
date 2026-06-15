// apps/web/lib/contracts/service.ts
//
// Orchestration: DB + merge engine + PDF + Firma. Server-side only.

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { merge } from './template-engine';
import { renderContractPdf } from './contract-pdf';
import {
  createSigningRequest, getRequest, type FirmaSigner, type ContractStatus,
} from '@/lib/firma';

const BUCKET = 'contracts';

export interface CreateContractInput {
  templateId: string;
  title: string;
  fieldValues: Record<string, string>;
  sowHtml: string;
  signers: FirmaSigner[];
  createdBy: string;
}

/** Persist a draft contract + its signers. */
export async function createContract(input: CreateContractInput): Promise<string> {
  const db = getSupabaseServerClient();
  const { data: contract, error } = await db
    .from('contracts')
    .insert({
      template_id: input.templateId,
      title: input.title,
      field_values: input.fieldValues,
      sow_html: input.sowHtml,
      status: 'draft',
      created_by: input.createdBy,
    })
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
 * Render the immutable snapshot, generate the PDF, create the Firma request,
 * and advance the contract to `sent`. Idempotent: only advances on success;
 * failures leave the contract `draft` with last_error set and send nothing.
 */
export async function generateAndSend(contractId: string): Promise<void> {
  const db = getSupabaseServerClient();

  const { data: contract } = await db
    .from('contracts').select('*').eq('id', contractId).single();
  if (!contract) throw new Error('contract not found');
  if (contract.status !== 'draft') return; // already sent — no duplicate envelope

  const { data: template } = await db
    .from('contract_templates').select('body_html').eq('id', contract.template_id).single();
  if (!template) throw new Error('template not found');

  const { data: signers } = await db
    .from('contract_signers').select('*').eq('contract_id', contractId).order('sign_order');
  if (!signers?.length) throw new Error('no signers');

  try {
    const mergedHtml = merge(template.body_html, contract.field_values, contract.sow_html);
    const pdf = await renderContractPdf(mergedHtml);

    const pdfPath = `${contractId}/contract.pdf`;
    const up = await db.storage.from(BUCKET).upload(pdfPath, pdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (up.error) throw new Error(`pdf upload failed: ${up.error.message}`);

    const firmaSigners: FirmaSigner[] = signers.map((s) => ({
      role: s.role as 'client' | 'counter', name: s.name, email: s.email, order: s.sign_order,
    }));
    const { requestId, signerIds } = await createSigningRequest(pdf, firmaSigners, contract.title);

    await db.from('contracts').update({
      merged_html: mergedHtml, pdf_path: pdfPath, firma_request_id: requestId,
      status: 'sent', last_error: null, updated_at: new Date().toISOString(),
    }).eq('id', contractId);

    for (const s of signers) {
      const fid = signerIds[s.role];
      if (fid) await db.from('contract_signers').update({ firma_signer_id: fid }).eq('id', s.id);
    }
  } catch (err) {
    await db.from('contracts').update({
      last_error: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', contractId);
    throw err;
  }
}

/** Poll-backup: pull current state from Firma and persist it (incl. signed PDF). */
export async function syncStatus(contractId: string): Promise<ContractStatus> {
  const db = getSupabaseServerClient();
  const { data: contract } = await db
    .from('contracts').select('firma_request_id, status').eq('id', contractId).single();
  if (!contract?.firma_request_id) throw new Error('contract has no Firma request');

  const state = await getRequest(contract.firma_request_id);
  const update: Record<string, unknown> = { status: state.status, updated_at: new Date().toISOString() };

  if (state.status === 'completed' && state.signedPdf) {
    const signedPath = `${contractId}/signed.pdf`;
    const up = await db.storage.from(BUCKET).upload(signedPath, state.signedPdf, {
      contentType: 'application/pdf', upsert: true,
    });
    if (!up.error) update.signed_pdf_path = signedPath;
  }
  await db.from('contracts').update(update).eq('id', contractId);
  return state.status;
}
