import { redirect } from "next/navigation";
import { createClient } from '@/lib/supabase-auth-server';
import { format } from "date-fns";
import Link from "next/link";
import { ConsolePanel, ConsoleHeading, CallLabProReport } from "@/components/console";
import { PatternTag } from "@/components/pattern-tag";

interface CallReport {
  id: string;
  user_id: string;
  buyer_name: string | null;
  company_name: string | null;
  call_type: string | null;
  call_date: string | null;
  duration_minutes: number | null;
  overall_score: number | null;
  opening_score: number | null;
  discovery_score: number | null;
  diagnostic_score: number | null;
  value_score: number | null;
  objection_score: number | null;
  commitment_score: number | null;
  human_first_score: number | null;
  trust_velocity: number | null;
  agenda_control: number | null;
  pattern_density: number | null;
  patterns_detected: string[] | null;
  primary_pattern: string | null;
  improvement_highlight: string | null;
  key_moments: { timestamp: string; description: string; type: string }[] | null;
  full_report: Record<string, unknown> | null;
  tier: string;
  created_at: string;
}

// Type for Pro JSON report format
type ProReport = {
  meta?: {
    callId?: string;
    version?: string;
    overallScore?: number;
    trustVelocity?: number;
    repName?: string;
    prospectName?: string;
    prospectCompany?: string;
    callStage?: string;
  };
  snapTake?: { tldr?: string; analysis?: string };
  scores?: Record<string, number>;
  kilroyFlavorIndex?: { score?: number; tldr?: string; notes?: string };
  modelScores?: Record<string, { score?: number; tldr?: string; analysis?: string; whatWorked?: string[]; whatMissed?: string[]; upgradeMove?: string }>;
  patterns?: Array<{ patternName?: string; severity?: string; tldr?: string; timestamps?: string[]; symptoms?: string[]; whyItMatters?: string; recommendedFixes?: string[]; exampleRewrite?: string }>;
  trustMap?: { tldr?: string; timeline?: Array<{ timestamp?: string; event?: string; trustDelta?: string; analysis?: string }> };
  tacticalRewrites?: { tldr?: string; items?: Array<{ context?: string; whatYouSaid?: string; whyItMissed?: string; strongerAlternative?: string }> };
  nextSteps?: { tldr?: string; actions?: string[] };
  followUpEmail?: { subject?: string; body?: string };
};

// Helper to safely extract score value
function getScoreValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'score' in value) {
    return (value as { score: number }).score;
  }
  return 0;
}

// Helper to safely render text
function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('tldr' in obj) return String(obj.tldr || '');
    if ('text' in obj) return String(obj.text || '');
    if ('value' in obj) return String(obj.value || '');
    return JSON.stringify(value);
  }
  return String(value);
}

// Check if full_report is Pro JSON format
function isProJsonReport(fullReport: Record<string, unknown> | null): fullReport is ProReport {
  if (!fullReport) return false;
  // Pro JSON has meta, snapTake, modelScores, or patterns
  return (
    ('meta' in fullReport && fullReport.meta !== null) ||
    ('snapTake' in fullReport && fullReport.snapTake !== null) ||
    ('modelScores' in fullReport && fullReport.modelScores !== null) ||
    ('patterns' in fullReport && Array.isArray(fullReport.patterns))
  );
}

// Check if full_report contains a nested report object (from API response)
function extractProReport(fullReport: Record<string, unknown> | null): ProReport | null {
  if (!fullReport) return null;

  // Check if it's directly a Pro report
  if (isProJsonReport(fullReport)) {
    return fullReport;
  }

  // Check if it's wrapped in a 'report' property
  if ('report' in fullReport && typeof fullReport.report === 'object' && fullReport.report !== null) {
    const nested = fullReport.report as Record<string, unknown>;
    if (isProJsonReport(nested)) {
      return nested;
    }
  }

  return null;
}

// Extract markdown from various possible locations in full_report
function extractMarkdown(fullReport: Record<string, unknown> | null): string | null {
  if (!fullReport) return null;

  // Check direct markdown property (new format from migration/analyze)
  if (typeof fullReport.markdown === 'string') return fullReport.markdown;

  // Check if full_report itself is a string (raw markdown)
  if (typeof fullReport === 'string') return fullReport;

  // Check for markdown_response property
  if (typeof fullReport.markdown_response === 'string') return fullReport.markdown_response;

  // Check for result.markdown (API response format)
  if (fullReport.result && typeof (fullReport.result as any).markdown === 'string') {
    return (fullReport.result as any).markdown;
  }

  return null;
}

// Component to render Pro JSON report
function ProJsonReportView({ report }: { report: ProReport }) {
  return (
    <div className="space-y-6">
      {/* Score Header */}
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
      {report.snapTake && (
        <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 mb-6">
          <h3 className="font-anton text-[#FFDE59] text-sm tracking-wider mb-2">SNAP TAKE</h3>
          <p className="text-white font-poppins text-lg">{safeText(report.snapTake?.tldr)}</p>
          <p className="text-[#B3B3B3] font-poppins mt-2">{safeText(report.snapTake?.analysis)}</p>
        </div>
      )}

      {/* Scores Grid */}
      {report.scores && Object.keys(report.scores).length > 0 && (
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

      {/* Model Scores (Challenger, SPIN, MEDDIC, etc.) */}
      {report.modelScores && Object.keys(report.modelScores).length > 0 && (
        <div className="border border-[#333] rounded-lg p-4 mb-6">
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
        </div>
      )}

      {/* Patterns */}
      {report.patterns && report.patterns.length > 0 && (
        <div className="border border-[#333] rounded-lg p-4 mb-6">
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
        </div>
      )}

      {/* Tactical Rewrites */}
      {report.tacticalRewrites?.items && report.tacticalRewrites.items.length > 0 && (
        <div className="border border-[#333] rounded-lg p-4 mb-6">
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
        </div>
      )}

      {/* Next Steps */}
      {report.nextSteps?.actions && report.nextSteps.actions.length > 0 && (
        <div className="border border-[#333] rounded-lg p-4 mb-6">
          <ConsoleHeading level={2} variant="yellow" className="mb-4">NEXT STEPS</ConsoleHeading>
          <ul className="space-y-2">
            {report.nextSteps.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[#FFDE59] font-anton">{i + 1}.</span>
                <span className="text-[#B3B3B3]">{safeText(action)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-Up Email */}
      {report.followUpEmail?.subject && (
        <div className="border border-[#333] rounded-lg p-4">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default async function CallReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: report, error } = await supabase
    .from("call_lab_reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<CallReport>();

  if (error || !report) {
    redirect("/dashboard");
  }

  const scores = [
    { label: "Opening", value: report.opening_score },
    { label: "Discovery", value: report.discovery_score },
    { label: "Diagnostic", value: report.diagnostic_score },
    { label: "Value", value: report.value_score },
    { label: "Objection", value: report.objection_score },
    { label: "Commitment", value: report.commitment_score },
    { label: "Human-First", value: report.human_first_score },
  ].filter((s) => s.value != null && typeof s.value === 'number');

  const callDate = report.call_date || report.created_at;
  const prospect = report.buyer_name || report.company_name || "Unknown Prospect";

  // Try to extract Pro JSON report first
  const proJsonReport = extractProReport(report.full_report);
  const markdownContent = !proJsonReport ? extractMarkdown(report.full_report) : null;

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-4 justify-end mb-6">
          <Link
            href="/dashboard"
            className="font-anton text-sm uppercase border border-[#333] text-[#B3B3B3] px-4 py-2 rounded hover:border-[#FFDE59] hover:text-[#FFDE59] transition"
          >
            ← DASHBOARD
          </Link>
          <Link
            href="/call-lab/pro"
            className="font-anton text-sm uppercase bg-[#E51B23] text-white px-4 py-2 rounded hover:bg-[#C41820] transition"
          >
            NEW ANALYSIS
          </Link>
        </div>

        {/* Main Report */}
        <ConsolePanel>
          {/* Pro JSON Report (rich structured format) */}
          {proJsonReport ? (
            <ProJsonReportView report={proJsonReport} />
          ) : markdownContent ? (
            /* Markdown Report */
            <CallLabProReport content={markdownContent} />
          ) : (
            <>
              {/* Fallback to structured data if no JSON or markdown */}
              {/* Quick Metrics */}
              <section className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
                  <div className="text-[#666] text-xs uppercase mb-1">Trust Velocity</div>
                  <div className="font-anton text-2xl text-white">
                    {report.trust_velocity?.toFixed(0) ?? "--"}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
                  <div className="text-[#666] text-xs uppercase mb-1">Agenda Control</div>
                  <div className="font-anton text-2xl text-white">
                    {report.agenda_control?.toFixed(0) ?? "--"}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
                  <div className="text-[#666] text-xs uppercase mb-1">Red Flag Frequency</div>
                  <div className="font-anton text-2xl text-white">
                    {report.pattern_density?.toFixed(0) ?? "--"}
                  </div>
                </div>
              </section>

              {/* Score Breakdown */}
              {scores.length > 0 && (
                <section className="border border-[#E51B23] rounded-lg px-6 py-4 mb-6">
                  <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
                    WTF Method Scores
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {scores.map((score) => (
                      <div key={score.label} className="bg-[#1A1A1A] rounded p-3 text-center">
                        <div className="text-[#666] text-xs uppercase mb-1">{score.label}</div>
                        <div className="font-anton text-xl text-white">
                          {score.value?.toFixed(1)}/10
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Patterns Detected */}
              {report.patterns_detected && report.patterns_detected.length > 0 && (
                <section className="border border-[#E51B23] rounded-lg px-6 py-4 mb-6">
                  <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
                    Patterns Detected
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {report.patterns_detected.map((pattern, i) => (
                      <PatternTag key={i} pattern={pattern} />
                    ))}
                  </div>
                  {report.primary_pattern && (
                    <div className="mt-4 bg-[#1A1A1A] border border-[#333] rounded p-4">
                      <span className="text-[#666] text-xs uppercase">Primary Pattern:</span>
                      <span className="ml-2 text-[#FFDE59] font-medium">{report.primary_pattern}</span>
                    </div>
                  )}
                </section>
              )}

              {/* Key Moments */}
              {report.key_moments && report.key_moments.length > 0 && (
                <section className="border border-[#E51B23] rounded-lg px-6 py-4 mb-6">
                  <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
                    Key Moments
                  </h2>
                  <div className="space-y-3">
                    {report.key_moments.map((moment, i) => (
                      <div key={i} className="bg-[#1A1A1A] border border-[#333] rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {moment.timestamp && (
                            <span className="text-[#E51B23] text-xs font-mono">{moment.timestamp}</span>
                          )}
                          {moment.type && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              moment.type === "positive" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                            }`}>
                              {moment.type}
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm">{moment.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Improvement Highlight */}
              {report.improvement_highlight && (
                <section className="border border-[#FFDE59] rounded-lg px-6 py-4">
                  <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-2">
                    Focus Area
                  </h2>
                  <p className="text-white">{report.improvement_highlight}</p>
                </section>
              )}
            </>
          )}
        </ConsolePanel>
      </div>
    </div>
  );
}
