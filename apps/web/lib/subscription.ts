import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscription Detection Utility
 *
 * CANONICAL MODEL:
 *   Email → Per-Product Subscription Tiers → Show Appropriate Labs
 *
 * Access is granted if ANY of these are true:
 *   1. User has personal pro tier (users.call_lab_tier = 'pro')
 *   2. User belongs to an agency with pro tier (agencies.call_lab_tier = 'pro')
 *   3. User has active Stripe subscription (subscriptions table by email)
 *
 * Team subscriptions: When an agency has pro, all members get pro access
 * (up to max_seats limit, enforced at invite time)
 */

export interface SubscriptionStatus {
  // Per-product access flags
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;
  hasVisibilityLabPro: boolean;

  // Source of access
  source: 'personal' | 'team' | 'stripe' | 'none';
  agencyName?: string;

  // Raw tier values
  callLabTier: string | null;
  discoveryLabTier: string | null;
  visibilityLabTier: string | null;

  // Metadata
  email: string;
}

/**
 * Get subscription status for a user
 *
 * Checks personal tiers, agency (team) tiers, and Stripe subscriptions.
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<SubscriptionStatus> {
  const email = userEmail.toLowerCase().trim();

  // Query user's personal tiers
  // Note: only select columns that exist in the users table.
  // visibility_lab_tier is not yet a DB column, so omitting it to avoid
  // a PostgREST error that would null out the entire result.
  const { data: userData } = await supabase
    .from('users')
    .select('call_lab_tier, discovery_lab_tier')
    .eq('id', userId)
    .single();

  const personalCallLabTier = userData?.call_lab_tier || 'free';
  const personalDiscoveryLabTier = userData?.discovery_lab_tier || null;
  // visibility_lab_tier column does not exist in the DB yet
  const personalVisibilityLabTier: string | null = null;

  // Check personal access first
  if (personalCallLabTier === 'pro' || personalDiscoveryLabTier === 'pro' || personalVisibilityLabTier === 'pro') {
    return {
      hasCallLabPro: personalCallLabTier === 'pro',
      hasDiscoveryLabPro: personalDiscoveryLabTier === 'pro',
      hasVisibilityLabPro: personalVisibilityLabTier === 'pro',
      source: 'personal',
      callLabTier: personalCallLabTier,
      discoveryLabTier: personalDiscoveryLabTier,
      visibilityLabTier: personalVisibilityLabTier,
      email,
    };
  }

  // Check agency (team) access
  const { data: assignmentData } = await supabase
    .from('user_agency_assignments')
    .select('agency_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  let agency: {
    name: string;
    call_lab_tier: string | null;
    discovery_lab_tier: string | null;
  } | null = null;

  if (assignmentData?.agency_id) {
    const { data: agencyData } = await supabase
      .from('agencies')
      .select('name, call_lab_tier, discovery_lab_tier')
      .eq('id', assignmentData.agency_id)
      .single();

    agency = agencyData;
  }

  if (agency) {
    const agencyCallLabTier = agency.call_lab_tier || 'free';
    const agencyDiscoveryLabTier = agency.discovery_lab_tier || null;
    // visibility_lab_tier column does not exist in the DB yet
    const agencyVisibilityLabTier: string | null = null;

    if (agencyCallLabTier === 'pro' || agencyDiscoveryLabTier === 'pro' || agencyVisibilityLabTier === 'pro') {
      return {
        hasCallLabPro: agencyCallLabTier === 'pro',
        hasDiscoveryLabPro: agencyDiscoveryLabTier === 'pro',
        hasVisibilityLabPro: agencyVisibilityLabTier === 'pro',
        source: 'team',
        agencyName: agency.name,
        callLabTier: agencyCallLabTier,
        discoveryLabTier: agencyDiscoveryLabTier,
        visibilityLabTier: agencyVisibilityLabTier,
        email,
      };
    }
  }

  // Check Stripe subscriptions table by email
  const { data: stripeSubscription } = await supabase
    .from('subscriptions')
    .select('status, plan_type')
    .eq('customer_email', email)
    .in('status', ['active', 'trialing'])
    .limit(1)
    .single();

  if (stripeSubscription) {
    // Has active Stripe subscription - grant Discovery Lab Pro access
    // (Discovery Lab Pro is the product sold via Stripe checkout)
    return {
      hasCallLabPro: false,
      hasDiscoveryLabPro: true,
      hasVisibilityLabPro: false,
      source: 'stripe',
      callLabTier: personalCallLabTier,
      discoveryLabTier: 'pro',
      visibilityLabTier: personalVisibilityLabTier,
      email,
    };
  }

  // No pro access
  return {
    hasCallLabPro: false,
    hasDiscoveryLabPro: false,
    hasVisibilityLabPro: false,
    source: 'none',
    callLabTier: personalCallLabTier,
    discoveryLabTier: personalDiscoveryLabTier,
    visibilityLabTier: personalVisibilityLabTier,
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

/**
 * Quick check for Visibility Lab Pro access
 */
export async function hasVisibilityLabProAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const status = await getSubscriptionStatus(supabase, userId, userEmail);
  return status.hasVisibilityLabPro;
}
