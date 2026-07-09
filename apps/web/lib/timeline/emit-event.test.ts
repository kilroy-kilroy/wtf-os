import { describe, it, expect } from 'vitest';
import { emitTimelineEvent } from './emit-event';

function stubClient() {
  const upserts: any[] = [];
  const client: any = {
    from() {
      return {
        upsert: (row: any, opts: any) => {
          upserts.push({ row, opts });
          return Promise.resolve({ error: null });
        },
      };
    },
    _upserts: upserts,
  };
  return client;
}

describe('emitTimelineEvent', () => {
  it('upserts a row keyed on source_type+source_id', async () => {
    const client = stubClient();
    await emitTimelineEvent(client, {
      contactId: 'c1',
      sourceType: 'assessment',
      sourceId: 'a1',
      occurredAt: '2026-07-09T00:00:00Z',
      title: 'GrowthOS assessment',
    });
    expect(client._upserts).toHaveLength(1);
    const { row, opts } = client._upserts[0];
    expect(row.contact_id).toBe('c1');
    expect(row.source_type).toBe('assessment');
    expect(row.source_id).toBe('a1');
    expect(row.title).toBe('GrowthOS assessment');
    expect(row.payload).toEqual({});
    expect(opts.onConflict).toBe('source_type,source_id');
  });
});
