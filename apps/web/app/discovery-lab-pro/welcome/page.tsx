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

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [serviceOffered, setServiceOffered] = useState('');
  const [saving, setSaving] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Load existing profile data
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();

      // If not authenticated, redirect to login with return URL
      if (!user) {
        router.push('/login?returnTo=/discovery-lab-pro/welcome');
        return;
      }

      setUserEmail(user.email || '');

      const { data: userData } = await supabase
        .from('users')
        .select(`
          full_name,
          first_name,
          last_name,
          preferences,
          org:org_id (name)
        `)
        .eq('id', user.id)
        .single();

      if (userData) {
        // Check if name is set
        const existingName = userData.full_name ||
          [userData.first_name, userData.last_name].filter(Boolean).join(' ') || '';
        const existingCompany = (userData.org as any)?.name || '';

        setFullName(existingName);
        setCompanyName(existingCompany);

        if (userData.preferences?.website) {
          setWebsite(userData.preferences.website);
        }
        if (userData.preferences?.service_offered) {
          setServiceOffered(userData.preferences.service_offered);
        }

        // Show profile setup if name or company is missing
        setNeedsProfileSetup(!existingName || !existingCompany);
      } else {
        // No user record exists - need full profile setup
        setNeedsProfileSetup(true);
        // Pre-fill name from auth metadata if available
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }
      }
      setUserLoaded(true);
    }
    loadUser();
  }, [supabase, router]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/discovery-lab-pro/create');
        return;
      }

      // Get current user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, preferences, org_id')
        .eq('id', user.id)
        .single();

      const currentPrefs = userData?.preferences || {};
      const updatedPrefs = {
        ...currentPrefs,
        ...(website && { website }),
        ...(serviceOffered && { service_offered: serviceOffered }),
      };

      if (userData) {
        // User exists - update their profile
        const updates: Record<string, any> = {
          preferences: updatedPrefs,
        };

        // Update name if provided and was missing
        if (fullName && needsProfileSetup) {
          updates.full_name = fullName;
        }

        await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        // Create/update org if company name provided and user has no org
        if (companyName && !userData.org_id) {
          const { data: newOrg } = await supabase
            .from('orgs')
            .insert({
              name: companyName,
              personal: true,
              created_by_user_id: user.id,
            })
            .select('id')
            .single();

          if (newOrg) {
            await supabase
              .from('users')
              .update({ org_id: newOrg.id })
              .eq('id', user.id);
          }
        }
      } else {
        // User doesn't exist - create user record
        // First create org if company name provided
        let orgId = null;
        if (companyName) {
          const { data: newOrg } = await supabase
            .from('orgs')
            .insert({
              name: companyName,
              personal: true,
              created_by_user_id: user.id,
            })
            .select('id')
            .single();
          orgId = newOrg?.id || null;
        }

        // Create user record
        await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            org_id: orgId,
            preferences: updatedPrefs,
          });
      }

      router.push('/discovery-lab-pro/create');
    } catch (err) {
      console.error('Error saving profile:', err);
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
            SET UP YOUR PROFILE
          </h2>
          <p className="text-[#B3B3B3] mb-6 font-poppins">
            We&apos;ll use this to personalize your playbooks:
          </p>

          <div className="space-y-5">
            {/* Name field */}
            <div className="space-y-2">
              <label className="block text-[#FFDE59] font-anton text-sm tracking-wide">
                YOUR NAME *
              </label>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 font-poppins focus:border-[#E51B23] focus:outline-none"
              />
            </div>

            {/* Company field */}
            <div className="space-y-2">
              <label className="block text-[#FFDE59] font-anton text-sm tracking-wide">
                YOUR COMPANY *
              </label>
              <input
                type="text"
                placeholder="Your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 font-poppins focus:border-[#E51B23] focus:outline-none"
              />
            </div>

            {/* Website field */}
            <div className="space-y-2">
              <label className="block text-[#FFDE59] font-anton text-sm tracking-wide">
                COMPANY WEBSITE
              </label>
              <input
                type="url"
                placeholder="https://yourcompany.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 font-poppins focus:border-[#E51B23] focus:outline-none"
              />
            </div>

            {/* Service offered field */}
            <div className="space-y-2">
              <label className="block text-[#FFDE59] font-anton text-sm tracking-wide">
                WHAT DO YOU SELL? *
              </label>
              <textarea
                placeholder="Describe your service or product..."
                value={serviceOffered}
                onChange={(e) => setServiceOffered(e.target.value)}
                rows={3}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 font-poppins focus:border-[#E51B23] focus:outline-none resize-none"
              />
              <p className="text-[#666] text-sm font-poppins">
                Example: Paid media management for ecommerce brands that want to scale profitably...
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={saving || !userLoaded || !fullName || !companyName || !serviceOffered}
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
