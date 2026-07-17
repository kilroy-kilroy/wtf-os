import { describe, it, expect } from 'vitest'
import { canViewOfficeHours, storagePathFromContentUrl } from './office-hours-access'

describe('canViewOfficeHours', () => {
  it('admins can always view', () => {
    expect(canViewOfficeHours(true, [], ['p1'])).toBe(true)
  })
  it('empty program_ids is visible to everyone', () => {
    expect(canViewOfficeHours(false, [], [])).toBe(true)
    expect(canViewOfficeHours(false, [], null)).toBe(true)
  })
  it('visible when the user shares a program', () => {
    expect(canViewOfficeHours(false, ['agency', 'other'], ['agency'])).toBe(true)
  })
  it('hidden when there is no program overlap', () => {
    expect(canViewOfficeHours(false, ['other'], ['agency'])).toBe(false)
  })
  it('hidden when the user has no programs', () => {
    expect(canViewOfficeHours(false, [], ['agency'])).toBe(false)
  })
})

describe('storagePathFromContentUrl', () => {
  it('derives the object path from a public-format URL', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/public/client-documents/sessions/123-call.vtt'
    expect(storagePathFromContentUrl(url)).toBe('sessions/123-call.vtt')
  })
  it('decodes percent-encoding', () => {
    const url = 'https://ref.supabase.co/storage/v1/object/public/client-documents/sessions/a%20b.vtt'
    expect(storagePathFromContentUrl(url)).toBe('sessions/a b.vtt')
  })
  it('returns null for a non-matching URL', () => {
    expect(storagePathFromContentUrl('https://example.com/nope.vtt')).toBeNull()
  })
  it('returns null for null/empty', () => {
    expect(storagePathFromContentUrl(null)).toBeNull()
    expect(storagePathFromContentUrl('')).toBeNull()
  })
})
