import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase-auth-server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { resolveBillingCustomerId } from '@/lib/billing-portal'

export const runtime = 'nodejs'

/**
 * Create a Stripe Billing Portal session for the signed-in user.
 *
 * Replaces the dead `billing.stripe.com/p/login/test` placeholder the settings
 * page used to link at. Because the session is minted server-side against the
 * user's own customer id, they land straight in billing instead of having to
 * re-verify by email the way the no-code portal login link demands.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You need to be signed in.' }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) {
    console.error('[stripe portal] STRIPE_SECRET_KEY is not configured')
    return NextResponse.json(
      { error: 'Billing is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  const customerId = await resolveBillingCustomerId(getSupabaseServerClient(), {
    userId: user.id,
    email: user.email,
  })

  // Pro access can come from an admin grant or an agency subscription, neither
  // of which has a customer to manage. Say so plainly instead of 500ing.
  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "We couldn't find a Stripe billing account for you. If your access came through a team plan or was set up manually, email support@salesos.com and we'll sort it out.",
      },
      { status: 404 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe portal] session create failed:', err)

    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      // Thrown until a portal configuration is saved in the Stripe Dashboard
      // (Settings -> Billing -> Customer portal). Easy to hit on a fresh account
      // and in test mode, so name the fix in the logs.
      if (err.message?.includes('configuration')) {
        console.error(
          '[stripe portal] No customer portal configuration. Save one at ' +
            'https://dashboard.stripe.com/settings/billing/portal'
        )
        return NextResponse.json(
          { error: 'The billing portal is not set up yet. Please contact support.' },
          { status: 500 }
        )
      }

      // Usually a customer id from the other Stripe mode (test id, live key).
      if (err.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'We could not load your billing account. Please contact support.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Could not open the billing portal. Please try again.' },
      { status: 502 }
    )
  }
}
