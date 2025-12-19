'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  SalesOSHeader,
  ConsoleMarkdownRenderer,
} from '@/components/console';

interface DiscoveryResult {
  markdown: string;
  metadata: {
    questionCount: number;
    hookCount: number;
    competitorCount: number;
    version: 'lite' | 'pro';
  };
}

interface UserProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  preferences?: {
    service_offered?: string;
    website?: string;
  };
  org?: {
    name?: string;
  };
}

// Loading messages to cycle through
const LOADING_MESSAGES = [
  'Researching company background...',
  'Analyzing market position...',
  'Building prospect psychology profile...',
  'Crafting discovery questions...',
  'Developing conversation strategy...',
  'Compiling competitive intelligence...',
  'Generating your playbook...',
];

export default function DiscoveryLabProCreatePage() {
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState({
    // Requestor info (pre-filled from profile)
    requestor_name: '',
    requestor_email: '',
    requestor_company: '',
    service_offered: '',
    // Target info
    target_company: '',
    target_website: '',
    target_contact_name: '',
    target_contact_title: '',
    target_linkedin: '',
    // Context
    competitors: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [serviceEdited, setServiceEdited] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfileLoaded(true);
          return;
        }

        // Fetch user with org
        const { data: userData } = await supabase
          .from('users')
          .select(`
            email,
            first_name,
            last_name,
            full_name,
            preferences,
            orgs:org_id (name)
          `)
          .eq('id', user.id)
          .single();

        if (userData) {
          const profile = userData as unknown as UserProfile;
          const fullName = profile.full_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            '';
          const companyName = (profile.org as any)?.name || '';
          const savedService = profile.preferences?.service_offered || '';

          setFormData(prev => ({
            ...prev,
            requestor_name: fullName,
            requestor_email: profile.email || user.email || '',
            requestor_company: companyName,
            service_offered: savedService,
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setProfileLoaded(true);
      }
    }
    loadUserProfile();
  }, [supabase]);

  // Save service_offered when it changes (debounced)
  useEffect(() => {
    if (!serviceEdited || !formData.service_offered) return;

    const saveTimeout = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const currentPrefs = userData?.preferences || {};

        await supabase
          .from('users')
          .update({
            preferences: { ...currentPrefs, service_offered: formData.service_offered },
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving service_offered:', err);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [formData.service_offered, serviceEdited, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setEmailSent(false);

    // Start cycling through loading messages
    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 3000);

    try {
      const response = await fetch('/api/analyze/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          version: 'pro',
          send_email: true, // Request email delivery
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate discovery playbook');
      }

      const data = await response.json();
      setResult(data.result);
      setEmailSent(data.emailSent || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result.markdown,
          metadata: {
            date: new Date().toLocaleDateString(),
            repName: formData.requestor_name || 'Sales Rep',
            prospectCompany: formData.target_company,
            tier: 'pro',
            product: 'discovery-lab',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discovery-lab-pro-${formData.target_company.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const renderLoadingState = () => (
    <ConsolePanel>
      <div className="flex flex-col items-center justify-center py-20 space-y-8">
        {/* Animated spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-[#333] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[#E51B23] rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent border-t-[#FFDE59] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>

        {/* Loading message */}
        <div className="text-center space-y-2">
          <p className="text-[#FFDE59] font-anton text-xl tracking-wide animate-pulse">
            {loadingMessage}
          </p>
          <p className="text-[#666] text-sm font-poppins">
            This typically takes 30-60 seconds
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#E51B23] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </ConsolePanel>
  );

  const renderResult = () => (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-black py-4 border-b border-[#333]">
        <div className="flex gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <ConsoleButton onClick={() => setResult(null)} variant="secondary">
              ← NEW PLAYBOOK
            </ConsoleButton>
            {emailSent && (
              <span className="text-[#FFDE59] text-sm font-poppins flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Report emailed to you
              </span>
            )}
          </div>
          <ConsoleButton
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            variant="primary"
          >
            {downloadingPdf ? 'GENERATING PDF...' : '↓ DOWNLOAD PDF'}
          </ConsoleButton>
        </div>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        <ConsoleMarkdownRenderer content={result!.markdown} />
      </ConsolePanel>

      {/* Bottom Action Bar (for long reports) */}
      <div className="flex gap-4 justify-center py-4">
        <ConsoleButton
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          variant="primary"
        >
          {downloadingPdf ? 'GENERATING PDF...' : '↓ DOWNLOAD PDF'}
        </ConsoleButton>
        <ConsoleButton onClick={() => setResult(null)} variant="secondary">
          ← NEW PLAYBOOK
        </ConsoleButton>
      </div>
    </div>
  );

  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-anton text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader
          systemStatus={loading ? 'PROCESSING' : 'PRO ACTIVE'}
          productName="DISCOVERY LAB"
          productVariant="PRO"
        />

        {loading ? (
          renderLoadingState()
        ) : !result ? (
          /* Input Form */
          <ConsolePanel>
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <ConsoleHeading level={1} className="mb-2">
                  <span className="text-white">GENERATE </span>
                  <span className="text-[#E51B23]">PRO</span>
                  <span className="text-[#FFDE59]"> CALL PLAYBOOK</span>
                </ConsoleHeading>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Full company research. Prospect psychology. Complete conversation strategy.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Your Info - Pre-filled and read-only for name/email/company */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    YOUR INFO
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1a1a1a] border border-[#333] px-4 py-3">
                      <div className="text-[#666] text-xs font-poppins mb-1">NAME</div>
                      <div className="text-white font-poppins">{formData.requestor_name || 'Not set'}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#333] px-4 py-3">
                      <div className="text-[#666] text-xs font-poppins mb-1">EMAIL</div>
                      <div className="text-white font-poppins truncate">{formData.requestor_email || 'Not set'}</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#333] px-4 py-3">
                      <div className="text-[#666] text-xs font-poppins mb-1">COMPANY</div>
                      <div className="text-white font-poppins">{formData.requestor_company || 'Not set'}</div>
                    </div>
                  </div>
                </div>

                {/* What You Sell - Editable but pre-filled */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    WHAT YOU SELL
                  </ConsoleHeading>
                  <div>
                    <ConsoleInput
                      multiline
                      rows={3}
                      placeholder=""
                      label="DESCRIBE YOUR SERVICE (BE SPECIFIC) *"
                      required
                      value={formData.service_offered}
                      onChange={(e) => {
                        setServiceEdited(true);
                        setFormData({
                          ...formData,
                          service_offered: (e.target as HTMLTextAreaElement).value,
                        });
                      }}
                    />
                    <p className="text-[#666] text-sm font-poppins mt-2">
                      <span className="italic">Example: Paid media management for ecommerce brands that want to scale profitably without wasting ad spend on the wrong audiences...</span>
                      {formData.service_offered && (
                        <span className="block mt-1 text-[#FFDE59]">✓ This will be saved for your next playbook</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Target Prospect */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    TARGET PROSPECT
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Acme Corp"
                      label="COMPANY NAME *"
                      required
                      value={formData.target_company}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_company: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                    <ConsoleInput
                      type="url"
                      placeholder="https://acmecorp.com"
                      label="COMPANY WEBSITE *"
                      required
                      value={formData.target_website}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_website: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Sarah Johnson"
                      label="CONTACT NAME *"
                      required
                      value={formData.target_contact_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_contact_name: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="VP of Marketing"
                      label="CONTACT TITLE"
                      value={formData.target_contact_title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_contact_title: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                  </div>
                  <ConsoleInput
                    type="url"
                    placeholder="https://linkedin.com/in/sarahjohnson"
                    label="LINKEDIN PROFILE"
                    value={formData.target_linkedin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_linkedin: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                </div>

                {/* Target's Competitors */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    TARGET&apos;S COMPETITIVE LANDSCAPE
                  </ConsoleHeading>
                  <div>
                    <ConsoleInput
                      multiline
                      rows={2}
                      placeholder=""
                      label="WHO ARE THEIR COMPETITORS?"
                      value={formData.competitors}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          competitors: (e.target as HTMLTextAreaElement).value,
                        })
                      }
                    />
                    <p className="text-[#666] text-sm font-poppins mt-2">
                      <span className="italic">Example: List the target company&apos;s competitors (not yours). This helps frame discovery questions around their market position.</span>
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-[#E51B23] border border-[#FF0000] rounded p-4">
                    <p className="text-white font-poppins font-medium">ERROR: {error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  ▶ GENERATE PRO PLAYBOOK
                </ConsoleButton>
              </form>
            </div>
          </ConsolePanel>
        ) : (
          /* Results Display */
          renderResult()
        )}
      </div>
    </div>
  );
}
