import { getStripe } from '@/lib/stripe'
import { PurchaseTracker, createPurchaseItem } from '@/components/analytics/PurchaseTracker'
import Link from 'next/link'

interface WelcomePageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams
  const sessionId = params.session_id
  let amountTotal: number | null = null
  let currency: string | null = null
  let plan: string | null = null

  const stripe = getStripe()
  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      amountTotal = session.amount_total ? session.amount_total / 100 : null
      currency = session.currency?.toUpperCase() || 'USD'
      plan = session.metadata?.plan || 'solo'
    } catch (error) {
      console.error('Error retrieving session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Track purchase in Google Analytics via GTM */}
      {sessionId && amountTotal && (
        <PurchaseTracker
          transactionId={sessionId}
          value={amountTotal}
          currency={currency || 'USD'}
          items={[createPurchaseItem('discovery-lab-pro', (plan as 'solo' | 'team') || 'solo', amountTotal)]}
        />
      )}

      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#E51B23] flex items-center justify-center">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Header */}
        <h1 className="font-anton text-[clamp(36px,6vw,56px)] text-white mb-4 tracking-wide">
          WELCOME TO{' '}
          <span className="text-[#FFDE59]">DISCOVERY LAB PRO</span>
        </h1>

        <p className="text-xl text-[#CCCCCC] mb-8 leading-relaxed">
          You just upgraded your pre-call intelligence.
          <br />
          Every discovery call is about to feel like an unfair advantage.
        </p>

        {/* What's Next */}
        <div className="bg-[#1a1a1a] border border-[#333] p-8 mb-8 text-left">
          <h2 className="font-anton text-2xl text-[#E51B23] mb-6 tracking-wide">
            WHAT HAPPENS NEXT
          </h2>
          <ul className="space-y-4 text-[#CCCCCC]">
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59] font-bold">1.</span>
              <span>
                Check your email for access instructions and your dashboard login
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59] font-bold">2.</span>
              <span>
                Start generating Discovery Blueprints with full company research,
                prospect psychology, and conversation playbooks
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59] font-bold">3.</span>
              <span>
                Use your first blueprint on your next call and feel the difference
              </span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/discovery-lab"
            className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg tracking-wide hover:bg-[#FFDE59] hover:text-black transition-colors no-underline"
          >
            [ START YOUR FIRST BLUEPRINT ]
          </Link>
          <Link
            href="/dashboard"
            className="inline-block bg-[#333] text-white px-8 py-4 font-anton text-lg tracking-wide hover:bg-[#444] transition-colors no-underline"
          >
            [ GO TO DASHBOARD ]
          </Link>
        </div>

        {/* Session ID for debugging */}
        {sessionId && (
          <p className="mt-8 text-xs text-[#666]">
            Order reference: {sessionId.substring(0, 20)}...
          </p>
        )}

        {/* Support */}
        <p className="mt-8 text-sm text-[#666]">
          Questions? Email{' '}
          <a href="mailto:tim@timkilroy.com" className="text-[#FFDE59]">
            tim@timkilroy.com
          </a>
        </p>
      </div>
    </div>
  )
}
