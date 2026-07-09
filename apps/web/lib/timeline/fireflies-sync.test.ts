// apps/web/lib/timeline/fireflies-sync.test.ts
import { describe, it, expect } from 'vitest';
import { transcriptToEvents } from './fireflies-sync';

describe('transcriptToEvents', () => {
  it('emits one call event per matched attendee', () => {
    const resolved = new Map([
      ['jane@acme.co', { id: 'c1', company_id: 'co1' }],
      ['bob@acme.co', { id: 'c2', company_id: 'co1' }],
    ]);
    const events = transcriptToEvents(
      { id: 'ff1', title: 'Pricing call', date: 1751500800000,
        attendeeEmails: ['jane@acme.co', 'bob@acme.co', 'tim@timkilroy.com'] },
      resolved,
    );
    expect(events).toHaveLength(2); // tim not in resolved map
    expect(events[0]).toMatchObject({
      contactId: 'c1', sourceType: 'call', sourceId: 'ff1:c1',
      title: 'Call: Pricing call',
    });
    expect(events[1]).toMatchObject({ contactId: 'c2', sourceId: 'ff1:c2' });
  });

  it('dedupes two attendee emails that resolve to the same contact into one event', () => {
    const resolved = new Map([
      ['jane@acme.co', { id: 'c1', company_id: 'co1' }],
      ['jane.smith@acme.co', { id: 'c1', company_id: 'co1' }],
    ]);
    const events = transcriptToEvents(
      { id: 'ff3', title: 'Follow-up', date: 1751500800000,
        attendeeEmails: ['jane@acme.co', 'jane.smith@acme.co'] },
      resolved,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ contactId: 'c1', sourceId: 'ff3:c1' });
  });

  it('emits nothing when no attendee resolves', () => {
    expect(transcriptToEvents(
      { id: 'ff2', title: 'x', date: 1, attendeeEmails: ['nobody@x.com'] },
      new Map(),
    )).toEqual([]);
  });
});
