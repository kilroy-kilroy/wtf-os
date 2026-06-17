import type { SupabaseClient } from '../client';
import type { Database } from '../types';

export async function createIngestionItem(
  supabase: SupabaseClient,
  data: {
    agency_id: string;
    user_id?: string;
    deal_id?: string;
    source_type: string;
    source_channel?: string;
    raw_content: string;
    content_format?: string;
    transcript_metadata?: Record<string, any>;
    participants?: Array<{ name: string; role?: string; email?: string }>;
  }
) {
  const { data: ingestionItem, error } = await (supabase as any)
    .from('ingestion_items')
    .insert({
      ...data,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return ingestionItem as any;
}

export async function getIngestionItem(supabase: SupabaseClient, itemId: string) {
  const { data, error } = await supabase
    .from('ingestion_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  return data as any; // TODO: Properly type with Database['public']['Tables']['ingestion_items']['Row']
}

/**
 * Atomically claim an ingestion item for processing.
 *
 * Transitions status -> 'processing' ONLY if the item is currently claimable
 * (pending, failed, or a stale 'processing' that was abandoned by a crashed
 * invocation). The conditional UPDATE is atomic at the Postgres row level, so
 * when the same item is POSTed twice (double-click, client retry on a slow Pro
 * analysis, platform retry) exactly one caller wins the claim. The loser gets
 * `null` and must abort — this is what prevents duplicate call_scores /
 * call_lab_reports rows (the root cause of phantom outcome-nudge emails).
 *
 * @returns the claimed row if we won the claim, otherwise null.
 */
export async function claimIngestionItem(
  supabase: SupabaseClient,
  itemId: string,
  staleProcessingMinutes = 15
) {
  const staleThreshold = new Date(
    Date.now() - staleProcessingMinutes * 60 * 1000
  ).toISOString();

  const { data, error } = await (supabase as any)
    .from('ingestion_items')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .or(
      `status.eq.pending,status.eq.failed,and(status.eq.processing,updated_at.lt.${staleThreshold})`
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as any; // null when another invocation already holds the claim
}

export async function updateIngestionItemStatus(
  supabase: SupabaseClient,
  itemId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
) {
  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' || status === 'failed') {
    updates.processed_at = new Date().toISOString();
  }

  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { data, error } = await (supabase as any)
    .from('ingestion_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}
