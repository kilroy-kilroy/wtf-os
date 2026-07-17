// apps/web/app/api/client/content/[id]/transcript/route.ts
//
// Permanent, login-gated download link for an office-hours session transcript.
// The client_content.content_url stores a public-format URL, but the
// `client-documents` bucket is PRIVATE — so on every click we authorize the
// viewer (admin or program-enrolled) and 302 to a throwaway 60s signed URL.
// This mirrors app/api/client/documents/[id]/file/route.ts for client_content.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { authorizeOfficeHoursTranscript } from '@/lib/client-content/authorize'
import { OFFICE_HOURS_BUCKET } from '@/lib/client-content/office-hours-access'

const SIGNED_URL_TTL_SECONDS = 60

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authz = await authorizeOfficeHoursTranscript(id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }

  const admin = getSupabaseServerClient()
  const { data: signed, error } = await admin.storage
    .from(OFFICE_HOURS_BUCKET)
    .createSignedUrl(authz.storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !signed) {
    console.error('[content/transcript] sign failed', {
      id,
      storagePath: authz.storagePath,
      error: error?.message,
    })
    return NextResponse.json({ error: 'Could not generate transcript link' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
