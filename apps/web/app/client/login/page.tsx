'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    }>
      <ClientLoginContent />
    </Suspense>
  );
}

function ClientLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for invite token in URL
  const inviteToken = searchParams.get('invite');

  // Surface errors passed by /auth/confirm (e.g. expired or already-used link).
  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam) setError(errParam);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('notice') === 'password_set') {
      setError('Your password has been set. Please sign in.');
    }
  }, [searchParams]);

  // Check for auth tokens in URL hash (recovery flow)
  useEffect(() => {
    const handleAuthTokens = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');

        if (type === 'recovery') {
          router.push(`/auth/reset-password${hash}`);
          return;
        }
      }
    };
    handleAuthTokens();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'forgot') {
        await fetch('/api/client/reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setResetSent(true);
        setError('If an account exists for that email, a password reset link is on its way. Check your inbox (and spam).');
        setIsLoading(false);
        return;
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (authData.user) {
          // Check if user has a client enrollment
          const { data: enrollment } = await supabase
            .from('client_enrollments')
            .select('id, onboarding_completed, program_id')
            .eq('user_id', authData.user.id)
            .eq('status', 'active')
            .single();

          if (enrollment) {
            if (!enrollment.onboarding_completed) {
              router.push('/client/onboarding');
            } else {
              router.push('/client/dashboard');
            }
          } else {
            // No enrollment - check if there's an invite
            setError('No active program found. Please contact your program administrator.');
          }
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
      {/* Background */}
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
      </div>

      <div className="relative z-10 w-full max-w-md px-5">
        {/* Header */}
        <div className="text-center mb-10">
          <Image
            src="/logos/trios-logo-sq-transparent.png"
            alt="TriOS"
            width={140}
            height={140}
            className="mx-auto mb-4"
          />
          <div className="text-[clamp(12px,1.5vw,16px)] text-[#FFDE59] tracking-[2px] font-anton">
            CLIENT PORTAL
          </div>
          <p className="text-[#666666] text-sm mt-2">
            {mode === 'login' ? 'Sign in to access your program dashboard' : 'Reset your password'}
          </p>
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
                autoComplete="email"
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
              {isLoading ? '[ SIGNING IN... ]' : mode === 'login' ? '[ ACCESS PORTAL ]' : '[ SEND RESET LINK ]'}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#333333]" />
                <span className="text-[11px] text-[#666666] tracking-[1px]">OR</span>
                <div className="flex-1 h-px bg-[#333333]" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-black border-none py-3 px-6 font-poppins text-sm font-semibold tracking-[1px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
                Sign in with Google
              </button>
            </>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setResetSent(false); }}
                className="block w-full text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors bg-transparent border-none cursor-pointer"
              >
                Forgot your password?
              </button>
            ) : (
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
            Need help? Email <span className="text-[#FFDE59]">tim@timkilroy.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
