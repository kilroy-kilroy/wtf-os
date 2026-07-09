import type { SupabaseClient } from '@repo/db';

export type TimelineEventInput = {
  contactId: string;
  companyId?: string | null;
  dealId?: string | null;
  sourceType: 'email' | 'call' | 'assessment' | 'discovery';
  sourceId: string;
  occurredAt: string; // ISO timestamp
  title: string;
  summary?: string;
  payload?: Record<string, unknown>;
};

export async function emitTimelineEvent(
  supabase: SupabaseClient,
  e: TimelineEventInput,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('timeline_events')
    .upsert(
      {
        contact_id: e.contactId,
        company_id: e.companyId ?? null,
        deal_id: e.dealId ?? null,
        source_type: e.sourceType,
        source_id: e.sourceId,
        occurred_at: e.occurredAt,
        title: e.title,
        summary: e.summary ?? null,
        payload: e.payload ?? {},
      },
      { onConflict: 'source_type,source_id' },
    );
  if (error) {
    console.error('[timeline] emitTimelineEvent failed', error);
  }
}
