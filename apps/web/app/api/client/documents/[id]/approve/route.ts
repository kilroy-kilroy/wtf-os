import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeClientDocument } from '@/lib/client-documents/authorize'
import { validateApprove } from '@/lib/client-documents/approval'
import { alertDocumentApproved } from '@/lib/slack'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name : ''

  const authz = await authorizeClientDocument(id)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const check = validateApprove(authz.doc, name)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const admin = getSupabaseServerClient()
  const { data, error } = await admin.from('client_documents').update({
    approved_at: new Date().toISOString(),
    approved_by: authz.userId,
    approved_name: name.trim(),
  }).eq('id', id).is('approved_at', null).select('id')
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'already approved' }, { status: 409 })

  alertDocumentApproved(authz.clientName, authz.doc.title, name.trim())
  return NextResponse.json({ ok: true })
}
