'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com',
  'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
  'gmx.com', 'yandex.com', 'fastmail.com'
];

const ROLE_OPTIONS = [
  'Founder / CEO',
  'Head of Sales',
  'Sales Manager',
  'Account Executive',
  'SDR / BDR',
  'RevOps',
  'Other'
];

const COMPANY_SIZE_OPTIONS = [
  '1', '2-5', '6-10', '11-25', '26-50', '51-100', '100+'
];

const SALES_TEAM_SIZE_OPTIONS = [
  'Just me', '2-3', '4-5', '6-10', '10+'
];

const CRM_OPTIONS = [
  'None yet', 'HubSpot', 'Salesforce', 'Pipedrive', 'Close', 'Copper', 'Other'
];

const REVENUE_OPTIONS = [
  'Pre-revenue',
  '$0 - $100K',
  '$100K - $500K',
  '$500K - $1M',
  '$1M - $5M',
  '$5M - $10M',
  '$10M+'
];

function mapRevenueToRange(rev: number): string {
  if (rev <= 0) return '';
  if (rev < 100000) return '$0 - $100K';
  if (rev < 500000) return '$100K - $500K';
  if (rev < 1000000) return '$500K - $1M';
  if (rev < 5000000) return '$1M - $5M';
  if (rev < 10000000) return '$5M - $10M';
  return '$10M+';
}

export default function ProfileSetupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: '',
    // Company fields (shown conditionally)
    companyName: '',
    companySize: '',
    salesTeamSize: '',
    companyRevenue: '',
    crm: '',
  });

  const [showCompanySection, setShowCompanySection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Pre-fill from auth and any existing assessment data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // Check if user already completed onboarding (e.g. via assessment)
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed, org_id, full_name')
        .eq('id', user.id)
        .single();

      if (userData?.onboarding_completed) {
        // Already onboarded (likely via assessment) — skip to labs
        router.push('/labs');
        return;
      }

      // Try to pre-fill from most recent assessment intake data
      const { data: latestAssessment } = await supabase
        .from('assessments')
        .select('intake_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const intake = latestAssessment?.intake_data as Record<string, any> | null;

      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: intake?.founderName || userData?.full_name || user.user_metadata?.full_name || '',
        companyName: intake?.agencyName || '',
        companyRevenue: intake?.lastYearRevenue ? mapRevenueToRange(Number(intake.lastYearRevenue)) : '',
      }));

      checkDomain(user.email);
    };
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]);

  const checkDomain = async (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return;

    // Check if public domain
    if (PUBLIC_EMAIL_DOMAINS.includes(domain)) {
      setShowCompanySection(true); // Personal workspace, show company section
      return;
    }

    setCheckingDomain(true);
    try {
      // Check if org exists for this domain
      const { data: org } = await supabase
        .from('orgs')
        .select('id, name')
        .eq('primary_domain', domain)
        .single();

      if (org) {
        // Org exists - user will join it
        setShowCompanySection(false);
        setExistingOrgName(org.name);
      } else {
        // First user from this domain - show company section
        setShowCompanySection(true);
        setExistingOrgName(null);
      }
    } catch {
      // No org found - show company section
      setShowCompanySection(true);
      setExistingOrgName(null);
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
    if (email.includes('@')) {
      checkDomain(email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const domain = formData.email.split('@')[1]?.toLowerCase();
      const isPublicDomain = PUBLIC_EMAIL_DOMAINS.includes(domain);

      let orgId: string | null = null;
      let isOrgOwner = false;
      let mode = 'solo';

      // Determine if solo or team
      if (formData.salesTeamSize && formData.salesTeamSize !== 'Just me') {
        mode = 'team';
      }

      if (!isPublicDomain) {
        // Always re-check for existing org at submit time (may have been
        // created by assessment or another flow since page load)
        const { data: domainOrg } = await supabase
          .from('orgs')
          .select('id, mode')
          .eq('primary_domain', domain)
          .single();

        if (domainOrg) {
          // Join existing org
          orgId = domainOrg.id;
          mode = domainOrg.mode || 'team';
        } else {
          // Create new org for this domain
          const { data: newOrg, error: orgError } = await supabase
            .from('orgs')
            .insert({
              name: formData.companyName,
              primary_domain: domain,
              company_size: formData.companySize,
              sales_team_size: formData.salesTeamSize,
              company_revenue: formData.companyRevenue,
              crm: formData.crm,
              personal: false,
              mode: mode,
              created_by_user_id: user.id,
            })
            .select()
            .single();

          if (orgError) throw orgError;
          orgId = newOrg.id;
          isOrgOwner = true;
        }
      } else {
        // Personal workspace for public email domains
        const { data: personalOrg, error: orgError } = await supabase
          .from('orgs')
          .insert({
            name: formData.companyName,
            company_size: formData.companySize,
            sales_team_size: formData.salesTeamSize,
            company_revenue: formData.companyRevenue,
            crm: formData.crm,
            personal: true,
            mode: mode,
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = personalOrg.id;
        isOrgOwner = true;
      }

      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: formData.email,
          full_name: formData.fullName,
          org_id: orgId,
          is_org_owner: isOrgOwner,
          onboarding_completed: false, // Will be set true after next-steps
        });

      if (userError) throw userError;

      // Add contact to Loops for email nurturing (non-blocking)
      const nameParts = formData.fullName.split(' ');
      fetch('/api/loops/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          companyName: formData.companyName,
          role: formData.role,
          salesTeamSize: formData.salesTeamSize,
        }),
      }).catch(() => {
        // Silently ignore - email marketing is non-critical
      });

      // Redirect to next steps with mode
      router.push(`/onboarding/next-steps?mode=${mode}`);
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-poppins py-12 px-4">
      {/* Background Effects */}
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

      <div className="relative z-10 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Image
            src="/logos/trios-logo-sq-transparent.png"
            alt="TriOS"
            width={140}
            height={140}
            className="mx-auto mb-4"
          />
          <p className="text-[#B3B3B3] text-lg">
            Let&apos;s set up your profile to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Your Profile Section */}
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded-lg relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23] rounded-l-lg" />

            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wide mb-6">
              Your Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={formData.fullName ? '' : 'Your full name'}
                  autoComplete="off"
                  className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded [&:-webkit-autofill]:bg-black [&:-webkit-autofill]:text-white [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_black_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder={formData.email ? '' : 'tim@youragency.com'}
                  autoComplete="off"
                  className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded [&:-webkit-autofill]:bg-black [&:-webkit-autofill]:text-white [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_black_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
                />
                <p className="text-[11px] text-[#555] mt-1">
                  We use this to connect you to your company workspace.
                </p>
                {existingOrgName && (
                  <p className="text-[11px] text-[#FFDE59] mt-1">
                    You&apos;ll be joining the {existingOrgName} workspace.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                >
                  <option value="">Select your role</option>
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Company Section (Conditional) */}
          {showCompanySection && !checkingDomain && (
            <div className="bg-[#1A1A1A] border border-[#333333] p-6 rounded-lg relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#FFDE59] rounded-l-lg" />

              <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wide mb-2">
                Your Company
              </h2>
              <p className="text-[#777] text-sm mb-6">
                Looks like you&apos;re the first person here from this company. Help us set up your workspace.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required={showCompanySection}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your Agency Name"
                    className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                      Company Size
                    </label>
                    <select
                      value={formData.companySize}
                      onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                      className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {COMPANY_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                      Sales Team Size
                    </label>
                    <select
                      value={formData.salesTeamSize}
                      onChange={(e) => setFormData({ ...formData, salesTeamSize: e.target.value })}
                      className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {SALES_TEAM_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                    Company Revenue
                  </label>
                  <select
                    value={formData.companyRevenue}
                    onChange={(e) => setFormData({ ...formData, companyRevenue: e.target.value })}
                    className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                  >
                    <option value="">Select</option>
                    {REVENUE_OPTIONS.map(revenue => (
                      <option key={revenue} value={revenue}>{revenue}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
                    CRM
                  </label>
                  <select
                    value={formData.crm}
                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                    className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                  >
                    <option value="">Select CRM</option>
                    {CRM_OPTIONS.map(crm => (
                      <option key={crm} value={crm}>{crm}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {checkingDomain && (
            <div className="text-center text-[#777] py-4">
              Checking your workspace...
            </div>
          )}

          {error && (
            <div className="bg-[#E51B23]/20 border border-[#E51B23] rounded p-4">
              <p className="text-[#E51B23] text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || checkingDomain}
            className="w-full bg-[#E51B23] text-white border-none py-4 px-6 font-anton text-base font-bold tracking-[2px] cursor-pointer transition-all duration-300 hover:bg-[#FFDE59] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            {isLoading ? '[ SETTING UP... ]' : '[ CONTINUE ]'}
          </button>

          <p className="text-center text-[11px] text-[#555]">
            By continuing, you agree to the{' '}
            <a href="/terms" className="text-[#FFDE59] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#FFDE59] hover:underline">Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
}
