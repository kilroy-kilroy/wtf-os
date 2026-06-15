import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhook, mapFirmaStatus } from '@/lib/firma';

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
