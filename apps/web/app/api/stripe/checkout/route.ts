import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy-load Stripe to avoid build-time initialization
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_PRICE_SOLO || !process.env.STRIPE_PRICE_TEAM) {
      console.error('Missing STRIPE_PRICE_SOLO or STRIPE_PRICE_TEAM environment variables');
      return NextResponse.json(
        { error: 'Product pricing not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Price IDs from your Stripe Dashboard
    const PRICE_IDS = {
      solo: process.env.STRIPE_PRICE_SOLO,
      team: process.env.STRIPE_PRICE_TEAM,
    };

    const body = await request.json();
    const { plan, email, referralCode } = body;

    console.log('Creating checkout session for plan:', plan);

    if (!plan || !['solo', 'team'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "solo" or "team"' },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    console.log('Using price ID:', priceId);

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
