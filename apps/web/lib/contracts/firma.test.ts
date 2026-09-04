import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhook, mapFirmaStatus, getSigningUserIds } from '@/lib/firma';

describe('mapFirmaStatus', () => {
  it('maps Firma event types to our contract statuses', () => {
    expect(mapFirmaStatus('signing_request.viewed')).toBe('viewed');
    expect(mapFirmaStatus('signing_request.recipient.signed')).toBe('signed');
    expect(mapFirmaStatus('signing_request.completed')).toBe('completed');
    expect(mapFirmaStatus('signing_request.recipient.declined')).toBe('declined');
    expect(mapFirmaStatus('signing_request.cancelled')).toBe('voided');
    expect(mapFirmaStatus('signing_request.expired')).toBe('voided');
  });
  it('returns null for events we do not track', () => {
    expect(mapFirmaStatus('signing_request.created')).toBeNull();
  });
});

describe('verifyWebhook', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ type: 'signing_request.completed' });
  const ts = '1707500000';
  const sign = (t: string, b: string) => crypto.createHmac('sha256', secret).update(`${t}.${b}`).digest('hex');
  const header = (t: string, v1: string) => `t=${t},v1=${v1}`;

  it('accepts a correct t=,v1= signature over `{ts}.{body}`', () => {
    expect(verifyWebhook(body, header(ts, sign(ts, body)), secret)).toBe(true);
  });
  it('rejects a tampered signature', () => {
    expect(verifyWebhook(body, header(ts, 'deadbeef'), secret)).toBe(false);
  });
  it('rejects when the body was altered', () => {
    expect(verifyWebhook(body + 'x', header(ts, sign(ts, body)), secret)).toBe(false);
  });
  it('rejects a malformed header', () => {
    expect(verifyWebhook(body, 'garbage', secret)).toBe(false);
  });
});

describe('getSigningUserIds', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubFetch(body: unknown, ok = true) {
    vi.stubEnv('FIRMA_ENV', 'test');
    vi.stubEnv('FIRMA_API_KEY_TEST', 'firma_test_key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('returns recipients ordered by signing order', async () => {
    stubFetch({
      results: [
        { id: 'rec-2', email: 'b@x.com', order: 2 },
        { id: 'rec-1', email: 'a@x.com', order: 1 },
      ],
    });
    const out = await getSigningUserIds('req-123');
    expect(out.map((r) => r.id)).toEqual(['rec-1', 'rec-2']);
  });

  it('tolerates a bare array response', async () => {
    stubFetch([{ id: 'rec-1' }]);
    const out = await getSigningUserIds('req-123');
    expect(out).toEqual([{ id: 'rec-1', email: undefined, order: undefined }]);
  });

  it('tolerates objects carrying only an id — order and email are unconfirmed in the docs', async () => {
    stubFetch({ results: [{ id: 'only-id' }] });
    const out = await getSigningUserIds('req-123');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('only-id');
  });

  it('drops entries with no id rather than returning undefined ids', async () => {
    stubFetch({ results: [{ email: 'ghost@x.com' }, { id: 'real' }] });
    const out = await getSigningUserIds('req-123');
    expect(out.map((r) => r.id)).toEqual(['real']);
  });

  it('calls the /users endpoint for the request', async () => {
    const fetchMock = stubFetch({ results: [{ id: 'rec-1' }] });
    await getSigningUserIds('req-abc');
    expect(fetchMock.mock.calls[0][0]).toContain('/signing-requests/req-abc/users');
  });
});
