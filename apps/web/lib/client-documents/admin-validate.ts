export function validateAdminDocPayload(p: {
  document_type: string; title: string | null; external_url: string | null; content_body: string | null
}): { ok: true } | { ok: false; error: string } {
  if (p.document_type === 'link' && !p.external_url) {
    return { ok: false, error: 'external_url is required for link documents' }
  }
  if ((p.document_type === 'text' || p.document_type === 'html') && !p.content_body) {
    return { ok: false, error: `content_body is required for ${p.document_type} documents` }
  }
  return { ok: true }
}
