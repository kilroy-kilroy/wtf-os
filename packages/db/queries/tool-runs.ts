import type { SupabaseClient } from '../client';

export async function createToolRun(
  supabase: SupabaseClient,
  data: {
    user_id?: string;
    agency_id?: string;
    lead_email?: string;
    lead_name?: string;
    tool_name: string;
    tool_version?: string;
    input_data?: Record<string, any>;
    ingestion_item_id?: string;
  }
) {
  const { data: toolRun, error } = await supabase
    .from('tool_runs')
    .insert({
      ...data,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return toolRun;
}

export async function updateToolRun(
  supabase: SupabaseClient,
  toolRunId: string,
  updates: {
    status?: 'processing' | 'completed' | 'failed' | 'emailed';
    completed_at?: string;
    duration_ms?: number;
    result_ids?: Record<string, any>;
    error_message?: string;
    error_stack?: string;
    model_used?: string;
    tokens_used?: { input: number; output: number };
    email_sent_at?: string;
    pdf_generated_at?: string;
    pdf_path?: string;
  }
) {
  const { data, error } = await supabase
    .from('tool_runs')
    .update(updates)
    .eq('id', toolRunId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getToolRun(supabase: SupabaseClient, toolRunId: string) {
  const { data, error } = await supabase
    .from('tool_runs')
    .select('*')
    .eq('id', toolRunId)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserToolRuns(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('tool_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getAgencyToolRuns(
  supabase: SupabaseClient,
  agencyId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('tool_runs')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
