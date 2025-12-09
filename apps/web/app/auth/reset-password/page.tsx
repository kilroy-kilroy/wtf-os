'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const hash = window.location.hash;
        if (!hash) {
          setError('No reset token found. Please request a new password reset link.');
          setLoading(false);
          return;
        }

        // Parse hash parameters
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (type !== 'recovery' || !accessToken) {
          setError('Invalid reset link. Please request a new password reset link.');
          setLoading(false);
          return;
        }

        const supabase = getSupabaseClient();

        // Set the session with the recovery tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Unable to verify reset token. The link may have expired. Please request a new password reset.');
          setLoading(false);
          return;
        }

        setSessionReady(true);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing session:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdating(true);

    try {
      const supabase = getSupabaseClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Update error:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
        setUpdating(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error updating password:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Verifying reset link...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-white mb-4">Password Updated</h1>
          <p className="text-zinc-400 mb-6">
            Your password has been successfully updated.
          </p>
          <a
            href="/"
            className="inline-block bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (error && !sessionReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-white mb-4">Reset Link Error</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-zinc-400 mb-6">Enter your new password below.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={updating}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
