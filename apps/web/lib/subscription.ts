import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscription Detection Utility
 *
 * CANONICAL MODEL (desired):
 *   Email → Subscription Status → Show Appropriate Labs
 *
 * This utility implements the email-centric subscription model.
 * Email is the canonical identifier for all user data.
 *
 * CURRENT SCHEMA LIMITATION:
 *   The users.subscription_tier field is a single value that doesn't
 *   support per-product subscriptions. Until the schema is updated,
 *   we use tier values and owner emails as temporary workarounds.
 *
 * RECOMMENDED SCHEMA CHANGE:
 *   Add per-product columns to users table:
 *     call_lab_tier TEXT DEFAULT 'free'     -- 'free' | 'pro'
 *     discovery_lab_tier TEXT DEFAULT null  -- null | 'free' | 'pro'
 *
 *   Or create a subscriptions table:
 *     CREATE TABLE subscriptions (
 *       email TEXT NOT NULL,
 *       product TEXT NOT NULL,  -- 'call_lab', 'discovery_lab'
 *       tier TEXT DEFAULT 'free',
 *       UNIQUE(email, product)
 *     );
 */

// Owner emails that have full access to all products
// TEMPORARY: This should be replaced with proper database entries
const OWNER_EMAILS = [
  'tk@timkilroy.com',
  'tim@timkilroy.com',
  'admin@timkilroy.com',
];

/**
 * Tier values from users.subscription_tier that indicate Pro access
 *
 * Current valid values in schema: 'lead', 'free', 'subscriber', 'client'
 * We map 'subscriber' and 'client' to Pro access
 */
const CALL_LAB_PRO_TIERS = ['subscriber', 'client', 'pro', 'premium', 'enterprise'];

export interface SubscriptionStatus {
  // Per-product access flags
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;

  // Metadata
  reason: string;
  tier: string | null;
  email: string;
}

/**
 * Get subscription status for a user by email
 *
 * The email is the canonical identifier. User ID is used only for
 * the users table lookup since that's how Supabase Auth works.
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<SubscriptionStatus> {
  const email = userEmail.toLowerCase().trim();

  // Check 1: Owner emails (full access)
  if (OWNER_EMAILS.some((e) => e.toLowerCase() === email)) {
    return {
      hasCallLabPro: true,
      hasDiscoveryLabPro: true,
      reason: 'Owner account',
      tier: 'owner',
      email,
    };
  }

  // Check 2: Query subscription tier from users table
  // This is the source of truth for subscription status
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const tier = (userData?.subscription_tier || 'free').toLowerCase();

  // Map tier to product access
  const hasCallLabPro = CALL_LAB_PRO_TIERS.includes(tier);
  const hasDiscoveryLabPro = tier === 'pro' || tier === 'enterprise';

  return {
    hasCallLabPro,
    hasDiscoveryLabPro,
    reason: hasCallLabPro ? `Tier: ${tier}` : 'Free tier',
    tier,
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
