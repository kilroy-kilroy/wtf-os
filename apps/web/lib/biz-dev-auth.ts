import { randomBytes } from 'node:crypto';
import { createServerClient } from '@repo/db/client';

/**
 * Resolve email → Supabase user_id, creating the user if they don't exist.
 * Returns the user_id. The user has no password — they sign in via the
 * access-token flow (see `mintAccessToken` / `consumeAccessToken`).
 *
 * IMPORTANT: requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function resolveOrCreateUserByEmail(email: string): Promise<string> {
  const supabase = createServerClient();
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

/** 24 hours, in ms — chosen so users can open the email later in the day. */
export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Mint a single-use, 24h-expiry access token for an assessment row and
 * persist it. Decouples our magic-link flow from Supabase's OTP expiry
 * (capped at 1h on most plans). The caller embeds the returned token in the
 * email link as `?access_token=...`; the report page consumes it.
 */
export async function mintAccessToken(assessmentId: string): Promise<string> {
  const token = randomBytes(32).toString('hex'); // 64-char hex
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('biz_dev_assessments')
    .update({
      access_token: token,
      access_token_expires_at: expiresAt,
      access_token_used_at: null,
    })
    .eq('id', assessmentId);

  if (error) {
    throw new Error(`Failed to persist access token for ${assessmentId}: ${error.message}`);
  }
  return token;
}

export interface ConsumedToken {
  assessmentId: string;
  userId: string;
  email: string;
}

/**
 * Validate an access token and exchange it for a fresh Supabase session via
 * `generateLink` + `verifyOtp`. The Supabase OTP itself is generated and
 * consumed within milliseconds, so the 1h Supabase OTP cap is irrelevant —
 * our 24h TTL governs the user-facing window.
 *
 * The caller is responsible for setting the resulting session cookies on the
 * response (use the SSR client from `@/lib/supabase-auth-server`).
 *
 * Returns null if the token is invalid, expired, or already used.
 */
export async function consumeAccessToken(
  assessmentId: string,
  presentedToken: string,
): Promise<ConsumedToken | null> {
  if (!presentedToken || presentedToken.length < 32) return null;

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from('biz_dev_assessments')
    .select('id, user_id, email, access_token, access_token_expires_at, access_token_used_at')
    .eq('id', assessmentId)
    .single();

  if (!row) return null;
  if (row.access_token !== presentedToken) return null;
  if (row.access_token_used_at) return null;
  if (!row.access_token_expires_at) return null;
  if (new Date(row.access_token_expires_at).getTime() < Date.now()) return null;
  if (!row.user_id || !row.email) return null;

  // Mark token consumed before minting the session — single-use semantics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('biz_dev_assessments')
    .update({ access_token_used_at: new Date().toISOString() })
    .eq('id', assessmentId);

  return {
    assessmentId: row.id,
    userId: row.user_id,
    email: row.email,
  };
}

/**
 * After consumeAccessToken returns success, this generates a Supabase OTP
 * (via admin API, no email sent) and returns the verifiable token_hash. The
 * caller passes the hash to the SSR client's `verifyOtp` to mint cookies.
 */
export async function generateOtpForUser(email: string): Promise<{ token_hash: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`Failed to generate OTP for ${email}: ${error?.message}`);
  }
  return { token_hash: data.properties.hashed_token };
}
