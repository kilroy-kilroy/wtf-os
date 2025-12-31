'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

interface PurchaseTrackerProps {
  transactionId: string
  value: number
  currency: string
  planType: string
}

export function PurchaseTracker({
  transactionId,
  value,
  currency,
  planType,
}: PurchaseTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return
    tracked.current = true

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        items: [
          {
            item_id: planType === 'team' ? 'call-lab-pro-team' : 'call-lab-pro-solo',
            item_name: planType === 'team' ? 'Call Lab Pro Team' : 'Call Lab Pro Solo',
            price: value,
            quantity: 1,
          },
        ],
      },
    })
  }, [transactionId, value, currency, planType])

  return null
}
