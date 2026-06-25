import { createClient } from '@/lib/supabase-auth-server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export type ClientDocRow = {
  id: string; enrollment_id: string; title: string; document_type: string;
  requires_approval: boolean; viewed_at: string | null; approved_at: string | null
}
type AuthzOk = { ok: true; userId: string; enrollmentId: string; doc: ClientDocRow; clientName: string }
type AuthzErr = { ok: false; status: number; error: string }

export async function authorizeClientDocument(id: string): Promise<AuthzOk | AuthzErr> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const admin = getSupabaseServerClient()
  const { data: doc } = await admin
    .from('client_documents')
    .select('id, enrollment_id, title, document_type, requires_approval, viewed_at, approved_at')
    .eq('id', id)
    .single()
  if (!doc) return { ok: false, status: 404, error: 'Not found' }

  const { data: enrollment } = await admin
    .from('client_enrollments')
    .select('id')
    .eq('id', doc.enrollment_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!enrollment) return { ok: false, status: 404, error: 'Not found' }

  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const clientName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Client'
  return { ok: true, userId: user.id, enrollmentId: enrollment.id, doc: doc as ClientDocRow, clientName }
}
