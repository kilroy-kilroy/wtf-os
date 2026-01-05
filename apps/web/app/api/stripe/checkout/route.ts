import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors when env var isn't available
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const { priceType, email, coupon, product = 'call-lab-pro' } = await request.json();

    // Get the appropriate price ID based on product and plan type
    let priceId: string | undefined;
    let successUrl: string;
    let cancelUrl: string;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

    switch (product) {
      case 'discovery-lab-pro':
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_DISCOVERY_TEAM
          : process.env.STRIPE_PRICE_DISCOVERY_SOLO;
        successUrl = `${appUrl}/discovery-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${appUrl}/discovery-lab-pro?checkout=cancelled`;
        break;
      case 'bundle':
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_BUNDLE_TEAM
          : process.env.STRIPE_PRICE_BUNDLE_SOLO;
        successUrl = `${appUrl}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${appUrl}/pricing?checkout=cancelled`;
        break;
      case 'call-lab-pro':
      default:
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_TEAM
          : process.env.STRIPE_PRICE_SOLO;
        successUrl = `${appUrl}/call-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${appUrl}/call-lab-pro?checkout=cancelled`;
        break;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${product}` },
        { status: 500 }
      );
    }

    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        priceType,
        product,
      },
    };

    // Apply coupon if provided
    if (coupon) {
      sessionOptions.discounts = [{ coupon }];
    }

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create(sessionOptions);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
