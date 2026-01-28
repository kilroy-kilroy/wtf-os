'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function GrowthOSGatePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'info' | 'account'>('info');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !website.trim()) return;
    setStep('account');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/growthos/assessment`,
            data: {
              full_name: name,
              website,
            },
          },
        });
        if (signUpError) throw signUpError;

        // If email confirmation is required
        if (data.user && !data.session) {
          setConfirmationSent(true);
          return;
        }

        // If session exists (email confirmation disabled), store intake basics and go
        if (data.session) {
          sessionStorage.setItem('growthos_intake', JSON.stringify({ founderName: name, email, website }));
          router.push('/growthos/assessment');
          router.refresh();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        if (data.session) {
          sessionStorage.setItem('growthos_intake', JSON.stringify({ founderName: name, email, website }));
          router.push('/growthos/assessment');
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    // Store intake data before redirecting to OAuth
    sessionStorage.setItem('growthos_intake', JSON.stringify({ founderName: name, email, website }));
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/growthos/assessment`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  }

  if (confirmationSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
            G
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Check your email</h1>
          <p className="text-slate-400 mb-2">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="text-slate-500 text-sm">
            Click the link to activate your account, then you&apos;ll land right in the assessment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            Take the WTF Assessment.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Get your GrowthOS Baseline.
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Find out what&apos;s actually broken in your agency. Data in, diagnosis out. Takes about 5 minutes.
          </p>
        </div>

        {step === 'info' ? (
          /* Step 1: Basic info */
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-0 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@agency.com"
                  className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-0 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Agency Website</label>
                <input
                  type="url"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://youragency.com"
                  className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-0 focus:outline-none transition-colors text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">We&apos;ll analyze your site for positioning and visibility</p>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all mt-2"
              >
                Continue
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Create account / login */
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-slate-400 text-sm">
                {mode === 'signup'
                  ? 'Save your results and track progress over time'
                  : 'Sign in to continue to the assessment'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-700/30 border-2 border-slate-700 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password (6+ chars)' : 'Your password'}
                  className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-0 focus:outline-none transition-colors text-sm"
                />
              </div>

              {error && (
                <div className="text-sm text-red-400">{error}</div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Working...' : mode === 'signup' ? 'Create Account & Start' : 'Sign In & Start'}
              </button>
            </form>

            {/* Google OAuth */}
            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Toggle login/signup */}
            <div className="mt-5 text-center">
              {mode === 'signup' ? (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-sm text-slate-500 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-sm text-slate-500 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Need an account? Sign up
                </button>
              )}
            </div>

            {/* Back link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setStep('info')}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors bg-transparent border-none cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
