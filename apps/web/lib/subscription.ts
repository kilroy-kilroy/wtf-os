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
  const { data: userData } = await supabase
    .from('users')
    .select('call_lab_tier, discovery_lab_tier, visibility_lab_tier')
    .eq('id', userId)
    .single();

  const personalCallLabTier = userData?.call_lab_tier || 'free';
  const personalDiscoveryLabTier = userData?.discovery_lab_tier || null;
  const personalVisibilityLabTier = userData?.visibility_lab_tier || null;

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
      .select('name, call_lab_tier, discovery_lab_tier, visibility_lab_tier')
      .eq('id', assignmentData.agency_id)
      .single();

    agency = agencyData as any;
  }

  // Check Stripe subscriptions table by email
  // A user may have multiple active subscriptions (e.g. upgraded from single to bundle)
  const { data: stripeSubscriptions } = await supabase
    .from('subscriptions')
    .select('status, plan_type, product')
    .eq('customer_email', email)
    .in('status', ['active', 'trialing']);

  const products = new Set((stripeSubscriptions || []).map(s => s.product));
  const personal = { call: personalCallLabTier === 'pro', discovery: personalDiscoveryLabTier === 'pro', visibility: personalVisibilityLabTier === 'pro' };
  const team = { call: agency?.call_lab_tier === 'pro', discovery: agency?.discovery_lab_tier === 'pro', visibility: (agency as any)?.visibility_lab_tier === 'pro' };
  const bundle = products.has('bundle') || products.has('growth-bundle');
  const hasCallLabPro = personal.call || team.call || bundle || products.has('call-lab-pro');
  const hasDiscoveryLabPro = personal.discovery || team.discovery || bundle || products.has('discovery-lab-pro');
  const hasVisibilityLabPro = personal.visibility || team.visibility || products.has('growth-bundle') || products.has('visibility-lab-pro');
  return {
    hasCallLabPro, hasDiscoveryLabPro, hasVisibilityLabPro,
    source: Object.values(personal).some(Boolean) ? 'personal' : Object.values(team).some(Boolean) ? 'team' : products.size ? 'stripe' : 'none',
    agencyName: agency?.name, email,
    callLabTier: hasCallLabPro ? 'pro' : personalCallLabTier,
    discoveryLabTier: hasDiscoveryLabPro ? 'pro' : personalDiscoveryLabTier,
    visibilityLabTier: hasVisibilityLabPro ? 'pro' : personalVisibilityLabTier,
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
