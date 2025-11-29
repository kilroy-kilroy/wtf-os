'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface SessionData {
  email: string;
  plan: 'solo' | 'team';
  customerName?: string;
}

const COMPANY_TYPES = [
  { value: '', label: 'Select company type...' },
  { value: 'agency', label: 'Agency' },
  { value: 'saas', label: 'SaaS' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];

const DEAL_SIZES = [
  { value: '', label: 'Select typical deal size...' },
  { value: 'under-10k', label: 'Under $10K' },
  { value: '10k-50k', label: '$10K - $50K' },
  { value: '50k-250k', label: '$50K - $250K' },
  { value: '250k-plus', label: '$250K+' },
];

// Loading fallback for Suspense
function ActivateLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-poppins">
      <div className="text-center">
        <div className="text-[#E51B23] text-2xl mb-4 animate-pulse">●</div>
        <div className="text-[#666666] text-sm tracking-[2px]">INITIALIZING...</div>
      </div>
    </div>
  );
}

// Main page wrapped in Suspense
export default function ActivatePage() {
  return (
    <Suspense fallback={<ActivateLoading />}>
      <ActivateForm />
    </Suspense>
  );
}

function ActivateForm() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [dealSize, setDealSize] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionId) {
      setError('Invalid session. Please complete checkout first.');
      setLoading(false);
      return;
    }

    // Fetch session data from Stripe
    fetch(`/api/stripe/session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSessionData(data);
          setEmail(data.email || '');
          // Try to split customer name if available
          if (data.customerName) {
            const parts = data.customerName.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to verify purchase. Please contact support.');
        setLoading(false);
      });
  }, [sessionId]);

  const addTeamMember = () => {
    if (teamMembers.length >= 4) return;
    setTeamMembers([
      ...teamMembers,
      { id: crypto.randomUUID(), firstName: '', lastName: '', email: '', role: '' },
    ]);
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
  };

  const updateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeamMembers(
      teamMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!companyType) newErrors.companyType = 'Company type is required';
    if (!dealSize) newErrors.dealSize = 'Deal size is required';

    // Validate team members
    teamMembers.forEach((member, index) => {
      if (!member.firstName.trim()) {
        newErrors[`team_${index}_firstName`] = 'First name required';
      }
      if (!member.lastName.trim()) {
        newErrors[`team_${index}_lastName`] = 'Last name required';
      }
      if (!member.email.trim() || !member.email.includes('@')) {
        newErrors[`team_${index}_email`] = 'Valid email required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          accountHolder: {
            firstName,
            lastName,
            email,
            password,
            role,
            companyName,
            companyType,
            dealSize,
          },
          teamMembers: sessionData?.plan === 'team' ? teamMembers : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to dashboard or success page
      window.location.href = '/call-lab?activated=true';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-poppins">
        <div className="text-center">
          <div className="text-[#E51B23] text-2xl mb-4 animate-pulse">●</div>
          <div className="text-[#666666] text-sm tracking-[2px]">VERIFYING PURCHASE...</div>
        </div>
      </div>
    );
  }

  if (error && !sessionData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-poppins px-5">
        <div className="text-center max-w-md">
          <div className="text-[#E51B23] text-4xl mb-4">⚠</div>
          <h1 className="font-anton text-2xl mb-4 tracking-[2px]">SESSION ERROR</h1>
          <p className="text-[#CCCCCC] mb-8">{error}</p>
          <a
            href="/call-lab-pro"
            className="inline-block bg-[#E51B23] text-white py-3 px-8 font-anton tracking-[2px] no-underline hover:bg-[#FFDE59] hover:text-black transition-all"
          >
            [ RETURN TO CALL LAB PRO ]
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[800px] mx-auto px-5 py-12">
        {/* Header */}
        <header className="mb-12">
          <div className="text-[9px] tracking-[2px] text-[#666666] mb-2">
            SYSTEM STATUS: <span className="text-[#E51B23]">●</span> PENDING ACTIVATION
          </div>
          <h1 className="font-anton text-[clamp(28px,5vw,48px)] tracking-[3px] mb-3">
            INITIALIZE ACCOUNT // <span className="text-[#E51B23]">CALL LAB PRO</span>
          </h1>
          <p className="text-[#CCCCCC] text-base">
            Configure your operator profile to personalize analysis
          </p>
          {sessionData?.plan === 'team' && (
            <div className="mt-4 inline-block bg-[#FFDE59] text-black px-4 py-1 text-[11px] tracking-[2px] font-bold">
              TEAM LICENSE — 5 SEATS
            </div>
          )}
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Holder Section */}
          <section className="bg-[#1A1A1A] border border-[#333333] p-8">
            <h2 className="font-anton text-xl text-[#FFDE59] mb-6 tracking-[2px]">
              ACCOUNT HOLDER
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  FIRST NAME *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full bg-black border ${errors.firstName ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors`}
                  placeholder="Tim"
                />
                {errors.firstName && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  LAST NAME *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full bg-black border ${errors.lastName ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors`}
                  placeholder="Kilroy"
                />
                {errors.lastName && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-[#0a0a0a] border border-[#222222] px-4 py-3 text-[#666666] cursor-not-allowed"
                />
                <p className="text-[#666666] text-[10px] mt-1">Pre-filled from checkout</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  PASSWORD *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-black border ${errors.password ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors`}
                  placeholder="Min 8 characters"
                />
                {errors.password && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Title/Role */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  TITLE / ROLE
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black border border-[#333333] px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors"
                  placeholder="Founder, Sales Rep, Sales Manager..."
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  COMPANY NAME *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full bg-black border ${errors.companyName ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors`}
                  placeholder="Acme Corp"
                />
                {errors.companyName && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.companyName}</p>
                )}
              </div>

              {/* Company Type */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  COMPANY TYPE *
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className={`w-full bg-black border ${errors.companyType ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors cursor-pointer`}
                >
                  {COMPANY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.companyType && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.companyType}</p>
                )}
              </div>

              {/* Deal Size */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2">
                  TYPICAL DEAL SIZE *
                </label>
                <select
                  value={dealSize}
                  onChange={(e) => setDealSize(e.target.value)}
                  className={`w-full bg-black border ${errors.dealSize ? 'border-[#E51B23]' : 'border-[#333333]'} px-4 py-3 text-white focus:border-[#E51B23] focus:outline-none transition-colors cursor-pointer`}
                >
                  {DEAL_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
                {errors.dealSize && (
                  <p className="text-[#E51B23] text-xs mt-1">{errors.dealSize}</p>
                )}
              </div>
            </div>
          </section>

          {/* Team Members Section (only for team plan) */}
          {sessionData?.plan === 'team' && (
            <section className="bg-[#1A1A1A] border border-[#333333] p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-anton text-xl text-[#FFDE59] tracking-[2px]">
                  TEAM MEMBERS
                </h2>
                <span className="text-[11px] text-[#666666] tracking-[1px]">
                  {teamMembers.length + 1}/5 SEATS USED
                </span>
              </div>

              {teamMembers.length === 0 && (
                <p className="text-[#666666] text-sm mb-6">
                  Add up to 4 additional team members. You can also invite them later.
                </p>
              )}

              {/* Team Member Rows */}
              <div className="space-y-6">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="bg-black border border-[#222222] p-6 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member.id)}
                      className="absolute top-4 right-4 text-[#666666] hover:text-[#E51B23] transition-colors text-sm"
                    >
                      [ REMOVE ]
                    </button>

                    <div className="text-[10px] text-[#E51B23] tracking-[2px] mb-4">
                      TEAM MEMBER {index + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] tracking-[1px] text-[#666666] mb-1">
                          FIRST NAME *
                        </label>
                        <input
                          type="text"
                          value={member.firstName}
                          onChange={(e) =>
                            updateTeamMember(member.id, 'firstName', e.target.value)
                          }
                          className={`w-full bg-[#1A1A1A] border ${errors[`team_${index}_firstName`] ? 'border-[#E51B23]' : 'border-[#333333]'} px-3 py-2 text-white text-sm focus:border-[#E51B23] focus:outline-none`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] tracking-[1px] text-[#666666] mb-1">
                          LAST NAME *
                        </label>
                        <input
                          type="text"
                          value={member.lastName}
                          onChange={(e) =>
                            updateTeamMember(member.id, 'lastName', e.target.value)
                          }
                          className={`w-full bg-[#1A1A1A] border ${errors[`team_${index}_lastName`] ? 'border-[#E51B23]' : 'border-[#333333]'} px-3 py-2 text-white text-sm focus:border-[#E51B23] focus:outline-none`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] tracking-[1px] text-[#666666] mb-1">
                          EMAIL *
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) =>
                            updateTeamMember(member.id, 'email', e.target.value)
                          }
                          className={`w-full bg-[#1A1A1A] border ${errors[`team_${index}_email`] ? 'border-[#E51B23]' : 'border-[#333333]'} px-3 py-2 text-white text-sm focus:border-[#E51B23] focus:outline-none`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] tracking-[1px] text-[#666666] mb-1">
                          TITLE / ROLE
                        </label>
                        <input
                          type="text"
                          value={member.role}
                          onChange={(e) =>
                            updateTeamMember(member.id, 'role', e.target.value)
                          }
                          className="w-full bg-[#1A1A1A] border border-[#333333] px-3 py-2 text-white text-sm focus:border-[#E51B23] focus:outline-none"
                          placeholder="Sales Rep, AE, SDR..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Team Member Button */}
              {teamMembers.length < 4 ? (
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="mt-6 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] py-3 px-6 text-sm tracking-[1px] transition-colors w-full"
                >
                  + ADD TEAM MEMBER
                </button>
              ) : (
                <div className="mt-6 text-center text-[#666666] text-sm">
                  <p className="mb-2">Maximum team size reached (5 seats)</p>
                  <a
                    href="mailto:tim@timkilroy.com"
                    className="text-[#FFDE59] hover:underline"
                  >
                    Need more than 5 seats? Contact us →
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-[#E51B23]/10 border border-[#E51B23] p-4 text-[#E51B23] text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-5 font-anton text-xl tracking-[3px] transition-all ${
              submitting
                ? 'bg-[#333333] text-[#666666] cursor-not-allowed'
                : 'bg-[#E51B23] text-white hover:bg-[#FFDE59] hover:text-black cursor-pointer'
            }`}
          >
            {submitting ? '[ ACTIVATING... ]' : '[ ACTIVATE ACCOUNT ]'}
          </button>

          <p className="text-center text-[#666666] text-xs">
            By activating, you agree to our Terms of Service and Privacy Policy
          </p>
        </form>
      </div>
    </div>
  );
}
