/**
 * Passwordless Supabase Auth helpers — table-agnostic, reusable across any
 * flow that needs to: (a) look up or create a user by email, and (b) mint a
 * short-lived OTP for that user without sending Supabase's built-in email.
 *
 * Pair these with `apps/web/lib/access-tokens.ts` to build a 24h confidential
 * link flow: mint your own access token (24h TTL), embed it in a Loops/Resend
 * email, then on click consume the access token and call `generateOtpForUser`
 * to mint a Supabase session via `supabase.auth.verifyOtp`. The Supabase OTP
 * is generated and consumed within milliseconds, so its 1h expiry is moot.
 *
 * IMPORTANT: requires SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createServerClient } from '@repo/db/client';

/**
 * Resolve email → Supabase user_id, creating the user (no password,
 * email pre-confirmed) if they don't exist.
 */
export async function resolveOrCreateUserByEmail(email: string): Promise<string> {
  const supabase = createServerClient();
  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const found = existing?.users.find(
    u => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (found) return found.id;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !created.user) {
    throw new Error(
      `[passwordless-auth] failed to create user for ${email}: ${error?.message}`,
    );
  }
  return created.user.id;
}

/**
 * Generate a Supabase magic-link OTP via the admin API (no email sent) and
 * return the verifiable token_hash. The caller passes the hash to the SSR
 * client's `verifyOtp` to mint cookies on the response.
 */
export async function generateOtpForUser(
  email: string,
): Promise<{ token_hash: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(
      `[passwordless-auth] failed to generate OTP for ${email}: ${error?.message}`,
    );
  }
  return { token_hash: data.properties.hashed_token };
}
