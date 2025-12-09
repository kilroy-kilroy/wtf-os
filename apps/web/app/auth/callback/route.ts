import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session?.user) {
      // Check if user has completed onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();

      if (!userData || !userData.onboarding_completed) {
        // New user - redirect to onboarding
        return NextResponse.redirect(new URL('/onboarding/profile', request.url));
      }

      // Onboarding complete - redirect to labs home
      return NextResponse.redirect(new URL('/labs', request.url));
    }
  }

  // Fallback - redirect to onboarding for new users
  return NextResponse.redirect(new URL('/onboarding/profile', request.url));
}
