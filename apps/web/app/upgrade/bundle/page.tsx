'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function UpgradeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get identifiers from URL params (from email link)
  const customerId = searchParams.get('customer')
  const subscriptionId = searchParams.get('subscription')
  const plan = searchParams.get('plan') || 'solo'
  const currentProduct = searchParams.get('from') || 'call-lab-pro'

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSolo = plan === 'solo'
  const prices = {
    'call-lab-pro': isSolo ? 29 : 87,
    'discovery-lab-pro': isSolo ? 29 : 87,
    'bundle': isSolo ? 45 : 135,
  }

  const currentPrice = prices[currentProduct as keyof typeof prices] || prices['call-lab-pro']
  const bundlePrice = prices.bundle
  const additionalCost = bundlePrice - currentPrice

  const otherProduct = currentProduct === 'call-lab-pro' ? 'Discovery Lab Pro' : 'Call Lab Pro'

  const handleUpgrade = async () => {
    if (!customerId && !subscriptionId) {
      setError('Missing customer information. Please contact support.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          plan,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to upgrade. Please try again.')
        setIsLoading(false)
        return
      }

      // Redirect to success page
      router.push('/upgrade/bundle/success')
    } catch (err) {
      console.error('Upgrade error:', err)
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  // If no customer info, show error
  if (!customerId && !subscriptionId) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[60vh]">
        <div className="bg-[#1a1a1a] border border-[#333] p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4 font-anton">Invalid Link</h1>
          <p className="text-gray-400 mb-6">
            This upgrade link is missing required information. Please use the link from your email or contact support.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[#E51B23] text-white px-6 py-3 font-semibold hover:bg-[#c41820] transition-colors"
          >
            GO TO DASHBOARD
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-block bg-[#FFDE59] text-black px-4 py-2 text-sm font-bold mb-4">
          EXCLUSIVE UPGRADE OFFER
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-anton">
          UPGRADE TO THE SALESOS BUNDLE
        </h1>
        <p className="text-xl text-gray-400">
          Add {otherProduct} to your subscription for just ${additionalCost}/mo more
        </p>
      </div>

      {/* Current vs Bundle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Current Plan */}
        <div className="bg-[#1a1a1a] border border-[#333] p-6">
          <div className="text-gray-500 text-sm mb-2">YOUR CURRENT PLAN</div>
          <h3 className="text-xl font-bold text-white font-anton mb-2">
            {currentProduct === 'call-lab-pro' ? 'CALL LAB PRO' : 'DISCOVERY LAB PRO'}
          </h3>
          <div className="text-2xl font-bold text-white mb-4">
            ${currentPrice}<span className="text-gray-400 text-base">/mo</span>
          </div>
          <ul className="text-gray-400 text-sm space-y-2">
            {currentProduct === 'call-lab-pro' ? (
              <>
                <li>✓ AI-powered call analysis</li>
                <li>✓ Framework scoring</li>
                <li>✓ Tactical rewrites</li>
                <li>✓ Progress dashboard</li>
              </>
            ) : (
              <>
                <li>✓ Discovery blueprints</li>
                <li>✓ Company research</li>
                <li>✓ Prospect psychology</li>
                <li>✓ Conversation playbooks</li>
              </>
            )}
          </ul>
        </div>

        {/* Bundle */}
        <div className="bg-[#1a1a1a] border-2 border-[#FFDE59] p-6 relative">
          <div className="absolute -top-3 left-4 bg-[#FFDE59] text-black px-3 py-1 text-xs font-bold">
            UPGRADE TO THIS
          </div>
          <div className="text-[#FFDE59] text-sm mb-2 mt-2">SALESOS BUNDLE</div>
          <h3 className="text-xl font-bold text-white font-anton mb-2">
            CALL LAB + DISCOVERY LAB
          </h3>
          <div className="text-2xl font-bold text-white mb-4">
            ${bundlePrice}<span className="text-gray-400 text-base">/mo</span>
          </div>
          <ul className="text-sm space-y-2">
            <li className="text-gray-400">✓ Everything you have now</li>
            <li className="text-[#FFDE59]">+ {otherProduct}</li>
            {currentProduct === 'call-lab-pro' ? (
              <>
                <li className="text-[#FFDE59]">+ Discovery blueprints</li>
                <li className="text-[#FFDE59]">+ Pre-call research</li>
              </>
            ) : (
              <>
                <li className="text-[#FFDE59]">+ Call analysis</li>
                <li className="text-[#FFDE59]">+ Framework scoring</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Upgrade Summary */}
      <div className="bg-[#111] border border-[#333] p-6 mb-8">
        <div className="flex justify-between items-center text-lg">
          <span className="text-gray-400">Additional cost:</span>
          <span className="text-white font-bold">+${additionalCost}/mo</span>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Your card will be charged a prorated amount for the rest of this billing period.
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 mb-6 text-center">
          {error}
        </div>
      )}

      {/* Upgrade Button */}
      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className="w-full bg-[#FFDE59] text-black py-4 font-bold text-lg hover:bg-[#e5c84f] transition-colors font-anton tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'UPGRADING...' : `UPGRADE NOW FOR +$${additionalCost}/MO`}
      </button>

      <p className="text-center text-gray-600 text-sm mt-4">
        Instant upgrade • No action needed • Prorated billing
      </p>

      <p className="text-center mt-6">
        <a href="/dashboard" className="text-gray-500 hover:text-white text-sm">
          ← Back to Dashboard
        </a>
      </p>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-[#333] py-4">
        <div className="max-w-4xl mx-auto px-4">
          <span className="text-white font-bold text-xl tracking-wider font-anton">
            SALES<span className="text-[#E51B23]">OS</span>
          </span>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="text-white font-anton text-xl">Loading...</div>
        </div>
      }>
        <UpgradeContent />
      </Suspense>
    </div>
  )
}
