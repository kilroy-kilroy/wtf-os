import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { onProUpgrade, onSubscriptionCancelled } from '@/lib/loops'
import { trackPurchaseCompleted, trackSubscriptionCancelled } from '@/lib/analytics'

export const runtime = 'nodejs'

// Create Supabase client with service role for webhook
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('Checkout completed:', {
        sessionId: session.id,
        customerEmail: session.customer_email,
        customerId: session.customer,
        priceType: session.metadata?.priceType,
        subscriptionId: session.subscription,
      })

      // Get subscription details from Stripe
      if (session.subscription && session.customer) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          // Try to find existing user by email
          let userId = null
          if (session.customer_email) {
            const { data: user } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.customer_email)
              .single()
            userId = user?.id || null
          }

          // Upsert subscription
          const { error } = await supabase
            .from('subscriptions')
            .upsert({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              user_id: userId,
              customer_email: session.customer_email || '',
              plan_type: session.metadata?.priceType || 'solo',
              product: session.metadata?.product || 'discovery-lab-pro',
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_subscription_id'
            })

          if (error) {
            console.error('Error saving subscription:', error)
          } else {
            console.log('Subscription saved successfully')

            // Track purchase completed in Vercel Analytics
            const product = session.metadata?.product || 'call-lab-pro';
            const planType = session.metadata?.priceType || 'solo';
            await trackPurchaseCompleted({
              product,
              planType,
              subscriptionId: subscription.id,
            });

            // Fire Loops event for Pro upgrade (product-aware)
            if (session.customer_email) {
              await onProUpgrade(session.customer_email, planType as 'solo' | 'team', product).catch(err => {
                console.error('Failed to send Loops Pro upgrade event:', err);
              });
            }
          }
        } catch (err) {
          console.error('Error processing checkout:', err)
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription

      console.log('Subscription updated:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: subscription.customer,
      })

      try {
        const currentPeriodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
        const canceledAt = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null

        // Update subscription in database
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            ...(currentPeriodStart && { current_period_start: currentPeriodStart }),
            ...(currentPeriodEnd && { current_period_end: currentPeriodEnd }),
            canceled_at: canceledAt,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription:', error)
        }
      } catch (err) {
        console.error('Error processing subscription update:', err)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      console.log('Subscription cancelled:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
      })

      // Mark subscription as cancelled
      const { error, data: cancelledSub } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
        .select('customer_email')
        .single()

      if (error) {
        console.error('Error cancelling subscription:', error)
      } else {
        // Track subscription cancelled in Vercel Analytics
        await trackSubscriptionCancelled({
          subscriptionId: subscription.id,
        });

        if (cancelledSub?.customer_email) {
          // Fire Loops event for subscription cancellation
          await onSubscriptionCancelled(cancelledSub.customer_email).catch(err => {
            console.error('Failed to send Loops cancellation event:', err);
          });
        }
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
