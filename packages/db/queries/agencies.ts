import type { SupabaseClient } from '../client';

export async function findOrCreateAgency(
  supabase: SupabaseClient,
  name: string,
  url?: string
) {
  // Try to find by URL if provided
  if (url) {
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('*')
      .eq('url', url)
      .single();

    if (existingAgency) {
      return existingAgency;
    }
  }

  // Try to find by name
  const { data: existingAgency } = await supabase
    .from('agencies')
    .select('*')
    .eq('name', name)
    .single();

  if (existingAgency) {
    return existingAgency;
  }

  // Create new agency
  const { data: newAgency, error } = await supabase
    .from('agencies')
    .insert({
      name,
      url,
    })
    .select()
    .single();

  if (error) throw error;
  return newAgency;
}

export async function assignUserToAgency(
  supabase: SupabaseClient,
  userId: string,
  agencyId: string,
  role: 'owner' | 'admin' | 'member' = 'member'
) {
  const { data, error } = await supabase
    .from('user_agency_assignments')
    .insert({
      user_id: userId,
      agency_id: agencyId,
      role,
    })
    .select()
    .single();

  if (error) {
    // Ignore duplicate errors
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
  return data;
}

export async function getUserAgencies(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_agency_assignments')
    .select('agency_id, role, agencies(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}
