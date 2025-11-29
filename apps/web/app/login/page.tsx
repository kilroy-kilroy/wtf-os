'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  SalesOSHeader
} from '@/components/console';
import { createBrowserClient } from '@repo/db';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-md mx-auto">
        <SalesOSHeader systemStatus="READY" />

        <ConsolePanel>
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <ConsoleHeading level={1} className="mb-2">
                <span className="text-white">CALL LAB </span>
                <span className="text-[#FFDE59]">PRO</span>
              </ConsoleHeading>
              <p className="text-[#B3B3B3] font-poppins">
                {mode === 'login' ? 'Sign in to access your account' : 'Reset your password'}
              </p>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <ConsoleInput
                  type="email"
                  placeholder="you@company.com"
                  label="EMAIL"
                  required
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                />

                <ConsoleInput
                  type="password"
                  placeholder="••••••••"
                  label="PASSWORD"
                  required
                  value={password}
                  onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                />

                {error && (
                  <div className="bg-[#E51B23]/20 border border-[#E51B23] rounded p-3">
                    <p className="text-[#E51B23] font-poppins text-sm">{error}</p>
                  </div>
                )}

                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  {loading ? '⟳ SIGNING IN...' : '▶ SIGN IN'}
                </ConsoleButton>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[#FFDE59] text-sm font-poppins hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {resetSent ? (
                  <div className="text-center space-y-4">
                    <div className="text-4xl">✓</div>
                    <p className="text-white font-poppins">
                      Check your email for a password reset link.
                    </p>
                    <ConsoleButton
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setMode('login');
                        setResetSent(false);
                      }}
                    >
                      ← BACK TO LOGIN
                    </ConsoleButton>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <ConsoleInput
                      type="email"
                      placeholder="you@company.com"
                      label="EMAIL"
                      required
                      value={email}
                      onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                    />

                    {error && (
                      <div className="bg-[#E51B23]/20 border border-[#E51B23] rounded p-3">
                        <p className="text-[#E51B23] font-poppins text-sm">{error}</p>
                      </div>
                    )}

                    <ConsoleButton type="submit" fullWidth disabled={loading}>
                      {loading ? '⟳ SENDING...' : '▶ SEND RESET LINK'}
                    </ConsoleButton>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-[#FFDE59] text-sm font-poppins hover:underline"
                      >
                        ← Back to login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[#333] pt-6">
              <p className="text-center text-[#666] font-poppins text-sm">
                Don&apos;t have an account?{' '}
                <a href="/call-lab-pro" className="text-[#FFDE59] hover:underline">
                  Get Call Lab Pro
                </a>
              </p>
            </div>
          </div>
        </ConsolePanel>
      </div>
    </div>
  );
}
