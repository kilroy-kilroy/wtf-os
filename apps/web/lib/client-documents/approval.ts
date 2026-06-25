export function isFirstView(doc: { viewed_at: string | null }): boolean {
  return doc.viewed_at === null
}

export function validateApprove(
  doc: { requires_approval: boolean; approved_at: string | null },
  name: string,
): { ok: true } | { ok: false; error: string } {
  if (!doc.requires_approval) return { ok: false, error: 'approval not enabled' }
  if (doc.approved_at) return { ok: false, error: 'already approved' }
  if (!name.trim()) return { ok: false, error: 'name required' }
  return { ok: true }
}
