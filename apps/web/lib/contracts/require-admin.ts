import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/** Returns the admin user id, or null if the caller is not a logged-in admin. */
export async function requireAdmin(): Promise<string | null> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const { data: row } = await getSupabaseServerClient()
    .from('users').select('is_admin').eq('id', user.id).single();
  return row?.is_admin ? user.id : null;
}
