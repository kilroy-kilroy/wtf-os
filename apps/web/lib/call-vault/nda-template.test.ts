import { describe, it, expect } from 'vitest';
import { CALL_VAULT_NDA_HTML, CALL_VAULT_NDA_VARIABLES, CALL_VAULT_NDA_SLUG } from '@/lib/call-vault/nda-template';

function merge(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (m, key) =>
    key.startsWith('sig_') || key.startsWith('date_') || key.startsWith('init_') ? m : values[key] ?? m);
}

const VALUES = {
  client_legal_name: 'Reed Media LLC',
  client_address: '12 Main St, Boston, MA 02116',
  effective_date: 'September 3, 2026',
};

describe('Call Vault NDA template', () => {
  it('has a stable slug', () => {
    expect(CALL_VAULT_NDA_SLUG).toBe('call-vault-nda');
  });

  it('declares exactly the variables it uses', () => {
    const keys = CALL_VAULT_NDA_VARIABLES.map((v) => v.key).sort();
    expect(keys).toEqual(['client_address', 'client_legal_name', 'effective_date']);
  });

  it('leaves no source placeholders behind', () => {
    for (const p of ['[DATE]', '[CLIENT LEGAL NAME]', '[state]', '[entity type]', '[address]']) {
      expect(CALL_VAULT_NDA_HTML).not.toContain(p);
    }
  });

  it('fully merges — no unreplaced {{...}} except Firma anchors', () => {
    const merged = merge(CALL_VAULT_NDA_HTML, VALUES);
    const leftover = merged.match(/\{\{(\w+)\}\}/g) ?? [];
    expect(leftover.sort()).toEqual(['{{date_client}}', '{{sig_client}}']);
  });

  it('carries the client signature anchors and NO counter anchors — KLRY is pre-signed', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('{{sig_client}}');
    expect(CALL_VAULT_NDA_HTML).toContain('{{date_client}}');
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{sig_counter}}');
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{date_counter}}');
  });

  it('requests no per-page initials (drives useInitials=false in the service)', () => {
    expect(CALL_VAULT_NDA_HTML).not.toContain('{{init_');
  });

  it('uses no <table> — the PDF renderer has no table branch and would drop it', () => {
    expect(CALL_VAULT_NDA_HTML.toLowerCase()).not.toContain('<table');
  });

  it('pre-executes the KLRY signature block as typed text', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Tim Kilroy');
    expect(CALL_VAULT_NDA_HTML).toContain('KLRY LLC');
  });

  it('fixes the source typo', () => {
    expect(CALL_VAULT_NDA_HTML).not.toContain('(30)days');
    expect(CALL_VAULT_NDA_HTML).toContain('(30) days');
  });

  it('keeps the anonymized-data license — it is what authorizes aggregate analysis', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Anonymized Data');
    expect(CALL_VAULT_NDA_HTML).toMatch(/perpetual, irrevocable, worldwide, royalty-free/);
  });

  it('keeps Massachusetts governing law and Middlesex County venue', () => {
    expect(CALL_VAULT_NDA_HTML).toContain('Commonwealth of Massachusetts');
    expect(CALL_VAULT_NDA_HTML).toContain('Middlesex County');
  });
});
