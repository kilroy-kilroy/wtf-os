import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

function ScoreBar({ score, label, insight, color }: {
  score: number; label: string; insight: string; color: string;
}) {
  const widthPercent = (score / 5) * 100;
  return (
    <div className="mb-4">
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
      <p className="mt-1 text-xs text-slate-400">{insight}</p>
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
      <p className="text-sm text-slate-400 mb-2">{lever.description}</p>
      <p className="text-xs text-slate-500 mb-1"><strong className="text-slate-400">Current:</strong> {lever.currentState}</p>
      <p className="text-xs text-[#00D4FF]"><strong>Fix:</strong> {lever.recommendation}</p>
    </div>
  );
}

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/growthos');

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !assessment) notFound();

  const scores = assessment.scores as any;
  const intake = assessment.intake_data as any;
  const enrichment = assessment.enrichment_data as any;
  const zones = scores?.wtfZones;

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

  const overallColor = scores.overall >= 4 ? '#10B981' : scores.overall >= 2.5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link href="/growthos" className="text-sm text-slate-400 hover:text-slate-200 mb-6 inline-block">
        &larr; Back to GrowthOS
      </Link>

      {/* Header */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">{intake.agencyName}</h1>
        <p className="text-slate-400 mb-6">Business Diagnostic Results</p>

        <div className="inline-flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white"
            style={{ backgroundColor: overallColor + '20', border: `2px solid ${overallColor}40` }}
          >
            <span style={{ color: overallColor }}>{scores.overall.toFixed(1)}</span>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Overall Score</p>
            <p className="text-lg font-bold text-white">{scores.overall >= 4 ? 'Strong' : scores.overall >= 2.5 ? 'Needs Work' : 'Critical'}</p>
            <p className="text-sm text-slate-400">{scores.segmentLabel}</p>
          </div>
        </div>
      </div>

      {/* WTF Zones Heatmap */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-5">WTF Zones Heatmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ScoreBar score={zones.revenueQuality.score} label="Revenue Quality" insight={zones.revenueQuality.insight} color={zones.revenueQuality.color} />
          <ScoreBar score={zones.profitability.score} label="Profitability" insight={zones.profitability.insight} color={zones.profitability.color} />
          <ScoreBar score={zones.growthVsChurn.score} label="Growth vs Churn" insight={zones.growthVsChurn.insight} color={zones.growthVsChurn.color} />
          <ScoreBar score={zones.leadEngine.score} label="Lead Engine" insight={zones.leadEngine.insight} color={zones.leadEngine.color} />
          <ScoreBar score={zones.founderLoad.score} label="Founder Load" insight={zones.founderLoad.insight} color={zones.founderLoad.color} />
          <ScoreBar score={zones.systemsReadiness.score} label="Systems Readiness" insight={zones.systemsReadiness.insight} color={zones.systemsReadiness.color} />
          <ScoreBar score={zones.contentPositioning.score} label="Content & Positioning" insight={zones.contentPositioning.insight} color={zones.contentPositioning.color} />
          <ScoreBar score={zones.teamVisibility.score} label="Team Visibility" insight={zones.teamVisibility.insight} color={zones.teamVisibility.color} />
        </div>
      </div>

      {/* Growth Levers */}
      {scores.growthLevers && scores.growthLevers.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5">Growth Levers</h2>
          <div className="space-y-4">
            {scores.growthLevers.map((lever: any, i: number) => (
              <GrowthLeverCard key={i} lever={lever} />
            ))}
          </div>
        </div>
      )}

      {/* Founder OS */}
      {scores.founderOS && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5">Founder Operating System</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.delegationScore.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Delegation Score</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.onVsInRatio}%</p>
              <p className="text-xs text-slate-500">ON vs IN Ratio</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${
                scores.founderOS.burnoutRisk === 'critical' ? 'text-red-400' :
                scores.founderOS.burnoutRisk === 'high' ? 'text-amber-400' : 'text-[#00D4FF]'
              }`}>
                {scores.founderOS.burnoutRisk}
              </p>
              <p className="text-xs text-slate-500">Burnout Risk</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{scores.founderOS.bottleneckAreas.length}</p>
              <p className="text-xs text-slate-500">Bottleneck Areas</p>
            </div>
          </div>
          {scores.founderOS.bottleneckAreas.length > 0 && (
            <p className="text-sm text-slate-400">
              <strong className="text-white">Bottlenecks:</strong> {scores.founderOS.bottleneckAreas.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Impossibilities */}
      {scores.impossibilities && scores.impossibilities.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-red-400 mb-4">Reality Checks</h2>
          <ul className="space-y-3">
            {scores.impossibilities.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-red-300">
                <span className="text-red-500 mt-0.5 font-bold">!</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LLM Awareness */}
      {enrichment?.llmAwareness?.summary && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">AI Awareness Check</h2>
          <p className="text-sm text-slate-400 mb-4">
            We asked Claude, ChatGPT, and Perplexity who the best agencies are for your ICP.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {['claude', 'chatgpt', 'perplexity'].map(provider => {
              const check = enrichment.llmAwareness[provider];
              if (!check?.available) return (
                <div key={provider} className="bg-slate-700/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 capitalize mb-1">{provider}</p>
                  <p className="text-sm text-slate-600">Not checked</p>
                </div>
              );
              return (
                <div key={provider} className="bg-slate-700/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 capitalize mb-1">{provider}</p>
                  <p className={`text-sm font-bold ${check.agencyMentioned ? 'text-[#00D4FF]' : 'text-red-400'}`}>
                    {check.agencyMentioned ? 'Found' : 'Not Found'}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Awareness score: {enrichment.llmAwareness.summary.score}% — Agency mentioned in {enrichment.llmAwareness.summary.agencyMentionedIn}/{enrichment.llmAwareness.summary.totalChecked} LLMs
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-8">
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
