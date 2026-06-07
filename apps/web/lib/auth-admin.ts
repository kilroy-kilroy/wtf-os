// Resolve a Supabase auth user by email using the service-role admin REST API.
// GoTrue's admin list endpoint has no reliable email filter across versions, so
// we fetch a page and match in-process. Fine at our scale (low hundreds of users);
// add pagination if the audience grows past ~1000.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const target = email.toLowerCase();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    console.error('findAuthUserByEmail failed:', res.status);
    return null;
  }
  const data = await res.json();
  const users = Array.isArray(data) ? data : data.users || [];
  const match = users.find((u: any) => (u.email || '').toLowerCase() === target);
  return match ? { id: match.id, email: match.email } : null;
}
