import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ user: null as any, row: null as any, cookie: '', pro: false, quota: true, error: null as any }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: m.cookie }), set: vi.fn() }) }));
vi.mock('@/lib/supabase-auth-server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: m.user } }) } }) }));
vi.mock('@/lib/subscription', () => ({ getSubscriptionStatus: async () => ({ hasCallLabPro: m.pro, hasDiscoveryLabPro: false }) }));
vi.mock('@repo/db/client', () => ({ createServerClient: () => ({
 rpc: async () => ({ data: m.quota, error: m.error }),
 from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: m.row, error: m.error }) }; return q; },
}) }));
import { authorizeLab, validGrant, requirePro, serviceAuthorized, readLabJson, limitLab } from './access';
beforeEach(() => { Object.assign(m, { user: null, row: null, cookie: '', pro: false, quota: true, error: null }); delete process.env.CRON_SECRET; });
describe('Lab access boundary', () => {
 it('denies anonymous and wrong-owner IDs', async () => {
  await expect(authorizeLab('call','id','owner')).rejects.toMatchObject({ status: 404 });
  m.user = { id: 'attacker' }; await expect(authorizeLab('call','id','owner')).rejects.toMatchObject({ status: 404 });
 });
 it('allows the authenticated owner', async () => { m.user = { id:'owner' }; await expect(authorizeLab('call','id','owner')).resolves.toBeUndefined(); });
 it('scopes guest access to resource, kind, expiry and revocation', async () => {
  m.cookie = 'a'.repeat(64); m.row = { kind:'call', resource_id:'id', expires_at:new Date(Date.now()+10000).toISOString() };
  await expect(authorizeLab('call','id',null)).resolves.toBeUndefined();
  await expect(authorizeLab('ingestion','id',null)).rejects.toMatchObject({status:404});
  expect(validGrant(m.row,'call','other')).toBe(false);
  m.row.expires_at = '2020-01-01'; await expect(authorizeLab('call','id',null)).rejects.toMatchObject({status:404});
  m.row.expires_at = '2099-01-01'; m.row.revoked_at='2026-01-01'; expect(validGrant(m.row,'call','id')).toBe(false);
 });
 it('requires the correct product entitlement', async () => {
  await expect(requirePro('call')).rejects.toMatchObject({status:401});
  m.user={id:'owner',email:'owner@example.com'};
  await expect(requirePro('call')).rejects.toMatchObject({status:403});
  m.pro=true; await expect(requirePro('call')).resolves.toEqual(m.user);
  await expect(requirePro('discovery')).rejects.toMatchObject({status:403});
 });
 it('fails closed when cron secret is unset', () => {
  expect(serviceAuthorized(new Request('https://app.test'))).toBe(false);
  process.env.CRON_SECRET='secret';
  expect(serviceAuthorized(new Request('https://app.test',{headers:{authorization:'Bearer secret'}}))).toBe(true);
  expect(serviceAuthorized(new Request('https://app.test',{headers:{authorization:'Bearer wrong'}}))).toBe(false);
 });
 it('bounds streamed bytes and rejects cross-origin mutations', async () => {
  await expect(readLabJson(new Request('https://app.test',{method:'POST',body:'{"x":"123456789"}'}),8)).rejects.toMatchObject({status:413});
  await expect(readLabJson(new Request('https://app.test',{method:'POST',body:'{}',headers:{origin:'https://evil.test'}}))).rejects.toMatchObject({status:403});
 });
 it('fails closed on quota errors and enforces exhausted quotas', async () => {
  m.error={message:'offline'}; await expect(limitLab(new Request('https://app.test'),'test')).rejects.toMatchObject({status:503});
  m.error=null;m.quota=false; await expect(limitLab(new Request('https://app.test'),'test')).rejects.toMatchObject({status:429});
 });
});
