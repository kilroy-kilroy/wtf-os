import { getSupabaseServerClient } from './supabase-server';

export interface OrgProfile {
  id: string;
  name: string;
  website: string | null;
  founder_linkedin_url: string | null;
  company_linkedin_url: string | null;
  company_size: string | null;
  company_revenue: string | null;
  annual_revenue: number | null;
  avg_client_value: number | null;
  client_count: number | null;
  target_industry: string | null;
  target_company_size: string | null;
  target_market: string | null;
  core_offer: string | null;
  differentiator: string | null;
  enrichment_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the organization profile for a user, populated from assessment data.
 * Call Lab Pro, Discovery Lab Pro, and other products can use this to
 * prepopulate onboarding forms instead of asking the user again.
 */
export async function getOrgProfile(userId: string): Promise<OrgProfile | null> {
  const supabase = getSupabaseServerClient();

  // Get the user's org_id first
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .single();

  if (userError || !user?.org_id) {
    return null;
  }

  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select(`
      id, name, website, founder_linkedin_url, company_linkedin_url,
      company_size, company_revenue, annual_revenue, avg_client_value,
      client_count, target_industry, target_company_size, target_market,
      core_offer, differentiator, enrichment_data, created_at, updated_at
    `)
    .eq('id', user.org_id)
    .single();

  if (orgError || !org) {
    return null;
  }

  return org as OrgProfile;
}
