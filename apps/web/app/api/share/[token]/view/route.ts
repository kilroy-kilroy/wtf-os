import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { isFirstView } from '@/lib/client-documents/approval'
import { alertDocumentViewed } from '@/lib/slack'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const authz = await authorizeShareDocument(token)
  if (!authz.ok) return NextResponse.json({ error: 'Not found' }, { status: authz.status })

  let firstView = isFirstView(authz.doc)
  if (firstView) {
    const admin = getSupabaseServerClient()
    const { data } = await admin.from('client_documents')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', authz.doc.id).is('viewed_at', null).select('id')
    if (data && data.length > 0) {
      alertDocumentViewed(authz.doc.prospect_name || 'Prospect', authz.doc.title)
    } else {
      firstView = false
    }
  }
  return NextResponse.json({ firstView })
}
