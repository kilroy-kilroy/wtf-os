import { stripe } from '@/lib/stripe'
import Link from 'next/link'

interface WelcomePageProps {
  searchParams: { session_id?: string }
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const sessionId = searchParams.session_id
  let customerEmail: string | null = null
  let plan: string | null = null

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      customerEmail = session.customer_email || (session.customer_details?.email ?? null)
      plan = session.metadata?.plan || null
    } catch (error) {
      console.error('Error retrieving session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-[#333] py-4">
        <div className="max-w-4xl mx-auto px-4">
          <span className="text-white font-bold text-xl tracking-wider">
            CALL<span className="text-[#E51B23]">LAB</span>
            <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">PRO</span>
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-[#27ca40] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to Call Lab Pro!</h1>
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
          <h2 className="text-xl font-bold text-white mb-4">What&apos;s Next?</h2>
          <ul className="text-left text-gray-400 space-y-3">
            <li className="flex items-start gap-3"><span className="text-[#FFDE59]">1.</span><span>Upload your first call transcript to get your Pro analysis</span></li>
            <li className="flex items-start gap-3"><span className="text-[#FFDE59]">2.</span><span>Review your framework scores and tactical rewrites</span></li>
            <li className="flex items-start gap-3"><span className="text-[#FFDE59]">3.</span><span>Check your dashboard to track progress over time</span></li>
            <li className="flex items-start gap-3"><span className="text-[#FFDE59]">4.</span><span>Get your first weekly coaching report on Monday</span></li>
          </ul>
        </div>

        <Link href="/call-lab" className="inline-block bg-[#E51B23] text-white px-8 py-4 font-bold text-lg hover:bg-[#c41820] transition-colors">
          ANALYZE YOUR FIRST CALL
        </Link>
      </div>
    </div>
  )
}
