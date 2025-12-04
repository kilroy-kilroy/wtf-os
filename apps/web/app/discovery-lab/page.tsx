'use client';

import { useState } from 'react';
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
    meetingFrameCount: number;
    version: 'lite' | 'pro';
  };
}

export default function DiscoveryLabPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    what_you_sell: '',
    market_concerns: '',
    target_company: '',
    target_contact_name: '',
    target_contact_title: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          version: 'lite',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate discovery brief');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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
            repName: formData.first_name || 'Sales Rep',
            prospectCompany: formData.target_company,
            tier: 'lite',
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
      a.download = `discovery-lab-brief-${formData.target_company.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
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

  const renderResult = () => (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <ConsoleButton
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          variant="secondary"
        >
          {downloadingPdf ? 'GENERATING PDF...' : '↓ DOWNLOAD PDF'}
        </ConsoleButton>
        <ConsoleButton onClick={() => setResult(null)} variant="primary">
          ← NEW BRIEF
        </ConsoleButton>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        <ConsoleHeading level={1} variant="yellow" className="mb-6">
          DISCOVERY LAB LITE - PRE-CALL BRIEF
        </ConsoleHeading>
        <ConsoleMarkdownRenderer content={result!.markdown} />
      </ConsolePanel>

      {/* Upgrade CTA */}
      <ConsolePanel variant="red-highlight">
        <div className="text-center space-y-4">
          <ConsoleHeading level={2} variant="yellow">
            DISCOVERY LAB LITE GAVE YOU QUESTIONS.
            <br />
            DISCOVERY LAB PRO GIVES YOU THE PLAYBOOK.
          </ConsoleHeading>
          <div className="text-left space-y-2 text-white font-poppins">
            <div>
              → Full Company Intel: Website analysis, positioning, recent news
            </div>
            <div>
              → Prospect Deep Dive: LinkedIn analysis, hot buttons, what they care about
            </div>
            <div>
              → Opening 60 Seconds: Scripted authority frame for the first minute
            </div>
            <div>
              → Question Arsenal: Authority, Depth, and Guidance questions with context
            </div>
            <div>
              → Permission Gates: Specific qualifiers to advance the deal
            </div>
            <div>
              → Conversation Decision Tree: If/then paths for common objections
            </div>
          </div>
          <ConsoleButton
            variant="secondary"
            fullWidth
            onClick={() => {
              window.location.href = '/discovery-lab-pro';
            }}
          >
            [ UPGRADE TO DISCOVERY LAB PRO ]
          </ConsoleButton>
        </div>
      </ConsolePanel>
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader
          systemStatus={loading ? 'PROCESSING' : 'READY'}
          productName="DISCOVERY LAB"
        />

        {!result ? (
          /* Input Form */
          <ConsolePanel>
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <ConsoleHeading level={1} className="mb-2">
                  <span className="text-white">GENERATE </span>
                  <span className="text-[#FFDE59]">PRE-CALL INTEL</span>
                </ConsoleHeading>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Tell us what you sell and who you&apos;re selling to. We&apos;ll make you
                  sound smarter.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Operator Identity */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    YOUR INFO
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="email"
                      placeholder="you@company.com"
                      label="EMAIL *"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          email: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="John"
                      label="FIRST NAME"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          first_name: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* What You Sell */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    WHAT YOU SELL
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={3}
                    placeholder="We help B2B SaaS companies reduce churn by 30% through proactive customer success automation..."
                    label="DESCRIBE YOUR PRODUCT/SERVICE IN ONE SENTENCE *"
                    required
                    value={formData.what_you_sell}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        what_you_sell: (e.target as HTMLTextAreaElement).value,
                      })
                    }
                  />
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Budget freezes, AI disruption, layoffs in our target market..."
                    label="CURRENT MARKET CONCERNS (OPTIONAL)"
                    value={formData.market_concerns}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        market_concerns: (e.target as HTMLTextAreaElement).value,
                      })
                    }
                  />
                </div>

                {/* Target Prospect */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    TARGET PROSPECT
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 gap-4">
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Sarah Johnson"
                      label="CONTACT NAME"
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
                      placeholder="VP of Sales"
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
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-[#E51B23] border border-[#FF0000] rounded p-4">
                    <p className="text-white font-poppins font-medium">ERROR: {error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  {loading ? '⟳ GENERATING INTEL...' : '▶ GENERATE PRE-CALL BRIEF'}
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
