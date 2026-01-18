'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  ConsoleMarkdownRenderer
} from '@/components/console';
import { PatternTag } from '@/components/pattern-tag';
import { CallLabLogo } from '@/components/CallLabLogo';

// Helper to safely extract score value (handles both number and {score, reason} format)
function getScoreValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'score' in value) {
    return (value as { score: number }).score;
  }
  return 0;
}

// Helper to safely render text (prevents rendering objects)
function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // If it's an object with a specific text field, extract it
    const obj = value as Record<string, unknown>;
    if ('tldr' in obj) return String(obj.tldr || '');
    if ('text' in obj) return String(obj.text || '');
    if ('value' in obj) return String(obj.value || '');
    return JSON.stringify(value);
  }
  return String(value);
}

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

// Terminal-style loading screen
function AnalysisLoader({ step }: { step: 'uploading' | 'analyzing' | 'saving' }) {
  const [logIndex, setLogIndex] = useState(0);

  const logs = [
    "INITIALIZING CALL_LAB PRO ENGINE...",
    "PARSING TRANSCRIPT DATA...",
    "DETECTING CONVERSATION PATTERNS...",
    "ANALYZING TRUST DYNAMICS...",
    "SCORING AGAINST SALES FRAMEWORKS...",
    "IDENTIFYING TACTICAL OPPORTUNITIES...",
    "GENERATING STRATEGIC REWRITES...",
    "COMPILING DIAGNOSTIC REPORT..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [logs.length]);

  const stepLabel = step === 'uploading' ? 'UPLOADING' : step === 'saving' ? 'SAVING' : 'ANALYZING';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8 font-mono">
      <div className="w-full max-w-md space-y-6">

        {/* Icon Animation */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-[#E51B23] blur-2xl opacity-20 animate-pulse"></div>
          <div className="text-[#E51B23] text-6xl font-anton animate-bounce">PRO</div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#111] border border-[#333]">
          <div
            className="h-full bg-[#E51B23] transition-all duration-500 ease-out"
            style={{ width: `${((logIndex + 1) / logs.length) * 100}%` }}
          ></div>
        </div>

        {/* Terminal Output */}
        <div className="bg-[#0a0a0a] border border-[#333] p-4 font-mono text-xs h-48 overflow-hidden flex flex-col justify-end">
          {logs.slice(0, logIndex + 1).map((log, i) => (
            <div key={i} className={`mb-1 flex items-center gap-2 ${i === logIndex ? 'text-[#FFDE59] animate-pulse' : 'text-[#666]'}`}>
              <span className="opacity-50">{`>`}</span> {log}
            </div>
          ))}
          <div className="text-[#E51B23] animate-pulse mt-2">_{stepLabel}</div>
        </div>

        <div className="text-center text-[#666] text-xs uppercase tracking-widest">
          Do not close this window
        </div>

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
    service_offered: '',
    discovery_brief_id: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'analyzing' | 'saving' | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [discoveryBriefs, setDiscoveryBriefs] = useState<Array<{
    id: string;
    companyName: string;
    contactName: string;
    label: string;
    createdAt: string;
  }>>([]);
  const [suggestedBrief, setSuggestedBrief] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Pre-fill user data if logged in
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

        // Load service_offered from user preferences
        const { data: userData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (userData?.preferences?.service_offered) {
          setFormData(prev => ({
            ...prev,
            service_offered: userData.preferences.service_offered,
          }));
        }

        // Fetch recent discovery briefs
        try {
          const briefsResponse = await fetch('/api/discovery-briefs/recent?limit=20');
          if (briefsResponse.ok) {
            const briefsData = await briefsResponse.json();
            setDiscoveryBriefs(briefsData.briefs || []);
          }
        } catch (err) {
          console.error('Failed to fetch discovery briefs:', err);
        }
      }
    };
    getUser();
  }, [supabase.auth, supabase]);

  // Auto-suggest discovery brief when prospect company changes
  useEffect(() => {
    if (formData.prospect_company && discoveryBriefs.length > 0) {
      const companyLower = formData.prospect_company.toLowerCase();
      const match = discoveryBriefs.find(brief =>
        brief.companyName.toLowerCase().includes(companyLower) ||
        companyLower.includes(brief.companyName.toLowerCase())
      );
      if (match && match.id !== formData.discovery_brief_id) {
        setSuggestedBrief(match.id);
      } else {
        setSuggestedBrief(null);
      }
    } else {
      setSuggestedBrief(null);
    }
  }, [formData.prospect_company, discoveryBriefs, formData.discovery_brief_id]);

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

      // Get the report from the response
      const report = analyzeData.result?.report || analyzeData.result;

      // Set result for display FIRST (before ingest, so we don't lose it)
      if (report) {
        setResult({
          type: 'json',
          report: report,
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

      // Step 3: Save to dashboard via ingest API (non-blocking)
      setLoadingStep('saving');
      try {
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
            discoveryBriefId: formData.discovery_brief_id || null,
          }
        };

        const saveResponse = await fetch('/api/call-lab/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ingestPayload),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          console.error('Failed to save to dashboard:', errorData);
        }
      } catch (ingestError) {
        console.error('Ingest error (non-fatal):', ingestError);
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
              <div className="text-5xl font-anton text-[#E51B23]">{getScoreValue(report.meta?.overallScore)}</div>
              <div className="text-[#666] text-xs tracking-wider">OVERALL SCORE</div>
            </div>
          </div>

          {/* Snap Take */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 mb-6">
            <h3 className="font-anton text-[#FFDE59] text-sm tracking-wider mb-2">SNAP TAKE</h3>
            <p className="text-white font-poppins text-lg">{safeText(report.snapTake?.tldr)}</p>
            <p className="text-[#B3B3B3] font-poppins mt-2">{safeText(report.snapTake?.analysis)}</p>
          </div>

          {/* Scores Grid */}
          {report.scores && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(report.scores).map(([key, value]) => (
                <div key={key} className="bg-[#111] border border-[#333] p-3 rounded">
                  <div className="text-2xl font-anton text-white">{getScoreValue(value)}</div>
                  <div className="text-[#666] text-xs tracking-wider uppercase">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConsolePanel>

        {/* Model Scores (Challenger, SPIN, MEDDIC, etc.) */}
        {report.modelScores && Object.keys(report.modelScores).length > 0 && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">SALES FRAMEWORK ANALYSIS</ConsoleHeading>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(report.modelScores).map(([model, data]) => (
                <div key={model} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-anton text-white uppercase">
                      {model === 'gapSelling' ? 'GAP SELLING' :
                       model === 'buyerJourney' ? 'BUYER JOURNEY' :
                       model === 'wtfMethod' ? 'WTF METHOD' :
                       model.toUpperCase()}
                    </span>
                    <span className="text-2xl font-anton text-[#E51B23]">{getScoreValue(data?.score)}</span>
                  </div>
                  {data?.tldr && (
                    <p className="text-[#FFDE59] text-sm mb-2">{safeText(data.tldr)}</p>
                  )}
                  {data?.analysis && (
                    <p className="text-[#B3B3B3] text-sm mb-3">{safeText(data.analysis)}</p>
                  )}
                  {data?.whatWorked && data.whatWorked.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[#00FF00] text-xs mb-1">WHAT WORKED:</p>
                      <ul className="text-[#B3B3B3] text-xs list-disc list-inside">
                        {data.whatWorked.slice(0, 3).map((item, j) => <li key={j}>{safeText(item)}</li>)}
                      </ul>
                    </div>
                  )}
                  {data?.whatMissed && data.whatMissed.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[#E51B23] text-xs mb-1">WHAT MISSED:</p>
                      <ul className="text-[#B3B3B3] text-xs list-disc list-inside">
                        {data.whatMissed.slice(0, 3).map((item, j) => <li key={j}>{safeText(item)}</li>)}
                      </ul>
                    </div>
                  )}
                  {data?.upgradeMove && (
                    <div className="mt-2 pt-2 border-t border-[#333]">
                      <p className="text-[#666] text-xs mb-1">UPGRADE MOVE:</p>
                      <p className="text-white text-sm">{safeText(data.upgradeMove)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ConsolePanel>
        )}

        {/* Patterns */}
        {report.patterns && report.patterns.length > 0 && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">PATTERNS DETECTED</ConsoleHeading>
            <div className="space-y-4">
              {report.patterns.map((pattern, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <PatternTag pattern={safeText(pattern.patternName)} className="font-anton text-base" />
                    <span className={`text-xs px-2 py-1 rounded ${
                      safeText(pattern.severity) === 'critical' ? 'bg-[#E51B23] text-white' :
                      safeText(pattern.severity) === 'high' ? 'bg-[#FF9500] text-black' :
                      safeText(pattern.severity) === 'medium' ? 'bg-[#FFDE59] text-black' :
                      'bg-[#333] text-white'
                    }`}>{safeText(pattern.severity).toUpperCase()}</span>
                  </div>
                  <p className="text-[#B3B3B3] text-sm">{safeText(pattern.tldr)}</p>
                  {pattern.recommendedFixes && pattern.recommendedFixes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#333]">
                      <p className="text-[#666] text-xs mb-1">RECOMMENDED FIXES:</p>
                      <ul className="text-[#B3B3B3] text-sm list-disc list-inside">
                        {pattern.recommendedFixes.map((fix, j) => <li key={j}>{safeText(fix)}</li>)}
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
                  <p className="text-[#666] text-xs mb-2">{safeText(item.context)}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[#E51B23] text-xs mb-1">WHAT YOU SAID:</p>
                      <p className="text-[#999] text-sm italic">&quot;{safeText(item.whatYouSaid)}&quot;</p>
                    </div>
                    <div>
                      <p className="text-[#00FF00] text-xs mb-1">STRONGER ALTERNATIVE:</p>
                      <p className="text-white text-sm">&quot;{safeText(item.strongerAlternative)}&quot;</p>
                    </div>
                  </div>
                  <p className="text-[#B3B3B3] text-sm mt-2">{safeText(item.whyItMissed)}</p>
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
                  <span className="text-[#B3B3B3]">{safeText(action)}</span>
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
                <p className="text-white font-medium">{safeText(report.followUpEmail.subject)}</p>
              </div>
              <div>
                <p className="text-[#666] text-xs mb-1">BODY:</p>
                <pre className="text-[#B3B3B3] text-sm whitespace-pre-wrap font-poppins">
                  {safeText(report.followUpEmail.body)}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${safeText(report.followUpEmail.subject)}\n\n${safeText(report.followUpEmail.body)}`);
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
    <div className="min-h-screen bg-black">
      {/* Loading overlay */}
      {loading && loadingStep && <AnalysisLoader step={loadingStep} />}

      {/* Header with Pro Logo */}
      <header className="border-b border-[#333] px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <CallLabLogo variant="pro-square" className="h-16 w-auto" />
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
                  {/* Service Offered */}
                  <div>
                    <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 font-poppins uppercase">
                      WHAT YOU SELL / YOUR SERVICE
                    </label>
                    <textarea
                      placeholder="e.g., Paid media management for ecommerce brands..."
                      value={formData.service_offered}
                      onChange={(e) => setFormData({ ...formData, service_offered: e.target.value })}
                      rows={2}
                      className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-sm font-poppins focus:border-[#E51B23] focus:outline-none transition-colors rounded resize-none"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-[#555]">
                        Helps us analyze your calls with relevant context. Edit per call if needed.
                      </p>
                      <a
                        href="/settings"
                        className="text-[10px] text-[#FFDE59] hover:underline"
                      >
                        Change in settings
                      </a>
                    </div>
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

                  {/* Discovery Brief Link */}
                  {discoveryBriefs.length > 0 && (
                    <div>
                      <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 font-poppins uppercase">
                        RELATED DISCOVERY BRIEF
                      </label>
                      <select
                        value={formData.discovery_brief_id}
                        onChange={(e) => {
                          setFormData({ ...formData, discovery_brief_id: e.target.value });
                          setSuggestedBrief(null);
                        }}
                        className="w-full bg-black border border-[#333333] text-white px-4 py-3 text-sm font-poppins focus:border-[#E51B23] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
                      >
                        <option value="">None / New Prospect</option>
                        {discoveryBriefs.map((brief) => (
                          <option key={brief.id} value={brief.id}>
                            {brief.label} ({new Date(brief.createdAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-[#555] mt-1">
                        Link this call to a discovery brief for pipeline tracking.
                      </p>

                      {/* Auto-suggestion */}
                      {suggestedBrief && (
                        <div className="mt-2 p-3 bg-[#1A1A1A] border border-[#FFDE59] rounded">
                          <p className="text-[#FFDE59] text-xs mb-2">
                            Is this call related to your discovery brief for{' '}
                            <strong>{discoveryBriefs.find(b => b.id === suggestedBrief)?.companyName}</strong>?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, discovery_brief_id: suggestedBrief });
                                setSuggestedBrief(null);
                              }}
                              className="px-3 py-1 bg-[#FFDE59] text-black text-xs font-medium rounded hover:bg-[#E51B23] hover:text-white transition-colors"
                            >
                              Yes, link it
                            </button>
                            <button
                              type="button"
                              onClick={() => setSuggestedBrief(null)}
                              className="px-3 py-1 bg-[#333] text-white text-xs font-medium rounded hover:bg-[#444] transition-colors"
                            >
                              No, different prospect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {loading ? (
                    loadingStep === 'uploading' ? '⟳ UPLOADING TRANSCRIPT...' :
                    loadingStep === 'saving' ? '⟳ SAVING TO DASHBOARD...' :
                    '⟳ RUNNING PRO ANALYSIS...'
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
