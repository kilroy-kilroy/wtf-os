import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility with existing code
export const stripe = typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null

// Product prices
export const PRICES = {
  // Call Lab Pro
  'call-lab-pro-solo': process.env.STRIPE_PRICE_SOLO || '',
  'call-lab-pro-team': process.env.STRIPE_PRICE_TEAM || '',
  // Discovery Lab Pro
  'discovery-lab-pro-solo': process.env.STRIPE_PRICE_DISCOVERY_SOLO || '',
  'discovery-lab-pro-team': process.env.STRIPE_PRICE_DISCOVERY_TEAM || '',
  // Bundle (Call Lab Pro + Discovery Lab Pro)
  'bundle-solo': process.env.STRIPE_PRICE_BUNDLE_SOLO || '',
  'bundle-team': process.env.STRIPE_PRICE_BUNDLE_TEAM || '',
  // Legacy aliases for backwards compatibility
  solo: process.env.STRIPE_PRICE_SOLO || '',
  team: process.env.STRIPE_PRICE_TEAM || '',
} as const

export type PriceKey = keyof typeof PRICES
export type PlanType = 'solo' | 'team'
export type ProductType = 'call-lab-pro' | 'discovery-lab-pro' | 'bundle'

// Price amounts in dollars (for display)
export const PRICE_AMOUNTS: Record<string, number> = {
  'call-lab-pro-solo': 29,
  'call-lab-pro-team': 87, // Adjust if different
  'discovery-lab-pro-solo': 29, // Adjust if different
  'discovery-lab-pro-team': 87, // Adjust if different
  'bundle-solo': 45,
  'bundle-team': 135,
}

// Helper to get price ID for a product and plan
export function getPriceId(product: ProductType, plan: PlanType): string {
  const key = `${product}-${plan}` as PriceKey
  return PRICES[key] || ''
}

// Helper to get price amount for a product and plan
export function getPriceAmount(product: ProductType, plan: PlanType): number {
  const key = `${product}-${plan}`
  return PRICE_AMOUNTS[key] || 0
}
