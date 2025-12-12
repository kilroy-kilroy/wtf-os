import type { SupabaseClient } from '../client';
import type { Json } from '../types';

export interface InstantReportAnalysis {
  summary: string;
  what_worked: string[];
  what_to_watch: string[];
  one_move: string;
}

export interface CreateInstantReportInput {
  id: string;
  transcript: string;
  analysis: InstantReportAnalysis;
  score: number;
  scenario_type?: string;
  duration_seconds?: number;
  audio_url?: string;
  cost_cents?: number;
  source?: string;
  user_agent?: string;
  ip_address?: string;
}

export async function createInstantReport(
  supabase: SupabaseClient,
  input: CreateInstantReportInput
) {
  const { data, error } = await (supabase as any)
    .from('instant_reports')
    .insert({
      id: input.id,
      transcript: input.transcript,
      analysis: input.analysis as unknown as Json,
      score: input.score,
      scenario_type: input.scenario_type,
      duration_seconds: input.duration_seconds,
      audio_url: input.audio_url,
      cost_cents: input.cost_cents || 50, // ~$0.50 default
      source: input.source || 'call-lab-instant',
      user_agent: input.user_agent,
      ip_address: input.ip_address,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInstantReportById(
  supabase: SupabaseClient,
  reportId: string
) {
  const { data, error } = await supabase
    .from('instant_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function updateInstantReportEmail(
  supabase: SupabaseClient,
  reportId: string,
  email: string
) {
  const { data, error } = await (supabase as any)
    .from('instant_reports')
    .update({
      email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementReportViews(
  supabase: SupabaseClient,
  reportId: string
) {
  // Use RPC function for atomic increment
  const { error } = await (supabase as any).rpc('increment_report_views', {
    report_id: reportId,
  });

  // Fallback if RPC not available
  if (error) {
    const { data: report } = await supabase
      .from('instant_reports')
      .select('view_count, viewed_at')
      .eq('id', reportId)
      .single();

    if (report) {
      await (supabase as any)
        .from('instant_reports')
        .update({
          view_count: (report.view_count || 0) + 1,
          viewed_at: report.viewed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    }
  }
}

export async function getReportsByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await supabase
    .from('instant_reports')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Leads

export interface CreateInstantLeadInput {
  email: string;
  first_name?: string;
  source?: string;
  first_report_id?: string;
}

export async function findOrCreateInstantLead(
  supabase: SupabaseClient,
  input: CreateInstantLeadInput
) {
  // Try to find existing lead
  const { data: existingLead } = await supabase
    .from('instant_leads')
    .select('*')
    .eq('email', input.email)
    .single();

  if (existingLead) {
    return { lead: existingLead, isNew: false };
  }

  // Create new lead
  const { data: newLead, error } = await (supabase as any)
    .from('instant_leads')
    .insert({
      email: input.email,
      first_name: input.first_name,
      source: input.source || 'call-lab-instant',
      first_report_id: input.first_report_id,
    })
    .select()
    .single();

  if (error) throw error;
  return { lead: newLead, isNew: true };
}

export async function updateLeadWelcomeSent(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await (supabase as any)
    .from('instant_leads')
    .update({
      welcome_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadBeehiivSync(
  supabase: SupabaseClient,
  email: string,
  subscriberId: string
) {
  const { data, error } = await (supabase as any)
    .from('instant_leads')
    .update({
      beehiiv_subscriber_id: subscriberId,
      beehiiv_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markLeadUpgraded(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await (supabase as any)
    .from('instant_leads')
    .update({
      upgraded_to_pro: true,
      upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email)
    .select()
    .single();

  if (error) throw error;
  return data;
}
