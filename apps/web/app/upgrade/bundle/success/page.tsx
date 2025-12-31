'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export default function UpgradeSuccessPage() {
  const tracked = useRef(false)

  // Track upgrade event
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'upgrade',
      upgrade_type: 'bundle',
      // The actual revenue will be tracked by the subscription.updated webhook
      // This event is just for user journey tracking
    })
  }, [])

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-[#333] py-4">
        <div className="max-w-4xl mx-auto px-4">
          <span className="text-white font-bold text-xl tracking-wider font-anton">
            SALES<span className="text-[#E51B23]">OS</span>
            <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">BUNDLE</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-[#FFDE59] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 font-anton">
            Upgrade Complete!
          </h1>
          <p className="text-xl text-gray-400">
            You now have full access to the SalesOS Bundle.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#333] p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 font-anton">Your Bundle Includes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="border border-[#333] p-4">
              <h3 className="text-[#E51B23] font-bold mb-2 font-anton">CALL LAB PRO</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• AI-powered call analysis</li>
                <li>• Framework scoring</li>
                <li>• Tactical rewrites</li>
                <li>• Progress dashboard</li>
              </ul>
            </div>
            <div className="border border-[#333] p-4">
              <h3 className="text-[#FFDE59] font-bold mb-2 font-anton">DISCOVERY LAB PRO</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Discovery blueprints</li>
                <li>• Company research</li>
                <li>• Prospect psychology</li>
                <li>• Conversation playbooks</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#FFDE59] p-6 mb-8">
          <p className="text-gray-400">
            Your billing has been updated automatically. You&apos;ll see a prorated charge for the remainder of this billing period.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/discovery-lab"
            className="inline-block bg-[#FFDE59] text-black px-8 py-4 font-bold text-lg hover:bg-[#e5c84f] transition-colors font-anton tracking-wider"
          >
            TRY DISCOVERY LAB →
          </Link>
          <Link
            href="/call-lab"
            className="inline-block bg-[#E51B23] text-white px-8 py-4 font-bold text-lg hover:bg-[#c41820] transition-colors font-anton tracking-wider"
          >
            GO TO CALL LAB →
          </Link>
        </div>

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
