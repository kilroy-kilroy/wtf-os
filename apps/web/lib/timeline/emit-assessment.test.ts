// apps/web/lib/timeline/emit-assessment.test.ts
import { describe, it, expect, vi } from 'vitest';

// Vitest hoists vi.mock() factories above top-level statements, including
// plain `const` declarations, which trips a TDZ error ("Cannot access before
// initialization") if the factory references such a const directly. vi.hoisted()
// is the documented escape hatch: its callback runs eagerly, alongside the
// hoisted vi.mock calls, so the mocks are initialized before use.
const { mockResolveContact, mockEmitTimelineEvent } = vi.hoisted(() => ({
  mockResolveContact: vi.fn(),
  mockEmitTimelineEvent: vi.fn(),
}));
vi.mock('./resolve-contact', () => ({ resolveContact: mockResolveContact }));
vi.mock('./emit-event', () => ({ emitTimelineEvent: mockEmitTimelineEvent }));

import { emitAssessmentEvent } from './emit-assessment';

describe('emitAssessmentEvent', () => {
  it('resolves the contact then emits an assessment event', async () => {
    mockResolveContact.mockResolvedValue({ id: 'c1', company_id: 'co1' });
    mockEmitTimelineEvent.mockResolvedValue(undefined);
    await emitAssessmentEvent({} as any, {
      id: 'a1', email: 'jane@acme.co', name: 'Jane',
      created_at: '2026-07-09T00:00:00Z', score: 68,
    }, 'biz_dev');
    expect(mockResolveContact).toHaveBeenCalledWith({}, 'jane@acme.co',
      { name: 'Jane', companyName: undefined, url: undefined });
    const emit = mockEmitTimelineEvent.mock.calls[0][1];
    expect(emit.sourceType).toBe('assessment');
    expect(emit.sourceId).toBe('biz_dev:a1');
    expect(emit.contactId).toBe('c1');
    expect(emit.title).toContain('Biz Dev');
  });

  it('no-ops when the email cannot resolve', async () => {
    mockResolveContact.mockResolvedValue(null);
    mockEmitTimelineEvent.mockClear();
    await emitAssessmentEvent({} as any, { id: 'a2', email: null }, 'growthos');
    expect(mockEmitTimelineEvent).not.toHaveBeenCalled();
  });
});
