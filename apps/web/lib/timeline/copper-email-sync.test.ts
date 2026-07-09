// apps/web/lib/timeline/copper-email-sync.test.ts
import { describe, it, expect } from 'vitest';
import { copperEmailToEvent } from './copper-email-sync';

describe('copperEmailToEvent', () => {
  it('maps a copper email to an email timeline event', () => {
    const e = copperEmailToEvent(
      {
        id: 42,
        subject: 'Proposal follow-up',
        snippet: 'Circling back…',
        senderEmail: 'jane@acme.co',
        occurredAt: '2026-07-08T12:00:00Z',
      },
      { id: 'c1', company_id: 'co1' },
    );
    expect(e).toMatchObject({
      contactId: 'c1',
      companyId: 'co1',
      sourceType: 'email',
      sourceId: 'copper:42',
      title: 'Email: Proposal follow-up',
      summary: 'Circling back…',
      occurredAt: '2026-07-08T12:00:00Z',
    });
  });

  it('carries the copper activity id and sender in the payload', () => {
    const e = copperEmailToEvent(
      {
        id: 'act-7',
        subject: 'Re: pricing',
        snippet: '',
        senderEmail: 'bob@acme.co',
        occurredAt: '2026-07-01T00:00:00Z',
      },
      { id: 'c2', company_id: null },
    );
    expect(e.companyId).toBeNull();
    expect(e.payload).toMatchObject({ copperActivityId: 'act-7', from: 'bob@acme.co' });
  });
});
