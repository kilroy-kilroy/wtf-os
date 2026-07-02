import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/contracts/require-admin'

/**
 * Delete a prospect share-document. Session-gated (admin cookie). The
 * `enrollment_id IS NULL` guard ensures this can only ever remove prospect
 * share-docs, never a real client's document.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await getSupabaseServerClient()
    .from('client_documents')
    .delete()
    .eq('id', id)
    .is('enrollment_id', null)
    .not('share_token', 'is', null)
    .select('id')

  if (error) {
    console.error('[Share Documents UI] Delete error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Not found or not a prospect share-doc' }, { status: 404 })
  }
  return NextResponse.json({ deleted: id })
}
