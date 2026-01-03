import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { addLeadToLoops, updateContactSubscription, triggerLoopsEvent } from '@/lib/loops'
import Stripe from 'stripe'

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

          const planType = session.metadata?.priceType || 'solo'
          const customerEmail = session.customer_email || ''

          // Try to find existing user by email
          let userId = null
          if (customerEmail) {
            const { data: user } = await supabase
              .from('users')
              .select('id')
              .eq('email', customerEmail)
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
              customer_email: customerEmail,
              plan_type: planType,
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
          }

          // Sync to Loops: Add contact and trigger subscription event
          if (customerEmail) {
            // Add/update contact in Loops with subscriber status
            await addLeadToLoops(customerEmail, 'stripe-checkout', {
              subscriptionTier: 'subscriber',
              planType: planType,
              stripeCustomerId: session.customer as string,
            })

            // Update their subscription tier in Loops
            await updateContactSubscription(
              customerEmail,
              'subscriber',
              planType as 'solo' | 'team'
            )

            // Trigger subscription_started event for automations
            await triggerLoopsEvent(customerEmail, 'subscription_started', {
              planType: planType,
              amount: subscription.items.data[0]?.price?.unit_amount
                ? subscription.items.data[0].price.unit_amount / 100
                : 29,
            })

            console.log('Loops: Subscription started event sent for', customerEmail)
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

      // Update subscription in database
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Error updating subscription:', error)
      }

      // If subscription became active after being past_due or trialing
      if (subscription.status === 'active') {
        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
        if (customer.email) {
          await triggerLoopsEvent(customer.email, 'subscription_renewed', {
            status: subscription.status,
          })
        }
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
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) {
        console.error('Error cancelling subscription:', error)
      }

      // Trigger cancellation event in Loops
      try {
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
        if (customer.email) {
          // Update contact tier to 'free' in Loops
          await updateContactSubscription(customer.email, 'free')

          // Trigger cancellation event for win-back automations
          await triggerLoopsEvent(customer.email, 'subscription_cancelled', {
            reason: subscription.cancellation_details?.reason || 'unknown',
          })

          console.log('Loops: Subscription cancelled event sent for', customer.email)
        }
      } catch (err) {
        console.error('Error sending cancellation to Loops:', err)
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
