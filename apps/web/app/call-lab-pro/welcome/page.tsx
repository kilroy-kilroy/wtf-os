import { getStripe } from '@/lib/stripe'
import Link from 'next/link'
import { PurchaseTracker } from './PurchaseTracker'

interface WelcomePageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams
  const sessionId = params.session_id
  let customerEmail: string | null = null
  let plan: string | null = null
  let amountTotal: number | null = null
  let currency: string | null = null

  const stripe = getStripe()
  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      customerEmail = session.customer_email || (session.customer_details?.email ?? null)
      plan = session.metadata?.priceType || null
      amountTotal = session.amount_total ? session.amount_total / 100 : null // Convert cents to dollars
      currency = session.currency?.toUpperCase() || 'USD'
    } catch (error) {
      console.error('Error retrieving session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Track purchase in Google Analytics via GTM */}
      {sessionId && amountTotal && (
        <PurchaseTracker
          transactionId={sessionId}
          value={amountTotal}
          currency={currency || 'USD'}
          planType={plan || 'solo'}
        />
      )}

      {/* Header */}
      <div className="border-b border-[#333] py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xl tracking-wider font-anton">
              SALES<span className="text-[#E51B23]">OS</span>
              <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">PRO</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-[#27ca40] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 font-anton">
            Welcome to Call Lab Pro!
          </h1>
          <p className="text-xl text-gray-400">
            Your subscription is now active.
            {plan === 'team' && ' Team access has been enabled.'}
          </p>
        </div>

        {customerEmail && (
          <p className="text-gray-500 mb-8">
            Confirmation sent to <span className="text-white">{customerEmail}</span>
          </p>
        )}

        <div className="bg-[#1a1a1a] border border-[#333] p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 font-anton">What&apos;s Next?</h2>
          <ul className="text-left text-gray-400 space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59]">1.</span>
              <span>Set up your profile so we know who you are</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59]">2.</span>
              <span>Upload your first call transcript to get your Pro analysis</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59]">3.</span>
              <span>Review your framework scores and tactical rewrites</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#FFDE59]">4.</span>
              <span>Check your dashboard to track progress over time</span>
            </li>
          </ul>
        </div>

        <Link
          href="/onboarding/profile"
          className="inline-block bg-[#E51B23] text-white px-8 py-4 font-bold text-lg hover:bg-[#c41820] transition-colors font-anton tracking-wider"
        >
          SET UP YOUR PROFILE →
        </Link>

        <p className="text-gray-600 text-sm mt-8">
          Questions? Contact us at{' '}
          <a href="mailto:tim@timkilroy.com" className="text-[#FFDE59] hover:underline">
            tim@timkilroy.com
          </a>
        </p>
      </div>
    </div>
  )
}
