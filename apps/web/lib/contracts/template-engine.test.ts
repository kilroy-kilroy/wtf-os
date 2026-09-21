import { describe, it, expect } from 'vitest';
import {
  merge, extractVariables, combineMergedHtml, SIGNATURE_ANCHORS,
  hasSowSlot, assertSowHasDestination,
} from './template-engine';

describe('combineMergedHtml', () => {
  it('returns the base only when there is no SOW body', () => {
    expect(combineMergedHtml('<p>{{a}}</p>{{sow}}', null, { a: 'X' }, 'S')).toBe('<p>X</p>S');
  });
  it('appends the SOW after a page break', () => {
    const out = combineMergedHtml('<p>{{a}}</p>', '<h2>SOW</h2>{{sow}}', { a: 'X' }, 'Scope');
    expect(out).toBe('<p>X</p><div class="page-break"></div><h2>SOW</h2>Scope');
  });
});

describe('extractVariables', () => {
  it('returns unique placeholder keys, excluding the sow slot and signature anchors', () => {
    const html = '<p>{{company_name}} at {{address}} — {{company_name}}</p>{{sow}}{{sig_client}}';
    expect(extractVariables(html)).toEqual(['address', 'company_name']);
  });
});

describe('merge', () => {
  it('substitutes field values and injects the SOW at the {{sow}} slot', () => {
    const out = merge('<h1>{{company_name}}</h1>{{sow}}', { company_name: 'Acme' }, '<p>Build stuff</p>');
    expect(out).toBe('<h1>Acme</h1><p>Build stuff</p>');
  });

  it('HTML-escapes field values to prevent injection', () => {
    const out = merge('<p>{{name}}</p>{{sow}}', { name: '<script>x</script>' }, '');
    expect(out).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });

  it('preserves signature anchors for Firma (does not treat them as missing)', () => {
    const out = merge('{{sow}}<div>{{sig_client}}</div>', {}, 'SOW');
    expect(out).toBe('SOW<div>{{sig_client}}</div>');
  });

  it('preserves per-page initials anchors for Firma', () => {
    const out = merge('{{sow}}<span>{{init_client}}{{init_counter}}</span>', {}, 'S');
    expect(out).toBe('S<span>{{init_client}}{{init_counter}}</span>');
  });

  it('throws listing every missing required field', () => {
    expect(() => merge('{{a}} {{b}}{{sow}}', { a: 'x' }, '')).toThrowError(/missing.*b/i);
  });

  it('exposes the reserved signature anchor names', () => {
    expect(SIGNATURE_ANCHORS).toContain('sig_client');
    expect(SIGNATURE_ANCHORS).toContain('sig_counter');
  });
});

// Regression: an MSA has no {{sow}} slot, so scope drafted against it merged
// into nothing and the client was emailed an MSA with no Statement of Work —
// no error, no warning. See the 2026-09-21 Link Helpers send.
describe('assertSowHasDestination', () => {
  const MSA = '<h1>Master Services Agreement</h1><p>{{client_company_name}}</p>';
  const SOW = '<h2>Statement of Work</h2>{{sow}}';

  it('throws when SOW scope was written but no document has a {{sow}} slot', () => {
    expect(() => assertSowHasDestination(MSA, null, '<p>Build the thing</p>'))
      .toThrowError(/statement of work.*dropped silently/is);
  });

  it('throws when the attached schedule is a fixed document with no slot', () => {
    const fixed = '<h2>Agency Studio Plus</h2><p>$999/mo</p>';
    expect(() => assertSowHasDestination(MSA, fixed, '<p>Scope</p>')).toThrowError(/dropped silently/i);
  });

  it('passes when an attached SOW template supplies the slot', () => {
    expect(() => assertSowHasDestination(MSA, SOW, '<p>Scope</p>')).not.toThrow();
  });

  it('passes when the base document itself carries the slot', () => {
    expect(() => assertSowHasDestination(SOW, null, '<p>Scope</p>')).not.toThrow();
  });

  it('stays quiet when there is no SOW content to lose', () => {
    expect(() => assertSowHasDestination(MSA, null, '')).not.toThrow();
    expect(() => assertSowHasDestination(MSA, null, '   ')).not.toThrow();
    expect(() => assertSowHasDestination(MSA, null, null)).not.toThrow();
  });
});

describe('hasSowSlot', () => {
  it('detects the slot regardless of spacing or case', () => {
    expect(hasSowSlot('a{{sow}}b')).toBe(true);
    expect(hasSowSlot('a{{ SOW }}b')).toBe(true);
  });

  it('is false for a body without the slot, and for nothing at all', () => {
    expect(hasSowSlot('<p>{{client_company_name}}</p>')).toBe(false);
    expect(hasSowSlot(null)).toBe(false);
  });

  // A /g regex keeps `lastIndex` between calls, so a shared one would answer
  // true, false, true, ... for the same input.
  it('returns the same answer when asked repeatedly', () => {
    expect([1, 2, 3].map(() => hasSowSlot('x{{sow}}y'))).toEqual([true, true, true]);
  });
});
