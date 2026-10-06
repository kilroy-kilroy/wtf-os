import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { createServerClient } from '@repo/db/client';
import { getSubscriptionStatus } from '@/lib/subscription';

export class LabError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const labFailure = (e: unknown) => e instanceof LabError
  ? NextResponse.json({ error: e.message }, { status: e.status }) : null;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const owns = (userId: string | undefined, ownerId: unknown) => !!userId && userId === ownerId;
export const validGrant = (row: any, kind: string, id: string, now = Date.now()) =>
  !!row && row.kind === kind && row.resource_id === id && !row.revoked_at && Date.parse(row.expires_at) > now;
const TTL = 7 * 86400;
const COOKIE = 'lab_guest';

export async function labUser() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}
export async function requirePro(product: 'call' | 'discovery') {
  const user = await labUser();
  if (!user?.email) throw new LabError(401, 'Sign in to use Pro.');
  const status = await getSubscriptionStatus(createServerClient(), user.id, user.email);
  if (!(product === 'call' ? status.hasCallLabPro : status.hasDiscoveryLabPro))
    throw new LabError(403, 'An active subscription for this Lab is required.');
  return user;
}
export async function guestToken(create = false) {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (validToken(old)) return old;
  if (!create) return null;
  const token = randomBytes(32).toString('hex');
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: TTL });
  return token;
}
async function saveGrant(kind: string, id: string, token: string) {
  const { error } = await (createServerClient() as any).from('lab_access_grants').upsert({
    kind, resource_id: id, token_hash: digest(token), expires_at: new Date(Date.now() + TTL * 1000).toISOString(),
  }, { onConflict: 'kind,resource_id,token_hash' });
  if (error) throw new LabError(503, 'Unable to secure this report. Please try again.');
}
export async function grantGuest(kind: string, id: string) {
  await saveGrant(kind, id, (await guestToken(true))!);
}
export async function reportLink(kind: string, id: string, path: string, guest: boolean) {
  if (!guest) return path;
  await grantGuest(kind, id);
  const token = randomBytes(32).toString('hex');
  await saveGrant(kind, id, token);
  return `${path}?access_token=${token}`;
}
export async function authorizeLab(kind: string, id: string, ownerId: unknown, presented?: string | null) {
  const user = await labUser();
  if (owns(user?.id, ownerId)) return;
  // Never authorize by submitted email, agency name, or report ID alone.
  const tokens = [presented, await guestToken()].filter(validToken);
  for (const token of tokens) {
    const { data, error } = await (createServerClient() as any).from('lab_access_grants')
      .select('kind,resource_id,expires_at,revoked_at').eq('kind', kind).eq('resource_id', id)
      .eq('token_hash', digest(token)).maybeSingle();
    if (!error && validGrant(data, kind, id)) return;
  }
  throw new LabError(404, 'Report not found or access expired. Sign in to view your saved reports.');
}
export function serviceAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = secret ? `Bearer ${secret}` : '';
  const actual = request.headers.get('authorization') || '';
  return !!secret && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin))
    throw new LabError(403, 'Cross-site requests are not allowed.');
}
export async function readLabBytes(request: Request, maxBytes: number) {
  sameOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new LabError(400, 'Request body is required.');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new LabError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readLabJson(request: Request, maxBytes = 300_000) {
  const bytes = await readLabBytes(request, maxBytes);
  try {
    const data = JSON.parse(bytes.toString('utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch { throw new LabError(400, 'Invalid JSON request.'); }
}
export async function limitLab(request: Request, action: string, userId?: string) {
  sameOrigin(request);
  // Only trust Vercel's platform-overwritten address header, never arbitrary X-Forwarded-For.
  const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local';
  const db = createServerClient() as any;
  const caps = action === 'export' ? [60, 2000] : [20, 300];
  for (const [key, max] of [[`${action}:ip:${ip}`, caps[0]], [`${action}:global`, caps[1]], ...(userId ? [[`${action}:user:${userId}`, 40]] : [])] as [string, number][]) {
    const { data, error } = await db.rpc('consume_lab_quota', { p_key: digest(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${key}`), p_limit: max });
    if (error) throw new LabError(503, 'Usage protection is unavailable. Please try again later.');
    if (data !== true) throw new LabError(429, 'Daily Lab limit reached. Please try again tomorrow.');
  }
}
