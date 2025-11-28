import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle successful checkout - create pending account record
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  const email = session.customer_email || session.customer_details?.email;
  const plan = session.metadata?.plan || 'solo';

  if (!email) {
    console.error('No email found in checkout session');
    return;
  }

  // Check if we already have a pending signup for this session
  const { data: existing } = await supabase
    .from('pending_signups')
    .select('id')
    .eq('stripe_session_id', session.id)
    .single();

  if (existing) {
    console.log('Pending signup already exists for session:', session.id);
    return;
  }

  // Create a pending signup record
  // This gets converted to a full user when they complete the /activate form
  const { error } = await supabase.from('pending_signups').insert({
    stripe_session_id: session.id,
    stripe_customer_id: customerId,
    email: email,
    plan: plan,
    status: 'pending',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  });

  if (error) {
    console.error('Failed to create pending signup:', error);
    return;
  }

  console.log('Created pending signup for:', email);

  // TODO: Send welcome email with activation link
  // await sendActivationEmail(email, session.id);
}

/**
 * Handle subscription updates (plan changes, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Update user's subscription status in database
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Failed to update subscription:', error);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Subscription canceled:', subscription.id);

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Mark user's subscription as canceled
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      plan: 'free', // Downgrade to free
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Failed to update canceled subscription:', error);
  }
}
