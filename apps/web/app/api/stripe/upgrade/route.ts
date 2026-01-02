import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

let stripe: Stripe | null = null

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    })
  }
  return stripe
}

// Bundle price IDs
function getBundlePriceId(plan: 'solo' | 'team'): string | undefined {
  return plan === 'team'
    ? process.env.STRIPE_PRICE_BUNDLE_TEAM
    : process.env.STRIPE_PRICE_BUNDLE_SOLO
}

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, customerId, plan = 'solo' } = await request.json()

    if (!subscriptionId && !customerId) {
      return NextResponse.json(
        { error: 'Either subscriptionId or customerId is required' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    let subscription: Stripe.Subscription

    // Get subscription either directly or by customer ID
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } else {
      // Find active subscription for customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 404 }
        )
      }
      subscription = subscriptions.data[0]
    }

    // Determine the plan type (solo or team) from current subscription
    const currentPlan = plan as 'solo' | 'team'
    const bundlePriceId = getBundlePriceId(currentPlan)

    if (!bundlePriceId) {
      return NextResponse.json(
        { error: 'Bundle price not configured' },
        { status: 500 }
      )
    }

    // Check if already on bundle
    const currentPriceId = subscription.items.data[0]?.price?.id
    if (currentPriceId === bundlePriceId) {
      return NextResponse.json(
        { error: 'Already subscribed to the bundle' },
        { status: 400 }
      )
    }

    // Get the subscription item ID to update
    const subscriptionItemId = subscription.items.data[0]?.id

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: 'No subscription item found' },
        { status: 400 }
      )
    }

    // Update subscription to bundle price
    // Stripe will automatically prorate
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItemId,
          price: bundlePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        ...subscription.metadata,
        product: 'bundle',
        upgraded_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: updatedSubscription.current_period_end,
    })
  } catch (error) {
    console.error('Upgrade error:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}
