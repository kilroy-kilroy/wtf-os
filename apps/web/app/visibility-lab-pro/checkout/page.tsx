import { redirect } from 'next/navigation';
import { getStripe } from '@/lib/stripe';

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

const VISIBILITY_PRICES = {
  solo: process.env.STRIPE_PRICE_VISIBILITY_SOLO || '',
  team: process.env.STRIPE_PRICE_VISIBILITY_TEAM || '',
} as const;

type PlanType = keyof typeof VISIBILITY_PRICES;

export default async function VisibilityLabProCheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const plan = params.plan as PlanType | undefined;
  const selectedPlan: PlanType = plan && plan in VISIBILITY_PRICES ? plan : 'solo';
  const priceId = VISIBILITY_PRICES[selectedPlan];

  const stripe = getStripe();

  // Check if Stripe is configured
  if (!stripe || !priceId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-[#333] p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Coming Soon</h1>
          <p className="text-gray-400 mb-6">
            Visibility Lab Pro checkout is being set up. Please check back shortly.
          </p>
          <a
            href="/visibility-lab-pro"
            className="inline-block bg-[#E51B23] text-white px-6 py-3 font-semibold hover:bg-[#c41820] transition-colors"
          >
            GO BACK
          </a>
        </div>
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/visibility-lab-pro/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/visibility-lab-pro`,
    metadata: { plan: selectedPlan, priceType: selectedPlan, product: 'visibility-lab-pro' },
  });

  if (session.url) {
    redirect(session.url);
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Checkout Error</h1>
        <p className="text-gray-400 mb-6">Something went wrong. Please try again.</p>
        <a
          href="/visibility-lab-pro"
          className="inline-block bg-[#E51B23] text-white px-6 py-3 font-semibold hover:bg-[#c41820] transition-colors"
        >
          GO BACK
        </a>
      </div>
    </div>
  );
}
