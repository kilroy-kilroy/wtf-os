import { describe, it, expect } from 'vitest';
import { normalizeEmail, deriveDomain, isFreeMailDomain } from './identity';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Tim@Example.COM ')).toBe('tim@example.com');
  });
  it('rejects strings without a single @domain', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('a@b@c.com')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('deriveDomain', () => {
  it('returns the domain', () => {
    expect(deriveDomain('tim@acme.co')).toBe('acme.co');
  });
  it('returns null for junk', () => {
    expect(deriveDomain('nope')).toBeNull();
  });
});

describe('isFreeMailDomain', () => {
  it('flags consumer providers', () => {
    expect(isFreeMailDomain('gmail.com')).toBe(true);
    expect(isFreeMailDomain('outlook.com')).toBe(true);
  });
  it('does not flag business domains', () => {
    expect(isFreeMailDomain('acme.co')).toBe(false);
  });
});
