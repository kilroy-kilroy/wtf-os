import { describe, it, expect } from 'vitest'
import { generateShareToken } from './share-token'

describe('generateShareToken', () => {
  it('is url-safe and long', () => { expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]{22,}$/) })
  it('differs each call', () => { expect(generateShareToken()).not.toBe(generateShareToken()) })
})
