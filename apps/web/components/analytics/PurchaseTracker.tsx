'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export interface PurchaseItem {
  item_id: string
  item_name: string
  price: number
  quantity: number
}

interface PurchaseTrackerProps {
  transactionId: string
  value: number
  currency: string
  items: PurchaseItem[]
}

export function PurchaseTracker({
  transactionId,
  value,
  currency,
  items,
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
        items: items,
      },
    })
  }, [transactionId, value, currency, items])

  return null
}

// Helper to create item from product/plan info
export function createPurchaseItem(
  product: 'call-lab-pro' | 'discovery-lab-pro' | 'bundle',
  plan: 'solo' | 'team',
  price: number
): PurchaseItem {
  const productNames: Record<string, string> = {
    'call-lab-pro': 'Call Lab Pro',
    'discovery-lab-pro': 'Discovery Lab Pro',
    'bundle': 'SalesOS Bundle',
  }

  return {
    item_id: `${product}-${plan}`,
    item_name: `${productNames[product]} ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
    price: price,
    quantity: 1,
  }
}
