'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Check for auth tokens in URL hash (recovery, signup confirmation, magic link)
  useEffect(() => {
    const handleAuthTokens = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (type === 'recovery') {
          // Redirect to password reset page with the hash
          router.push(`/auth/reset-password${hash}`);
          return;
        }

        // Handle signup confirmation and magic link
        if ((type === 'signup' || type === 'magiclink') && accessToken && refreshToken) {
          try {
            // Set the session from the tokens
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
              setError('Failed to confirm email. Please try logging in.');
              return;
            }

            // Get user and check onboarding status
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
              router.refresh();
            }
          } catch (err) {
            console.error('Error handling auth tokens:', err);
            setError('Failed to confirm email. Please try logging in.');
          }
        }
      }
    };

    handleAuthTokens();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        setError('Check your email for the password reset link. If you don\'t see it, check your spam folder.');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setError('Check your email for the confirmation link. If you don\'t see it, check your spam folder.');
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check user's onboarding status and route accordingly
        if (authData.user) {
          // Check if user has completed onboarding
          const { data: userData } = await supabase
            .from('users')
            .select('onboarding_completed, org_id')
            .eq('id', authData.user.id)
            .single();

          if (!userData || !userData.onboarding_completed) {
            // New user or hasn't completed onboarding
            router.push('/onboarding/profile');
          } else {
            // Onboarding complete - go to labs home
            router.push('/labs');
          }
        } else {
          router.push('/onboarding/profile');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-poppins overflow-x-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-5">
        {/* Header */}
        <div className="text-center mb-10">
          <Image
            src="/logos/salesosdemandossqtransparent.png"
            alt="SalesOS"
            width={140}
            height={140}
            className="mx-auto mb-4"
          />
          <div className="text-[clamp(12px,1.5vw,16px)] text-[#FFDE59] tracking-[2px] font-anton">
            {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'RESET PASSWORD'}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-[#1A1A1A] border border-[#333333] p-8 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23]" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                placeholder="you@company.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className={`text-sm ${error.includes('Check your email') ? 'text-[#FFDE59]' : 'text-[#E51B23]'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (mode === 'forgot' && resetSent)}
              className="w-full bg-[#E51B23] text-white border-none py-4 px-6 font-anton text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '[ SENDING... ]' : mode === 'login' ? '[ ACCESS PRO ]' : mode === 'signup' ? '[ CREATE ACCOUNT ]' : '[ SEND RESET LINK ]'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setResetSent(false); }}
                  className="block w-full text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors bg-transparent border-none cursor-pointer"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="block w-full text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors bg-transparent border-none cursor-pointer"
                >
                  Don&apos;t have an account? Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors bg-transparent border-none cursor-pointer"
              >
                Already have an account? Log in
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setResetSent(false); }}
                className="text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors bg-transparent border-none cursor-pointer"
              >
                Back to login
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[13px] text-[#666666] space-y-2">
          <div>
            Questions? Email <span className="text-[#FFDE59]">tim@timkilroy.com</span>
          </div>
          <div className="flex justify-center gap-4">
            <a href="/privacy" className="hover:text-[#FFDE59] transition-colors">Privacy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-[#FFDE59] transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
