'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';

function ActivateContent() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const token = params.get('token');
  const reset = params.get('reset');
  const isReset = !!reset && !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/client/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reset, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setLoading(false); return; }

      const { data: auth, error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInErr || !auth.user) {
        router.push('/client/login?notice=password_set');
        return;
      }

      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('onboarding_completed')
        .eq('user_id', auth.user.id)
        .eq('status', 'active')
        .maybeSingle();

      router.push(enrollment && !enrollment.onboarding_completed ? '/client/onboarding' : '/client/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-poppins flex items-center justify-center px-5">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Image src="/logos/trios-logo-sq-transparent.png" alt="TriOS" width={120} height={120} className="mx-auto mb-4" />
          <div className="text-[clamp(12px,1.5vw,16px)] text-[#FFDE59] tracking-[2px] font-anton">CLIENT PORTAL</div>
          <p className="text-[#666666] text-sm mt-2">
            {isReset ? 'Choose a new password' : 'Create your password to access your dashboard'}
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#333333] p-8 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23]" />
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} autoComplete="new-password"
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">Confirm Password</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required minLength={8} autoComplete="new-password"
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                placeholder="Enter password again"
              />
            </div>
            {error && <div className="text-sm text-[#E51B23]">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#E51B23] text-white border-none py-4 px-6 font-anton text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:text-black disabled:opacity-50"
            >
              {loading ? '[ SAVING... ]' : isReset ? '[ RESET PASSWORD ]' : '[ CREATE PASSWORD ]'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <a href="/client/login" className="text-[13px] text-[#666666] hover:text-[#FFDE59] transition-colors">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ActivateContent />
    </Suspense>
  );
}
