'use client';

import React, { useState, useEffect } from 'react';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
} from '@/components/console';
import { ProReport } from '@/components/visibility-lab-pro/ProReport';
import { ProLoadingScreen } from '@/components/visibility-lab-pro/ProLoadingScreen';
import { ToolPageHeader } from '@/components/ToolPageHeader';
import { VisibilityLabProInput, VisibilityLabProReport } from '@/lib/visibility-lab-pro/types';
import { Lock, X, Save, Webhook, Eye } from 'lucide-react';

// --- CONFIGURATION ---
const HARDCODED_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/1852580/uzksxsr/";

const REVENUE_OPTIONS = [
  'Under $250K',
  '$250K - $500K',
  '$500K - $1M',
  '$1M - $3M',
  '$3M - $5M',
  '$5M - $10M',
  '$10M+',
];

const TEAM_SIZE_OPTIONS = [
  'Solo (just me)',
  '2-5 people',
  '6-15 people',
  '16-30 people',
  '30+ people',
];

const BUSINESS_MODEL_OPTIONS = [
  'Retainer-based',
  'Project-based',
  'Productized service',
  'Hybrid (retainer + project)',
  'Consulting / Advisory',
  'Other',
];

const YEARS_OPTIONS = [
  'Less than 1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

export default function VisibilityLabProPage() {
  const [report, setReport] = useState<VisibilityLabProReport | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempWebhook, setTempWebhook] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<VisibilityLabProInput>({
    userName: '',
    userEmail: '',
    userPhone: '',
    userTitle: '',
    brandName: '',
    website: '',
    targetAudience: '',
    mainCompetitors: '',
    currentChannels: '',
    // Pro fields
    revenueRange: '',
    teamSize: '',
    businessModel: '',
    yearsInBusiness: '',
    growthGoal: '',
    clientAcquisition: '',
    contentCapacity: '',
    linkedInUrl: '',
    companyLinkedInUrl: '',
    youtubeUrl: '',
    podcastUrl: '',
    newsletterUrl: '',
    twitterUrl: '',
  });

  // Load saved data from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedReport = localStorage.getItem('visibility_lab_pro_report');
      if (savedReport) {
        setReport(JSON.parse(savedReport));
      }

      if (HARDCODED_WEBHOOK_URL) {
        setWebhookUrl(HARDCODED_WEBHOOK_URL);
        setTempWebhook(HARDCODED_WEBHOOK_URL);
      } else {
        const savedWebhook = localStorage.getItem('demandos_webhook_url');
        if (savedWebhook) {
          setWebhookUrl(savedWebhook);
          setTempWebhook(savedWebhook);
        }
      }
    } catch (e) {
      console.error("Failed to load saved data", e);
    }
  }, []);

  const handleSaveWebhook = () => {
    setWebhookUrl(tempWebhook);
    localStorage.setItem('demandos_webhook_url', tempWebhook);
    setShowSettings(false);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visibility-lab-pro/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        let errorMessage = 'Analysis failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const result: VisibilityLabProReport = await response.json();

      // Save to localStorage
      localStorage.setItem('visibility_lab_pro_report', JSON.stringify(result));

      // Auto-send to Zapier (background)
      const targetWebhook = HARDCODED_WEBHOOK_URL || webhookUrl;
      if (targetWebhook) {
        const zapierPayload = {
          name: formData.userName,
          email: formData.userEmail,
          company: formData.brandName,
          phone: formData.userPhone,
          title: formData.userTitle,
          brand_name: formData.brandName,
          tier: 'pro',
          product: 'visibility-lab-pro',
          visibility_score: result.kvi?.compositeScore,
          brand_archetype: result.brandArchetype?.name,
          diagnosis_severity: result.diagnosisSeverity,
          revenue_range: formData.revenueRange,
          team_size: formData.teamSize,
          timestamp: new Date().toISOString()
        };

        fetch(targetWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(zapierPayload)
        }).catch(err => console.error("Zapier Auto-Send Failed:", err));
      }

      setReport(result);

    } catch (err) {
      console.error("Error generating Pro report", err);
      setError(err instanceof Error ? err.message : "System Failure. Check API Key or Try Again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('visibility_lab_pro_report');
    setReport(null);
    setError(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#E51B23] animate-pulse font-mono">INITIALIZING PRO ENGINE...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <ToolPageHeader
        osLogoSrc="/logos/DemandOS All-Caps Logo in WHITE and Red.png"
        osLogoAlt="DemandOS"
        toolLogoSrc="/logos/VisibilityLabSQTransparent.png"
        toolLogoAlt="Visibility Lab"
      />
      {isLoading && <ProLoadingScreen />}

      {!report ? (
        <div className="max-w-5xl mx-auto px-4 py-12">
          <ConsolePanel>
            <div className="space-y-8 relative">
              {/* Settings Modal */}
              {showSettings && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-sm rounded-lg">
                  <div className="w-full max-w-lg">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                      <h3 className="text-xl font-anton text-white flex items-center gap-2">
                        <Lock className="text-[#E51B23]" size={20} /> ADMIN CONFIG
                      </h3>
                      <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-6 font-poppins">
                      <div className="bg-[#1a1a1a] p-4 border border-[#333333] rounded">
                        <div className="flex items-center gap-2 text-[#FFDE59] font-bold uppercase mb-2">
                          <Webhook size={16} /> Zapier Integration
                        </div>
                        <p className="text-sm text-[#B3B3B3] mb-4">
                          Configure a Webhook to automatically receive analysis data JSON when a report is generated.
                        </p>
                        <ConsoleInput
                          type="url"
                          value={tempWebhook}
                          onChange={(e) => setTempWebhook((e.target as HTMLInputElement).value)}
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          label="DESTINATION URL"
                        />
                      </div>
                      <ConsoleButton
                        onClick={handleSaveWebhook}
                        variant="secondary"
                        fullWidth
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Save size={16} /> SAVE CONFIGURATION
                        </span>
                      </ConsoleButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ConsoleHeading level={1} className="mb-0">
                    <span className="text-white">VISIBILITY LAB </span>
                    <span className="text-[#FFDE59]">PRO</span>
                  </ConsoleHeading>
                  <span className="bg-[#FFDE59] text-black text-xs font-anton uppercase px-2 py-1">PRO</span>
                </div>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Deep strategic visibility audit. We go beyond surface metrics into competitive intelligence, buyer journey mapping, and operator profiling.
                </p>
              </div>

              {error && (
                <div className="bg-[#E51B23]/10 border border-[#E51B23] p-4 text-[#E51B23] font-poppins">
                  {error}
                </div>
              )}

              <form onSubmit={handleAnalyze} className="space-y-8">
                {/* ── OPERATOR IDENTITY ── */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    OPERATOR IDENTITY
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Your Name"
                      label="NAME *"
                      required
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="email"
                      placeholder="you@company.com"
                      label="EMAIL *"
                      required
                      value={formData.userEmail}
                      onChange={(e) => setFormData({ ...formData, userEmail: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      label="PHONE *"
                      required
                      value={formData.userPhone}
                      onChange={(e) => setFormData({ ...formData, userPhone: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="CEO, VP Marketing, etc."
                      label="JOB TITLE *"
                      required
                      value={formData.userTitle}
                      onChange={(e) => setFormData({ ...formData, userTitle: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                  <ConsoleInput
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    label="LINKEDIN URL"
                    value={formData.linkedInUrl}
                    onChange={(e) => setFormData({ ...formData, linkedInUrl: (e.target as HTMLInputElement).value })}
                  />
                </div>

                {/* ── TARGET BRAND ── */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    TARGET BRAND
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Brand / Agency Name"
                      label="BRAND NAME *"
                      required
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="https://..."
                      label="WEBSITE *"
                      required
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                </div>

                {/* ── BRAND CHANNELS (PRO) ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ConsoleHeading level={3} variant="yellow">
                      BRAND CHANNELS
                    </ConsoleHeading>
                    <span className="bg-[#FFDE59] text-black text-[10px] font-anton uppercase px-2 py-0.5">PRO</span>
                  </div>
                  <p className="text-[#666] text-xs font-poppins">
                    Provide direct URLs so we can audit your actual channels instead of guessing. All optional.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="url"
                      placeholder="https://linkedin.com/company/yourbrand"
                      label="COMPANY LINKEDIN"
                      value={formData.companyLinkedInUrl}
                      onChange={(e) => setFormData({ ...formData, companyLinkedInUrl: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="url"
                      placeholder="https://youtube.com/@yourchannel"
                      label="YOUTUBE"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeUrl: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="url"
                      placeholder="https://podcasts.apple.com/... or Spotify link"
                      label="PODCAST"
                      value={formData.podcastUrl}
                      onChange={(e) => setFormData({ ...formData, podcastUrl: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="url"
                      placeholder="https://yourbrand.substack.com or newsletter URL"
                      label="NEWSLETTER"
                      value={formData.newsletterUrl}
                      onChange={(e) => setFormData({ ...formData, newsletterUrl: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="url"
                      placeholder="https://twitter.com/yourbrand"
                      label="TWITTER / X"
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                </div>

                {/* ── BUSINESS CONTEXT (PRO) ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ConsoleHeading level={3} variant="yellow">
                      BUSINESS CONTEXT
                    </ConsoleHeading>
                    <span className="bg-[#FFDE59] text-black text-[10px] font-anton uppercase px-2 py-0.5">PRO</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#FFDE59] uppercase mb-2 tracking-widest font-poppins">
                        REVENUE RANGE *
                      </label>
                      <select
                        required
                        value={formData.revenueRange}
                        onChange={(e) => setFormData({ ...formData, revenueRange: e.target.value })}
                        className="w-full bg-black border border-gray-700 text-white p-3 text-sm focus:border-[#E51B23] outline-none font-poppins"
                      >
                        <option value="">Select range...</option>
                        {REVENUE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#FFDE59] uppercase mb-2 tracking-widest font-poppins">
                        TEAM SIZE *
                      </label>
                      <select
                        required
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                        className="w-full bg-black border border-gray-700 text-white p-3 text-sm focus:border-[#E51B23] outline-none font-poppins"
                      >
                        <option value="">Select size...</option>
                        {TEAM_SIZE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#FFDE59] uppercase mb-2 tracking-widest font-poppins">
                        BUSINESS MODEL *
                      </label>
                      <select
                        required
                        value={formData.businessModel}
                        onChange={(e) => setFormData({ ...formData, businessModel: e.target.value })}
                        className="w-full bg-black border border-gray-700 text-white p-3 text-sm focus:border-[#E51B23] outline-none font-poppins"
                      >
                        <option value="">Select model...</option>
                        {BUSINESS_MODEL_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#FFDE59] uppercase mb-2 tracking-widest font-poppins">
                        YEARS IN BUSINESS *
                      </label>
                      <select
                        required
                        value={formData.yearsInBusiness}
                        onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                        className="w-full bg-black border border-gray-700 text-white p-3 text-sm focus:border-[#E51B23] outline-none font-poppins"
                      >
                        <option value="">Select...</option>
                        {YEARS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── MARKET CONTEXT ── */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    MARKET CONTEXT
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Who are you trying to sell to? Be specific about role, industry, company size."
                    label="TARGET AUDIENCE *"
                    required
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: (e.target as HTMLTextAreaElement).value })}
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Who is stealing your lunch? List 2-3 top competitors with URLs if possible."
                    label="COMPETITORS *"
                    required
                    value={formData.mainCompetitors}
                    onChange={(e) => setFormData({ ...formData, mainCompetitors: (e.target as HTMLTextAreaElement).value })}
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Where are you currently posting? LinkedIn? YouTube? Newsletter? Nowhere?"
                    label="CURRENT VISIBILITY *"
                    required
                    value={formData.currentChannels}
                    onChange={(e) => setFormData({ ...formData, currentChannels: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>

                {/* ── GROWTH CONTEXT (PRO) ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ConsoleHeading level={3} variant="yellow">
                      GROWTH CONTEXT
                    </ConsoleHeading>
                    <span className="bg-[#FFDE59] text-black text-[10px] font-anton uppercase px-2 py-0.5">PRO</span>
                  </div>
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="What does success look like in 12 months? Be specific: revenue target, client count, market position."
                    label="GROWTH GOAL *"
                    required
                    value={formData.growthGoal}
                    onChange={(e) => setFormData({ ...formData, growthGoal: (e.target as HTMLTextAreaElement).value })}
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="How do you currently get clients? Referrals only? Inbound? Outbound? What percentage is referral vs other?"
                    label="CLIENT ACQUISITION *"
                    required
                    value={formData.clientAcquisition}
                    onChange={(e) => setFormData({ ...formData, clientAcquisition: (e.target as HTMLTextAreaElement).value })}
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="How much content can you realistically produce? Who creates it? How often? What formats?"
                    label="CONTENT PRODUCTION CAPACITY *"
                    required
                    value={formData.contentCapacity}
                    onChange={(e) => setFormData({ ...formData, contentCapacity: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-4">
                  <ConsoleButton type="submit" fullWidth disabled={isLoading}>
                    <span className="flex items-center justify-center gap-2">
                      <Eye size={18} />
                      {isLoading ? 'RUNNING PRO DIAGNOSTICS...' : 'RUN VISIBILITY LAB PRO'}
                    </span>
                  </ConsoleButton>
                </div>

                {/* Settings link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="text-[#666] hover:text-[#FFDE59] transition-colors text-xs font-poppins flex items-center gap-1"
                    title="Admin Configuration"
                  >
                    <Lock size={12} /> Admin Settings
                  </button>
                </div>
              </form>
            </div>
          </ConsolePanel>
        </div>
      ) : (
        <ProReport data={report} onReset={handleReset} />
      )}
    </div>
  );
}
