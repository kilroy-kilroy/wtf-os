export function validateShareDocPayload(p: { title: string | null; content_body: string | null }): { ok: true } | { ok: false; error: string } {
  if (!p.title || !p.title.trim()) return { ok: false, error: 'title is required' }
  if (!p.content_body || !p.content_body.trim()) return { ok: false, error: 'content_body is required' }
  return { ok: true }
}
