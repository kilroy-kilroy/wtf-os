import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { onProUpgrade, onSubscriptionCancelled, onGrowthOSBundlePurchased } from '@/lib/loops'
import { addProSubscriber } from '@/lib/beehiiv'
import { copperCloseDeal, PRO_ACV, BUNDLE_ACV } from '@/lib/copper'
import { trackPurchaseCompleted, trackSubscriptionCancelled } from '@/lib/analytics'
import { alertNewSubscription, alertSubscriptionCancelled } from '@/lib/slack'
import { waitUntil } from '@vercel/functions'
import { createSession, getSessionByStripe } from '@/lib/robot-tim/db'
import { captureRobotTimCustomer } from '@/lib/robot-tim/lead'

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

      // Robot-Tim: one-time payment, not a subscription. Create the session row,
      // start the crawl in the background, fire the customer pipeline, and stop.
      if (session.metadata?.product === 'robot-tim') {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
        const siteUrl = session.metadata.site_url as string
        const firstName = (session.metadata.first_name as string) || null
        const email = session.customer_email || null

        try {
          const existing = await getSessionByStripe(session.id)
          if (existing) {
            return NextResponse.json({ received: true })
          }

          const id = await createSession({
            email,
            firstName,
            siteUrl,
            stripeSessionId: session.id,
          })

          // Kick the crawl in the background (Apify can take up to 2 min).
          waitUntil(
            fetch(`${appUrl}/api/robot-tim/crawl`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id }),
            }).catch((e) => console.error('[robot-tim] crawl kick failed:', e))
          )

          if (email) {
            await captureRobotTimCustomer({ id, email, firstName: firstName || undefined, siteUrl })
          }
        } catch (e) {
          console.error('[robot-tim] session create failed:', e)
        }
        return NextResponse.json({ received: true })
      }

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
              current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
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

            // Slack alert
            alertNewSubscription(
              session.customer_email || 'unknown',
              product,
              planType
            );

            // Fire Loops event for Pro upgrade (product-aware)
            if (session.customer_email) {
              await onProUpgrade(session.customer_email, planType as 'solo' | 'team', product).catch(err => {
                console.error('Failed to send Loops Pro upgrade event:', err);
              });

              // Fire dedicated GrowthOS bundle event for welcome series
              if (product === 'growth-bundle') {
                await onGrowthOSBundlePurchased(session.customer_email, planType as 'solo' | 'team').catch(err => {
                  console.error('Failed to send GrowthOS bundle Loops event:', err);
                });
              }

              // Add to Beehiiv newsletter as Pro subscriber
              await addProSubscriber(session.customer_email, product).catch(err => {
                console.error('Failed to add Beehiiv Pro subscriber:', err);
              });

              // Copper CRM: close deal as won (fire-and-forget)
              const copperProductMap: Record<string, string> = {
                'call-lab-pro': 'Call Lab Pro',
                'discovery-lab-pro': 'Discovery Lab Pro',
                'visibility-lab-pro': 'Visibility Lab Pro',
                'growth-bundle': 'Growth Bundle',
                'growthos-bundle': 'Growth Bundle',
              };
              const copperProductName = copperProductMap[product] || product;
              const copperValue = product.includes('bundle') ? BUNDLE_ACV : PRO_ACV;

              copperCloseDeal({
                email: session.customer_email!,
                productName: copperProductName,
                monetaryValue: copperValue,
                note: `Purchased ${copperProductName} (${planType} plan) — Subscription: ${subscription.id}`,
              }).catch(err => console.error('[Copper] close deal failed:', err));
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
        const item = subscription.items.data[0]
        const currentPeriodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null
        const currentPeriodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
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

        // Slack alert
        alertSubscriptionCancelled(cancelledSub?.customer_email || 'unknown');

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
