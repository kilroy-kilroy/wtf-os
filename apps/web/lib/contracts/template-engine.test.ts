import { describe, it, expect } from 'vitest';
import { merge, extractVariables, SIGNATURE_ANCHORS } from './template-engine';

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
