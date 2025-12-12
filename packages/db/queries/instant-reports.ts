import type { SupabaseClient } from '../client';
import type { Json } from '../types';

export interface InstantReportAnalysis {
  summary: string;
  what_worked: string[];
  what_to_watch: string[];
  one_move: string;
}

export interface InstantReport {
  id: string;
  email: string | null;
  audio_url: string | null;
  transcript: string;
  duration_seconds: number | null;
  analysis: InstantReportAnalysis;
  score: number;
  scenario_type: string | null;
  viewed_at: string | null;
  view_count: number;
  cost_cents: number;
  source: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
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
): Promise<InstantReport> {
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
      cost_cents: input.cost_cents || 50,
      source: input.source || 'call-lab-instant',
      user_agent: input.user_agent,
      ip_address: input.ip_address,
    })
    .select()
    .single();

  if (error) throw error;
  return data as InstantReport;
}

export async function getInstantReportById(
  supabase: SupabaseClient,
  reportId: string
): Promise<InstantReport | null> {
  const { data, error } = await (supabase as any)
    .from('instant_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as InstantReport;
}

export async function updateInstantReportEmail(
  supabase: SupabaseClient,
  reportId: string,
  email: string
): Promise<InstantReport> {
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
  return data as InstantReport;
}

export async function incrementReportViews(
  supabase: SupabaseClient,
  reportId: string
): Promise<void> {
  // Use RPC function for atomic increment
  const { error } = await (supabase as any).rpc('increment_report_views', {
    report_id: reportId,
  });

  // Fallback if RPC not available
  if (error) {
    const { data: report } = await (supabase as any)
      .from('instant_reports')
      .select('view_count, viewed_at')
      .eq('id', reportId)
      .single();

    if (report) {
      const typedReport = report as { view_count: number | null; viewed_at: string | null };
      await (supabase as any)
        .from('instant_reports')
        .update({
          view_count: (typedReport.view_count || 0) + 1,
          viewed_at: typedReport.viewed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    }
  }
}

export async function getReportsByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<InstantReport[]> {
  const { data, error } = await (supabase as any)
    .from('instant_reports')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as InstantReport[];
}

// Leads

export interface InstantLead {
  id: string;
  email: string;
  first_name: string | null;
  source: string;
  first_report_id: string | null;
  welcome_sent_at: string | null;
  pro_pitch_sent_at: string | null;
  subscribed_to_newsletter: boolean;
  upgraded_to_pro: boolean;
  upgraded_at: string | null;
  beehiiv_subscriber_id: string | null;
  beehiiv_synced_at: string | null;
  tags: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CreateInstantLeadInput {
  email: string;
  first_name?: string;
  source?: string;
  first_report_id?: string;
}

export async function findOrCreateInstantLead(
  supabase: SupabaseClient,
  input: CreateInstantLeadInput
): Promise<{ lead: InstantLead; isNew: boolean }> {
  // Try to find existing lead
  const { data: existingLead } = await (supabase as any)
    .from('instant_leads')
    .select('*')
    .eq('email', input.email)
    .single();

  if (existingLead) {
    return { lead: existingLead as InstantLead, isNew: false };
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
  return { lead: newLead as InstantLead, isNew: true };
}

export async function updateLeadWelcomeSent(
  supabase: SupabaseClient,
  email: string
): Promise<InstantLead> {
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
  return data as InstantLead;
}

export async function updateLeadBeehiivSync(
  supabase: SupabaseClient,
  email: string,
  subscriberId: string
): Promise<InstantLead> {
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
  return data as InstantLead;
}

export async function markLeadUpgraded(
  supabase: SupabaseClient,
  email: string
): Promise<InstantLead> {
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
  return data as InstantLead;
}
