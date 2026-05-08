import { createServerClient } from '@repo/db/client';

/**
 * Resolve email → Supabase user_id, creating the user if they don't exist.
 * Returns the user_id. The user has no password — they sign in via magic link.
 *
 * IMPORTANT: requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function resolveOrCreateUserByEmail(email: string): Promise<string> {
  const supabase = createServerClient();
  // Try listUsers and scan for the email (no server-side filter exists)
  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const found = existing?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !created.user) {
    throw new Error(`Failed to create Supabase user for ${email}: ${error?.message}`);
  }
  return created.user.id;
}

/**
 * Generate a magic-link URL without sending Supabase's built-in email.
 *
 * The link is wrapped through `/auth/callback?next=...` so the PKCE
 * code-for-session exchange happens on our domain (where cookies live),
 * then the callback redirects to `finalDestination`.
 *
 * @param email - the recipient (must be the email of an existing Supabase user;
 *   call resolveOrCreateUserByEmail first)
 * @param finalDestination - absolute URL on our domain where the user should land
 *   after auth completes (e.g., `https://timkilroy.com/wtf-biz-dev-assessment/report/...`)
 */
export async function generateMagicLink(email: string, finalDestination: string): Promise<string> {
  // Build the callback URL with `next` set to the final destination's path.
  // The callback exchanges the code, then redirects to `next`.
  const finalUrl = new URL(finalDestination);
  const callbackUrl = `${finalUrl.origin}/auth/callback?next=${encodeURIComponent(finalUrl.pathname + finalUrl.search)}`;

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: callbackUrl },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate magic link for ${email}: ${error?.message}`);
  }
  return data.properties.action_link;
}
