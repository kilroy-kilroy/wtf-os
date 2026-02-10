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
        setError('Check your email for the password reset link.');
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
