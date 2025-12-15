import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscription Detection Utility
 *
 * CANONICAL MODEL:
 *   Email → Per-Product Subscription Tiers → Show Appropriate Labs
 *
 * Each product has its own tier column:
 *   - call_lab_tier: 'free' | 'pro'
 *   - discovery_lab_tier: null | 'free' | 'pro'
 *
 * The legacy subscription_tier field is kept for backwards compatibility
 * but the per-product columns are the source of truth.
 */

export interface SubscriptionStatus {
  // Per-product access flags
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;

  // Raw tier values from database
  callLabTier: string | null;
  discoveryLabTier: string | null;

  // Metadata
  email: string;
}

/**
 * Get subscription status for a user
 *
 * Queries the per-product tier columns from the users table.
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<SubscriptionStatus> {
  const email = userEmail.toLowerCase().trim();

  // Query per-product tiers from users table
  const { data: userData } = await supabase
    .from('users')
    .select('call_lab_tier, discovery_lab_tier')
    .eq('id', userId)
    .single();

  const callLabTier = userData?.call_lab_tier || 'free';
  const discoveryLabTier = userData?.discovery_lab_tier || null;

  return {
    hasCallLabPro: callLabTier === 'pro',
    hasDiscoveryLabPro: discoveryLabTier === 'pro',
    callLabTier,
    discoveryLabTier,
    email,
  };
}

/**
 * Quick check for Call Lab Pro access
 */
export async function hasCallLabProAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const status = await getSubscriptionStatus(supabase, userId, userEmail);
  return status.hasCallLabPro;
}

/**
 * Quick check for Discovery Lab Pro access
 */
export async function hasDiscoveryLabProAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const status = await getSubscriptionStatus(supabase, userId, userEmail);
  return status.hasDiscoveryLabPro;
}
