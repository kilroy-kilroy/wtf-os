import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates an auth-aware Supabase client for server components and route handlers.
 * Uses the anon key + user cookies so RLS policies apply and auth works.
 *
 * For admin/service-role access (bypasses RLS), use createServerClient from @repo/db/client.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
            // when middleware handles session refresh
          }
        },
      },
    }
  )
}
