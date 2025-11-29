'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  SalesOSHeader,
  ConsoleMarkdownRenderer
} from '@/components/console';

type AnalysisResult = {
  type: 'markdown';
  markdown: string;
  metadata: {
    score: number;
    effectiveness: 'High' | 'Medium' | 'Low';
  };
};

export default function CallLabProPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    phone: '',
    role: '',
    transcript: '',
    prospect_company: '',
    prospect_role: '',
    call_stage: 'discovery',
    tier: 'pro', // Always Pro
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'analyzing' | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Pre-fill user email if logged in
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
        }));
      }
    };
    getUser();
  }, [supabase.auth]);

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

      // Step 2: Analyze call with Pro tier
      setLoadingStep('analyzing');
      const analyzeResponse = await fetch('/api/analyze/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingestion_item_id: ingestData.ingestion_item_id,
          tool_run_id: ingestData.tool_run_id,
          rep_name: formData.first_name || 'Sales Rep',
          version: 'pro',
          use_markdown: true,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Failed to analyze call');
      }

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.result.markdown) {
        setResult({
          type: 'markdown',
          markdown: analyzeData.result.markdown,
          metadata: analyzeData.result.metadata,
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
          result: result.markdown,
          metadata: {
            date: new Date().toLocaleDateString(),
            repName: formData.first_name || 'Sales Rep',
            prospectCompany: formData.prospect_company,
            tier: 'pro',
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
      a.download = `call-lab-pro-report-${Date.now()}.pdf`;
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

  const renderProResult = () => (
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
        <ConsoleButton onClick={() => router.push('/dashboard')} variant="primary">
          → GO TO DASHBOARD
        </ConsoleButton>
        <ConsoleButton onClick={() => setResult(null)} variant="secondary">
          ← NEW ANALYSIS
        </ConsoleButton>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        <ConsoleHeading level={1} variant="yellow" className="mb-6">
          CALL LAB <span className="text-[#E51B23]">PRO</span> - FULL DIAGNOSTIC
        </ConsoleHeading>
        {result && <ConsoleMarkdownRenderer content={result.markdown} />}
      </ConsolePanel>
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader systemStatus={loading ? 'PROCESSING' : 'PRO_READY'} />

        {!result ? (
          /* Input Form */
          <ConsolePanel>
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <ConsoleHeading level={1} className="mb-2">
                  <span className="text-white">CALL LAB </span>
                  <span className="text-[#E51B23]">PRO</span>
                </ConsoleHeading>
                <p className="text-[#B3B3B3] font-poppins text-lg">
                  Full diagnostic. Pattern recognition. Trust mapping. Tactical rewrites.
                </p>
                <div className="inline-block bg-[#E51B23] text-white text-xs font-anton tracking-wider px-3 py-1 rounded">
                  PRO TIER ACTIVE
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Target Prospect */}
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">
                    CALL CONTEXT
                  </ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="Acme Corp"
                      label="PROSPECT COMPANY"
                      value={formData.prospect_company}
                      onChange={(e) =>
                        setFormData({ ...formData, prospect_company: (e.target as HTMLInputElement).value })
                      }
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="VP of Sales"
                      label="PROSPECT ROLE"
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
                    loadingStep === 'uploading' ? '⟳ UPLOADING TRANSCRIPT...' : '⟳ RUNNING PRO ANALYSIS...'
                  ) : (
                    '▶ RUN CALL LAB PRO'
                  )}
                </ConsoleButton>
              </form>
            </div>
          </ConsolePanel>
        ) : (
          renderProResult()
        )}
      </div>
    </div>
  );
}
