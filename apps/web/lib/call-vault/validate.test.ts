import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  ownsStoragePath,
  sanitizeFileName,
  validateAboutYou,
  validateCallMeta,
  isSessionExpired,
  shouldSendResumeLink,
  MAX_FILE_BYTES,
} from '@/lib/call-vault/validate';

describe('classifyFile', () => {
  it('classifies text transcript formats', () => {
    expect(classifyFile('call.txt', 'text/plain')).toEqual({ ok: true, kind: 'transcript' });
    expect(classifyFile('call.vtt', 'text/vtt')).toEqual({ ok: true, kind: 'transcript' });
    expect(classifyFile('NOTES.DOCX', '')).toEqual({ ok: true, kind: 'transcript' });
  });

  it('classifies pdf separately from other text', () => {
    expect(classifyFile('deck.pdf', 'application/pdf')).toEqual({ ok: true, kind: 'pdf' });
  });

  it('classifies audio', () => {
    expect(classifyFile('call.mp3', 'audio/mpeg')).toEqual({ ok: true, kind: 'audio' });
    expect(classifyFile('call.m4a', '')).toEqual({ ok: true, kind: 'audio' });
  });

  it('rejects video even when the extension looks harmless', () => {
    const r = classifyFile('call.mp4', 'video/mp4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/video/i);
  });

  it('rejects unknown extensions', () => {
    expect(classifyFile('payload.exe', '').ok).toBe(false);
    expect(classifyFile('noextension', '').ok).toBe(false);
  });

  it('rejects a video mime type wearing an audio extension', () => {
    expect(classifyFile('call.mp3', 'video/mp4').ok).toBe(false);
  });
});

describe('ownsStoragePath', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('accepts a path under the contributor prefix', () => {
    expect(ownsStoragePath(`${id}/call-abc/file.mp3`, id)).toBe(true);
  });

  it('rejects another contributor prefix', () => {
    expect(ownsStoragePath('22222222-2222-2222-2222-222222222222/x/f.mp3', id)).toBe(false);
  });

  it('rejects traversal and prefix-collision attempts', () => {
    expect(ownsStoragePath(`${id}/../other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}-evil/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`x/${id}/f.mp3`, id)).toBe(false);
  });

  it('rejects percent-encoded traversal attempts', () => {
    expect(ownsStoragePath(`${id}/%2e%2e/other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/%2E%2E/other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/.%2e/other/f.mp3`, id)).toBe(false);
  });

  it('rejects unsafe characters (backslash, null byte, etc)', () => {
    expect(ownsStoragePath(`${id}/sub\\..\\f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/file\x00.mp3`, id)).toBe(false);
  });

  it('still accepts valid paths under the contributor prefix', () => {
    expect(ownsStoragePath(`${id}/call-abc/file.mp3`, id)).toBe(true);
  });

  it('accepts a legitimate filename containing two consecutive dots', () => {
    expect(ownsStoragePath(`${id}/call-abc/uuid-notes..txt`, id)).toBe(true);
    expect(ownsStoragePath(`${id}/call-abc/uuid-call...mp3`, id)).toBe(true);
  });

  it('still blocks a `..` path segment even with the exact-segment check', () => {
    expect(ownsStoragePath(`${id}/../evil/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`../${id}/f.mp3`, id)).toBe(false);
  });

  it('still rejects percent-encoded, backslash, and null-byte cases', () => {
    expect(ownsStoragePath(`${id}/%2e%2e/other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/%2E%2E/other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/.%2e/other/f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/sub\\..\\f.mp3`, id)).toBe(false);
    expect(ownsStoragePath(`${id}/file\x00.mp3`, id)).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  it('replaces spaces and slashes with underscores', () => {
    expect(sanitizeFileName('my call/notes.txt')).toBe('my_call_notes.txt');
    expect(sanitizeFileName('my call/notes.txt')).not.toMatch(/\//);
  });

  it('preserves consecutive dots', () => {
    expect(sanitizeFileName('notes..txt')).toBe('notes..txt');
  });

  it('agrees with ownsStoragePath: a sanitized filename never produces a path it rejects', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const callId = 'call-abc';
    const dangerous = 'Acme call..transcript.txt';
    const safeName = sanitizeFileName(dangerous);
    const storagePath = `${id}/${callId}/uuid-${safeName}`;
    expect(ownsStoragePath(storagePath, id)).toBe(true);
  });
});

describe('validateAboutYou', () => {
  const base = {
    name: 'Dana Reed',
    email: 'dana@example.com',
    agencyName: 'Reed Media',
    agencyUrl: 'https://reedmedia.com',
    services: ['paid_media', 'seo'],
    revenueBand: '1m_3m',
    targetClient: 'DTC brands',
    termsAccepted: true,
  };

  it('accepts a complete payload', () => {
    const r = validateAboutYou(base);
    expect(r.ok).toBe(true);
  });

  it('requires a name and a valid email', () => {
    expect(validateAboutYou({ ...base, name: '  ' }).ok).toBe(false);
    expect(validateAboutYou({ ...base, email: 'not-an-email' }).ok).toBe(false);
  });

  it('requires the consent checkbox', () => {
    const r = validateAboutYou({ ...base, termsAccepted: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/consent|terms/i);
  });

  it('rejects unknown vocabulary values', () => {
    expect(validateAboutYou({ ...base, services: ['astrology'] }).ok).toBe(false);
    expect(validateAboutYou({ ...base, revenueBand: 'squillions' }).ok).toBe(false);
  });

  it('normalizes the email to lowercase and trims text', () => {
    const r = validateAboutYou({ ...base, email: '  Dana@Example.COM ', name: ' Dana Reed ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe('dana@example.com');
      expect(r.value.name).toBe('Dana Reed');
    }
  });
});

describe('validateCallMeta', () => {
  it('accepts known vocabulary values', () => {
    expect(validateCallMeta({ stage: 'discovery', outcome: 'won', dealSizeBand: '5k_10k_mo' }).ok).toBe(true);
  });

  it('accepts an entirely empty payload — call metadata is optional', () => {
    expect(validateCallMeta({}).ok).toBe(true);
  });

  it('rejects an unknown stage', () => {
    expect(validateCallMeta({ stage: 'vibes' }).ok).toBe(false);
  });
});

describe('isSessionExpired', () => {
  const now = new Date('2026-09-03T12:00:00Z');

  it('treats a future expiry as live', () => {
    expect(isSessionExpired('2026-09-03T12:00:01Z', now)).toBe(false);
  });

  it('treats a past expiry as expired', () => {
    expect(isSessionExpired('2026-09-03T11:59:59Z', now)).toBe(true);
  });

  it('treats a missing expiry as expired — never fail open', () => {
    expect(isSessionExpired(null, now)).toBe(true);
    expect(isSessionExpired('', now)).toBe(true);
  });

  it('treats an unparseable expiry as expired', () => {
    expect(isSessionExpired('not-a-date', now)).toBe(true);
  });
});

describe('shouldSendResumeLink', () => {
  const now = new Date('2026-09-03T12:00:00Z');

  it('sends when there is no token at all', () => {
    expect(shouldSendResumeLink(null, null, now)).toBe(true);
  });

  it('sends when the existing token was already used', () => {
    expect(shouldSendResumeLink('2026-09-04T11:00:00Z', '2026-09-03T10:00:00Z', now)).toBe(true);
  });

  it('sends when the existing token has expired', () => {
    expect(shouldSendResumeLink('2026-09-03T11:00:00Z', null, now)).toBe(true);
  });

  it('withholds when a live token was minted about 5 minutes ago (expiry ~23h55m out)', () => {
    expect(shouldSendResumeLink('2026-09-04T11:55:00Z', null, now)).toBe(false);
  });

  it('sends when a live token was minted about 2 hours ago (expiry ~22h out)', () => {
    expect(shouldSendResumeLink('2026-09-04T10:00:00Z', null, now)).toBe(true);
  });

  it('sends when the expiry is unparseable — never fail toward silence', () => {
    expect(shouldSendResumeLink('not-a-date', null, now)).toBe(true);
  });
});

describe('limits', () => {
  it('caps files at 200MB', () => {
    expect(MAX_FILE_BYTES).toBe(200 * 1024 * 1024);
  });
});
