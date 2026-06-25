export function canApprove(doc: { requires_approval: boolean; approved_at: string | null }): boolean {
  return doc.requires_approval && !doc.approved_at
}
