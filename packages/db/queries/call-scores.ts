import type { SupabaseClient } from '../client';
import type { Database } from '../types';

export async function createCallScore(
  supabase: SupabaseClient,
  data: {
    ingestion_item_id: string;
    agency_id: string;
    user_id?: string;
    deal_id?: string;
    version: 'lite' | 'full';
    overall_score: number;
    overall_grade: string;
    lite_scores?: Record<string, any>;
    full_scores?: Record<string, any>;
    framework_scores?: Record<string, any>;
    talk_listen_ratio?: Record<string, any>;
    engagement_level?: string;
    likelihood_to_advance?: number;
    diagnosis_summary?: string;
  }
) {
  const { data: callScore, error } = await (supabase as any)
    .from('call_scores')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return callScore as any;
}

export async function createCallSnippets(
  supabase: SupabaseClient,
  snippets: Array<{
    call_score_id: string;
    ingestion_item_id: string;
    snippet_type: string;
    transcript_quote: string;
    speaker?: string;
    timestamp_start?: string;
    rep_behavior?: string;
    coaching_note?: string;
    alternative_response?: string;
    category_affected?: string;
    impact?: string;
    display_order?: number;
  }>
) {
  const { data, error } = await (supabase as any)
    .from('call_snippets')
    .insert(snippets)
    .select();

  if (error) throw error;
  return data as any;
}

export async function createFollowUpTemplates(
  supabase: SupabaseClient,
  templates: Array<{
    call_score_id: string;
    deal_id?: string;
    template_type: string;
    subject_line?: string;
    body: string;
    task_checklist?: Array<{ task: string; done: boolean }>;
    promises_referenced?: string[];
    display_order?: number;
  }>
) {
  const { data, error } = await (supabase as any)
    .from('follow_up_templates')
    .insert(templates)
    .select();

  if (error) throw error;
  return data as any;
}

export async function getCallScoreWithDetails(
  supabase: SupabaseClient,
  callScoreId: string
) {
  const { data: callScore, error: scoreError } = await supabase
    .from('call_scores')
    .select('*')
    .eq('id', callScoreId)
    .single();

  if (scoreError) throw scoreError;

  const { data: snippets, error: snippetsError } = await supabase
    .from('call_snippets')
    .select('*')
    .eq('call_score_id', callScoreId)
    .order('display_order', { ascending: true });

  if (snippetsError) throw snippetsError;

  const { data: followUps, error: followUpsError } = await supabase
    .from('follow_up_templates')
    .select('*')
    .eq('call_score_id', callScoreId)
    .order('display_order', { ascending: true });

  if (followUpsError) throw followUpsError;

  return {
    ...(callScore as any),
    snippets,
    follow_ups: followUps,
  };
}

export async function getAgencyCallScores(
  supabase: SupabaseClient,
  agencyId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('call_scores')
    .select('*, ingestion_items(raw_content, created_at)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as any;
}
