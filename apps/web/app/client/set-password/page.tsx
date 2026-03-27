'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/client/dashboard');
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-slate-700/50 rounded-lg p-8">
          <h1 className="text-xl font-bold text-white mb-2">Set Your Password</h1>
          <p className="text-slate-400 text-sm mb-6">
            Create a password so you can log in anytime at app.timkilroy.com
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-slate-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-slate-400 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-slate-500"
                placeholder="Enter password again"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-[#E51B23] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-[#E51B23] text-white text-sm font-medium hover:bg-[#E51B23]/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting password...' : 'Set Password'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/client/dashboard"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now — I'll set it later in Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
