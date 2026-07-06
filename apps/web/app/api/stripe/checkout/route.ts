import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { trackCheckoutStarted } from '@/lib/analytics';

// Lazy initialization to avoid build-time errors when env var isn't available
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const { priceType, email, coupon, product = 'call-lab-pro', siteUrl, firstName } = await request.json();

    if (product === "robot-tim") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
      const priceId = process.env.STRIPE_PRICE_ROBOT_TIM;
      if (!priceId) {
        return NextResponse.json({ error: "Robot-Tim price not configured" }, { status: 500 });
      }
      if (!siteUrl) {
        return NextResponse.json({ error: "Missing site URL" }, { status: 400 });
      }
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        success_url: `${appUrl}/robot-tim/pending?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/robot-tim?checkout=cancelled`,
        metadata: {
          product: "robot-tim",
          site_url: siteUrl,
          first_name: firstName || "",
        },
      });
      return NextResponse.json({ url: session.url });
    }

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
      case 'visibility-lab-pro':
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_VISIBILITY_TEAM
          : process.env.STRIPE_PRICE_VISIBILITY_SOLO;
        successUrl = `${appUrl}/visibility-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${appUrl}/visibility-lab-pro?checkout=cancelled`;
        break;
      case 'bundle':
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_BUNDLE_TEAM
          : process.env.STRIPE_PRICE_BUNDLE_SOLO;
        successUrl = `${appUrl}/pro/welcome?session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${appUrl}/pricing?checkout=cancelled`;
        break;
      case 'growth-bundle':
        priceId = priceType === 'team'
          ? process.env.STRIPE_PRICE_GROWTHBUNDLE_TEAM
          : process.env.STRIPE_PRICE_GROWTHBUNDLE_SOLO;
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

    // Track checkout started event
    await trackCheckoutStarted({
      product,
      planType: priceType,
      hasCoupon: !!coupon,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
