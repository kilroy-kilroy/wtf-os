import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null

export const PRICES = {
  solo: process.env.STRIPE_PRICE_SOLO || 'price_solo_placeholder',
  team: process.env.STRIPE_PRICE_TEAM || 'price_team_placeholder',
} as const

export type PlanType = keyof typeof PRICES
