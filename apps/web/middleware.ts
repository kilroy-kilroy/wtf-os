import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/client', '/admin', '/settings'];

// Routes that authenticated users should be redirected away from
// Pages that must be reachable WITHOUT a session even though they sit under a
// protected prefix (/client). Listed here so the unauthenticated protected-route
// redirect skips them (see isAuthPage usage below).
const AUTH_PAGES = ['/login', '/client/login', '/client/activate'];

// Routes that require admin access
const ADMIN_PREFIX = '/admin';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This refreshes the auth token if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Auth pages (e.g. /client/login) live UNDER a protected prefix (/client), so
  // they must be exempted from the unauthenticated protected-route redirect
  // below — otherwise /client/login redirects to itself forever
  // (ERR_TOO_MANY_REDIRECTS).
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  // Redirect authenticated users away from login pages. /client/activate is
  // exempt: a signed-in client may still be completing a password reset there,
  // and the activate route validates its token independently of the session.
  if (user && isAuthPage && !pathname.startsWith('/client/activate')) {
    if (pathname.startsWith('/client/login')) {
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && !isAuthPage && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (pathname.startsWith('/client')) {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin route protection: check is_admin flag
  if (user && pathname.startsWith(ADMIN_PREFIX)) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Record lightweight "last seen" activity for authenticated users on normal
  // page navigations (redirect paths above intentionally skip this). Throttled
  // via the `ls_ping` cookie so we write at most once per ACTIVITY_THROTTLE_MS.
  //
  // Why: auth.users.last_sign_in_at only updates on a fresh authentication, so
  // a client returning with a live session looks dormant on the client-health
  // dashboard. Stamping users.last_login_at here captures those return visits.
  // RLS policy "Users update own record" permits this self-update via the
  // session client. We await it (rare, ~once/30min/user) so the write isn't
  // lost when the serverless function freezes, and swallow errors so a failed
  // write never blocks navigation.
  if (user) {
    const ACTIVITY_THROTTLE_MS = 30 * 60 * 1000;
    const lastPing = Number(request.cookies.get('ls_ping')?.value || 0);
    if (!lastPing || Date.now() - lastPing > ACTIVITY_THROTTLE_MS) {
      try {
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.error('[activity] last_login_at update failed', err);
      }
      response.cookies.set('ls_ping', String(Date.now()), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
