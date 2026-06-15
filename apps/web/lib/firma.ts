// apps/web/lib/firma.ts
//
// The ONLY seam to Firma. Endpoint shapes confirmed in docs/firma-api-notes.md.
// Two-step create+send flow; signature/date fields bind to PDF text anchors;
// webhooks are Stripe-style signed (t=<unix>,v1=<hex> over `${t}.${rawBody}`).

import crypto from 'node:crypto';

export type ContractStatus =
  | 'draft' | 'sending' | 'sent' | 'viewed' | 'signed' | 'completed' | 'declined' | 'voided';

const FIRMA_BASE_URL = 'https://api.firma.dev/functions/v1/signing-request-api';

function apiKey(): string {
  const env = (process.env.FIRMA_ENV || 'test').toLowerCase();
  const key = env === 'live' ? process.env.FIRMA_API_KEY_LIVE : process.env.FIRMA_API_KEY_TEST;
  if (!key) throw new Error(`Firma API key not set for FIRMA_ENV=${env}`);
  return key;
}

async function firmaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${FIRMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: apiKey(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Firma ${init.method || 'GET'} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export interface FirmaSigner {
  role: 'client' | 'counter';
  name: string;
  email: string;
  order: number;
}

export interface CreateSigningRequestResult {
  requestId: string;
  signerIds: Record<string, string>; // role -> firma recipient uuid
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] || name, last: parts.slice(1).join(' ') };
}

/**
 * Create a draft signing request from a PDF + signers, binding signature/date
 * fields to the PDF's text anchors. Does NOT send — call sendSigningRequest once
 * the returned request id has been persisted, so a send failure can never orphan
 * a sent envelope we can't correlate back to a contract.
 * Anchors expected in the PDF: {{sig_<role>}} and {{date_<role>}}.
 */
export async function createSigningRequest(
  pdf: Buffer,
  signers: FirmaSigner[],
  name = 'Contract',
): Promise<CreateSigningRequestResult> {
  const recipients = signers.map((s) => {
    const { first, last } = splitName(s.name);
    return {
      id: `temp_${s.role}`,
      first_name: first,
      last_name: last,
      email: s.email,
      designation: 'Signer',
      order: s.order,
    };
  });

  const anchor_tags = signers.flatMap((s) => [
    { anchor_string: `{{sig_${s.role}}}`, type: 'signature', recipient_id: `temp_${s.role}` },
    { anchor_string: `{{date_${s.role}}}`, type: 'date', recipient_id: `temp_${s.role}` },
  ]);

  // Step 1: create draft.
  const createRes = await firmaFetch('/signing-requests', {
    method: 'POST',
    body: JSON.stringify({ document: pdf.toString('base64'), name, recipients, anchor_tags }),
  });
  const created = await createRes.json();

  // Map role -> real recipient UUID. Match on signing order first (always unique:
  // client=1, counter=2); fall back to email only if order is absent. Matching on
  // `order || email` risked collapsing both roles onto one recipient when signers
  // happen to share an email (e.g. internal test envelopes).
  const recipientsOut: Array<{ order?: number; email?: string; id?: string }> =
    created.recipients ?? [];
  const signerIds: Record<string, string> = {};
  for (const s of signers) {
    const match =
      recipientsOut.find((r) => r.order === s.order) ??
      recipientsOut.find((r) => r.email === s.email);
    if (match?.id) signerIds[s.role] = match.id;
  }

  return { requestId: created.id, signerIds };
}

/** Send a previously-created draft signing request (triggers email delivery). */
export async function sendSigningRequest(requestId: string): Promise<void> {
  await firmaFetch(`/signing-requests/${requestId}/send`, { method: 'POST' });
}

export interface FirmaRequestState {
  status: ContractStatus;
  signedPdf?: Buffer;
}

/** Map the /download status enum to our contract status. */
function mapDownloadStatus(s: string): ContractStatus {
  switch (s) {
    case 'finished': return 'completed';
    case 'in_progress': return 'sent';
    case 'declined': return 'declined';
    case 'cancelled':
    case 'expired': return 'voided';
    default: return 'sent';
  }
}

/**
 * Poll current state via the download endpoint; when finished, fetch the signed
 * PDF from the returned pre-signed URL.
 */
export async function getRequest(requestId: string): Promise<FirmaRequestState> {
  const res = await firmaFetch(`/signing-requests/${requestId}/download`);
  const json = await res.json();
  const status = mapDownloadStatus(json.status);
  let signedPdf: Buffer | undefined;
  if (status === 'completed' && json.download_url) {
    const dl = await fetch(json.download_url);
    signedPdf = Buffer.from(await dl.arrayBuffer());
  }
  return { status, signedPdf };
}

/** Map a Firma webhook event `type` to our status, or null if untracked. */
export function mapFirmaStatus(eventType: string): ContractStatus | null {
  switch (eventType) {
    case 'signing_request.viewed': return 'viewed';
    case 'signing_request.recipient.signed': return 'signed';
    case 'signing_request.completed': return 'completed';
    case 'signing_request.recipient.declined': return 'declined';
    case 'signing_request.cancelled':
    case 'signing_request.expired': return 'voided';
    default: return null;
  }
}

// Monotonic rank over the status lifecycle. Used to reject stale/out-of-order
// webhook events and to stop the /download poll from regressing a richer state
// (e.g. /download reports `in_progress` -> 'sent' after a webhook reached 'signed').
const STATUS_RANK: Record<ContractStatus, number> = {
  draft: 0, sending: 1, sent: 2, viewed: 3, signed: 4,
  completed: 5, declined: 5, voided: 5,
};

/** True if `next` is a forward (or terminal) transition from `current`. */
export function shouldApplyStatus(current: ContractStatus, next: ContractStatus): boolean {
  return STATUS_RANK[next] >= STATUS_RANK[current];
}

/**
 * Verify a Firma webhook signature.
 * Header format:  X-Firma-Signature: t=<unix>,v1=<hex>
 * Signed payload: `${t}.${rawBody}`, HMAC-SHA256, hex, timing-safe compare.
 */
export function verifyWebhook(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  for (const seg of signatureHeader.split(',')) {
    const i = seg.indexOf('=');
    if (i === -1) continue;
    parts[seg.slice(0, i).trim()] = seg.slice(i + 1).trim();
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
