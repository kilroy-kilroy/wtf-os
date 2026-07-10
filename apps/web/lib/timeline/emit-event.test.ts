import { describe, it, expect } from 'vitest';
import { emitTimelineEvent } from './emit-event';

function stubClient(upsertResult: { error: any } = { error: null }) {
  const upserts: any[] = [];
  const client: any = {
    from() {
      return {
        upsert: (row: any, opts: any) => {
          upserts.push({ row, opts });
          return Promise.resolve(upsertResult);
        },
      };
    },
    _upserts: upserts,
  };
  return client;
}

describe('emitTimelineEvent', () => {
  it('upserts a row keyed on source_type+source_id and returns true on success', async () => {
    const client = stubClient();
    const result = await emitTimelineEvent(client, {
      contactId: 'c1',
      sourceType: 'assessment',
      sourceId: 'a1',
      occurredAt: '2026-07-09T00:00:00Z',
      title: 'GrowthOS assessment',
    });
    expect(result).toBe(true);
    expect(client._upserts).toHaveLength(1);
    const { row, opts } = client._upserts[0];
    expect(row.contact_id).toBe('c1');
    expect(row.source_type).toBe('assessment');
    expect(row.source_id).toBe('a1');
    expect(row.title).toBe('GrowthOS assessment');
    expect(row.payload).toEqual({});
    expect(opts.onConflict).toBe('source_type,source_id');
  });

  it('returns false (without throwing) when the upsert errors', async () => {
    const client = stubClient({ error: { message: 'db error' } });
    const result = await emitTimelineEvent(client, {
      contactId: 'c1',
      sourceType: 'assessment',
      sourceId: 'a1',
      occurredAt: '2026-07-09T00:00:00Z',
      title: 'GrowthOS assessment',
    });
    expect(result).toBe(false);
  });
});
