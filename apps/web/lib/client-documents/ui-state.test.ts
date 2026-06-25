import { describe, it, expect } from 'vitest'
import { canApprove } from './ui-state'

describe('canApprove', () => {
  it('true when required and not yet approved', () => {
    expect(canApprove({ requires_approval: true, approved_at: null })).toBe(true)
  })
  it('false when already approved', () => {
    expect(canApprove({ requires_approval: true, approved_at: '2026-06-25T00:00:00Z' })).toBe(false)
  })
  it('false when not required', () => {
    expect(canApprove({ requires_approval: false, approved_at: null })).toBe(false)
  })
})
