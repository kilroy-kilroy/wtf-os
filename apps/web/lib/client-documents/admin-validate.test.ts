import { describe, it, expect } from 'vitest'
import { validateAdminDocPayload } from './admin-validate'

describe('validateAdminDocPayload', () => {
  it('html requires content_body', () => {
    expect(validateAdminDocPayload({ document_type: 'html', title: 'T', external_url: null, content_body: null }))
      .toEqual({ ok: false, error: 'content_body is required for html documents' })
  })
  it('html ok with content_body', () => {
    expect(validateAdminDocPayload({ document_type: 'html', title: 'T', external_url: null, content_body: '<p>x</p>' }))
      .toEqual({ ok: true })
  })
  it('link still requires external_url', () => {
    expect(validateAdminDocPayload({ document_type: 'link', title: 'T', external_url: null, content_body: null }))
      .toEqual({ ok: false, error: 'external_url is required for link documents' })
  })
})
