import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeClientDocument } from '@/lib/client-documents/authorize'
import { isFirstView } from '@/lib/client-documents/approval'
import { alertDocumentViewed } from '@/lib/slack'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authz = await authorizeClientDocument(id)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const firstView = isFirstView(authz.doc)
  if (firstView) {
    const admin = getSupabaseServerClient()
    await admin.from('client_documents').update({ viewed_at: new Date().toISOString() }).eq('id', id)
    alertDocumentViewed(authz.clientName, authz.doc.title)
  }
  return NextResponse.json({ firstView })
}
