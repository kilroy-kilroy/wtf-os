import { getSupabaseServerClient } from '@/lib/supabase-server'

export type ShareDocRow = {
  id: string; title: string; document_type: string; content_body: string | null;
  requires_approval: boolean; viewed_at: string | null; approved_at: string | null;
  approved_name: string | null; prospect_name: string | null
}

export async function authorizeShareDocument(
  token: string,
): Promise<{ ok: true; doc: ShareDocRow } | { ok: false; status: number }> {
  if (!token) return { ok: false, status: 404 }
  const admin = getSupabaseServerClient()
  const { data: doc } = await admin
    .from('client_documents')
    .select('id, title, document_type, content_body, requires_approval, viewed_at, approved_at, approved_name, prospect_name')
    .eq('share_token', token)
    .single()
  if (!doc) return { ok: false, status: 404 }
  return { ok: true, doc: doc as ShareDocRow }
}
