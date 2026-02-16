import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { FollowUpQuestionsSection, LTVSection } from './FollowUpSection';

function ScoreBar({ score, label, narrative, color }: {
  score: number; label: string; narrative: string; color: string;
}) {
  const widthPercent = (score / 5) * 100;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}/5</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${widthPercent}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-300">{narrative}</p>
    </div>
  );
}

function GrowthLeverCard({ lever }: { lever: any }) {
  const impactColor = lever.impact === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30'
    : lever.impact === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  return (
    <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-white">{lever.name}</h4>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${impactColor}`}>
          {lever.impact} impact
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-3">{lever.description}</p>
      <p className="text-xs text-slate-500 mb-1"><strong className="text-slate-400">Current:</strong> {lever.currentState}</p>
      <p className="text-xs text-[#00D4FF]"><strong>Fix:</strong> {lever.recommendation}</p>
    </div>
  );
}

function AnalysisSection({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
  const scoreColor = score >= 8 ? '#00D4FF' : score >= 5 ? '#f59e0b' : '#E31B23';
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <span className="text-sm font-bold" style={{ color: scoreColor }}>{score}/10</span>
      </div>
      {children}
    </div>
  );
}

function GapsList({ gaps }: { gaps: string[] }) {
  if (!gaps?.length) return null;
  return (
    <div className="mb-3">
      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Gaps</p>
      <ul className="space-y-1">{gaps.map((g: string, i: number) => <li key={i} className="text-sm text-slate-400">&bull; {g}</li>)}</ul>
    </div>
  );
}

function RecommendationsList({ recs }: { recs: string[] }) {
  if (!recs?.length) return null;
  return (
    <div>
      <p className="text-xs text-[#00D4FF] font-bold uppercase mb-1">Recommendations</p>
      <ul className="space-y-1">{recs.map((r: string, i: number) => <li key={i} className="text-sm text-slate-300">&bull; {r}</li>)}</ul>
    </div>
  );
}

function fmtCurrency(amount: number): string {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + Math.round(amount);
}

// ============================================
// MARKDOWN RENDERER for Claude diagnoses
// ============================================

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm">
            {tableHeaders.length > 0 && (
              <thead>
                <tr className="border-b border-slate-600/50">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="text-left text-slate-500 px-3 py-2 font-medium">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-700/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-300">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  }

  function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1);
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (cells.every(c => /^[\s\-:]+$/.test(c))) {
        continue; // separator row
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-bold text-[#00D4FF] uppercase tracking-wide mt-5 mb-2">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-white mt-5 mb-2">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>);
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-slate-700/50 my-4" />);
    } else if (/^[\-\*]\s/.test(line.trim())) {
      elements.push(<p key={i} className="text-sm text-slate-300 ml-4 mb-1">&bull; {renderInline(line.trim().slice(2))}</p>);
    } else if (/^\d+\.\s/.test(line.trim())) {
      const num = line.trim().match(/^(\d+)\.\s/)?.[1];
      const text = line.trim().replace(/^\d+\.\s/, '');
      elements.push(
        <p key={i} className="text-sm text-slate-300 ml-4 mb-1">
          <span className="text-[#00D4FF] font-bold mr-1">{num}.</span>
          {renderInline(text)}
        </p>
      );
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(<p key={i} className="text-sm text-slate-300 mb-2">{renderInline(line)}</p>);
    }
  }

  if (inTable) flushTable();

  return <div className="space-y-0.5">{elements}</div>;
}

function DiagnosisSection({ title, content, color = '#E31B23' }: {
  title: string; content: string; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

// ============================================
// MAIN RESULTS PAGE
// ============================================

export default async function ResultsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>
}) {
  const { id } = await params;
  const { admin } = await searchParams;

  let assessment: any = null;
  let isAdmin = false;

  // Admin bypass: validate cookie against env var
  if (admin === '1') {
    const cookieStore = await cookies();
    const adminKey = cookieStore.get('admin_api_key')?.value;
    if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
      const adminSupabase = getSupabaseServerClient();
      const { data, error } = await adminSupabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        assessment = data;
        isAdmin = true;
      }
    }
  }

  // Normal user flow (only if admin bypass didn't succeed)
  if (!assessment) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) redirect('/growthos');

    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) notFound();
    assessment = data;
  }

  const scores = assessment.scores as any;
  const intake = assessment.intake_data as any;
  const enrichment = assessment.enrichment_data as any;
  const zones = scores?.wtfZones;
  const narratives = scores?.narratives || {};
  const analysis = enrichment?.analysis;
  const diagnoses = scores?.diagnoses;
  const revelations = scores?.revelations;

  if (!scores || !zones) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Assessment Processing</h1>
        <p className="text-slate-400">Your assessment is still being processed. Check back shortly.</p>
        <Link href="/growthos" className="inline-block mt-6 text-[#00D4FF] hover:text-[#00D4FF]/80 font-medium">
          &larr; Back to GrowthOS
        </Link>
      </div>
    );
  }

  const overallColor = scores.overall >= 4 ? '#22c55e' : scores.overall >= 2.5 ? '#f59e0b' : '#E31B23';

  // Determine whether we have Claude diagnoses or need to fall back to calculated revelations
  const hasDiagnoses = !!(diagnoses?.founderTax || diagnoses?.pipeline || diagnoses?.authority || diagnoses?.positioning || diagnoses?.trajectory);

  // Diagnosis CTA (from Claude) or fallback to revelations CTA
  const ctaData = diagnoses?.cta || revelations?.cta;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link href="/growthos" className="text-sm text-slate-400 hover:text-slate-200 mb-6 inline-block">
        &larr; Back to GrowthOS
      </Link>

      {/* ===== 1. HEADER ===== */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">{intake.agencyName}</h1>
        <p className="text-slate-400 mb-6">Business Diagnostic Results</p>

        <div className="inline-flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold"
            style={{ backgroundColor: overallColor + '20', border: `2px solid ${overallColor}40` }}
          >
            <span style={{ color: overallColor }}>{scores.overall.toFixed(1)}</span>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Overall Score</p>
            <p className="text-lg font-bold text-white">{scores.overallLabel || (scores.overall >= 4 ? 'Strong Foundation' : scores.overall >= 2.5 ? 'Needs Work' : 'Critical Issues')}</p>
            <p className="text-sm text-slate-400">{scores.segmentLabel}</p>
          </div>
        </div>
      </div>

      {/* ===== 2. WTF ZONES HEATMAP ===== */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-5">WTF Zones Heatmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ScoreBar score={zones.revenueQuality.score} label="Revenue Quality" narrative={narratives.revenueQuality || zones.revenueQuality.insight} color={zones.revenueQuality.color} />
          <ScoreBar score={zones.profitability.score} label="Profitability" narrative={narratives.profitability || zones.profitability.insight} color={zones.profitability.color} />
          <ScoreBar score={zones.growthVsChurn.score} label="Growth vs Churn" narrative={narratives.growthVsChurn || zones.growthVsChurn.insight} color={zones.growthVsChurn.color} />
          <ScoreBar score={zones.leadEngine.score} label="Lead Engine" narrative={narratives.leadEngine || zones.leadEngine.insight} color={zones.leadEngine.color} />
          <ScoreBar score={zones.founderLoad.score} label="Founder Load" narrative={narratives.founderLoad || zones.founderLoad.insight} color={zones.founderLoad.color} />
          <ScoreBar score={zones.systemsReadiness.score} label="Systems Readiness" narrative={narratives.systemsReadiness || zones.systemsReadiness.insight} color={zones.systemsReadiness.color} />
          <ScoreBar score={zones.contentPositioning.score} label="Content & Positioning" narrative={narratives.contentPositioning || zones.contentPositioning.insight} color={zones.contentPositioning.color} />
          <ScoreBar score={zones.teamVisibility.score} label="Team Visibility" narrative={narratives.teamVisibility || zones.teamVisibility.insight} color={zones.teamVisibility.color} />
        </div>
      </div>

      {/* ===== 3-6. ENRICHMENT ANALYSIS SECTIONS ===== */}
      {analysis?.positioningCoherence && (() => {
        const pos = analysis.positioningCoherence;
        const alignColor = pos.alignment === 'aligned' ? 'text-[#00D4FF]' : pos.alignment === 'partial' ? 'text-amber-400' : 'text-[#E31B23]';
        return (
          <AnalysisSection title="Positioning Coherence" score={pos.score}>
            <p className="text-sm text-slate-300 mb-4">{pos.verdict}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 font-bold uppercase">What Your Website Says</p>
                <p className="text-sm text-slate-300">{pos.websiteMessage}</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 font-bold uppercase">What Your LinkedIn Says</p>
                <p className="text-sm text-slate-300">{pos.linkedinMessage}</p>
              </div>
            </div>
            <p className="text-sm mb-4">Alignment: <span className={`font-bold capitalize ${alignColor}`}>{pos.alignment}</span></p>
            <GapsList gaps={pos.gaps} />
            <RecommendationsList recs={pos.recommendations} />
          </AnalysisSection>
        );
      })()}

      {analysis?.contentMarketFit && (() => {
        const cmf = analysis.contentMarketFit;
        return (
          <AnalysisSection title="Content-Market Fit" score={cmf.score}>
            <p className="text-sm text-slate-300 mb-4">{cmf.verdict}</p>
            {cmf.topicsVsIcpProblems && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Your Content Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cmf.topicsVsIcpProblems.topContentTopics?.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] text-xs">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase">What Your ICP Cares About</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cmf.topicsVsIcpProblems.topIcpProblems?.map((p: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {cmf.topicsVsIcpProblems?.overlap !== undefined && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-bold">Content-Problem Overlap</span>
                  <span className="text-xs font-bold text-[#00D4FF]">{cmf.topicsVsIcpProblems.overlap}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D4FF] rounded-full" style={{ width: `${cmf.topicsVsIcpProblems.overlap}%` }} />
                </div>
              </div>
            )}
            <GapsList gaps={cmf.gaps} />
            <RecommendationsList recs={cmf.recommendations} />
          </AnalysisSection>
        );
      })()}

      {analysis?.socialProofAlignment && (() => {
        const sp = analysis.socialProofAlignment;
        return (
          <AnalysisSection title="Social Proof Alignment" score={sp.score}>
            <p className="text-sm text-slate-300 mb-4">{sp.verdict}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Case Studies</p>
                <p className="text-sm text-slate-300">{sp.caseStudyRelevance}</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Testimonials</p>
                <p className="text-sm text-slate-300">{sp.testimonialStrength}</p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Client Logos</p>
                <p className="text-sm text-slate-300">{sp.logoSignalStrength}</p>
              </div>
            </div>
            <GapsList gaps={sp.gaps} />
            <RecommendationsList recs={sp.recommendations} />
          </AnalysisSection>
        );
      })()}

      {analysis?.icpProblemAwareness && (() => {
        const ipa = analysis.icpProblemAwareness;
        return (
          <AnalysisSection title="ICP Problem Awareness" score={ipa.score}>
            <p className="text-sm text-slate-300 mb-4">{ipa.verdict}</p>
            {ipa.problemCoverage?.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Problem</th>
                      <th className="text-center py-2 text-xs text-slate-500 font-bold uppercase w-28">Addressed?</th>
                      <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipa.problemCoverage.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-300">{row.problem}</td>
                        <td className="py-2 text-center">
                          <span className={row.addressed ? 'text-[#00D4FF]' : 'text-[#E31B23]'}>
                            {row.addressed ? '\u2713' : '\u2717'}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400 text-xs">{row.where}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {ipa.coveragePercent !== undefined && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-bold">Problem Coverage</span>
                  <span className="text-xs font-bold text-[#00D4FF]">{ipa.coveragePercent}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D4FF] rounded-full" style={{ width: `${ipa.coveragePercent}%` }} />
                </div>
              </div>
            )}
            {ipa.missingProblems?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#E31B23] font-bold uppercase mb-1">Problems You&apos;re Not Addressing</p>
                <ul className="space-y-1">{ipa.missingProblems.map((p: string, i: number) => <li key={i} className="text-sm text-slate-400">&bull; {p}</li>)}</ul>
              </div>
            )}
            {ipa.contentOpportunities?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#00D4FF] font-bold uppercase mb-1">Content Opportunities</p>
                <ul className="space-y-1">{ipa.contentOpportunities.map((c: string, i: number) => <li key={i} className="text-sm text-slate-300">&bull; {c}</li>)}</ul>
              </div>
            )}
            <RecommendationsList recs={ipa.recommendations} />
          </AnalysisSection>
        );
      })()}

      {/* ===== 7. AI DISCOVERABILITY ===== */}
      {enrichment?.llmAwareness?.summary && (() => {
        const llm = enrichment.llmAwareness;
        const aiScore = llm.summary.score;
        return (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">AI Discoverability</h2>
              <span className={`text-sm font-bold ${aiScore >= 50 ? 'text-[#00D4FF]' : 'text-[#E31B23]'}`}>{aiScore}%</span>
            </div>
            {aiScore === 0 ? (
              <div className="mb-4">
                <p className="text-sm text-[#E31B23] font-medium mb-2">You don&apos;t exist to AI.</p>
                <p className="text-sm text-slate-400">We asked Claude, ChatGPT, and Perplexity the kinds of questions your ICP would actually type &mdash; real problems, real revenue numbers, asking for specific help. You weren&apos;t mentioned. Not once.</p>
              </div>
            ) : aiScore < 50 ? (
              <p className="text-sm text-slate-400 mb-4">
                We ran 3 queries across Claude, ChatGPT, and Perplexity. You appeared in {llm.summary.agencyMentionedIn} of {llm.summary.totalChecked} LLMs. AI is becoming how buyers discover agencies. If you&apos;re not in the training data, you&apos;re invisible to a growing chunk of your market.
              </p>
            ) : (
              <p className="text-sm text-slate-400 mb-4">
                The robots know who you are. You showed up in {llm.summary.agencyMentionedIn} of {llm.summary.totalChecked} LLMs when we asked about agencies for your ICP. That&apos;s a competitive moat. Protect it.
              </p>
            )}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(['claude', 'chatgpt', 'perplexity'] as const).map(provider => {
                const check = llm[provider];
                return (
                  <div key={provider} className="bg-slate-700/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 capitalize mb-1">{provider}</p>
                    {!check?.available ? (
                      <p className="text-sm text-slate-600">Not checked</p>
                    ) : (
                      <>
                        <p className={`text-lg font-bold ${check.agencyMentioned ? 'text-[#00D4FF]' : 'text-[#E31B23]'}`}>
                          {check.agencyMentioned ? '\u2713 Found' : '\u2717 Not Found'}
                        </p>
                        {check.founderMentioned && <p className="text-xs text-slate-500 mt-1">Founder mentioned</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold">AI Awareness Score</span>
              <span className="text-xs font-bold text-[#00D4FF]">{aiScore}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full" style={{ width: `${aiScore}%`, backgroundColor: aiScore >= 50 ? '#00D4FF' : '#E31B23' }} />
            </div>
            {llm.summary.topCompetitors?.length > 0 && aiScore > 0 && (
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Competitors LLMs Recommend Instead</p>
                <div className="flex flex-wrap gap-2">
                  {llm.summary.topCompetitors.map((name: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">{name}</span>
                  ))}
                </div>
              </div>
            )}
            {aiScore === 0 && (
              <div className="mt-4 bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-bold uppercase mb-2">What Buyers Are Asking AI Right Now</p>
                {llm.summary.queriesUsed?.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {llm.summary.queriesUsed.map((q: string, i: number) => (
                      <p key={i} className="text-sm text-white bg-slate-600/30 rounded-lg px-3 py-2 italic">&ldquo;{q}&rdquo;</p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-slate-400 mb-2">We asked Claude, ChatGPT, and Perplexity these exact questions. You weren&apos;t mentioned. Not once.</p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li>&bull; AI is increasingly how people research purchases</li>
                  <li>&bull; Your competitors ARE showing up</li>
                  <li>&bull; This gap will widen, not shrink</li>
                </ul>
                <p className="text-sm text-[#00D4FF] mt-3 font-medium">The fix: become the answer. Your ICP is asking questions like {llm.summary.queriesUsed?.[0] ? `"${llm.summary.queriesUsed[0]}"` : 'these'} right now. You need content that answers those exact questions &mdash; not thought leadership, not brand awareness. Specific, tactical answers to specific problems. That&apos;s how you get cited.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== 8. REALITY CHECKS ===== */}
      {((scores.realityChecks?.length > 0) || (scores.impossibilities?.length > 0)) && (
        <div className="space-y-4 mb-6">
          {scores.realityChecks?.filter((c: any) => c.type === 'celebration').length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-emerald-400 mb-5">What You&apos;re Doing Right</h2>
              <div className="space-y-6">
                {scores.realityChecks.filter((c: any) => c.type === 'celebration').map((check: any, i: number) => (
                  <div key={check.id || i}>
                    <h3 className="text-sm font-bold text-emerald-400 mb-2">{check.title}</h3>
                    {check.body.split('\n').map((line: string, j: number) => {
                      if (!line.trim()) return null;
                      return <p key={j} className="text-sm text-slate-300 mb-1">{line}</p>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-[#E31B23]/5 border border-[#E31B23]/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#E31B23] mb-5">Reality Checks</h2>
          <div className="space-y-6">
            {scores.realityChecks?.filter((c: any) => c.type !== 'celebration').map((check: any, i: number) => (
              <div key={check.id || i}>
                <h3 className="text-sm font-bold text-[#E31B23] mb-2">{check.title}</h3>
                {check.body.split('\n').map((line: string, j: number) => {
                  if (!line.trim()) return null;
                  if (line.startsWith('\u2022')) return <p key={j} className="text-sm text-slate-400 ml-4">{line}</p>;
                  if (/^\d+\./.test(line)) return <p key={j} className="text-sm text-slate-300 ml-4">{line}</p>;
                  return <p key={j} className="text-sm text-slate-300 mb-1">{line}</p>;
                })}
              </div>
            ))}
            {(!scores.realityChecks || scores.realityChecks.filter((c: any) => c.type !== 'celebration').length === 0) && scores.impossibilities?.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[#E31B23] mt-0.5 font-bold text-lg">!</span>
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* ===== UNIT ECONOMICS (LTV) ===== */}
      {scores.ltvMetrics && (
        <LTVSection ltv={scores.ltvMetrics} />
      )}

      {/* ===== FOLLOW-UP QUESTIONS / DEEP DIVE ===== */}
      {(scores.followUpQuestions?.length > 0 || scores.followUpInsights?.length > 0) && (
        <FollowUpQuestionsSection
          questions={scores.followUpQuestions || []}
          assessmentId={id}
          existingInsights={scores.followUpInsights}
        />
      )}

      {/* ===== REVELATIONS: Claude Diagnoses (primary) or Calculated Fallback ===== */}
      {hasDiagnoses ? (
        <>
          {diagnoses.founderTax && (
            <DiagnosisSection title="The Founder Tax" content={diagnoses.founderTax} color="#E31B23" />
          )}
          {diagnoses.pipeline && (
            <DiagnosisSection title="The Pipeline Probability" content={diagnoses.pipeline} color="#f59e0b" />
          )}
          {diagnoses.authority && (
            <DiagnosisSection title="The Authority Gap" content={diagnoses.authority} color="#E31B23" />
          )}
          {diagnoses.positioning && (
            <DiagnosisSection title="The Positioning Collision" content={diagnoses.positioning} color="#f59e0b" />
          )}
          {diagnoses.trajectory && (
            <DiagnosisSection title="The Trajectory Fork" content={diagnoses.trajectory} color="#00D4FF" />
          )}
        </>
      ) : (
        <>
          {/* Fallback: show calculated revelation data if no Claude diagnoses */}
          {revelations?.founderTax?.canRender && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1.5 h-8 rounded-full bg-[#E31B23]" />
                <h2 className="text-lg font-bold text-white">The Founder Tax</h2>
              </div>
              <p className="text-3xl font-extrabold text-[#E31B23] text-center mb-4">{fmtCurrency(revelations.founderTax.totalFounderTax)}/yr</p>
              <p className="text-sm text-slate-300 mb-2">
                Implied hourly rate: <strong className="text-white">{fmtCurrency(revelations.founderTax.founderHourlyEquivalent)}/hr</strong>.
                Operational hours: <strong className="text-white">{revelations.founderTax.totalOperationalHours}h/week</strong>.
                Biggest bottleneck: <strong className="text-white">{revelations.founderTax.biggestBottleneck}</strong>.
              </p>
            </div>
          )}
          {revelations?.trajectoryFork?.canRender && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1.5 h-8 rounded-full bg-[#00D4FF]" />
                <h2 className="text-lg font-bold text-white">The Trajectory Fork</h2>
              </div>
              <p className="text-lg font-bold text-center" style={{ color: '#00D4FF' }}>
                {fmtCurrency(revelations.trajectoryFork.gap.valuationDifference)} gap in enterprise value over 3 years.
              </p>
            </div>
          )}
        </>
      )}

      {/* Diagnosis CTA — only show standalone if NOT showing Next Steps below */}

      {/* ===== GROWTH LEVERS ===== */}
      {scores.growthLevers?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5">Growth Levers</h2>
          <div className="space-y-4">
            {scores.growthLevers.map((lever: any, i: number) => (
              <GrowthLeverCard key={i} lever={lever} />
            ))}
          </div>
        </div>
      )}

      {/* ===== FOUNDER OPERATING SYSTEM ===== */}
      {scores.founderOS && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5">Founder Operating System</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.delegationScore.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Delegation</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.onVsInRatio}%</p>
              <p className="text-xs text-slate-500">ON vs IN</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold capitalize ${
                scores.founderOS.burnoutRisk === 'critical' ? 'text-[#E31B23]' :
                scores.founderOS.burnoutRisk === 'high' ? 'text-amber-400' :
                scores.founderOS.burnoutRisk === 'moderate' ? 'text-amber-400' : 'text-[#00D4FF]'
              }`}>
                {scores.founderOS.burnoutRisk}
              </p>
              <p className="text-xs text-slate-500">Burnout Risk</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.bottleneckAreas.length}</p>
              <p className="text-xs text-slate-500">Bottlenecks</p>
            </div>
          </div>
          {scores.founderOS.delegationNarrative && (
            <p className="text-sm text-slate-300 mb-2">{scores.founderOS.delegationNarrative}</p>
          )}
          {scores.founderOS.onVsInNarrative && (
            <p className="text-sm text-slate-400 mb-2">{scores.founderOS.onVsInNarrative}</p>
          )}
          {scores.founderOS.bottleneckAreas.length > 0 && (
            <p className="text-sm text-slate-400 mt-2">
              <strong className="text-white">Bottlenecks:</strong> {scores.founderOS.bottleneckAreas.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ===== PRIORITY ACTIONS ===== */}
      {scores.priorityActions?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5">Priority Actions</h2>
          <p className="text-sm text-slate-400 mb-4">Based on everything above, here&apos;s what matters in order:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase w-16">#</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Action</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Why</th>
                </tr>
              </thead>
              <tbody>
                {scores.priorityActions.map((action: any) => (
                  <tr key={action.priority} className="border-b border-slate-700/50">
                    <td className="py-3 text-[#00D4FF] font-bold">{action.priority}</td>
                    <td className="py-3 text-white font-medium">{action.action}</td>
                    <td className="py-3 text-slate-400">{action.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== NEXT STEPS CTA ===== */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6">
        {ctaData?.headline && (
          <p className="text-lg font-bold text-[#E31B23] mb-6 text-center">{ctaData.headline}</p>
        )}
        <h2 className="text-xl font-bold text-white mb-6 text-center">Next Steps</h2>

        <div className="bg-slate-700/30 rounded-xl p-6 mb-4 border border-[#00D4FF]/20">
          <h3 className="text-lg font-bold text-white mb-2">45-Minute Roadmap Consultation</h3>
          <p className="text-sm text-slate-400 mb-3">Let&apos;s fix this together. In 45 minutes, we&apos;ll:</p>
          <ul className="text-sm text-slate-300 space-y-1 mb-4">
            <li>&bull; Prioritize your positioning fix</li>
            <li>&bull; Map your founder escape route</li>
            <li>&bull; Build your 90-day action plan</li>
          </ul>
          <a
            href="https://zcal.co/timkilroy/growthos"
            className="inline-block px-6 py-3 rounded-xl bg-[#E31B23] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#E31B23]/25 transition-all"
          >
            Book Your Roadmap Call &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="[COACHING_URL]"
            className="bg-slate-700/30 rounded-xl p-5 border border-slate-700/50 hover:border-[#00D4FF]/30 transition-all block"
          >
            <h4 className="font-bold text-white mb-1">Coaching &amp; Consulting</h4>
            <p className="text-xs text-slate-400">Explore our programs &rarr;</p>
          </a>
          <a
            href="https://www.skool.com/agency-inner-circle"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-700/30 rounded-xl p-5 border border-slate-700/50 hover:border-[#00D4FF]/30 transition-all block"
          >
            <h4 className="font-bold text-white mb-1">The Agency Inner Circle</h4>
            <p className="text-xs text-slate-400">Free Slack community for agency owners who are tired of the bullshit. Join free &rarr;</p>
          </a>
        </div>
      </div>

      {/* ===== FOOTER ACTIONS ===== */}
      <div className="flex gap-4 mt-4 mb-12">
        <Link
          href="/growthos/assessment"
          className="flex-1 text-center py-3 rounded-xl bg-[#E31B23] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#E31B23]/25 transition-all"
        >
          Retake Assessment
        </Link>
        <Link
          href="/growthos"
          className="flex-1 text-center py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-600 transition-all"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
