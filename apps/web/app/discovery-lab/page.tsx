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

export default function DiscoveryLabPage() {
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
    const pdfMetadata = {
      date: new Date().toLocaleDateString(),
      repName: formData.requestor_name || 'Sales Rep',
      prospectCompany: formData.target_company,
      tier: 'lite',
      product: 'discovery-lab',
    };

    try {
      // Try server-side PDF generation first
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result.markdown,
          metadata: pdfMetadata,
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
      console.error('Server PDF generation failed, trying HTML fallback:', err);

      // Fallback: fetch the styled HTML and open it for print-to-PDF
      try {
        const htmlResponse = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            result: result.markdown,
            metadata: pdfMetadata,
            format: 'html',
          }),
        });

        if (!htmlResponse.ok) {
          throw new Error('HTML fallback also failed');
        }

        const html = await htmlResponse.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          // Auto-trigger print dialog so user can "Save as PDF"
          printWindow.onload = () => printWindow.print();
          // Fallback if onload doesn't fire (content already loaded)
          setTimeout(() => {
            try { printWindow.print(); } catch (_) { /* ignore */ }
          }, 1000);
        } else {
          alert('Please allow pop-ups to download the PDF.');
        }
      } catch (fallbackErr) {
        console.error('HTML fallback also failed:', fallbackErr);
        alert('Failed to download PDF. Please try again.');
      }
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
          YOUR DISCOVERYLAB CALL GUIDE
        </ConsoleHeading>
        <ConsoleMarkdownRenderer content={result!.markdown} />
      </ConsolePanel>

      {/* Upgrade CTA */}
      <ConsolePanel variant="red-highlight">
        <div className="text-center space-y-4">
          <ConsoleHeading level={2} variant="yellow">
            WANT THE FULL PLAYBOOK?
          </ConsoleHeading>
          <div className="text-left space-y-2 text-white font-poppins">
            <div>
              → Full Company Research: Website analysis, positioning, verbatim phrases
            </div>
            <div>
              → LinkedIn Intelligence: Contact insights, role context, hot buttons
            </div>
            <div>
              → Competitor Analysis: Why each competitor matters to this conversation
            </div>
            <div>
              → Industry Signals: What&apos;s happened in their world the last 90 days
            </div>
            <div>
              → Emotional/Identity Probe: The question that makes them feel seen
            </div>
            <div>
              → Complete Decision Tree: If/then paths for every direction
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
                  Tell us what you sell and who you&apos;re selling to. We&apos;ll arm you with
                  the questions that make prospects think &quot;this person did their homework.&quot;
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
                </div>

                {/* Competitors */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    COMPETITORS (OPTIONAL)
                  </ConsoleHeading>
                  <ConsoleInput
                    type="text"
                    placeholder="Competitor A, Competitor B, Competitor C"
                    label="WHO ELSE MIGHT THEY BE TALKING TO?"
                    value={formData.competitors}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        competitors: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                  <p className="text-[#666] text-sm font-poppins">
                    Comma-separated. We&apos;ll infer likely competitors if you don&apos;t know.
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
                  {loading ? '⟳ GENERATING CALL GUIDE...' : '▶ GENERATE CALL GUIDE'}
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
