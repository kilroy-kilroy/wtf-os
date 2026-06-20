import { describe, it, expect } from 'vitest';
import { companyNameMatches } from '../research';

describe('companyNameMatches (discovery-lab entity-verification gate)', () => {
  it('matches identical names', () => {
    expect(companyNameMatches('Acme Corp', 'Acme Corp')).toBe(true);
  });

  it('matches across corporate-suffix and punctuation noise', () => {
    expect(companyNameMatches('InteractOne, Inc.', 'InteractOne')).toBe(true);
    expect(companyNameMatches('Acme LLC', 'The Acme Company')).toBe(true);
    expect(companyNameMatches('Smith & Co.', 'Smith')).toBe(true);
  });

  it('matches when one name contains the other', () => {
    expect(companyNameMatches('Acme', 'Acme Marketing Group')).toBe(true);
  });

  it('matches on majority token overlap (word reordering / extra words)', () => {
    expect(companyNameMatches('Blue Ocean Digital', 'Blue Ocean')).toBe(true);
  });

  it('rejects two distinct, conflicting companies (the wrong-person case)', () => {
    // The bug: a guessed LinkedIn profile resolves to a different human whose
    // employer is an unrelated company. The gate must catch this.
    expect(companyNameMatches('Searchable', 'Riverside Plumbing')).toBe(false);
    expect(companyNameMatches('Victor Labs', 'InteractOne')).toBe(false);
  });

  it('does NOT reject when employer data is missing (unverifiable, not wrong)', () => {
    expect(companyNameMatches('', 'InteractOne')).toBe(true);
    expect(companyNameMatches(undefined, 'InteractOne')).toBe(true);
    expect(companyNameMatches('InteractOne', null)).toBe(true);
  });
});
