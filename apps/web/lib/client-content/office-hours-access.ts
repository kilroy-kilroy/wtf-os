export const OFFICE_HOURS_BUCKET = 'client-documents'

/**
 * Mirrors the client_content RLS policy: an office-hours session is visible if
 * the viewer is an admin, OR the session targets everyone (empty program_ids),
 * OR the viewer is enrolled in one of the session's programs.
 */
export function canViewOfficeHours(
  isAdmin: boolean,
  userProgramIds: string[],
  contentProgramIds: string[] | null | undefined,
): boolean {
  if (isAdmin) return true
  const ids = contentProgramIds ?? []
  if (ids.length === 0) return true
  return ids.some((id) => userProgramIds.includes(id))
}

/**
 * Derive the in-bucket object path from a stored public-format Storage URL, e.g.
 *   https://<ref>.supabase.co/storage/v1/object/public/client-documents/<path>
 *   → <path>
 * client_content rows store this public URL in `content_url`; the bucket is
 * private, so downloads must be signed on demand — this recovers the path to sign.
 */
export function storagePathFromContentUrl(contentUrl: string | null | undefined): string | null {
  if (!contentUrl) return null
  const marker = `/object/public/${OFFICE_HOURS_BUCKET}/`
  const i = contentUrl.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(contentUrl.slice(i + marker.length))
}
