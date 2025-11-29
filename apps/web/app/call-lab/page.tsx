'use client';

import { useState, useEffect } from 'react';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
  SalesOSHeader,
  ConsoleMarkdownRenderer
} from '@/components/console';
import CallLabLoadingScreen from '@/components/CallLabLoadingScreen';
import { createBrowserClient } from '@repo/db';

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
  const [userPlan, setUserPlan] = useState<'lite' | 'solo' | 'team' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is logged in and has Pro subscription
  useEffect(() => {
    const checkUserSubscription = async () => {
      try {
        const supabase = createBrowserClient();

        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User is logged in - fetch their plan
          // Using type assertion since we added columns that aren't in generated types
          const { data: userData } = await supabase
            .from('users')
            .select('plan, email, first_name')
            .eq('id', session.user.id)
            .single() as { data: { plan: string | null; email: string | null; first_name: string | null } | null };

          if (userData) {
            const plan = userData.plan as 'lite' | 'solo' | 'team' | null;
            setUserPlan(plan);

            // Auto-set tier to pro if they have a paid plan
            if (plan === 'solo' || plan === 'team') {
              setFormData(prev => ({ ...prev, tier: 'pro' }));
            }

            // Pre-fill email and name if available
            if (userData.email) {
              setFormData(prev => ({ ...prev, email: userData.email ?? '' }));
            }
            if (userData.first_name) {
              setFormData(prev => ({ ...prev, first_name: userData.first_name ?? '' }));
            }
          }
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUserSubscription();
  }, []);

  // Reset for new analysis - clear call data but keep user info
  const handleNewAnalysis = () => {
    setResult(null);
    setError(null);
    setFormData(prev => ({
      ...prev,
      transcript: '',
      prospect_company: '',
      prospect_role: '',
      call_stage: 'discovery',
    }));
  };

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
        <ConsoleButton onClick={handleNewAnalysis} variant="primary">
          ← NEW ANALYSIS
        </ConsoleButton>
      </div>

      {/* Report Content */}
      <ConsolePanel>
        {/* Only show header for Lite - Pro has its own header in the markdown */}
        {formData.tier === 'lite' && (
          <ConsoleHeading level={1} variant="yellow" className="mb-6">
            CALL LAB LITE - DIAGNOSTIC SNAPSHOT
          </ConsoleHeading>
        )}
        <ConsoleMarkdownRenderer content={mdResult.markdown} />
      </ConsolePanel>

      {/* Upgrade CTA - only show for Lite */}
      {formData.tier === 'lite' && (
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
                window.location.href = '/call-lab-pro';
              }}
            >
              [ UPGRADE TO CALL LAB PRO ]
            </ConsoleButton>
          </div>
        </ConsolePanel>
      )}

      {/* Pro users get a different CTA */}
      {formData.tier === 'pro' && (
        <ConsolePanel>
          <div className="text-center space-y-4">
            <ConsoleHeading level={2} variant="yellow">
              KEEP STACKING WINS
            </ConsoleHeading>
            <p className="text-[#B3B3B3] font-poppins">
              Every call analyzed is another pattern recognized. Keep feeding the machine.
            </p>
            <div className="flex gap-4 justify-center">
              <ConsoleButton
                variant="secondary"
                onClick={handleNewAnalysis}
              >
                [ ANALYZE ANOTHER CALL ]
              </ConsoleButton>
              <ConsoleButton
                variant="primary"
                onClick={() => window.location.href = '/dashboard'}
              >
                [ REVIEW DASHBOARD ]
              </ConsoleButton>
            </div>
          </div>
        </ConsolePanel>
      )}
    </div>
  );

  // Show full-screen loading animation
  if (loading && loadingStep) {
    return (
      <CallLabLoadingScreen
        step={loadingStep}
        tier={formData.tier as 'lite' | 'pro'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <SalesOSHeader systemStatus={checkingAuth ? 'PROCESSING' : loading ? 'PROCESSING' : 'READY'} />

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
                {/* Tier Selector - only show if user is not a Pro subscriber */}
                {checkingAuth ? (
                  <div className="bg-[#1A1A1A] border border-[#333] p-4 animate-pulse">
                    <div className="text-[#666] font-poppins text-sm">
                      Checking subscription status...
                    </div>
                  </div>
                ) : (userPlan === 'solo' || userPlan === 'team') ? (
                  <div className="bg-[#1A1A1A] border-2 border-[#FFDE59] p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">⚡</div>
                      <div>
                        <div className="font-anton text-[#FFDE59] tracking-wider">
                          CALL LAB PRO ACTIVE
                        </div>
                        <div className="text-xs text-[#B3B3B3] font-poppins">
                          {userPlan === 'team' ? 'Team Plan' : 'Solo Plan'} • Full Pattern Analysis Enabled
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ConsoleHeading level={3} variant="yellow">
                      ANALYSIS MODE
                    </ConsoleHeading>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tier: 'lite' })}
                        className={`flex-1 py-4 px-6 border-2 font-anton tracking-wider transition-all ${
                          formData.tier === 'lite'
                            ? 'bg-[#E51B23] border-[#E51B23] text-white'
                            : 'bg-transparent border-[#333] text-[#666] hover:border-[#E51B23] hover:text-white'
                        }`}
                      >
                        <div className="text-lg">LITE</div>
                        <div className="text-xs font-poppins font-normal mt-1 opacity-70">
                          Diagnostic Snapshot
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tier: 'pro' })}
                        className={`flex-1 py-4 px-6 border-2 font-anton tracking-wider transition-all ${
                          formData.tier === 'pro'
                            ? 'bg-[#FFDE59] border-[#FFDE59] text-black'
                            : 'bg-transparent border-[#333] text-[#666] hover:border-[#FFDE59] hover:text-white'
                        }`}
                      >
                        <div className="text-lg">PRO</div>
                        <div className="text-xs font-poppins font-normal mt-1 opacity-70">
                          Full Pattern Analysis
                        </div>
                      </button>
                    </div>
                    {formData.tier === 'pro' && !userPlan && (
                      <p className="text-xs text-[#E51B23] font-poppins">
                        Note: Pro analysis requires a subscription. <a href="/call-lab-pro" className="text-[#FFDE59] underline">Upgrade here</a>
                      </p>
                    )}
                  </div>
                )}

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
