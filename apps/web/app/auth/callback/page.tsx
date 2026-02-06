'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for code in query params (PKCE flow)
        const code = searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            setError(error.message);
            return;
          }
        }

        // Check for tokens in URL hash (implicit/magic link flow)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.error('Session set error:', error);
              setError(error.message);
              return;
            }
          }
        }

        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Check for a `next` destination (e.g. from growthos assessment flow)
          const next = searchParams.get('next');

          if (next && next.startsWith('/')) {
            // Respect the intended destination — skip onboarding for known flows
            router.push(next);
          } else {
            // Default: check onboarding status
            const { data: userData } = await supabase
              .from('users')
              .select('onboarding_completed')
              .eq('id', user.id)
              .single();

            if (!userData || !userData.onboarding_completed) {
              router.push('/onboarding/profile');
            } else {
              router.push('/labs');
            }
          }
          router.refresh();
        } else {
          // No user found - redirect to login
          setError('Authentication failed. Please try again.');
          setTimeout(() => router.push('/login'), 2000);
        }
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, supabase]);

  return (
    <div className="text-center">
      {error ? (
        <div className="space-y-4">
          <p className="text-[#E51B23]">{error}</p>
          <p className="text-[#666]">Redirecting to login...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#666]">Authenticating...</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#666]">Loading...</p>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
