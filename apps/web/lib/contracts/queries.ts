import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function listContracts() {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('contracts')
    .select('id, title, status, created_at, signed_pdf_path')
    .order('created_at', { ascending: false });
  return data ?? [];
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
