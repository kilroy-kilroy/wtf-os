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

type ProReport = {
  meta: {
    callId: string;
    version: string;
    overallScore: number;
    trustVelocity: number;
    repName: string;
    prospectName: string;
    prospectCompany: string;
    callStage: string;
  };
  snapTake: { tldr: string; analysis: string };
  scores: Record<string, number>;
  kilroyFlavorIndex: { score: number; tldr: string; notes: string };
  modelScores: Record<string, { score: number; tldr: string; analysis: string; whatWorked: string[]; whatMissed: string[]; upgradeMove: string }>;
  patterns: Array<{ patternName: string; severity: string; tldr: string; timestamps: string[]; symptoms: string[]; whyItMatters: string; recommendedFixes: string[]; exampleRewrite: string }>;
  ambiguityDetection: { tldr: string; moments: Array<{ quote: string; interpretation: string; impact: string; recommendedLanguage: string }> };
  trustMap: { tldr: string; timeline: Array<{ timestamp: string; event: string; trustDelta: string; analysis: string }> };
  tacticalRewrites: { tldr: string; items: Array<{ context: string; whatYouSaid: string; whyItMissed: string; strongerAlternative: string }> };
  nextSteps: { tldr: string; actions: string[] };
  followUpEmail: { subject: string; body: string };
};

type AnalysisResult = {
  type: 'json' | 'markdown';
  report?: ProReport;
  markdown?: string;
  metadata?: {
    agent: string;
    version: string;
    callId: string;
    userId: string;
    transcript: string;
    createdAt: string;
  };
};

// Loading animation component
function AnalysisLoader({ step }: { step: 'uploading' | 'analyzing' | 'saving' }) {
  const steps = [
    { key: 'uploading', label: 'Uploading transcript', icon: '↑' },
    { key: 'analyzing', label: 'Running Pro analysis', icon: '⚡' },
    { key: 'saving', label: 'Saving to dashboard', icon: '✓' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto border-4 border-[#333] rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-anton text-[#E51B23] text-3xl animate-bounce">PRO</span>
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-4">
          {steps.map((s, i) => {
            const isActive = s.key === step;
            const isPast = steps.findIndex(x => x.key === step) > i;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-4 px-6 py-3 rounded transition-all duration-300 ${
                  isActive ? 'bg-[#E51B23]/20 border border-[#E51B23]' :
                  isPast ? 'bg-[#1A1A1A] border border-[#333] opacity-50' :
                  'bg-[#1A1A1A] border border-[#333] opacity-30'
                }`}
              >
                <span className={`text-2xl ${isActive ? 'animate-spin' : ''}`}>
                  {isPast ? '✓' : s.icon}
                </span>
                <span className={`font-poppins ${isActive ? 'text-white' : 'text-[#666]'}`}>
                  {s.label}
                  {isActive && <span className="animate-pulse">...</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Kilroy quote */}
        <p className="text-[#666] text-sm font-poppins italic">
          &quot;Good analysis takes time. Bad calls take longer to fix.&quot;
        </p>
      </div>
    </div>
  );
}

export default function CallLabProPage() {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    phone: '',
    role: '',
    transcript: '',
    prospect_name: '',
    prospect_company: '',
    prospect_url: '',
    prospect_role: '',
    call_type: 'discovery',
    call_stage: 'discovery',
    tier: 'pro',
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'analyzing' | 'saving' | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Pre-fill user email if logged in
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          first_name: user.user_metadata?.full_name || user.user_metadata?.first_name || '',
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
          prospect_name: formData.prospect_name,
          prospect_company: formData.prospect_company,
          call_type: formData.call_type,
          version: 'pro',
          use_markdown: false, // Get JSON for structured display
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Failed to analyze call');
      }

      const analyzeData = await analyzeResponse.json();
      const callId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      // Step 3: Save to dashboard via ingest API
      setLoadingStep('saving');
      const report = analyzeData.result?.report || analyzeData.result;

      const ingestPayload = {
        report: report,
        metadata: {
          userId: userId,
          agent: 'pro',
          version: '1.0',
          callId: callId,
          transcript: formData.transcript,
          createdAt: createdAt,
          buyerName: formData.prospect_name,
          companyName: formData.prospect_company,
        }
      };

      const saveResponse = await fetch('/api/call-lab/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestPayload),
      });

      if (!saveResponse.ok) {
        console.error('Failed to save to dashboard, but analysis completed');
      }

      // Set result for display
      if (analyzeData.result?.report) {
        setResult({
          type: 'json',
          report: analyzeData.result.report,
          metadata: {
            agent: 'pro',
            version: '1.0',
            callId,
            userId: userId || '',
            transcript: formData.transcript,
            createdAt,
          }
        });
      } else if (analyzeData.result?.markdown) {
        setResult({
          type: 'markdown',
          markdown: analyzeData.result.markdown,
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
          report: result.type === 'json' ? result.report : null,
          markdown: result.type === 'markdown' ? result.markdown : null,
          metadata: {
            date: new Date().toLocaleDateString(),
            repName: formData.first_name || 'Sales Rep',
            prospectName: formData.prospect_name,
            prospectCompany: formData.prospect_company,
            callType: formData.call_type,
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
      a.download = `call-lab-pro-${formData.prospect_company || 'report'}-${Date.now()}.pdf`;
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

  const renderProResult = () => {
    if (!result) return null;

    // For markdown results, use the existing renderer
    if (result.type === 'markdown' && result.markdown) {
      return (
        <div className="space-y-6">
          <div className="flex gap-4 justify-end flex-wrap">
            <ConsoleButton onClick={handleDownloadPdf} disabled={downloadingPdf} variant="secondary">
              {downloadingPdf ? 'GENERATING PDF...' : '↓ DOWNLOAD PDF'}
            </ConsoleButton>
            <ConsoleButton onClick={() => router.push('/dashboard')} variant="primary">
              → GO TO DASHBOARD
            </ConsoleButton>
            <ConsoleButton onClick={() => setResult(null)} variant="secondary">
              ← NEW ANALYSIS
            </ConsoleButton>
          </div>
          <ConsolePanel>
            <ConsoleHeading level={1} variant="yellow" className="mb-6">
              CALL LAB <span className="text-[#E51B23]">PRO</span> - FULL DIAGNOSTIC
            </ConsoleHeading>
            <ConsoleMarkdownRenderer content={result.markdown} />
          </ConsolePanel>
        </div>
      );
    }

    // For JSON results, render structured report
    const report = result.report;
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-4 justify-end flex-wrap">
          <ConsoleButton onClick={handleDownloadPdf} disabled={downloadingPdf} variant="secondary">
            {downloadingPdf ? 'GENERATING PDF...' : '↓ DOWNLOAD PDF'}
          </ConsoleButton>
          <ConsoleButton onClick={() => router.push('/dashboard')} variant="primary">
            → GO TO DASHBOARD
          </ConsoleButton>
          <ConsoleButton onClick={() => setResult(null)} variant="secondary">
            ← NEW ANALYSIS
          </ConsoleButton>
        </div>

        {/* Score Header */}
        <ConsolePanel>
          <div className="flex items-center justify-between mb-6">
            <ConsoleHeading level={1} variant="yellow">
              CALL LAB <span className="text-[#E51B23]">PRO</span> - FULL DIAGNOSTIC
            </ConsoleHeading>
            <div className="text-right">
              <div className="text-5xl font-anton text-[#E51B23]">{report.meta?.overallScore || 0}</div>
              <div className="text-[#666] text-xs tracking-wider">OVERALL SCORE</div>
            </div>
          </div>

          {/* Snap Take */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 mb-6">
            <h3 className="font-anton text-[#FFDE59] text-sm tracking-wider mb-2">SNAP TAKE</h3>
            <p className="text-white font-poppins text-lg">{report.snapTake?.tldr}</p>
            <p className="text-[#B3B3B3] font-poppins mt-2">{report.snapTake?.analysis}</p>
          </div>

          {/* Scores Grid */}
          {report.scores && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(report.scores).map(([key, value]) => (
                <div key={key} className="bg-[#111] border border-[#333] p-3 rounded">
                  <div className="text-2xl font-anton text-white">{value as number}</div>
                  <div className="text-[#666] text-xs tracking-wider uppercase">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConsolePanel>

        {/* Patterns */}
        {report.patterns && report.patterns.length > 0 && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">PATTERNS DETECTED</ConsoleHeading>
            <div className="space-y-4">
              {report.patterns.map((pattern, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-anton text-[#E51B23]">{pattern.patternName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      pattern.severity === 'critical' ? 'bg-[#E51B23] text-white' :
                      pattern.severity === 'high' ? 'bg-[#FF9500] text-black' :
                      pattern.severity === 'medium' ? 'bg-[#FFDE59] text-black' :
                      'bg-[#333] text-white'
                    }`}>{pattern.severity?.toUpperCase()}</span>
                  </div>
                  <p className="text-[#B3B3B3] text-sm">{pattern.tldr}</p>
                  {pattern.recommendedFixes && pattern.recommendedFixes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#333]">
                      <p className="text-[#666] text-xs mb-1">RECOMMENDED FIXES:</p>
                      <ul className="text-[#B3B3B3] text-sm list-disc list-inside">
                        {pattern.recommendedFixes.map((fix, j) => <li key={j}>{fix}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ConsolePanel>
        )}

        {/* Tactical Rewrites */}
        {report.tacticalRewrites?.items && report.tacticalRewrites.items.length > 0 && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">TACTICAL REWRITES</ConsoleHeading>
            <div className="space-y-4">
              {report.tacticalRewrites.items.map((item, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#666] text-xs mb-2">{item.context}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[#E51B23] text-xs mb-1">WHAT YOU SAID:</p>
                      <p className="text-[#999] text-sm italic">&quot;{item.whatYouSaid}&quot;</p>
                    </div>
                    <div>
                      <p className="text-[#00FF00] text-xs mb-1">STRONGER ALTERNATIVE:</p>
                      <p className="text-white text-sm">&quot;{item.strongerAlternative}&quot;</p>
                    </div>
                  </div>
                  <p className="text-[#B3B3B3] text-sm mt-2">{item.whyItMissed}</p>
                </div>
              ))}
            </div>
          </ConsolePanel>
        )}

        {/* Next Steps */}
        {report.nextSteps?.actions && report.nextSteps.actions.length > 0 && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">NEXT STEPS</ConsoleHeading>
            <ul className="space-y-2">
              {report.nextSteps.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#FFDE59] font-anton">{i + 1}.</span>
                  <span className="text-[#B3B3B3]">{action}</span>
                </li>
              ))}
            </ul>
          </ConsolePanel>
        )}

        {/* Follow-Up Email */}
        {report.followUpEmail?.subject && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">FOLLOW-UP EMAIL</ConsoleHeading>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <div className="mb-4">
                <p className="text-[#666] text-xs mb-1">SUBJECT:</p>
                <p className="text-white font-medium">{report.followUpEmail.subject}</p>
              </div>
              <div>
                <p className="text-[#666] text-xs mb-1">BODY:</p>
                <pre className="text-[#B3B3B3] text-sm whitespace-pre-wrap font-poppins">
                  {report.followUpEmail.body}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${report.followUpEmail.subject}\n\n${report.followUpEmail.body}`);
                  alert('Email copied to clipboard!');
                }}
                className="mt-4 px-4 py-2 bg-[#333] text-white text-sm rounded hover:bg-[#444] transition-colors"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </ConsolePanel>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      {/* Loading overlay */}
      {loading && loadingStep && <AnalysisLoader step={loadingStep} />}

      <div className="max-w-5xl mx-auto">
        <SalesOSHeader systemStatus={loading ? 'PROCESSING' : 'READY'} />

        {!result ? (
          <ConsolePanel>
            <div className="space-y-8">
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
                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">CALL CONTEXT</ConsoleHeading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="text"
                      placeholder="John Smith"
                      label="PROSPECT NAME"
                      value={formData.prospect_name}
                      onChange={(e) => setFormData({ ...formData, prospect_name: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="Acme Corp"
                      label="PROSPECT COMPANY"
                      value={formData.prospect_company}
                      onChange={(e) => setFormData({ ...formData, prospect_company: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConsoleInput
                      type="url"
                      placeholder="https://linkedin.com/in/johnsmith"
                      label="PROSPECT URL"
                      value={formData.prospect_url}
                      onChange={(e) => setFormData({ ...formData, prospect_url: (e.target as HTMLInputElement).value })}
                    />
                    <ConsoleInput
                      type="text"
                      placeholder="VP of Sales"
                      label="PROSPECT ROLE"
                      value={formData.prospect_role}
                      onChange={(e) => setFormData({ ...formData, prospect_role: (e.target as HTMLInputElement).value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 font-poppins uppercase">
                      CALL TYPE
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { value: 'discovery', label: 'Discovery' },
                        { value: 'follow_up', label: 'Follow Up' },
                        { value: 'presentation', label: 'Presentation' },
                        { value: 'close', label: 'Close' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, call_type: option.value })}
                          className={`px-4 py-3 text-sm font-poppins font-medium tracking-wide border rounded transition-all duration-200 ${
                            formData.call_type === option.value
                              ? 'bg-[#E51B23] border-[#E51B23] text-white'
                              : 'bg-black border-[#333333] text-[#B3B3B3] hover:border-[#E51B23] hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <ConsoleHeading level={3} variant="yellow">TRANSCRIPT INPUT</ConsoleHeading>
                  <ConsoleInput
                    multiline
                    rows={16}
                    placeholder="Paste your call transcript here... Supports Zoom, Fireflies, Gong, or any text format."
                    label="CALL TRANSCRIPT *"
                    required
                    value={formData.transcript}
                    onChange={(e) => setFormData({ ...formData, transcript: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>

                {error && (
                  <div className="bg-[#E51B23]/20 border border-[#E51B23] rounded p-4">
                    <p className="text-[#E51B23] font-poppins font-medium">ERROR: {error}</p>
                  </div>
                )}

                <ConsoleButton type="submit" fullWidth disabled={loading}>
                  {loading ? '⟳ ANALYZING...' : '▶ RUN CALL LAB PRO'}
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
