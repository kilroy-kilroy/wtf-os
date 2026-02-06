'use client';

import React, { useState, useEffect } from 'react';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
} from '@/components/console';
import { Dashboard } from '@/components/visibility-lab/Dashboard';
import { LoadingScreen } from '@/components/visibility-lab/LoadingScreen';
import { ToolPageHeader } from '@/components/ToolPageHeader';
import { AnalysisInput, AnalysisReport } from '@/lib/visibility-lab/types';
import { formatEmail } from '@/lib/visibility-lab/email-formatter';
import { Lock, X, Save, Webhook } from 'lucide-react';

// --- CONFIGURATION ---
// Paste your Zapier Webhook URL here to hardcode it (avoids using the UI settings)
const HARDCODED_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/1852580/uzksxsr/";

export default function VisibilityLabPage() {
  // Initialize state from localStorage
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempWebhook, setTempWebhook] = useState('');

  const [formData, setFormData] = useState<AnalysisInput>({
    userName: '',
    userEmail: '',
    userPhone: '',
    userTitle: '',
    brandName: '',
    website: '',
    targetAudience: '',
    mainCompetitors: '',
    currentChannels: ''
  });

  // Load saved data from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedReport = localStorage.getItem('demandos_report');
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
    try {
      const response = await fetch('/api/visibility-lab/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const result: AnalysisReport = await response.json();

      // 1. Save to local storage immediately
      localStorage.setItem('demandos_report', JSON.stringify(result));

      // 2. GENERATE HTML EMAIL PAYLOAD
      const emailHtml = formatEmail(result);

      // 3. AUTO-SEND TO ZAPIER (Background Process)
      const targetWebhook = HARDCODED_WEBHOOK_URL || webhookUrl;

      if (targetWebhook) {
        console.log("Transmitting payload to Zapier...");

        // Flattened payload for specific Zapier requirements
        const zapierPayload = {
          name: formData.userName,
          email: formData.userEmail,
          company: formData.brandName,
          phone: formData.userPhone,
          title: formData.userTitle,
          brand_name: formData.brandName,
          html: emailHtml,
          timestamp: new Date().toISOString()
        };

        fetch(targetWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(zapierPayload)
        }).catch(err => console.error("Zapier Auto-Send Failed:", err));
      }

      // 4. Show Dashboard
      setReport(result);

    } catch (error) {
      console.error("Error generating report", error);
      alert(`DemandOS Error: ${error instanceof Error ? error.message : "System Failure. Check API Key or Try Again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // Clear local storage on reset
    localStorage.removeItem('demandos_report');
    setReport(null);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-brand-red animate-pulse font-mono">INITIALIZING...</div>
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
      {isLoading && <LoadingScreen />}

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

                        <div className="text-xs text-gray-300 bg-black p-3 mb-4 font-mono border-l-2 border-[#E51B23]">
                          <strong className="text-[#E51B23]">INSTRUCTIONS:</strong><br/>
                          1. Go to Zapier &rarr; Click &quot;Create Zap&quot;<br/>
                          2. Trigger: <strong>&quot;Webhooks by Zapier&quot;</strong><br/>
                          3. Event: <strong>&quot;Catch Hook&quot;</strong><br/>
                          4. Copy the &quot;Webhook URL&quot; provided<br/>
                          5. Paste below.
                        </div>

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
                <ConsoleHeading level={1} className="mb-2">
                  <span className="text-white">INITIALIZE </span>
                  <span className="text-[#FFDE59]">ANALYSIS</span>
                </ConsoleHeading>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Feed the DemandOS engine. Be honest. We can&apos;t fix what we can&apos;t see.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="space-y-8">
                {/* Operator Identity */}
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
                      onChange={(e) =>
                        setFormData({ ...formData, userName: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="email"
                      placeholder="you@company.com"
                      label="EMAIL *"
                      required
                      value={formData.userEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, userEmail: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      label="PHONE *"
                      required
                      value={formData.userPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, userPhone: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="CEO, VP Marketing, etc."
                      label="JOB TITLE *"
                      required
                      value={formData.userTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, userTitle: (e.target as HTMLInputElement).value })
                      }
                    />
                  </div>
                </div>

                {/* Target Brand */}
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
                      onChange={(e) =>
                        setFormData({ ...formData, brandName: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="https://..."
                      label="WEBSITE *"
                      required
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: (e.target as HTMLInputElement).value })
                      }
                    />
                  </div>
                </div>

                {/* Market Context */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    MARKET CONTEXT
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Who are you trying to sell to? Be specific."
                    label="TARGET AUDIENCE *"
                    required
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAudience: (e.target as HTMLTextAreaElement).value })
                    }
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Who is stealing your lunch? List 2-3 top competitors."
                    label="COMPETITORS *"
                    required
                    value={formData.mainCompetitors}
                    onChange={(e) =>
                      setFormData({ ...formData, mainCompetitors: (e.target as HTMLTextAreaElement).value })
                    }
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Where are you currently posting? LinkedIn? YouTube? Nowhere?"
                    label="CURRENT VISIBILITY *"
                    required
                    value={formData.currentChannels}
                    onChange={(e) =>
                      setFormData({ ...formData, currentChannels: (e.target as HTMLTextAreaElement).value })
                    }
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-4">
                  <ConsoleButton type="submit" fullWidth disabled={isLoading}>
                    {isLoading ? '⟳ RUNNING DIAGNOSTICS...' : '▶ RUN VISIBILITY LAB'}
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
        <Dashboard data={report} onReset={handleReset} />
      )}
    </div>
  );
}
