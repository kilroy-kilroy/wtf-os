import { describe, it, expect } from 'vitest'
import { validateShareDocPayload } from './share-validate'
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
