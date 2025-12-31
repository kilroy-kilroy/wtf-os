'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ProductChoice = 'discovery-lab-pro' | 'bundle'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || 'solo'
  const isSolo = plan === 'solo'

  const [selectedProduct, setSelectedProduct] = useState<ProductChoice>('discovery-lab-pro')
  const [isLoading, setIsLoading] = useState(false)

  const prices = {
    'call-lab-pro': isSolo ? 29 : 87,
    'discovery-lab-pro': isSolo ? 29 : 87,
    'bundle': isSolo ? 45 : 135,
  }

  const bundleSavings = prices['call-lab-pro'] + prices['discovery-lab-pro'] - prices.bundle

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: selectedProduct,
          plan: plan,
        }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setIsLoading(false)
    }
  }

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

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2 font-anton text-center">
          CHOOSE YOUR PLAN
        </h1>
        <p className="text-gray-400 text-center mb-8">
          {isSolo ? 'Solo' : 'Team'} Plan
        </p>

        {/* Product Options */}
        <div className="space-y-4 mb-8">
          {/* Discovery Lab Pro Only */}
          <button
            onClick={() => setSelectedProduct('discovery-lab-pro')}
            className={`w-full p-6 border-2 text-left transition-all ${
              selectedProduct === 'discovery-lab-pro'
                ? 'border-[#E51B23] bg-[#1a1a1a]'
                : 'border-[#333] bg-[#111] hover:border-[#555]'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white font-anton">DISCOVERY LAB PRO</h3>
                <p className="text-gray-400 mt-1">
                  Pre-call intelligence & research
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-500">
                  <li>• Unlimited discovery blueprints</li>
                  <li>• Company & prospect research</li>
                  <li>• Conversation playbooks</li>
                  <li>• Psychology-driven insights</li>
                </ul>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">${prices['discovery-lab-pro']}</span>
                <span className="text-gray-400">/mo</span>
              </div>
            </div>
          </button>

          {/* Bundle Option */}
          <button
            onClick={() => setSelectedProduct('bundle')}
            className={`w-full p-6 border-2 text-left transition-all relative ${
              selectedProduct === 'bundle'
                ? 'border-[#FFDE59] bg-[#1a1a1a]'
                : 'border-[#333] bg-[#111] hover:border-[#555]'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-4 bg-[#FFDE59] text-black px-3 py-1 text-xs font-bold">
              BEST VALUE - SAVE ${bundleSavings}/MO
            </div>

            <div className="flex justify-between items-start mt-2">
              <div>
                <h3 className="text-xl font-bold text-white font-anton">
                  SALESOS BUNDLE
                </h3>
                <p className="text-[#FFDE59] mt-1 font-semibold">
                  Discovery Lab Pro + Call Lab Pro
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-500">
                  <li>• Everything in Discovery Lab Pro</li>
                  <li className="text-[#FFDE59]">• + AI-powered call analysis</li>
                  <li className="text-[#FFDE59]">• + Framework scoring</li>
                  <li className="text-[#FFDE59]">• + Tactical rewrites & coaching</li>
                </ul>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">${prices.bundle}</span>
                <span className="text-gray-400">/mo</span>
                <div className="text-sm text-gray-500 line-through mt-1">
                  ${prices['call-lab-pro'] + prices['discovery-lab-pro']}/mo
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full bg-[#E51B23] text-white py-4 font-bold text-lg hover:bg-[#c41820] transition-colors font-anton tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'LOADING...' : `CONTINUE TO PAYMENT →`}
        </button>

        <p className="text-center text-gray-600 text-sm mt-4">
          Secure checkout powered by Stripe
        </p>

        <p className="text-center mt-6">
          <a href="/discovery-lab-pro" className="text-gray-500 hover:text-white text-sm">
            ← Back to Discovery Lab Pro
          </a>
        </p>
      </div>
    </div>
  )
}
