const MAX_CONTENT_BYTES = 5_000_000

export function validateShareDocPayload(p: { title: string | null; content_body: string | null }): { ok: true } | { ok: false; error: string } {
  if (!p.title || !p.title.trim()) return { ok: false, error: 'title is required' }
  if (!p.content_body || !p.content_body.trim()) return { ok: false, error: 'content_body is required' }
  if (p.content_body.length > MAX_CONTENT_BYTES) return { ok: false, error: 'content_body too large' }
  return { ok: true }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
