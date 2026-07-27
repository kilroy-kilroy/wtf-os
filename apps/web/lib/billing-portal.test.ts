import { describe, it, expect } from 'vitest'
import { selectBillingCustomerId } from './billing-portal'

describe('selectBillingCustomerId', () => {
  it('returns null when there are no rows', () => {
    expect(selectBillingCustomerId([])).toBeNull()
    expect(selectBillingCustomerId(null)).toBeNull()
    expect(selectBillingCustomerId(undefined)).toBeNull()
  })

  it('returns null when rows carry no usable customer id', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: null, status: 'active' },
        { stripe_customer_id: '  ', status: 'active' },
      ])
    ).toBeNull()
  })

  it('returns the customer id of a lone active subscription', () => {
    expect(
      selectBillingCustomerId([{ stripe_customer_id: 'cus_live', status: 'active' }])
    ).toBe('cus_live')
  })

  it('prefers an active subscription over a cancelled one', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: 'cus_old', status: 'canceled', created_at: '2026-07-01T00:00:00Z' },
        { stripe_customer_id: 'cus_new', status: 'active', created_at: '2026-01-01T00:00:00Z' },
      ])
    ).toBe('cus_new')
  })

  it('prefers past_due over cancelled so a lapsed card can be fixed', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: 'cus_dead', status: 'canceled', created_at: '2026-07-01T00:00:00Z' },
        { stripe_customer_id: 'cus_lapsed', status: 'past_due', created_at: '2026-01-01T00:00:00Z' },
      ])
    ).toBe('cus_lapsed')
  })

  it('breaks ties on equal status by most recently created', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: 'cus_first', status: 'active', created_at: '2026-01-01T00:00:00Z' },
        { stripe_customer_id: 'cus_latest', status: 'active', created_at: '2026-07-01T00:00:00Z' },
      ])
    ).toBe('cus_latest')
  })

  it('still returns a cancelled customer so past invoices stay reachable', () => {
    expect(
      selectBillingCustomerId([{ stripe_customer_id: 'cus_gone', status: 'canceled' }])
    ).toBe('cus_gone')
  })

  it('trims whitespace and skips blank ids while ranking', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: '', status: 'active' },
        { stripe_customer_id: ' cus_padded ', status: 'active' },
      ])
    ).toBe('cus_padded')
  })

  it('tolerates missing and unparseable created_at values', () => {
    expect(
      selectBillingCustomerId([
        { stripe_customer_id: 'cus_nodate', status: 'active' },
        { stripe_customer_id: 'cus_baddate', status: 'active', created_at: 'not-a-date' },
      ])
    ).toBe('cus_nodate')
  })
})
