import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PRICES = {
  solo: process.env.STRIPE_PRICE_SOLO || 'price_solo_placeholder',
  team: process.env.STRIPE_PRICE_TEAM || 'price_team_placeholder',
} as const

export type PlanType = keyof typeof PRICES
