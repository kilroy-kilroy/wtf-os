import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/client', '/admin', '/settings'];

// Routes that authenticated users should be redirected away from
const AUTH_PAGES = ['/login', '/client/login'];

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

  // Redirect authenticated users away from login pages
  if (user && isAuthPage) {
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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
