/**
 * Thin biz-dev-specific wrapper around the generic access-token + passwordless
 * auth utilities. Pre-fills the `biz_dev_assessments` table so callers can use
 * `mintAccessToken(id)` / `consumeAccessToken(id, token)` without repeating
 * the table config.
 *
 * For new flows, prefer using `./access-tokens` and `./passwordless-auth`
 * directly with the appropriate table.
 */

import {
  mintAccessToken as mintGeneric,
  consumeAccessToken as consumeGeneric,
  type ConsumedToken,
  type AccessTokenTableConfig,
} from './access-tokens';

export {
  resolveOrCreateUserByEmail,
  generateOtpForUser,
} from './passwordless-auth';
export { DEFAULT_ACCESS_TOKEN_TTL_MS as ACCESS_TOKEN_TTL_MS } from './access-tokens';

const BIZ_DEV_TABLE: AccessTokenTableConfig = { table: 'biz_dev_assessments' };

export function mintAccessToken(assessmentId: string): Promise<string> {
  return mintGeneric(assessmentId, BIZ_DEV_TABLE);
}

export interface BizDevConsumedToken {
  assessmentId: string;
  userId: string;
  email: string;
}

export async function consumeAccessToken(
  assessmentId: string,
  presentedToken: string,
): Promise<BizDevConsumedToken | null> {
  const consumed: ConsumedToken | null = await consumeGeneric(
    assessmentId,
    presentedToken,
    BIZ_DEV_TABLE,
  );
  if (!consumed) return null;
  return {
    assessmentId: consumed.rowId,
    userId: consumed.userId,
    email: consumed.email,
  };
}
