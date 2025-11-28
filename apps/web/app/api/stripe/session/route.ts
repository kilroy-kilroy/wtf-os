import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id parameter' },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items'],
    });

    // Verify the session is complete
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Determine plan type from price/product
    // We'll check the line items to determine if it's solo or team
    const lineItems = session.line_items?.data || [];
    let plan: 'solo' | 'team' = 'solo';

    for (const item of lineItems) {
      const priceId = item.price?.id;
      // Check if this is the team plan price
      // You can also check product metadata or name
      if (
        item.price?.unit_amount === 8900 || // $89 team plan
        item.description?.toLowerCase().includes('team')
      ) {
        plan = 'team';
        break;
      }
    }

    // Get customer info
    const customer = session.customer as Stripe.Customer | null;
    const customerEmail = session.customer_email || customer?.email || '';
    const customerName = customer?.name || session.customer_details?.name || '';

    return NextResponse.json({
      email: customerEmail,
      customerName: customerName,
      plan: plan,
      sessionId: session.id,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    });
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Invalid or expired session' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to verify purchase' },
      { status: 500 }
    );
  }
}
