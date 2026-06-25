import { describe, it, expect } from 'vitest'
import { isFirstView } from './approval'

describe('isFirstView', () => {
  it('true when viewed_at is null', () => { expect(isFirstView({ viewed_at: null })).toBe(true) })
  it('false when viewed_at is set', () => { expect(isFirstView({ viewed_at: '2026-06-25T00:00:00Z' })).toBe(false) })
})

import { validateApprove } from './approval'

describe('validateApprove', () => {
  const base = { requires_approval: true, approved_at: null }
  it('ok with a name on an approvable doc', () => {
    expect(validateApprove(base, 'Jeff')).toEqual({ ok: true })
  })
  it('rejects empty name', () => {
    expect(validateApprove(base, '  ')).toEqual({ ok: false, error: 'name required' })
  })
  it('rejects when already approved', () => {
    expect(validateApprove({ requires_approval: true, approved_at: '2026-06-25T00:00:00Z' }, 'Jeff'))
      .toEqual({ ok: false, error: 'already approved' })
  })
  it('rejects when approval not requested', () => {
    expect(validateApprove({ requires_approval: false, approved_at: null }, 'Jeff'))
      .toEqual({ ok: false, error: 'approval not enabled' })
  })
})
