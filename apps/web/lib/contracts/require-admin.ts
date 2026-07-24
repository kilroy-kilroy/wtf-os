import type { NextRequest } from 'next/server';
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

/**
 * Request-level admin gate for /api/admin/* and admin-only /api/client/* routes.
 *
 * Passes when EITHER:
 *  - the caller has a logged-in admin session (is_admin) — the normal path for
 *    the admin UI, carried by the session cookie, no key needed; OR
 *  - the request presents the ADMIN_API_KEY bearer token — retained only for
 *    programmatic/cron callers.
 *
 * This is strictly more permissive than the old key-only check, so migrating a
 * route to it cannot break any caller that works today; it just lets the admin
 * UI stop pasting the key. Middleware already gates /admin *pages* on is_admin,
 * but not /api/* routes, so this request-level check remains load-bearing.
 */
export async function requireAdminRequest(request: NextRequest): Promise<boolean> {
  // Session path (admin UI) — cookie carries auth.
  if (await requireAdmin()) return true;

  // Bearer-token path (programmatic) — only when a key is configured.
  const key = process.env.ADMIN_API_KEY;
  if (key) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token === key) return true;
  }

  return false;
}
