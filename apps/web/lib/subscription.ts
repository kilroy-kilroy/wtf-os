import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscription Detection Utility
 *
 * Checks multiple signals to determine if a user has Pro access:
 * 1. Explicit subscription_tier in users table
 * 2. Pro usage history (call_scores with version='full')
 * 3. Known Pro user emails (owner accounts)
 * 4. Active Stripe subscription status
 */

// Known Pro user emails (owner/admin accounts)
// These users always have full Pro access
const KNOWN_PRO_EMAILS = [
  'tk@timkilroy.com',
  'tim@timkilroy.com',
  'admin@timkilroy.com',
];

// Subscription tier values that indicate Pro access
const PRO_TIER_VALUES = [
  'call_lab_pro',
  'call-lab-pro',
  'calllabpro',
  'pro',
  'all',
  'subscriber',
  'client',
  'paid',
  'premium',
  'team',
  'enterprise',
];

export interface SubscriptionStatus {
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;
  reason: string;
  tier: string | null;
  debugInfo: {
    email: string;
    userId: string;
    subscriptionTier: string | null;
    isKnownProEmail: boolean;
    hasProUsageHistory: boolean;
    proCallCount: number;
    proToolCount: number;
  };
}

export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<SubscriptionStatus> {
  const email = userEmail.toLowerCase();

  // Check 1: Known Pro emails (owner accounts)
  const isKnownProEmail = KNOWN_PRO_EMAILS.some(
    (proEmail) => proEmail.toLowerCase() === email
  );

  if (isKnownProEmail) {
    return {
      hasCallLabPro: true,
      hasDiscoveryLabPro: true,
      reason: 'Known Pro email',
      tier: 'owner',
      debugInfo: {
        email,
        userId,
        subscriptionTier: 'owner',
        isKnownProEmail: true,
        hasProUsageHistory: false,
        proCallCount: 0,
        proToolCount: 0,
      },
    };
  }

  // Check 2: Subscription tier from users table
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const subscriptionTier = (userData?.subscription_tier || '').toLowerCase();
  const tierIndicatesPro =
    PRO_TIER_VALUES.includes(subscriptionTier) ||
    subscriptionTier.includes('pro');

  // Check 3: Pro usage history - by user_id
  const { count: proCallCountById } = await supabase
    .from('call_scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('version', 'full');

  // Check 4: Pro usage history - by matching email in ingestion_items
  // This catches cases where calls were submitted before user account was created
  const { data: ingestionItems } = await supabase
    .from('ingestion_items')
    .select('id')
    .ilike('metadata->>email', email);

  let proCallCountByEmail = 0;
  if (ingestionItems && ingestionItems.length > 0) {
    const ingestionIds = ingestionItems.map((i: { id: string }) => i.id);
    const { count } = await supabase
      .from('call_scores')
      .select('*', { count: 'exact', head: true })
      .in('ingestion_item_id', ingestionIds)
      .eq('version', 'full');
    proCallCountByEmail = count || 0;
  }

  // Check 5: Tool runs by user_id
  const { count: proToolCount } = await supabase
    .from('tool_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tool_name', 'call_lab_full');

  // Check 6: Tool runs by email
  const { count: proToolCountByEmail } = await supabase
    .from('tool_runs')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_email', email)
    .eq('tool_name', 'call_lab_full');

  const totalProCallCount = (proCallCountById || 0) + proCallCountByEmail;
  const totalProToolCount = (proToolCount || 0) + (proToolCountByEmail || 0);
  const hasProUsageHistory = totalProCallCount > 0 || totalProToolCount > 0;

  // Determine final status
  const hasCallLabPro = tierIndicatesPro || hasProUsageHistory;
  const hasDiscoveryLabPro =
    subscriptionTier.includes('discovery') ||
    subscriptionTier === 'all' ||
    subscriptionTier === 'pro';

  // Determine reason
  let reason = 'No Pro access detected';
  if (tierIndicatesPro) {
    reason = `Subscription tier: ${subscriptionTier}`;
  } else if (hasProUsageHistory) {
    reason = `Pro usage history: ${totalProCallCount} calls, ${totalProToolCount} tool runs`;
  }

  return {
    hasCallLabPro,
    hasDiscoveryLabPro,
    reason,
    tier: subscriptionTier || null,
    debugInfo: {
      email,
      userId,
      subscriptionTier: subscriptionTier || null,
      isKnownProEmail,
      hasProUsageHistory,
      proCallCount: totalProCallCount,
      proToolCount: totalProToolCount,
    },
  };
}

/**
 * Quick check if user has Call Lab Pro access
 * Use this for simple boolean checks
 */
export async function hasCallLabProAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const status = await getSubscriptionStatus(supabase, userId, userEmail);
  return status.hasCallLabPro;
}
