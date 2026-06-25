export function isFirstView(doc: { viewed_at: string | null }): boolean {
  return doc.viewed_at === null
}
