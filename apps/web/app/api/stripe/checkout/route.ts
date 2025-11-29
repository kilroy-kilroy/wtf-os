import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Price IDs from your Stripe Dashboard
const PRICE_IDS = {
  solo: process.env.STRIPE_PRICE_SOLO || 'price_solo_monthly',
  team: process.env.STRIPE_PRICE_TEAM || 'price_team_monthly',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, email, referralCode } = body;

    if (!plan || !['solo', 'team'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "solo" or "team"' },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];

    // Build the success URL with session ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/activate?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/call-lab-pro`;

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Pre-fill email if provided
      ...(email && { customer_email: email }),
      // Store metadata for later use
      metadata: {
        plan,
        ...(referralCode && { referral_code: referralCode }),
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'required',
      // Configure subscription data
      subscription_data: {
        metadata: {
          plan,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
