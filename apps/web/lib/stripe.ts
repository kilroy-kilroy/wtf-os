import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility with existing code
export const stripe = typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null

export const PRICES = {
  solo: process.env.STRIPE_PRICE_SOLO || '',
  team: process.env.STRIPE_PRICE_TEAM || '',
} as const

export const DISCOVERY_PRICES = {
  solo: process.env.STRIPE_PRICE_DISCOVERY_SOLO || '',
  team: process.env.STRIPE_PRICE_DISCOVERY_TEAM || '',
} as const

export const BUNDLE_PRICES = {
  solo: process.env.STRIPE_PRICE_BUNDLE_SOLO || '',
  team: process.env.STRIPE_PRICE_BUNDLE_TEAM || '',
} as const

export type PlanType = keyof typeof PRICES
