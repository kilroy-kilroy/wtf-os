import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/contracts/require-admin'
import { generateShareToken } from '@/lib/client-documents/share-token'
import { validateShareDocPayload } from '@/lib/client-documents/share-validate'

/**
 * Session-gated sibling of /api/admin/share-documents (which is guarded by the
 * ADMIN_API_KEY bearer token for programmatic use). This route authorizes the
 * logged-in admin via their session cookie, so the browser UI never needs the
 * secret. Both paths reuse the same token + validation helpers and write the
 * same prospect-share row.
 */
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const title: string | null = body.title || null
    const contentBody: string | null = body.content_body || null
    const check = validateShareDocPayload({ title, content_body: contentBody })
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

    const shareToken = generateShareToken()
    const admin = getSupabaseServerClient()
    const { data: document, error } = await admin.from('client_documents').insert({
      enrollment_id: null,
      document_type: 'html',
      title,
      description: body.description || null,
      content_body: contentBody,
      category: body.category || 'proposal',
      requires_approval: body.requires_approval === true,
      share_token: shareToken,
      prospect_email: body.prospect_email || null,
      prospect_name: body.prospect_name || null,
    }).select().single()

    if (error) {
      console.error('[Share Documents UI] Insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
    return NextResponse.json({ document, shareUrl: `${appUrl}/d/${shareToken}` })
  } catch (e) {
    console.error('[Share Documents UI] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
