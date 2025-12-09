import type { SupabaseClient } from '../client';
import type { Database, Json } from '../types';

type DiscoveryBriefRow = Database['public']['Tables']['discovery_briefs']['Row'];
type DiscoveryBriefInsert = Database['public']['Tables']['discovery_briefs']['Insert'];
type DiscoveryBriefUpdate = Database['public']['Tables']['discovery_briefs']['Update'];

export interface CreateDiscoveryBriefParams {
  user_id?: string;
  agency_id: string;
  version: string;
  what_you_sell: string;
  market_concerns?: string;
  target_company: string;
  target_contact_name?: string;
  target_contact_title?: string;
  // Pro-only inputs
  target_company_url?: string;
  target_linkedin_url?: string;
  product_strengths?: string;
  deal_context?: {
    size?: string;
    stage?: string;
    urgency?: string;
  };
  // Outputs
  markdown_response?: string;
  questions?: string[];
  meeting_frames?: string[];
  // Pro-only outputs
  market_intel?: {
    bullets: string[];
  };
  company_intel?: {
    description?: string;
    positioning?: string;
    recent_news?: string[];
  };
  prospect_intel?: {
    role?: string;
    tenure?: string;
    background?: string;
    hot_buttons?: string[];
  };
  opening_script?: string;
  authority_questions?: string[];
  depth_questions?: string[];
  guidance_questions?: string[];
  permission_gates?: string[];
  google_radar?: string[];
  meeting_agenda?: string;
  decision_tree?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateDiscoveryBriefParams {
  markdown_response?: string;
  questions?: string[];
  meeting_frames?: string[];
  market_intel?: Record<string, unknown>;
  company_intel?: Record<string, unknown>;
  prospect_intel?: Record<string, unknown>;
  opening_script?: string;
  authority_questions?: string[];
  depth_questions?: string[];
  guidance_questions?: string[];
  permission_gates?: string[];
  google_radar?: string[];
  meeting_agenda?: string;
  decision_tree?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new discovery brief
 */
export async function createDiscoveryBrief(
  supabase: SupabaseClient,
  params: CreateDiscoveryBriefParams
): Promise<DiscoveryBriefRow> {
  const insertData: DiscoveryBriefInsert = {
    user_id: params.user_id,
    agency_id: params.agency_id,
    version: params.version,
    what_you_sell: params.what_you_sell,
    market_concerns: params.market_concerns,
    target_company: params.target_company,
    target_contact_name: params.target_contact_name,
    target_contact_title: params.target_contact_title,
    target_company_url: params.target_company_url,
    target_linkedin_url: params.target_linkedin_url,
    product_strengths: params.product_strengths,
    deal_context: params.deal_context as Json,
    markdown_response: params.markdown_response,
    questions: params.questions as Json,
    meeting_frames: params.meeting_frames as Json,
    market_intel: params.market_intel as Json,
    company_intel: params.company_intel as Json,
    prospect_intel: params.prospect_intel as Json,
    opening_script: params.opening_script,
    authority_questions: params.authority_questions as Json,
    depth_questions: params.depth_questions as Json,
    guidance_questions: params.guidance_questions as Json,
    permission_gates: params.permission_gates as Json,
    google_radar: params.google_radar as Json,
    meeting_agenda: params.meeting_agenda,
    decision_tree: params.decision_tree as Json,
    metadata: params.metadata as Json,
  };

  // Note: Using 'any' assertion because discovery_briefs is a new table
  // that needs to be created in the database. Once the table exists,
  // regenerate types with: supabase gen types typescript
  const { data, error } = await (supabase as any)
    .from('discovery_briefs')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create discovery brief: ${error.message}`);
  }

  return data as DiscoveryBriefRow;
}

/**
 * Update an existing discovery brief
 */
export async function updateDiscoveryBrief(
  supabase: SupabaseClient,
  id: string,
  params: UpdateDiscoveryBriefParams
): Promise<DiscoveryBriefRow> {
  const updateData: DiscoveryBriefUpdate = {
    markdown_response: params.markdown_response,
    questions: params.questions as Json,
    meeting_frames: params.meeting_frames as Json,
    market_intel: params.market_intel as Json,
    company_intel: params.company_intel as Json,
    prospect_intel: params.prospect_intel as Json,
    opening_script: params.opening_script,
    authority_questions: params.authority_questions as Json,
    depth_questions: params.depth_questions as Json,
    guidance_questions: params.guidance_questions as Json,
    permission_gates: params.permission_gates as Json,
    google_radar: params.google_radar as Json,
    meeting_agenda: params.meeting_agenda,
    decision_tree: params.decision_tree as Json,
    metadata: params.metadata as Json,
    updated_at: new Date().toISOString(),
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof DiscoveryBriefUpdate] === undefined) {
      delete updateData[key as keyof DiscoveryBriefUpdate];
    }
  });

  // Note: Using 'any' assertion because discovery_briefs is a new table
  const { data, error } = await (supabase as any)
    .from('discovery_briefs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update discovery brief: ${error.message}`);
  }

  return data as DiscoveryBriefRow;
}

/**
 * Get a discovery brief by ID
 */
export async function getDiscoveryBrief(
  supabase: SupabaseClient,
  id: string
): Promise<DiscoveryBriefRow | null> {
  // Note: Using 'any' assertion because discovery_briefs is a new table
  const { data, error } = await (supabase as any)
    .from('discovery_briefs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get discovery brief: ${error.message}`);
  }

  return data as DiscoveryBriefRow;
}

/**
 * Get discovery briefs for an agency
 */
export async function getAgencyDiscoveryBriefs(
  supabase: SupabaseClient,
  agencyId: string
): Promise<DiscoveryBriefRow[]> {
  // Note: Using 'any' assertion because discovery_briefs is a new table
  const { data, error } = await (supabase as any)
    .from('discovery_briefs')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get agency discovery briefs: ${error.message}`);
  }

  return (data || []) as DiscoveryBriefRow[];
}

/**
 * Get discovery briefs for a user
 */
export async function getUserDiscoveryBriefs(
  supabase: SupabaseClient,
  userId: string
): Promise<DiscoveryBriefRow[]> {
  // Note: Using 'any' assertion because discovery_briefs is a new table
  const { data, error } = await (supabase as any)
    .from('discovery_briefs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user discovery briefs: ${error.message}`);
  }

  return (data || []) as DiscoveryBriefRow[];
}
