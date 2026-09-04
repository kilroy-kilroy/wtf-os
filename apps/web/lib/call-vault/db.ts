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

export interface ContributorCallSummary {
  id: string;
  stage: string | null;
  outcome: string | null;
  dealSizeBand: string | null;
  label: string | null;
  fileCount: number;
}

/**
 * Read-only summary of a contributor's existing calls, for the resume flow —
 * so a contributor who already saved calls before their session expired sees
 * them instead of discovering the 10-call cap as a bare 400 on an 11th blank
 * card. One query for the calls, one query for all their files (filtered to
 * those call ids), counted in JS — never one query per call.
 */
export async function listCallsForContributor(contributorId: string): Promise<ContributorCallSummary[]> {
  const db = getSupabaseServerClient();
  const { data: calls, error } = await db
    .from('call_vault_calls')
    .select('id, stage, outcome, deal_size_band, label, created_at')
    .eq('contributor_id', contributorId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listCallsForContributor failed: ${error.message}`);
  if (!calls || calls.length === 0) return [];

  const callIds = calls.map((c) => c.id);
  const { data: files } = await db
    .from('call_vault_files')
    .select('call_id')
    .in('call_id', callIds);

  const fileCounts = new Map<string, number>();
  for (const f of files ?? []) {
    fileCounts.set(f.call_id, (fileCounts.get(f.call_id) ?? 0) + 1);
  }

  return calls.map((c) => ({
    id: c.id,
    stage: c.stage,
    outcome: c.outcome,
    dealSizeBand: c.deal_size_band,
    label: c.label,
    fileCount: fileCounts.get(c.id) ?? 0,
  }));
}

export interface AdminCallFile {
  id: string;
  fileName: string;
  kind: string;
  sizeBytes: number | null;
}

export interface AdminCallDetail {
  id: string;
  stage: string | null;
  outcome: string | null;
  dealSizeBand: string | null;
  label: string | null;
  notes: string | null;
  files: AdminCallFile[];
}

/**
 * Full per-call detail for the admin review page: like `listCallsForContributor`
 * above, but including `notes` and the actual files (not just a count) since the
 * admin detail page renders each file as a download link. Same shape: one query
 * for the calls, one query for all their files, joined in JS with a Map — never
 * one query per call.
 */
export async function listCallsForAdmin(contributorId: string): Promise<AdminCallDetail[]> {
  const db = getSupabaseServerClient();
  const { data: calls, error } = await db
    .from('call_vault_calls')
    .select('id, stage, outcome, deal_size_band, label, notes, created_at')
    .eq('contributor_id', contributorId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listCallsForAdmin failed: ${error.message}`);
  if (!calls || calls.length === 0) return [];

  const callIds = calls.map((c) => c.id);
  const { data: files } = await db
    .from('call_vault_files')
    .select('id, call_id, file_name, kind, size_bytes')
    .in('call_id', callIds);

  const filesByCall = new Map<string, AdminCallFile[]>();
  for (const f of files ?? []) {
    const list = filesByCall.get(f.call_id) ?? [];
    list.push({ id: f.id, fileName: f.file_name, kind: f.kind, sizeBytes: f.size_bytes });
    filesByCall.set(f.call_id, list);
  }

  return calls.map((c) => ({
    id: c.id,
    stage: c.stage,
    outcome: c.outcome,
    dealSizeBand: c.deal_size_band,
    label: c.label,
    notes: c.notes,
    files: filesByCall.get(c.id) ?? [],
  }));
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
      label: meta.label,
      notes: meta.notes,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createCall failed: ${error?.message}`);
  return data.id;
}

/**
 * Overwrite a call's contributor-supplied dimensions.
 *
 * These five fields are the whole reason the intake asks for anything at all:
 * stage, outcome, deal size and date cannot be recovered from a transcript
 * later, so a contributor has to stay able to correct them after the row
 * exists (the row is created on their first file upload, before they have
 * necessarily finished picking).
 *
 * `notes` is deliberately NOT written here even though `CallMeta` carries it.
 * The public form never collects notes, so `validateCallMeta` resolves it to
 * null on every request from that form — writing it would silently erase any
 * note added elsewhere on each metadata edit. Callers pass a full `CallMeta`;
 * the `Omit` in the signature is what makes the omission deliberate rather
 * than accidental.
 */
export async function updateCall(
  callId: string, meta: Omit<CallMeta, 'notes'>,
): Promise<void> {
  const db = getSupabaseServerClient();
  const { error } = await db
    .from('call_vault_calls')
    .update({
      stage: meta.stage,
      outcome: meta.outcome,
      deal_size_band: meta.dealSizeBand,
      label: meta.label,
    })
    .eq('id', callId);
  if (error) throw new Error(`updateCall failed: ${error.message}`);
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

/**
 * Attach a newly-created NDA contract to a contributor, as a compare-and-swap
 * on `nda_contract_id` still being null. Two simultaneous first-time NDA
 * requests can each create their own contract row before either calls this;
 * without the `.is('nda_contract_id', null)` guard, both writes would land
 * and both callers would go on to generate their own (paid) Firma envelope.
 * With it, only one write can succeed.
 *
 * Returns the EFFECTIVE contract id, which the caller must use instead of the
 * `contractId` it passed in — it may have lost the race, in which case the
 * winner's id (already attached) is returned instead, and the caller's own
 * freshly-created contract is simply abandoned as an unused draft (harmless:
 * no envelope was ever generated for it, so nothing was billed).
 */
export async function attachNda(contributorId: string, contractId: string): Promise<string> {
  const db = getSupabaseServerClient();
  const { data } = await db
    .from('call_vault_contributors')
    .update({ nda_contract_id: contractId })
    .eq('id', contributorId)
    .is('nda_contract_id', null)
    .select('nda_contract_id')
    .maybeSingle();
  if (data) return contractId; // we won the race

  // Someone else already attached a contract — use theirs.
  const { data: existing } = await db
    .from('call_vault_contributors')
    .select('nda_contract_id')
    .eq('id', contributorId)
    .maybeSingle();
  if (!existing?.nda_contract_id) {
    throw new Error(`attachNda: lost the race but no nda_contract_id found for contributor ${contributorId}`);
  }
  return existing.nda_contract_id;
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
