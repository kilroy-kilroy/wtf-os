import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { validateApprove } from '@/lib/client-documents/approval'
import { alertDocumentApproved } from '@/lib/slack'
import { isValidEmail } from '@/lib/client-documents/share-validate'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))
  const name = (typeof body?.name === 'string' ? body.name : '').slice(0, 200)
  const email = (typeof body?.email === 'string' ? body.email.trim() : '').slice(0, 320)

  const authz = await authorizeShareDocument(token)
  if (!authz.ok) return NextResponse.json({ error: 'Not found' }, { status: authz.status })

  const check = validateApprove(authz.doc, name)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  if (email && !isValidEmail(email)) return NextResponse.json({ error: 'invalid email' }, { status: 400 })

  const admin = getSupabaseServerClient()
  const { data, error } = await admin.from('client_documents').update({
    approved_at: new Date().toISOString(),
    approved_name: name.trim(),
    approved_email: email || null,
  }).eq('id', authz.doc.id).is('approved_at', null).select('id')
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'already approved' }, { status: 409 })

  alertDocumentApproved(authz.doc.prospect_name || email || 'Prospect', authz.doc.title, name.trim())
  return NextResponse.json({ ok: true })
}
