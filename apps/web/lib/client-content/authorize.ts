import { createClient } from '@/lib/supabase-auth-server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { canViewOfficeHours, storagePathFromContentUrl } from './office-hours-access'

export type OfficeHoursRow = {
  id: string
  content_type: string
  content_url: string | null
  program_ids: string[] | null
}

type Ok = { ok: true; row: OfficeHoursRow; storagePath: string }
type Err = { ok: false; status: number; error: string }

/**
 * Authorize a request to download an office-hours transcript.
 * login required → row must be a session → viewer must be admin or program-enrolled
 * → returns the derived in-bucket storage path for signing.
 */
export async function authorizeOfficeHoursTranscript(id: string): Promise<Ok | Err> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const admin = getSupabaseServerClient()
  const { data: row } = await admin
    .from('client_content')
    .select('id, content_type, content_url, program_ids')
    .eq('id', id)
    .single()
  if (!row || row.content_type !== 'session') {
    return { ok: false, status: 404, error: 'Not found' }
  }

  const { data: userRow } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = !!userRow?.is_admin

  let userProgramIds: string[] = []
  if (!isAdmin) {
    const { data: enrollments } = await admin
      .from('client_enrollments')
      .select('program_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
    userProgramIds = (enrollments ?? []).map((e) => e.program_id as string)
  }

  if (!canViewOfficeHours(isAdmin, userProgramIds, row.program_ids)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  const storagePath = storagePathFromContentUrl(row.content_url)
  if (!storagePath) {
    return { ok: false, status: 404, error: 'No transcript is associated with this session' }
  }

  return { ok: true, row: row as OfficeHoursRow, storagePath }
}
