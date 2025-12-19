'use client';

import { useState } from 'react';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  ConsoleMarkdownRenderer
} from '@/components/console';
import { CallLabLogo } from '@/components/CallLabLogo';

// Union type for both response formats
type AnalysisResult =
  | {
      type: 'markdown';
      markdown: string;
      metadata: {
        score: number;
        effectiveness: 'High' | 'Medium' | 'Low';
      };
    }
  | {
      type: 'json';
      overall_score: number;
      overall_grade: string;
      diagnosis_summary: string;
      scores: Record<string, { score: number; reason: string }>;
      strengths: Array<{ quote: string; behavior: string; note: string }>;
      weaknesses: Array<{ quote: string; behavior: string; note: string }>;
      focus_area: { theme: string; why: string; drill: string };
      follow_ups: Array<{ type: string; subject: string; body: string }>;
      tasks: string[];
    };

export default function CallLabPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    phone: '',
    role: '',
    transcript: '',
    prospect_company: '',
    prospect_role: '',
    call_stage: 'discovery',
    tier: 'lite', // 'lite' or 'pro'
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'analyzing' | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Ingest transcript
      setLoadingStep('uploading');
      const ingestResponse = await fetch('/api/ingest/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json();
        throw new Error(errorData.error || 'Failed to submit transcript');
      }

      const ingestData = await ingestResponse.json();

      // Step 2: Analyze call with new markdown format
      setLoadingStep('analyzing');
      const analyzeResponse = await fetch('/api/analyze/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingestion_item_id: ingestData.ingestion_item_id,
          tool_run_id: ingestData.tool_run_id,
          rep_name: formData.first_name || 'Sales Rep',
          version: formData.tier,
          use_markdown: true, // Use new markdown prompts
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Failed to analyze call');
      }

      const analyzeData = await analyzeResponse.json();

      // Check if response is markdown or JSON format
      if (analyzeData.result.markdown) {
        setResult({
          type: 'markdown',
          markdown: analyzeData.result.markdown,
          metadata: analyzeData.result.metadata,
        });
      } else {
        // Backwards compatibility with JSON format
        setResult({
          type: 'json',
          ...analyzeData.result,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingStep(null);
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
          result: result.type === 'markdown' ? result.markdown : result,
          metadata: {
            date: new Date().toLocaleDateString(),
            repName: formData.first_name || 'Sales Rep',
            prospectCompany: formData.prospect_company,
            tier: formData.tier,
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
      a.download = `call-lab-${formData.tier}-report-${Date.now()}.pdf`;
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

  const renderMarkdownResult = (mdResult: Extract<AnalysisResult, { type: 'markdown' }>) => (
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
          ← NEW ANALYSIS
        </ConsoleButton>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        <ConsoleHeading level={1} variant="yellow" className="mb-6">
          CALL LAB LITE - DIAGNOSTIC SNAPSHOT
        </ConsoleHeading>
        <ConsoleMarkdownRenderer content={mdResult.markdown} />
      </ConsolePanel>

      {/* Upgrade CTA */}
      <ConsolePanel variant="red-highlight">
        <div className="text-center space-y-4">
          <ConsoleHeading level={2} variant="yellow">
            CALL LAB LITE SHOWED YOU WHAT HAPPENED.<br />CALL LAB PRO SHOWS YOU THE SYSTEM.
          </ConsoleHeading>
          <div className="text-left space-y-2 text-white font-poppins">
            <div>→ Pattern Library: The 47 trust-building moves you&apos;re using (or missing)</div>
            <div>→ Trust Acceleration Map: See exactly when buyers go from skeptical to sold</div>
            <div>→ Tactical Rewrites: Word-for-word fixes for every weak moment</div>
            <div>→ Timestamp Analysis: Every buying signal decoded with your exact response</div>
            <div>→ Framework Breakdowns: When to deploy each close, how to recognize the setup</div>
            <div>→ Comparative Scoring: How you stack up against 8 major sales methodologies</div>
          </div>
          <ConsoleButton
            variant="secondary"
            fullWidth
            onClick={() => {
              // TODO: Integrate with Stripe checkout
              console.log('Upgrade to Call Lab Pro clicked');
            }}
          >
            [ UPGRADE TO CALL LAB PRO ]
          </ConsoleButton>
        </div>
      </ConsolePanel>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Header with Logo */}
      <header className="border-b border-[#333] px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <CallLabLogo variant="square" className="h-16 w-auto" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-anton text-xs text-white uppercase tracking-wider">
              SYS_{loading ? 'PROCESSING' : 'READY'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {!result ? (
          /* Input Form */
          <ConsolePanel>
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <ConsoleHeading level={1} className="mb-2">
                  <span className="text-white">INITIALIZE </span>
                  <span className="text-[#FFDE59]">ANALYSIS</span>
                </ConsoleHeading>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Feed Call Lab your transcript. We&apos;ll tell you what you missed.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Operator Identity */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    OPERATOR IDENTITY
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="email"
                      placeholder="operator@agency.com"
                      label="EMAIL *"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="John"
                      label="FIRST NAME"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      label="PHONE"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="Account Executive"
                      label="ROLE"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: (e.target as HTMLInputElement).value })
                      }
                    />
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
                      label="COMPANY"
                      value={formData.prospect_company}
                      onChange={(e) =>
                        setFormData({ ...formData, prospect_company: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="VP of Sales"
                      label="ROLE"
                      value={formData.prospect_role}
                      onChange={(e) =>
                        setFormData({ ...formData, prospect_role: (e.target as HTMLInputElement).value })
                      }
                    />
                  </div>
                </div>

                {/* Transcript Input */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    TRANSCRIPT INPUT
                  </ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={16}
                    placeholder="Paste your call transcript here... Supports Zoom, Fireflies, Gong, or any text format."
                    label="CALL TRANSCRIPT *"
                    required
                    value={formData.transcript}
                    onChange={(e) =>
                      setFormData({ ...formData, transcript: (e.target as HTMLTextAreaElement).value })
                    }
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-[#E51B23] border border-[#FF0000] rounded p-4">
                    <p className="text-white font-poppins font-medium">ERROR: {error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  {loading ? (
                    loadingStep === 'uploading' ? '⟳ UPLOADING TRANSCRIPT...' : '⟳ ANALYZING WITH AI...'
                  ) : (
                    '▶ RUN CALL LAB'
                  )}
                </ConsoleButton>
              </form>
            </div>
          </ConsolePanel>
        ) : (
          /* Results Display */
          result.type === 'markdown' && renderMarkdownResult(result)
        )}
      </div>
    </div>
  );
}
