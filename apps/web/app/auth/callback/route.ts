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

      // Check if user has analyzed calls
      const { count } = await supabase
        .from('call_lab_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (count && count > 0) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/call-lab/pro', request.url));
      }
    }
  }

  // Fallback - redirect to onboarding for new users
  return NextResponse.redirect(new URL('/onboarding/profile', request.url));
}
