// Resolve a Supabase auth user by email using the service-role admin REST API.
// GoTrue's admin list endpoint has no reliable email filter across versions, so
// we page through users and match in-process. We paginate explicitly rather than
// trusting a large per_page, because some GoTrue versions silently cap per_page
// (e.g. at 50) — a single big request would miss users beyond the cap.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const target = email.toLowerCase();
  const perPage = 200;
  const maxPages = 100; // safety bound: up to 20k users

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    if (!res.ok) {
      console.error('findAuthUserByEmail failed:', res.status);
      return null;
    }
    const data = await res.json();
    const users: any[] = Array.isArray(data) ? data : data.users || [];

    const match = users.find((u: any) => (u.email || '').toLowerCase() === target);
    if (match) return { id: match.id, email: match.email };

    if (users.length < perPage) break; // last page reached
  }
  return null;
}
