import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
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
    const error = err as Error
    console.error('Webhook signature verification failed:', {
      message: error.message,
      signatureHeader: signature?.substring(0, 50) + '...',
      secretPrefix: webhookSecret?.substring(0, 10) + '...',
      bodyLength: body?.length,
      bodyPreview: body?.substring(0, 100),
    })
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

      // Get period dates from subscription (items may have period in some API versions)
      const firstItem = subscription.items?.data?.[0] as Stripe.SubscriptionItem & {
        current_period_start?: number
        current_period_end?: number
      }
      const periodStart = subscription.current_period_start ?? firstItem?.current_period_start
      const periodEnd = subscription.current_period_end ?? firstItem?.current_period_end

      // First, check if the subscription exists
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: periodStart
              ? new Date(periodStart * 1000).toISOString()
              : undefined,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : undefined,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
      } else {
        // Subscription doesn't exist yet - create it
        // This handles race condition where update arrives before checkout.session.completed
        console.log('Subscription not found, creating new record')

        // Fetch customer email from Stripe
        let customerEmail = ''
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          if (customer && !customer.deleted) {
            customerEmail = customer.email || ''
          }
        } catch (err) {
          console.error('Error fetching customer:', err)
        }

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

        const { error } = await supabase
          .from('subscriptions')
          .insert({
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            user_id: userId,
            customer_email: customerEmail,
            plan_type: 'solo', // Default, will be updated if checkout.session.completed arrives later
            status: subscription.status,
            current_period_start: periodStart
              ? new Date(periodStart * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : new Date().toISOString(),
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          console.error('Error creating subscription:', error)
          return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
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
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
