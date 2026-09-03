// Thin data-access layer for Call Vault. All decision logic lives in
// ./validate.ts so it can be unit tested; this file only talks to Supabase.

import { randomBytes, randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { AboutYou, CallMeta } from './validate';
import { ownsStoragePath, isSessionExpired, sanitizeFileName } from './validate';

export const CALL_VAULT_BUCKET = 'call-vault';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface ContributorRow {
  id: string;
  name: string;
  email: string;
  agency_name: string | null;
  agency_url: string | null;
  services: string[];
  revenue_band: string | null;
  target_client: string | null;
  nda_contract_id: string | null;
  nda_signed_at: string | null;
  client_legal_name: string | null;
  client_address: string | null;
  status: string;
}

const CONTRIBUTOR_COLUMNS =
  'id, name, email, agency_name, agency_url, services, revenue_band, target_client, ' +
  'nda_contract_id, nda_signed_at, client_legal_name, client_address, status';

function mintSessionToken() {
  return {
    session_token: randomBytes(32).toString('hex'),
    session_token_expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

/**
 * Create or refresh a contributor from the "About you" step, and mint a session
 * token for this sitting. Upserts on email so a returning contributor attaches
 * new calls to their existing row rather than creating a duplicate.
 */
export async function startContributor(
  input: AboutYou & { ip: string | null },
): Promise<{ contributorId: string; sessionToken: string }> {
  const db = getSupabaseServerClient();
  const session = mintSessionToken();

  const { data, error } = await db
    .from('call_vault_contributors')
    .upsert({
      name: input.name,
      email: input.email,
      agency_name: input.agencyName,
      agency_url: input.agencyUrl,
      services: input.services,
      revenue_band: input.revenueBand,
      target_client: input.targetClient,
      terms_accepted_at: new Date().toISOString(),
      ip: input.ip,
      ...session,
    }, { onConflict: 'email' })
    .select('id')
    .single();

  if (error || !data) throw new Error(`startContributor failed: ${error?.message}`);
  return { contributorId: data.id, sessionToken: session.session_token };
}

export interface ContributorResumeState {
  id: string;
  accessTokenExpiresAt: string | null;
  accessTokenUsedAt: string | null;
}

/**
 * Look up an existing contributor by email, without creating or touching a
 * session. Used by /start to detect a returning contributor BEFORE any
 * session is minted for them — email ownership is never verified inline, so
 * a known email must go through the emailed resume-link path instead of
 * getting a fresh session handed back in the response. Also returns the
 * current resume-token state so the route can decide whether a fresh link is
 * even warranted (see `shouldSendResumeLink` in ./validate) instead of
 * re-minting — and so invalidating — one on every call.
 *
 * Fails CLOSED: a Supabase error throws rather than returning null, matching
 * `resolveSession`'s posture in this file. Returning null on a transient
 * error would make the route treat a known email as brand-new and hand back
 * a live session for it — the exact takeover this lookup exists to prevent.
 */
export async function findContributorForResume(email: string): Promise<ContributorResumeState | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_contributors')
    .select('id, access_token_expires_at, access_token_used_at')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`findContributorForResume failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    accessTokenExpiresAt: data.access_token_expires_at,
    accessTokenUsedAt: data.access_token_used_at,
  };
}

/** Resolve an anonymous session token to its contributor, or null if invalid/expired. */
export async function resolveSession(sessionToken: string): Promise<ContributorRow | null> {
  if (!sessionToken) return null;
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('call_vault_contributors')
    .select(`${CONTRIBUTOR_COLUMNS}, session_token_expires_at`)
    .eq('session_token', sessionToken)
    .maybeSingle();
  if (!data) return null;
  // Expiry is decided here rather than in SQL so it is unit-testable and fails
  // closed on a null or malformed timestamp.
  if (isSessionExpired(data.session_token_expires_at)) return null;
  return data as ContributorRow;
}

export async function countCalls(contributorId: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_calls')
    .select('id', { count: 'exact', head: true })
    .eq('contributor_id', contributorId);
  return count ?? 0;
}

/** Abuse control: how many contributors this IP has created since `sinceIso`. */
export async function countRecentByIp(ip: string, sinceIso: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_contributors')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', sinceIso);
  return count ?? 0;
}

export async function countFiles(callId: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { count } = await db
    .from('call_vault_files')
    .select('id', { count: 'exact', head: true })
    .eq('call_id', callId);
  return count ?? 0;
}

export async function createCall(contributorId: string, meta: CallMeta): Promise<string> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_calls')
    .insert({
      contributor_id: contributorId,
      stage: meta.stage,
      outcome: meta.outcome,
      deal_size_band: meta.dealSizeBand,
      call_date: meta.callDate,
      label: meta.label,
      notes: meta.notes,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createCall failed: ${error?.message}`);
  return data.id;
}

/** Verify the call belongs to this contributor before issuing an upload URL. */
export async function callBelongsTo(callId: string, contributorId: string): Promise<boolean> {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('call_vault_calls').select('id')
    .eq('id', callId).eq('contributor_id', contributorId).maybeSingle();
  return !!data;
}

/**
 * Issue a direct-to-storage upload URL. The path is always rooted at the
 * contributor's uuid so ownership is checkable on commit and on download.
 */
export async function signUpload(
  contributorId: string, callId: string, fileName: string,
): Promise<{ storagePath: string; uploadUrl: string; token: string }> {
  const db = getSupabaseServerClient();
  const safeName = sanitizeFileName(fileName);
  const storagePath = `${contributorId}/${callId}/${randomUUID()}-${safeName}`;
  const { data, error } = await db.storage.from(CALL_VAULT_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) throw new Error(`signUpload failed: ${error?.message}`);
  return { storagePath, uploadUrl: data.signedUrl, token: data.token };
}

/**
 * Count objects actually sitting in storage under this call's prefix, as
 * opposed to `countFiles`, which counts committed DB rows. A client can call
 * `sign` repeatedly and never `commit`, leaving `countFiles` at 0 forever
 * while pushing unlimited objects into the bucket — this is the guard against
 * that. Fails open to 0 on a storage error rather than throwing, since this is
 * a secondary cap check and must never itself take the route down.
 */
export async function countStoredObjects(contributorId: string, callId: string): Promise<number> {
  const db = getSupabaseServerClient();
  const { data, error } = await db.storage
    .from(CALL_VAULT_BUCKET)
    .list(`${contributorId}/${callId}`);
  if (error) return 0;
  return data?.length ?? 0;
}

export async function commitFile(input: {
  contributorId: string; callId: string; storagePath: string;
  kind: string; fileName: string; mimeType: string | null; sizeBytes: number | null;
}): Promise<string> {
  if (!ownsStoragePath(input.storagePath, input.contributorId)) {
    throw new Error('storagePath does not belong to this contributor');
  }
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_files')
    .insert({
      call_id: input.callId,
      storage_path: input.storagePath,
      kind: input.kind,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`commitFile failed: ${error?.message}`);
  return data.id;
}

export async function attachNda(contributorId: string, contractId: string): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ nda_contract_id: contractId }).eq('id', contributorId);
}

export async function saveNdaParty(
  contributorId: string, legalName: string, address: string,
): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ client_legal_name: legalName, client_address: address })
    .eq('id', contributorId);
}

export async function markNdaSigned(contributorId: string): Promise<void> {
  const db = getSupabaseServerClient();
  await db.from('call_vault_contributors')
    .update({ nda_signed_at: new Date().toISOString() }).eq('id', contributorId);
}

/**
 * Flip a contributor to `submitted`, as a compare-and-swap on `status='draft'`
 * rather than an unconditional update. Two near-simultaneous submits (a
 * double-click, two tabs) can both read `status: 'draft'` from their own
 * session before either write lands; without the `.eq('status', 'draft')`
 * guard both would also both flip the row and both look like "I did it",
 * causing the route to fan out (thank-you email, Copper lead, Slack alert)
 * twice. Only one request's update can match a still-`draft` row, so a
 * `null` return means someone else already submitted — the caller must treat
 * that exactly like the fast-path guard: acknowledge success, but do not fire
 * the fan-out again.
 */
export async function markSubmitted(contributorId: string): Promise<{
  email: string; name: string; agencyName: string | null; callCount: number; ndaSigned: boolean;
} | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('call_vault_contributors')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', contributorId)
    .eq('status', 'draft')
    .select('email, name, agency_name, nda_signed_at')
    .maybeSingle();
  if (error) throw new Error(`markSubmitted failed: ${error.message}`);
  if (!data) return null; // already submitted — do not fire the fan-out

  return {
    email: data.email,
    name: data.name,
    agencyName: data.agency_name,
    callCount: await countCalls(contributorId),
    ndaSigned: !!data.nda_signed_at,
  };
}
