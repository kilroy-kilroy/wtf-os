import { describe, it, expect } from 'vitest'
import { buildDocumentViewedText, buildDocumentApprovedText } from './slack'

describe('slack document notifications', () => {
  it('viewed text names the client and doc', () => {
    const t = buildDocumentViewedText('Huemor', 'The Path Forward')
    expect(t).toContain('Huemor')
    expect(t).toContain('The Path Forward')
    expect(t.toLowerCase()).toContain('view')
  })
  it('approved text names client, doc, and approver', () => {
    const t = buildDocumentApprovedText('Huemor', 'The Path Forward', 'Jeff Gapinski')
    expect(t).toContain('Huemor')
    expect(t).toContain('The Path Forward')
    expect(t).toContain('Jeff Gapinski')
    expect(t.toLowerCase()).toContain('approv')
  })
})
