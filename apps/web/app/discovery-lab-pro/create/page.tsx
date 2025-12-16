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
    hookCount: number;
    competitorCount: number;
    version: 'lite' | 'pro';
  };
}

export default function DiscoveryLabProCreatePage() {
  const [formData, setFormData] = useState({
    // Requestor info
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
          version: 'pro', // Key difference: Pro version
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate discovery playbook');
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
          ← NEW PLAYBOOK
        </ConsoleButton>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        <ConsoleHeading level={1} variant="yellow" className="mb-6">
          YOUR DISCOVERY LAB PRO PLAYBOOK
        </ConsoleHeading>
        <ConsoleMarkdownRenderer content={result!.markdown} />
      </ConsolePanel>

      {/* Pro Badge */}
      <ConsolePanel variant="default">
        <div className="text-center space-y-2">
          <div className="text-[#FFDE59] font-anton text-lg tracking-wide">
            DISCOVERY LAB PRO
          </div>
          <div className="text-[#666] font-poppins text-sm">
            Full playbook generated with company research, prospect psychology, and complete conversation strategy.
          </div>
        </div>
      </ConsolePanel>
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader
          systemStatus={loading ? 'PROCESSING' : 'PRO ACTIVE'}
          productName="DISCOVERY LAB"
          productVariant="PRO"
        />

        {!result ? (
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
                  The unfair advantage you paid for.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Your Info */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    YOUR INFO
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="John Smith"
                      label="YOUR NAME *"
                      required
                      value={formData.requestor_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requestor_name: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                    <ConsoleInput
                      type="email"
                      placeholder="you@company.com"
                      label="EMAIL *"
                      required
                      value={formData.requestor_email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requestor_email: (e.target as HTMLInputElement).value,
                        })
                      }
                    />
                  </div>
                  <ConsoleInput
                    type="text"
                    placeholder="Acme Agency"
                    label="YOUR COMPANY"
                    value={formData.requestor_company}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestor_company: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                </div>

                {/* What You Sell */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    WHAT YOU SELL
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={3}
                    placeholder="Paid media management for ecommerce brands that want to scale profitably without wasting ad spend on the wrong audiences..."
                    label="DESCRIBE YOUR SERVICE (BE SPECIFIC) *"
                    required
                    value={formData.service_offered}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        service_offered: (e.target as HTMLTextAreaElement).value,
                      })
                    }
                  />
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
                      label="COMPANY WEBSITE"
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
                    label="LINKEDIN PROFILE (PRO FEATURE)"
                    value={formData.target_linkedin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_linkedin: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                </div>

                {/* Competitors */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    COMPETITORS
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={2}
                    placeholder="Competitor A, Competitor B, Competitor C"
                    label="WHO ELSE MIGHT THEY BE TALKING TO?"
                    value={formData.competitors}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        competitors: (e.target as HTMLTextAreaElement).value,
                      })
                    }
                  />
                  <p className="text-[#666] text-sm font-poppins">
                    Comma-separated. Pro will provide detailed positioning against each competitor.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-[#E51B23] border border-[#FF0000] rounded p-4">
                    <p className="text-white font-poppins font-medium">ERROR: {error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  {loading ? '⟳ GENERATING PRO PLAYBOOK...' : '▶ GENERATE PRO PLAYBOOK'}
                </ConsoleButton>

                {/* Pro indicator */}
                <div className="text-center text-[#666] text-sm font-poppins">
                  <span className="text-[#E51B23]">●</span> PRO generates 2000-2500 word comprehensive playbooks with 15 questions, competitor analysis, and full conversation strategy
                </div>
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
