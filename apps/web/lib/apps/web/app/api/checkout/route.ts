import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES, PlanType } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, email } = body as { plan?: PlanType; email?: string }

    const selectedPlan: PlanType = plan && plan in PRICES ? plan : 'solo'
    const priceId = PRICES[selectedPlan]

    if (priceId.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Stripe prices not configured. Please set STRIPE_PRICE_SOLO and STRIPE_PRICE_TEAM environment variables.' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/call-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/call-lab-pro`,
      ...(email && { customer_email: email }),
      metadata: { plan: selectedPlan },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as PlanType | null

    const selectedPlan: PlanType = plan && plan in PRICES ? plan : 'solo'
    const priceId = PRICES[selectedPlan]

    if (priceId.includes('placeholder')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
      return NextResponse.redirect(`${baseUrl}/call-lab-pro?error=stripe_not_configured`)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/call-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/call-lab-pro`,
      metadata: { plan: selectedPlan },
    })

    if (session.url) {
      return NextResponse.redirect(session.url)
    }

    return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 })
  } catch (error) {
    console.error('Checkout error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
    return NextResponse.redirect(`${baseUrl}/call-lab-pro?error=checkout_failed`)
  }
}
