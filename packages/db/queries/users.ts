import type { SupabaseClient } from '../client';
import type { Database } from '../types';

export async function findOrCreateUser(
  supabase: SupabaseClient,
  email: string,
  firstName?: string,
  lastName?: string
) {
  // Try to find existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    return existingUser as any;
  }

  // Create new user
  const { data: newUser, error } = await (supabase as any)
    .from('users')
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      subscription_tier: 'lead',
    })
    .select()
    .single();

  if (error) throw error;
  return newUser as any;
}

export async function getUserById(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateUser(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    subscription_tier?: string;
    preferences?: Record<string, any>;
  }
) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}
