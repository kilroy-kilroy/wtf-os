'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Redirect to home or dashboard on success
      window.location.href = '/';
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setMessage('Check your email for a confirmation link.');
      setLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setMessage('Check your email for a password reset link.');
      setLoading(false);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (message) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-white mb-4">Check Your Email</h1>
          <p className="text-zinc-400 mb-6">{message}</p>
          <button
            onClick={() => {
              setMessage(null);
              setMode('login');
            }}
            className="inline-block bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' && 'Sign In'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'forgot' && 'Reset Password'}
        </h1>
        <p className="text-zinc-400 mb-6">
          {mode === 'login' && 'Welcome back! Enter your credentials below.'}
          {mode === 'signup' && 'Create a new account to get started.'}
          {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
        </p>

        <form
          onSubmit={
            mode === 'login'
              ? handleLogin
              : mode === 'signup'
              ? handleSignup
              : handleForgotPassword
          }
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {mode === 'login' && (
            <>
              <button
                onClick={() => setMode('forgot')}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
              <span className="mx-2">·</span>
              <button
                onClick={() => setMode('signup')}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Create account
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button
              onClick={() => setMode('login')}
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => setMode('login')}
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
