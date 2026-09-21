import { describe, it, expect, vi, beforeEach } from 'vitest';

const cancelSigningRequest = vi.fn();
const getRequestStatus = vi.fn();

vi.mock('@/lib/firma', () => ({
  cancelSigningRequest: (...a: unknown[]) => cancelSigningRequest(...a),
  getRequestStatus: (...a: unknown[]) => getRequestStatus(...a),
  createSigningRequest: vi.fn(),
  createSigningRequestWithFields: vi.fn(),
  countPdfPages: () => 1,
  sendSigningRequest: vi.fn(),
  getSignedPdf: vi.fn(),
  shouldApplyStatus: vi.fn(),
  getSigningUserIds: vi.fn(),
  embeddedSigningUrl: (id: string) => id,
}));

vi.mock('@/lib/contracts/contract-pdf', () => ({ renderContractPdf: vi.fn() }));
vi.mock('@repo/pdf', () => ({ SIGNATURE_LAYOUT: {}, INITIALS_LAYOUT: {} }));

const row = { id: 'c1', status: 'sent', firma_request_id: 'req-1' };
const updateSpy = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {};
      const chain = () => b;
      b.select = chain; b.eq = chain;
      b.update = (patch: unknown) => { updateSpy(patch); return b; };
      b.single = async () => ({ data: row.id ? row : null });
      return b;
    },
  }),
}));

import { voidContract } from '@/lib/contracts/service';

describe('voidContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    row.status = 'sent';
    row.firma_request_id = 'req-1';
    getRequestStatus.mockResolvedValue('sent');
    cancelSigningRequest.mockResolvedValue({ emailsSent: 1 });
  });

  it('cancels at Firma and settles the row to voided', async () => {
    const out = await voidContract('c1');
    expect(cancelSigningRequest).toHaveBeenCalledWith('req-1');
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'voided' }));
    expect(out.emailsSent).toBe(1);
  });

  // A part-executed agreement is a legal artefact. Our own status can lag, so
  // the live check is what stands between a stale row and destroying ink.
  it('refuses when Firma says it is already signed, even if our row says sent', async () => {
    getRequestStatus.mockResolvedValue('signed');
    await expect(voidContract('c1')).rejects.toThrowError(/already 'signed'/i);
    expect(cancelSigningRequest).not.toHaveBeenCalled();
  });

  it('refuses when Firma says it is completed', async () => {
    getRequestStatus.mockResolvedValue('completed');
    await expect(voidContract('c1')).rejects.toThrowError(/already 'completed'/i);
    expect(cancelSigningRequest).not.toHaveBeenCalled();
  });

  it('refuses to void a contract that never reached Firma', async () => {
    row.firma_request_id = '';
    await expect(voidContract('c1')).rejects.toThrowError(/no Firma envelope/i);
    expect(cancelSigningRequest).not.toHaveBeenCalled();
  });

  it('refuses a state that was never live, so a draft is deleted rather than voided', async () => {
    row.status = 'draft';
    await expect(voidContract('c1')).rejects.toThrowError(/cannot void.*'draft'/i);
    expect(cancelSigningRequest).not.toHaveBeenCalled();
  });

  // Already cancelled at Firma (a webhook we missed, or someone used the
  // dashboard): settle our row without emailing the signers a second time.
  it('settles the row without re-cancelling when Firma already voided it', async () => {
    getRequestStatus.mockResolvedValue('voided');
    const out = await voidContract('c1');
    expect(cancelSigningRequest).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'voided' }));
    expect(out.emailsSent).toBe(0);
  });
});
