import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/contracts/require-admin'
import { generateShareToken } from '@/lib/client-documents/share-token'
import { validateShareDocPayload, isValidEmail } from '@/lib/client-documents/share-validate'
import { onProspectDocShared } from '@/lib/loops'
import { addProspectShareSubscriber } from '@/lib/beehiiv'

/** Human-friendly label for the category: known slugs get a fixed label; a
 *  custom label is shown as typed. */
function categoryLabel(category: string): string {
  const known: Record<string, string> = { proposal: 'Proposal', alignment: 'Alignment Doc', scope: 'Scope' }
  return known[category] || category
}

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

    const category: string = (typeof body.category === 'string' && body.category.trim()) || 'proposal'
    const prospectEmail: string | null = body.prospect_email || null
    const prospectName: string | null = body.prospect_name || null

    const shareToken = generateShareToken()
    const admin = getSupabaseServerClient()
    const { data: document, error } = await admin.from('client_documents').insert({
      enrollment_id: null,
      document_type: 'html',
      title,
      description: body.description || null,
      content_body: contentBody,
      category,
      requires_approval: body.requires_approval === true,
      share_token: shareToken,
      prospect_email: prospectEmail,
      prospect_name: prospectName,
    }).select().single()

    if (error) {
      console.error('[Share Documents UI] Insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
    const shareUrl = `${appUrl}/d/${shareToken}`

    // Optionally email the link via Loops + add to Agency Inner Circle (Beehiiv).
    // Best-effort: a delivery failure never invalidates the created link — the
    // owner can always copy it and send manually.
    let emailSent = false
    let emailError: string | undefined
    if (body.send_email === true) {
      if (!prospectEmail || !isValidEmail(prospectEmail)) {
        emailError = 'A valid prospect email is required to send.'
      } else {
        const res = await onProspectDocShared({
          email: prospectEmail,
          prospectName: prospectName || undefined,
          shareUrl,
          docTitle: title as string,
          category,
          categoryLabel: categoryLabel(category),
          requiresApproval: body.requires_approval === true,
        })
        emailSent = res.success
        if (!res.success) emailError = res.error || 'Loops event failed'
        // Agency Inner Circle subscribe — idempotent, fully non-blocking.
        addProspectShareSubscriber(prospectEmail, prospectName || undefined).catch(() => {})
      }
    }

    return NextResponse.json({ document, shareUrl, emailSent, emailError })
  } catch (e) {
    console.error('[Share Documents UI] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
