import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression guard for the 2026-09-21 Link Helpers send: a Statement of Work
// was written against an MSA, the MSA has no {{sow}} slot, the scope merged
// into nothing, and the client was emailed an MSA-only contract with no error.
// Creating the envelope also notifies the client, so this must fail BEFORE the
// Firma call — a warning after the fact buys nothing.

const createSigningRequestWithFields = vi.fn();

vi.mock('@/lib/firma', () => ({
  createSigningRequest: vi.fn(),
  createSigningRequestWithFields: (...a: unknown[]) => createSigningRequestWithFields(...a),
  countPdfPages: () => 4,
  sendSigningRequest: vi.fn(),
  getRequestStatus: vi.fn(),
  getSignedPdf: vi.fn(),
  shouldApplyStatus: vi.fn(),
  getSigningUserIds: vi.fn(),
  embeddedSigningUrl: (id: string) => `https://app.firma.dev/signing/${id}`,
}));

vi.mock('@/lib/contracts/contract-pdf', () => ({
  renderContractPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

vi.mock('@repo/pdf', () => ({
  SIGNATURE_LAYOUT: {
    client: { signature: { x: 10, y: 30, width: 34, height: 7 }, date: { x: 52, y: 30, width: 26, height: 7 } },
    counter: { signature: { x: 10, y: 58, width: 34, height: 7 }, date: { x: 52, y: 58, width: 26, height: 7 } },
  },
  INITIALS_LAYOUT: {
    client: { x: 81.5, y: 93.5, width: 8, height: 1.8 },
    counter: { x: 81.5, y: 95.8, width: 8, height: 1.8 },
  },
}));

// The real template-engine is deliberately NOT mocked — the guard under test
// lives there, and a stub would test the stub.

const MSA_NO_SLOT = '<h1>Master Services Agreement</h1><p>{{client_company_name}}</p>';
const SOW_WITH_SLOT = '<h2>Statement of Work</h2><p>{{client_company_name}}</p>{{sow}}';

const claimed = {
  id: 'c1', template_id: 't-msa', sow_template_id: null as string | null,
  title: 'Link Helpers LLC — Master Services Agreement',
  field_values: { client_company_name: 'Link Helpers LLC' },
  sow_html: '<p>Two workshops and a roadmap.</p>',
  firma_request_id: null as string | null,
};
let templateBodies: string[] = [];
const updateSpy = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain; builder.eq = chain; builder.order = chain; builder.insert = chain;
      builder.update = (patch: unknown) => { updateSpy(table, patch); return builder; };
      builder.maybeSingle = async () => ({ data: table === 'contracts' ? claimed : null });
      builder.single = async () => ({
        data: table === 'contract_templates' ? { body_html: templateBodies.shift() } : null,
      });
      if (table === 'contract_signers') {
        builder.select = () => ({
          eq: () => ({ order: async () => ({ data: [
            { id: 's1', role: 'client', name: 'Dana Reed', email: 'dana@example.com', sign_order: 1 },
            { id: 's2', role: 'counter', name: 'Tim Kilroy', email: 'tim@timkilroy.com', sign_order: 2 },
          ] }) }),
        });
      }
      return builder;
    },
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
  }),
}));

import { generateAndSend } from '@/lib/contracts/service';

describe('generateAndSend — Statement of Work with nowhere to land', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimed.sow_template_id = null;
    claimed.firma_request_id = null;
    createSigningRequestWithFields.mockResolvedValue({ requestId: 'r1', signerIds: { client: 'u1' } });
  });

  it('refuses to send when the SOW would be dropped, and never reaches Firma', async () => {
    templateBodies = [MSA_NO_SLOT];
    await expect(generateAndSend('c1')).rejects.toThrowError(/dropped silently/i);
    expect(createSigningRequestWithFields).not.toHaveBeenCalled();
  });

  it('rolls the contract back to draft with the reason, so it can be fixed and resent', async () => {
    templateBodies = [MSA_NO_SLOT];
    await expect(generateAndSend('c1')).rejects.toThrow();

    const rollback = updateSpy.mock.calls
      .map(([, patch]) => patch as { status?: string; last_error?: string })
      .find((patch) => patch.status === 'draft');
    expect(rollback?.last_error).toMatch(/statement of work/i);
  });

  it('sends normally once a Statement of Work template supplies the slot', async () => {
    claimed.sow_template_id = 't-sow';
    templateBodies = [MSA_NO_SLOT, SOW_WITH_SLOT];

    await generateAndSend('c1');

    expect(createSigningRequestWithFields).toHaveBeenCalledTimes(1);
    const merged = updateSpy.mock.calls
      .map(([, patch]) => patch as { merged_html?: string })
      .find((patch) => patch.merged_html)?.merged_html;
    expect(merged).toContain('Two workshops and a roadmap.');
    expect(merged).toContain('page-break');
  });

  it('lets a contract with no SOW content through untouched', async () => {
    claimed.sow_html = '';
    templateBodies = [MSA_NO_SLOT];
    try {
      await generateAndSend('c1');
      expect(createSigningRequestWithFields).toHaveBeenCalledTimes(1);
    } finally {
      claimed.sow_html = '<p>Two workshops and a roadmap.</p>';
    }
  });
});
