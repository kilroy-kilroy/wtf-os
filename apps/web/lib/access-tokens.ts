/**
 * Generic single-use access-token utility.
 *
 * Decouples our magic-link-style flows from Supabase's OTP expiry (capped at
 * 1h on most plans). The owning table needs three nullable columns:
 *   - access_token text unique
 *   - access_token_expires_at timestamptz
 *   - access_token_used_at timestamptz
 * Plus a partial index on access_token where access_token is not null.
 *
 * Typical flow:
 *   1. After a row is ready (e.g., a report is generated), call
 *      `mintAccessToken(rowId, { table })` and embed the returned token in the
 *      email link as `?access_token=...`.
 *   2. On the gated landing page, call `consumeAccessToken(rowId, token, { table })`.
 *      If it returns a `ConsumedToken`, mint a Supabase session for the
 *      returned email and redirect to the clean URL.
 *
 * The token is consumed (single-use) at validation time — re-using the same
 * link sends the user to the request-link page.
 */

import { randomBytes } from 'node:crypto';
import { createServerClient } from '@repo/db/client';

/** 24 hours, in ms. */
export const DEFAULT_ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface AccessTokenTableConfig {
  /** Table name, e.g. `'biz_dev_assessments'`. */
  table: string;
  /** Column holding the row id used for lookup. Defaults to `'id'`. */
  idColumn?: string;
  /** Column holding the Supabase user id. Defaults to `'user_id'`. */
  userIdColumn?: string;
  /** Column holding the user email. Defaults to `'email'`. */
  emailColumn?: string;
}

export interface ConsumedToken {
  rowId: string;
  userId: string;
  email: string;
}

/**
 * Mint a single-use access token onto a row. Returns the bare token string
 * the caller embeds in the email URL.
 */
export async function mintAccessToken(
  rowId: string,
  config: AccessTokenTableConfig,
  ttlMs: number = DEFAULT_ACCESS_TOKEN_TTL_MS,
): Promise<string> {
  const idColumn = config.idColumn ?? 'id';
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from(config.table)
    .update({
      access_token: token,
      access_token_expires_at: expiresAt,
      access_token_used_at: null,
    })
    .eq(idColumn, rowId);

  if (error) {
    throw new Error(
      `[access-tokens] mint failed for ${config.table}#${rowId}: ${error.message}`,
    );
  }
  return token;
}

/**
 * Validate the presented token against the row, mark it consumed, and return
 * the row's user_id + email for the caller to mint a Supabase session with.
 *
 * Returns null if:
 *   - the token doesn't match
 *   - the token has expired
 *   - the token was already used
 *   - the row is missing the user_id or email
 */
export async function consumeAccessToken(
  rowId: string,
  presentedToken: string,
  config: AccessTokenTableConfig,
): Promise<ConsumedToken | null> {
  if (!presentedToken || presentedToken.length < 32) return null;

  const idColumn = config.idColumn ?? 'id';
  const userIdColumn = config.userIdColumn ?? 'user_id';
  const emailColumn = config.emailColumn ?? 'email';

  const selectColumns = [
    idColumn,
    userIdColumn,
    emailColumn,
    'access_token',
    'access_token_expires_at',
    'access_token_used_at',
  ].join(', ');

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from(config.table)
    .select(selectColumns)
    .eq(idColumn, rowId)
    .single();

  if (!row) return null;
  if (row.access_token !== presentedToken) return null;
  if (row.access_token_used_at) return null;
  if (!row.access_token_expires_at) return null;
  if (new Date(row.access_token_expires_at).getTime() < Date.now()) return null;

  const userId = row[userIdColumn];
  const email = row[emailColumn];
  if (!userId || !email) return null;

  // Mark consumed before the caller mints a session — single-use semantics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from(config.table)
    .update({ access_token_used_at: new Date().toISOString() })
    .eq(idColumn, rowId);

  return { rowId, userId, email };
}
