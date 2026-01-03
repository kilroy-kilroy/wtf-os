import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  try {
    // Verify authorization (accept either cron or admin secret)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || (token !== CRON_SECRET && token !== ADMIN_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const supabase = getSupabase();

    // Fetch all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      expand: ['data.customer'],
    });

    const results = {
      total: subscriptions.data.length,
      synced: 0,
      errors: [] as string[],
      subscriptions: [] as {
        email: string;
        status: string;
        plan: string;
        created: string;
      }[],
    };

    for (const sub of subscriptions.data) {
      try {
        const customer = sub.customer as import('stripe').Stripe.Customer;
        const customerEmail = customer.email || '';

        // Determine plan type from metadata or price
        let planType = 'solo';
        if (sub.items.data.length > 0) {
          const priceId = sub.items.data[0].price.id;
          // Check if it's a team plan based on price ID or metadata
          if (priceId.toLowerCase().includes('team') ||
              sub.metadata?.priceType === 'team') {
            planType = 'team';
          }
        }

        // Upsert to database
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            stripe_customer_id: customer.id,
            stripe_subscription_id: sub.id,
            customer_email: customerEmail,
            plan_type: planType,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            canceled_at: sub.canceled_at
              ? new Date(sub.canceled_at * 1000).toISOString()
              : null,
            created_at: new Date(sub.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'stripe_subscription_id',
          });

        if (error) {
          results.errors.push(`${customerEmail}: ${error.message}`);
        } else {
          results.synced++;
          results.subscriptions.push({
            email: customerEmail,
            status: sub.status,
            plan: planType,
            created: new Date(sub.created * 1000).toISOString(),
          });
        }
      } catch (err) {
        results.errors.push(`Sub ${sub.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced}/${results.total} subscriptions from Stripe`,
      results,
    });
  } catch (error) {
    console.error('Stripe sync error:', error);
    return NextResponse.json({
      error: 'Failed to sync',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
