import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors when env var isn't available
let stripe: Stripe | null = null

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripe
}

type ProductType = 'call-lab-pro' | 'discovery-lab-pro' | 'bundle'
type PlanType = 'solo' | 'team'

// Price ID mapping
function getPriceId(product: ProductType, plan: PlanType): string | undefined {
  const priceMap: Record<string, string | undefined> = {
    'call-lab-pro-solo': process.env.STRIPE_PRICE_SOLO,
    'call-lab-pro-team': process.env.STRIPE_PRICE_TEAM,
    'discovery-lab-pro-solo': process.env.STRIPE_PRICE_DISCOVERY_SOLO,
    'discovery-lab-pro-team': process.env.STRIPE_PRICE_DISCOVERY_TEAM,
    'bundle-solo': process.env.STRIPE_PRICE_BUNDLE_SOLO,
    'bundle-team': process.env.STRIPE_PRICE_BUNDLE_TEAM,
  }
  return priceMap[`${product}-${plan}`]
}

// Success URL mapping
function getSuccessUrl(product: ProductType, appUrl: string): string {
  const urlMap: Record<ProductType, string> = {
    'call-lab-pro': `${appUrl}/call-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    'discovery-lab-pro': `${appUrl}/discovery-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    'bundle': `${appUrl}/bundle/welcome?session_id={CHECKOUT_SESSION_ID}`,
  }
  return urlMap[product]
}

// Cancel URL mapping
function getCancelUrl(product: ProductType, appUrl: string): string {
  const urlMap: Record<ProductType, string> = {
    'call-lab-pro': `${appUrl}/call-lab-pro?checkout=cancelled`,
    'discovery-lab-pro': `${appUrl}/discovery-lab-pro?checkout=cancelled`,
    'bundle': `${appUrl}/call-lab-pro?checkout=cancelled`, // Bundle cancels go back to call-lab-pro
  }
  return urlMap[product]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both old format (priceType) and new format (product, plan)
    const product: ProductType = body.product || 'call-lab-pro'
    const plan: PlanType = body.plan || body.priceType || 'solo'
    const email: string | undefined = body.email

    const priceId = getPriceId(product, plan)

    if (!priceId) {
      console.error('Price ID not configured for:', { product, plan })
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: getSuccessUrl(product, appUrl),
      cancel_url: getCancelUrl(product, appUrl),
      metadata: {
        product,
        plan,
        // Legacy field for backwards compatibility
        priceType: plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
