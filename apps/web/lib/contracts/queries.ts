import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function listContracts() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('contracts')
    .select('id, title, status, created_at, signed_pdf_path')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getContract(id: string) {
  const db = getSupabaseServerClient();
  const { data: contract } = await db.from('contracts').select('*').eq('id', id).single();
  if (!contract) return null;
  const { data: template } = contract.template_id
    ? await db.from('contract_templates').select('name, body_html').eq('id', contract.template_id).single()
    : { data: null };
  const { data: sowTemplate } = contract.sow_template_id
    ? await db.from('contract_templates').select('name, body_html').eq('id', contract.sow_template_id).single()
    : { data: null };
  const { data: signers } = await db
    .from('contract_signers').select('*').eq('contract_id', id).order('sign_order');
  return { contract, template, sowTemplate, signers: signers ?? [] };
}

export async function listActiveTemplates() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('contract_templates')
    .select('id, name, variables, body_html')
    .eq('is_active', true)
    .order('name');
  return data ?? [];
}

export async function listSnippets() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('sow_snippets')
    .select('id, label, category, body_html')
    .eq('is_active', true)
    .order('category');
  return data ?? [];
}
