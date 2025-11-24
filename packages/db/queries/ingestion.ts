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
  const { data: ingestionItem, error } = await supabase
    .from('ingestion_items')
    .insert({
      ...data,
      status: 'pending',
    } as Database['public']['Tables']['ingestion_items']['Insert'])
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

  const { data, error } = await supabase
    .from('ingestion_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}
