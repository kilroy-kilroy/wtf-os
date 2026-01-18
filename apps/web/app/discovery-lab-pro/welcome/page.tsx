'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Suspense } from 'react';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const supabase = createClientComponentClient();

  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    // Load existing website from user preferences
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (userData?.preferences?.website) {
          setWebsite(userData.preferences.website);
        }
      }
      setUserLoaded(true);
    }
    loadUser();
  }, [supabase]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && website) {
        // Get current preferences and merge
        const { data: userData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const currentPrefs = userData?.preferences || {};

        await supabase
          .from('users')
          .update({
            preferences: { ...currentPrefs, website },
          })
          .eq('id', user.id);
      }
      router.push('/discovery-lab-pro/create');
    } catch (err) {
      console.error('Error saving website:', err);
      router.push('/discovery-lab-pro/create');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#E51B23] flex items-center justify-center">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Header */}
        <h1 className="font-anton text-[clamp(36px,6vw,56px)] text-white mb-4 tracking-wide">
          WELCOME TO{' '}
          <span className="text-[#FFDE59]">DISCOVERY LAB PRO</span>
        </h1>

        <p className="text-xl text-[#CCCCCC] mb-8 leading-relaxed">
          You just upgraded your pre-call intelligence.
          <br />
          Every discovery call is about to feel like an unfair advantage.
        </p>

        {/* Quick Setup */}
        <div className="bg-[#1a1a1a] border border-[#333] p-8 mb-8 text-left">
          <h2 className="font-anton text-2xl text-[#E51B23] mb-6 tracking-wide">
            QUICK SETUP
          </h2>
          <p className="text-[#B3B3B3] mb-4 font-poppins">
            One thing we need to personalize your playbooks:
          </p>
          <div className="space-y-2">
            <label className="block text-[#FFDE59] font-anton text-sm tracking-wide">
              YOUR COMPANY WEBSITE
            </label>
            <input
              type="url"
              placeholder="https://yourcompany.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-black border border-[#333] text-white px-4 py-3 font-poppins focus:border-[#E51B23] focus:outline-none"
            />
            <p className="text-[#666] text-sm font-poppins">
              We&apos;ll use this to help the AI understand your business better.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={saving || !userLoaded}
          className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg tracking-wide hover:bg-[#FFDE59] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'SAVING...' : '[ START YOUR FIRST PLAYBOOK ]'}
        </button>

        {/* Session ID for debugging */}
        {sessionId && (
          <p className="mt-8 text-xs text-[#666]">
            Order reference: {sessionId.substring(0, 20)}...
          </p>
        )}

        {/* Support */}
        <p className="mt-8 text-sm text-[#666]">
          Questions? Email{' '}
          <a href="mailto:tim@timkilroy.com" className="text-[#FFDE59]">
            tim@timkilroy.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white font-anton text-2xl">Loading...</div>
        </div>
      }
    >
      <WelcomeContent />
    </Suspense>
  );
}
