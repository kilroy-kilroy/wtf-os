import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Stripe Billing Portal support.
 *
 * The settings page used to link at a hardcoded `billing.stripe.com/p/login/test`
 * placeholder, which 404s. Logged-in users should instead get a real portal
 * session created server-side against their own Stripe customer, so they land
 * in billing without re-authenticating by email.
 *
 * A user's Stripe customer lives on the `subscriptions` rows written by the
 * Stripe webhook. Note that Pro access does NOT imply a Stripe customer: admins
 * can grant `users.call_lab_tier = 'pro'` by hand, and agency members inherit
 * access from their agency's subscription. Those users have nothing to manage,
 * so callers must handle a null customer rather than assuming Pro == billable.
 */

export interface BillingSubscriptionRow {
  stripe_customer_id?: string | null
  status?: string | null
  created_at?: string | null
}

/**
 * Rank a subscription for the purpose of picking which customer to send to the
 * portal. Lower sorts first.
 *
 * `past_due`/`unpaid` rank above cancelled ones on purpose: a lapsed card is the
 * single most likely reason someone opens this page, and they still need in.
 */
function statusRank(status: string | null | undefined): number {
  switch (status) {
    case 'active':
    case 'trialing':
      return 0
    case 'past_due':
    case 'unpaid':
      return 1
    default:
      return 2
  }
}

function createdAtMs(value: string | null | undefined): number {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * Pick the Stripe customer id to open the billing portal for.
 *
 * Prefers a live subscription, then the most recently created row. Returns null
 * when no row carries a usable customer id.
 */
export function selectBillingCustomerId(
  rows: BillingSubscriptionRow[] | null | undefined
): string | null {
  if (!rows?.length) return null

  // Only real Stripe ids. Some rows carry sentinels like `internal_admin` for
  // comped access, which Stripe would reject with resource_missing — better to
  // report "not billed through Stripe" than to offer a button that always fails.
  const candidates = rows
    .map((row) => ({ ...row, customerId: row.stripe_customer_id?.trim() || '' }))
    .filter((row) => row.customerId.startsWith('cus_'))

  if (!candidates.length) return null

  candidates.sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status)
    if (byStatus !== 0) return byStatus
    return createdAtMs(b.created_at) - createdAtMs(a.created_at)
  })

  return candidates[0].customerId
}

/**
 * Look up the Stripe customer for a signed-in user.
 *
 * Matches on user_id and on email, because the webhook only backfills `user_id`
 * when a `users` row already existed at checkout time — subscriptions bought
 * before first login carry a null user_id and are only reachable by email.
 *
 * Pass a service-role client: the `subscriptions` RLS policy is
 * `auth.uid() = user_id`, which by construction cannot see those null-user_id
 * rows. Callers are responsible for authenticating the user first.
 */
export async function resolveBillingCustomerId(
  supabase: SupabaseClient,
  { userId, email }: { userId?: string | null; email?: string | null }
): Promise<string | null> {
  const normalizedEmail = email?.toLowerCase().trim() || ''
  const columns = 'stripe_customer_id, status, created_at'
  const rows: BillingSubscriptionRow[] = []

  if (userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(columns)
      .eq('user_id', userId)
    if (error) console.error('[billing-portal] lookup by user_id failed:', error)
    if (data) rows.push(...(data as BillingSubscriptionRow[]))
  }

  // Queried separately rather than via .or() so an email containing a comma or
  // quote can't corrupt the PostgREST filter expression.
  if (normalizedEmail) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(columns)
      .eq('customer_email', normalizedEmail)
    if (error) console.error('[billing-portal] lookup by email failed:', error)
    if (data) rows.push(...(data as BillingSubscriptionRow[]))
  }

  return selectBillingCustomerId(rows)
}
