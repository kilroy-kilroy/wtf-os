import { describe, it, expect } from 'vitest'
import { validateShareDocPayload, isValidEmail } from './share-validate'
describe('validateShareDocPayload', () => {
  it('ok with title + content_body', () => {
    expect(validateShareDocPayload({ title: 'T', content_body: '<p>x</p>' })).toEqual({ ok: true })
  })
  it('rejects missing title', () => {
    expect(validateShareDocPayload({ title: null, content_body: '<p>x</p>' })).toEqual({ ok: false, error: 'title is required' })
  })
  it('rejects missing content_body', () => {
    expect(validateShareDocPayload({ title: 'T', content_body: null })).toEqual({ ok: false, error: 'content_body is required' })
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => { expect(isValidEmail('jeff@huemor.com')).toBe(true) })
  it('rejects malformed', () => { expect(isValidEmail('not-an-email')).toBe(false) })
  it('rejects empty', () => { expect(isValidEmail('')).toBe(false) })
})

describe('validateShareDocPayload size cap', () => {
  it('rejects oversized content_body', () => {
    expect(validateShareDocPayload({ title: 'T', content_body: 'x'.repeat(5_000_001) }))
      .toEqual({ ok: false, error: 'content_body too large' })
  })
})
