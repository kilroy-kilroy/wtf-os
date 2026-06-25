import { describe, it, expect } from 'vitest'
import { isFirstView } from './approval'

describe('isFirstView', () => {
  it('true when viewed_at is null', () => { expect(isFirstView({ viewed_at: null })).toBe(true) })
  it('false when viewed_at is set', () => { expect(isFirstView({ viewed_at: '2026-06-25T00:00:00Z' })).toBe(false) })
})
