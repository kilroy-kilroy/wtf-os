import type { NextRequest } from 'next/server';
import { resolveSession, type ContributorRow } from './db';

export const SESSION_HEADER = 'x-call-vault-session';

/** Resolve the anonymous session header to a contributor, or null. */
export async function contributorFromRequest(
  request: NextRequest,
): Promise<ContributorRow | null> {
  return resolveSession(request.headers.get(SESSION_HEADER) || '');
}
