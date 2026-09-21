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

// Per-page initials were lost in the 2026-09 anchor outage and restored as
// coordinate fields. The count has to line up with the rules the renderer draws
// — every page but the execution page — or a party is asked to initial a page
// with no line on it.
describe('createSigningRequestWithFields — per-page initials', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const SIGNERS = [
    { role: 'client' as const, name: 'Dana Reed', email: 'dana@example.com', order: 1 },
    { role: 'counter' as const, name: 'Tim Kilroy', email: 'tim@timkilroy.com', order: 2 },
  ];
  const SIG = { signature: { x: 10, y: 30, width: 34, height: 7 }, date: { x: 52, y: 30, width: 26, height: 7 } };
  const INIT = { x: 81.5, y: 93.5, width: 8, height: 1.8 };

  function stub() {
    vi.stubEnv('FIRMA_ENV', 'test');
    vi.stubEnv('FIRMA_API_KEY_TEST', 'firma_test_key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'req-1', recipients: [{ id: 'r1', order: 1 }, { id: 'r2', order: 2 }] }),
      text: async () => '{}',
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  const bodyOf = (fetchMock: ReturnType<typeof vi.fn>) =>
    JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);

  it('places one initial field per party on every page but the last', async () => {
    const { createSigningRequestWithFields } = await import('@/lib/firma');
    const fetchMock = stub();

    await createSigningRequestWithFields(
      Buffer.from('%PDF-1.4'),
      SIGNERS,
      { page: 5, byRole: { client: SIG, counter: SIG }, initials: { pages: 4, byRole: { client: INIT, counter: INIT } } },
      'MSA + SOW',
      { notify: true },
    );

    const fields = bodyOf(fetchMock).fields as Array<{ type: string; page_number: number; recipient_id: string }>;
    const initials = fields.filter((f) => f.type === 'initial');

    expect(initials).toHaveLength(8); // 4 pages x 2 parties
    expect(initials.filter((f) => f.recipient_id === 'temp_client').map((f) => f.page_number)).toEqual([1, 2, 3, 4]);
    expect(initials.every((f) => f.page_number !== 5)).toBe(true); // never the execution page
    expect(fields.filter((f) => f.type === 'signature')).toHaveLength(2);
    expect(fields.filter((f) => f.type === 'date')).toHaveLength(2);
  });

  it('asks for no initials when the caller does not want them (the embedded NDA)', async () => {
    const { createSigningRequestWithFields } = await import('@/lib/firma');
    const fetchMock = stub();

    await createSigningRequestWithFields(
      Buffer.from('%PDF-1.4'),
      [SIGNERS[0]],
      { page: 2, byRole: { client: SIG } },
      'NDA',
      { notify: false },
    );

    const fields = bodyOf(fetchMock).fields as Array<{ type: string }>;
    expect(fields.some((f) => f.type === 'initial')).toBe(false);
    expect(fields).toHaveLength(2);
  });

  it('puts the initials at exactly the coordinates it was given', async () => {
    const { createSigningRequestWithFields } = await import('@/lib/firma');
    const fetchMock = stub();

    await createSigningRequestWithFields(
      Buffer.from('%PDF-1.4'),
      [SIGNERS[0]],
      { page: 2, byRole: { client: SIG }, initials: { pages: 1, byRole: { client: INIT } } },
      'MSA',
      { notify: true },
    );

    const initial = (bodyOf(fetchMock).fields as Array<{ type: string; position: unknown }>)
      .find((f) => f.type === 'initial');
    expect(initial?.position).toEqual(INIT);
  });
});
