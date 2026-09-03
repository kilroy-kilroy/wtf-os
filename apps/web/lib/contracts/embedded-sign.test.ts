import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendSigningRequest = vi.fn();
const createSigningRequest = vi.fn();
const getSigningUserIds = vi.fn();

vi.mock('@/lib/firma', () => ({
  createSigningRequest: (...a: unknown[]) => createSigningRequest(...a),
  sendSigningRequest: (...a: unknown[]) => sendSigningRequest(...a),
  getSigningUserIds: (...a: unknown[]) => getSigningUserIds(...a),
  embeddedSigningUrl: (id: string) => `https://app.firma.dev/signing/${id}`,
  getRequest: vi.fn(),
  shouldApplyStatus: vi.fn(),
}));

vi.mock('@/lib/contracts/contract-pdf', () => ({
  renderContractPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

vi.mock('@/lib/contracts/template-engine', () => ({
  combineMergedHtml: vi.fn().mockReturnValue('<p>NDA body {{sig_client}}</p>'),
}));

// Minimal chainable Supabase stub. Each `from()` call returns a builder whose
// terminal method resolves the queued result for that table.
const claimed = {
  id: 'c1', template_id: 't1', sow_template_id: null, title: 'NDA',
  field_values: {}, sow_html: '', firma_request_id: null,
};
const updateSpy = vi.fn();
const uploadSpy = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain; builder.eq = chain; builder.order = chain;
      builder.insert = chain; builder.update = (patch: unknown) => { updateSpy(table, patch); return builder; };
      builder.maybeSingle = async () => ({ data: table === 'contracts' ? claimed : null });
      builder.single = async () => ({
        data: table === 'contract_templates' ? { body_html: '<p>NDA</p>' } : null,
      });
      builder.then = undefined;
      if (table === 'contract_signers') {
        builder.select = () => ({
          eq: () => ({ order: async () => ({ data: [
            { role: 'client', name: 'Dana Reed', email: 'dana@example.com', sign_order: 1 },
          ] }) }),
        });
      }
      return builder;
    },
    storage: { from: () => ({ upload: uploadSpy }) },
  }),
}));

import { generateForEmbeddedSign } from '@/lib/contracts/service';

describe('generateForEmbeddedSign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSigningRequest.mockResolvedValue({ requestId: 'req-1', signerIds: { client: 'sig-1' } });
    getSigningUserIds.mockResolvedValue([{ id: 'rec-1', order: 1 }]);
  });

  it('NEVER sends the envelope — sending would email the signer and spend a credit', async () => {
    await generateForEmbeddedSign('c1');
    expect(sendSigningRequest).not.toHaveBeenCalled();
  });

  it('creates the envelope and returns the embedded signing URL', async () => {
    const out = await generateForEmbeddedSign('c1');
    expect(createSigningRequest).toHaveBeenCalledOnce();
    expect(out.requestId).toBe('req-1');
    expect(out.signingUserId).toBe('rec-1');
    expect(out.signingUrl).toBe('https://app.firma.dev/signing/rec-1');
  });

  it('persists the firma request id before returning, so a crash stays correlatable', async () => {
    await generateForEmbeddedSign('c1');
    const persisted = updateSpy.mock.calls.find(
      ([table, patch]) => table === 'contracts' && (patch as Record<string, unknown>).firma_request_id === 'req-1',
    );
    expect(persisted).toBeTruthy();
  });

  it('throws when Firma returns no recipients', async () => {
    getSigningUserIds.mockResolvedValue([]);
    await expect(generateForEmbeddedSign('c1')).rejects.toThrow(/recipient/i);
  });
});
