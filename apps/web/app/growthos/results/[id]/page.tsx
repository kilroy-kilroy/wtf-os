import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

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
      <ul className="space-y-1">{gaps.map((g: string, i: number) => <li key={i} className="text-sm text-slate-400">• {g}</li>)}</ul>
    </div>
  );
}

function RecommendationsList({ recs }: { recs: string[] }) {
  if (!recs?.length) return null;
  return (
    <div>
      <p className="text-xs text-[#00D4FF] font-bold uppercase mb-1">Recommendations</p>
      <ul className="space-y-1">{recs.map((r: string, i: number) => <li key={i} className="text-sm text-slate-300">• {r}</li>)}</ul>
    </div>
  );
}

function RevelationSection({ title, children, color = '#E31B23' }: {
  title: string; children: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function BigNumber({ value, label, color = '#00D4FF' }: { value: string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function fmtCurrency(amount: number): string {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + Math.round(amount);
}

function FounderTaxSection({ data }: { data: any }) {
  if (!data?.canRender) return null;
  const taxLevel = data.totalFounderTax > 300000 ? 'high' : data.totalFounderTax > 100000 ? 'medium' : 'low';
  const headlineColor = taxLevel === 'high' ? '#E31B23' : taxLevel === 'medium' ? '#f59e0b' : '#22c55e';
  return (
    <RevelationSection title="The Founder Tax" color={headlineColor}>
      <BigNumber value={fmtCurrency(data.totalFounderTax) + '/yr'} label="Annual Founder Tax" color={headlineColor} />
      <div className="mt-6 space-y-3">
        <p className="text-sm text-slate-300">
          You&apos;re billing at an implied rate of <strong className="text-white">{fmtCurrency(data.founderHourlyEquivalent)}/hr</strong>.
          You spend <strong className="text-white">{data.totalOperationalHours} hrs/week</strong> on operational work.
        </p>
        <div className="bg-slate-700/30 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-600/50">
              <th className="text-left text-slate-500 px-4 py-2 font-medium">Component</th>
              <th className="text-right text-slate-500 px-4 py-2 font-medium">Cost</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-slate-700/50"><td className="px-4 py-2 text-slate-300">Labor arbitrage (overpaying yourself)</td><td className="px-4 py-2 text-right text-white">{fmtCurrency(data.laborArbitrage)}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="px-4 py-2 text-slate-300">Strategic opportunity cost</td><td className="px-4 py-2 text-right text-white">{fmtCurrency(data.strategicOpportunityCost)}</td></tr>
              <tr className="font-bold"><td className="px-4 py-2 text-white">Total</td><td className="px-4 py-2 text-right" style={{ color: headlineColor }}>{fmtCurrency(data.totalFounderTax)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Object.entries(data.breakdown).map(([area, info]: [string, any]) => (
            <div key={area} className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{info.hours}h</p>
              <p className="text-[10px] text-slate-500 capitalize">{area.replace('accountMgmt', 'Acct Mgmt')}</p>
              <p className="text-[10px] text-slate-600">Rating: {info.rating}/5</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#00D4FF] mt-4">
          <strong>The Fix:</strong> Your lowest delegation score is {data.biggestBottleneck}. That&apos;s your first hire.
        </p>
      </div>
    </RevelationSection>
  );
}

function PipelineProbabilitySection({ data }: { data: any }) {
  if (!data?.canRender) return null;
  const statusColor = data.referralDependencyStatus === 'critical' ? '#E31B23'
    : data.referralDependencyStatus === 'high' ? '#f59e0b'
    : data.referralDependencyStatus === 'moderate' ? '#f59e0b' : '#22c55e';
  return (
    <RevelationSection title="The Pipeline Probability" color={statusColor}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <BigNumber value={`${data.referralPercent}%`} label="Referral Dependency" color={statusColor} />
        <BigNumber value={`${data.probabilityOfMajorDisruption}%`} label="3-Year Disruption Risk" color="#f59e0b" />
        <BigNumber value={fmtCurrency(data.revenueAtRiskIn3Years)} label="Revenue at Risk" color="#E31B23" />
      </div>
      <div className="space-y-3">
        <div className="bg-slate-700/30 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Net Client Growth</p>
              <p className={`font-bold ${data.isGrowing ? 'text-emerald-400' : data.isShrinking ? 'text-red-400' : 'text-slate-400'}`}>
                {data.netClientGrowth > 0 ? '+' : ''}{data.netClientGrowth}/year
              </p>
            </div>
            <div>
              <p className="text-slate-500">Referral Network Ceiling</p>
              <p className="font-bold text-white">{data.referralNetworkCeiling} clients</p>
            </div>
            <div>
              <p className="text-slate-500">Active Channels (10%+)</p>
              <p className={`font-bold ${data.activeChannels >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>{data.activeChannels}</p>
            </div>
            {data.monthsToReferralCeiling && (
              <div>
                <p className="text-slate-500">Months to Ceiling</p>
                <p className="font-bold text-amber-400">{data.monthsToReferralCeiling}</p>
              </div>
            )}
          </div>
        </div>
        {data.referralDependencyStatus === 'critical' && (
          <p className="text-sm text-red-300">This isn&apos;t fear-mongering. It&apos;s actuarial math. One retirement dinner away from crisis.</p>
        )}
        <p className="text-sm text-[#00D4FF]"><strong>The Fix:</strong> Build ONE channel you control. Content or outbound. Start this month.</p>
      </div>
    </RevelationSection>
  );
}

function AuthorityGapSection({ data }: { data: any }) {
  if (!data?.canRender) return null;
  const scoreColor = data.overallAuthorityScore >= 60 ? '#22c55e' : data.overallAuthorityScore >= 30 ? '#f59e0b' : '#E31B23';
  return (
    <RevelationSection title="The Authority Gap" color={scoreColor}>
      <BigNumber value={`${data.overallAuthorityScore}/100`} label="Overall Authority Score" color={scoreColor} />
      <div className="grid grid-cols-3 gap-4 mt-6 mb-4">
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{data.contentVolumeScore}</p>
          <p className="text-[10px] text-slate-500">Content Volume</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{data.proofScore}</p>
          <p className="text-[10px] text-slate-500">Proof Points</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{data.aiDiscoverabilityScore}%</p>
          <p className="text-[10px] text-slate-500">AI Discoverability</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {['claude', 'chatgpt', 'perplexity'].map(platform => (
          <div key={platform} className="bg-slate-700/30 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 capitalize mb-1">{platform}</p>
            <p className={`text-sm font-bold ${data.aiResults[platform]?.found ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.aiResults[platform]?.found ? 'Found' : 'Not Found'}
            </p>
          </div>
        ))}
      </div>
      {data.invisibleToBuyersCount > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-300">
            <strong>{data.invisibleToBuyersCount * 12} invisible prospects per year.</strong>{' '}
            {data.invisibleToBuyersCount} potential buyers/month who never see you in AI search results.
          </p>
        </div>
      )}
      {data.problemCoverage && (
        <div className="text-sm text-slate-300 mb-3">
          ICP Problem Coverage: <strong className="text-white">{data.problemCoverage.percentage}%</strong> ({data.problemCoverage.covered}/{data.problemCoverage.total})
          {data.problemCoverage.gaps.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">Gaps: {data.problemCoverage.gaps.slice(0, 3).join(', ')}</p>
          )}
        </div>
      )}
      {data.competitorsRecommendedInstead?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Who&apos;s surfacing instead:</p>
          <div className="flex flex-wrap gap-2">
            {data.competitorsRecommendedInstead.map((name: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">{name}</span>
            ))}
          </div>
        </div>
      )}
    </RevelationSection>
  );
}

function PositioningCollisionSection({ data }: { data: any }) {
  if (!data?.canRender) return null;
  const severity = data.collisionScore > 60 ? 'severe' : data.collisionScore > 30 ? 'moderate' : 'aligned';
  const color = severity === 'severe' ? '#E31B23' : severity === 'moderate' ? '#f59e0b' : '#22c55e';
  return (
    <RevelationSection title="The Positioning Collision" color={color}>
      <BigNumber value={`${data.collisionScore}%`} label="Collision Score (higher = more misalignment)" color={color} />
      <div className="mt-6 grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">What You Claim</p>
          <p className="text-sm text-white mb-1">{data.stated.icp}</p>
          <p className="text-xs text-slate-400">{data.stated.offer}</p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">What Your Website Proves</p>
          <p className="text-sm text-white mb-1">{data.proof.websiteHeadline}</p>
          <p className="text-xs text-slate-400">
            {data.caseStudyAnalysis ? `${data.caseStudyAnalysis.length} case studies found` : 'No case studies detected'}
          </p>
        </div>
      </div>
      <div className="bg-slate-700/20 border-l-2 rounded-r-lg px-4 py-3 mb-4" style={{ borderColor: color }}>
        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{data.prospectNarrative.headline}</p>
        <p className="text-sm text-slate-300 italic">&quot;{data.prospectNarrative.story}&quot;</p>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-slate-500">Time on site: <strong className="text-slate-300">{data.prospectNarrative.timeOnSite}</strong></span>
          <span className="text-slate-500">Verdict: <strong style={{ color }}>{data.prospectNarrative.verdict}</strong></span>
        </div>
      </div>
      {data.lostRevenueAnnual > 0 && (
        <p className="text-sm text-red-300 mb-3">Annual cost of positioning/proof mismatch: <strong>~{fmtCurrency(data.lostRevenueAnnual)}</strong></p>
      )}
      {data.recommendations?.length > 0 && (
        <div className="text-sm text-[#00D4FF]">
          <strong>The Fix:</strong>
          <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-300">
            {data.recommendations.slice(0, 3).map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      )}
    </RevelationSection>
  );
}

function TrajectoryForkSection({ data }: { data: any }) {
  if (!data?.canRender) return null;
  return (
    <RevelationSection title="The Trajectory Fork" color="#00D4FF">
      <div className="text-center mb-6">
        <p className="text-sm text-slate-400 mb-1">Current Valuation</p>
        <p className="text-2xl font-bold text-white">{fmtCurrency(data.currentValuation)}</p>
        <p className="text-xs text-slate-500">{data.currentMultiple.toFixed(1)}x revenue</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-600/50">
            <th className="text-left text-slate-500 px-3 py-2">Metric</th>
            <th className="text-center text-slate-500 px-3 py-2">Now</th>
            <th className="text-center text-red-400/70 px-3 py-2">Y3 Current</th>
            <th className="text-center text-emerald-400/70 px-3 py-2">Y3 Intervention</th>
            <th className="text-center text-[#00D4FF]/70 px-3 py-2">Gap</th>
          </tr></thead>
          <tbody>
            <tr className="border-b border-slate-700/50">
              <td className="px-3 py-2 text-slate-300">Revenue</td>
              <td className="px-3 py-2 text-center text-white">{fmtCurrency(data.currentValuation / data.currentMultiple)}</td>
              <td className="px-3 py-2 text-center text-red-300">{fmtCurrency(data.trajectoryA.year3.revenue)}</td>
              <td className="px-3 py-2 text-center text-emerald-300">{fmtCurrency(data.trajectoryB.year3.revenue)}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{fmtCurrency(data.gap.revenue)}</td>
            </tr>
            <tr className="border-b border-slate-700/50">
              <td className="px-3 py-2 text-slate-300">Clients</td>
              <td className="px-3 py-2 text-center text-white">{data.trajectoryA.year1.clients}</td>
              <td className="px-3 py-2 text-center text-red-300">{data.trajectoryA.year3.clients}</td>
              <td className="px-3 py-2 text-center text-emerald-300">{data.trajectoryB.year3.clients}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{data.gap.clients}</td>
            </tr>
            <tr className="border-b border-slate-700/50">
              <td className="px-3 py-2 text-slate-300">Your Hours/Week</td>
              <td className="px-3 py-2 text-center text-white">{data.trajectoryA.year1.founderHours}</td>
              <td className="px-3 py-2 text-center text-red-300">{data.trajectoryA.year3.founderHours}</td>
              <td className="px-3 py-2 text-center text-emerald-300">{data.trajectoryB.year3.founderHours}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">-{data.gap.founderHoursSaved}h</td>
            </tr>
            <tr className="border-b border-slate-700/50">
              <td className="px-3 py-2 text-slate-300">Net Margin</td>
              <td className="px-3 py-2 text-center text-white">{data.trajectoryA.year1.margin}%</td>
              <td className="px-3 py-2 text-center text-red-300">{data.trajectoryA.year3.margin}%</td>
              <td className="px-3 py-2 text-center text-emerald-300">{data.trajectoryB.year3.margin}%</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{data.gap.marginPoints}pts</td>
            </tr>
            <tr className="font-bold">
              <td className="px-3 py-2 text-white">Valuation</td>
              <td className="px-3 py-2 text-center text-white">{fmtCurrency(data.currentValuation)}</td>
              <td className="px-3 py-2 text-center text-red-400">{fmtCurrency(data.trajectoryA.year3.valuation)}</td>
              <td className="px-3 py-2 text-center text-emerald-400">{fmtCurrency(data.trajectoryB.year3.valuation)}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{fmtCurrency(data.gap.valuationDifference)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs text-red-400 font-semibold uppercase mb-2">Current Path</p>
          <p className="text-sm text-slate-300">{data.trajectoryA.narrative}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-xs text-emerald-400 font-semibold uppercase mb-2">Intervention Path</p>
          <p className="text-sm text-slate-300">{data.trajectoryB.narrative}</p>
        </div>
      </div>
      {data.keyInterventions?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Key Interventions:</p>
          <div className="space-y-2">
            {data.keyInterventions.map((intervention: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[#00D4FF] font-bold mt-0.5">{i + 1}.</span>
                <div>
                  <span className="text-white font-medium">{intervention.action}</span>
                  <span className="text-slate-500"> — {intervention.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 text-center">
        <p className="text-lg font-bold" style={{ color: '#00D4FF' }}>
          {fmtCurrency(data.gap.valuationDifference)} in enterprise value. Same 3 years. Same founder.
        </p>
      </div>
    </RevelationSection>
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
  const narratives = scores?.narratives || {};
  const analysis = enrichment?.analysis;
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

      {/* ===== 3. POSITIONING ANALYSIS ===== */}
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

      {/* ===== 4. CONTENT-MARKET FIT ===== */}
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

      {/* ===== 5. SOCIAL PROOF ALIGNMENT ===== */}
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

      {/* ===== 6. ICP PROBLEM AWARENESS ===== */}
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
                            {row.addressed ? '✓' : '✗'}
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
                <ul className="space-y-1">{ipa.missingProblems.map((p: string, i: number) => <li key={i} className="text-sm text-slate-400">• {p}</li>)}</ul>
              </div>
            )}
            {ipa.contentOpportunities?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#00D4FF] font-bold uppercase mb-1">Content Opportunities</p>
                <ul className="space-y-1">{ipa.contentOpportunities.map((c: string, i: number) => <li key={i} className="text-sm text-slate-300">• {c}</li>)}</ul>
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
                <p className="text-sm text-slate-400">We asked Claude, ChatGPT, and Perplexity the question your ICP would ask: &quot;I&apos;m a {intake.statedICP || intake.targetMarket || 'company looking for help'}. Who should I hire?&quot; You weren&apos;t mentioned. Not once.</p>
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
                          {check.agencyMentioned ? '✓ Found' : '✗ Not Found'}
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
            {llm.summary.topCompetitors?.length > 0 && (
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
                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Why This Matters</p>
                <ul className="space-y-1 text-sm text-slate-400">
                  <li>• AI is increasingly how people research purchases</li>
                  <li>• Your competitors ARE showing up</li>
                  <li>• This gap will widen, not shrink</li>
                </ul>
                <p className="text-sm text-[#00D4FF] mt-3 font-medium">The fix: become the answer. Your ICP ({intake.statedICP || intake.targetMarket || 'your target market'}) is typing questions into ChatGPT right now. Write the definitive guide to solving their exact problem — a post like &quot;How {intake.statedICP || intake.targetMarket || 'companies like yours'} can fix {(intake.coreOffer || 'growth').split('\n')[0].substring(0, 60)}&quot; — so detailed and useful that AI has no choice but to cite you.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== 8. GROWTH LEVERS ===== */}
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

      {/* ===== 9. FOUNDER OPERATING SYSTEM ===== */}
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

      {/* ===== 10. REALITY CHECKS ===== */}
      {((scores.realityChecks?.length > 0) || (scores.impossibilities?.length > 0)) && (
        <div className="bg-[#E31B23]/5 border border-[#E31B23]/20 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-[#E31B23] mb-5">Reality Checks</h2>
          <div className="space-y-6">
            {scores.realityChecks?.map((check: any, i: number) => (
              <div key={check.id || i}>
                <h3 className="text-sm font-bold text-[#E31B23] mb-2">{check.title}</h3>
                {check.body.split('\n').map((line: string, j: number) => {
                  if (!line.trim()) return null;
                  if (line.startsWith('•')) return <p key={j} className="text-sm text-slate-400 ml-4">{line}</p>;
                  if (/^\d+\./.test(line)) return <p key={j} className="text-sm text-slate-300 ml-4">{line}</p>;
                  return <p key={j} className="text-sm text-slate-300 mb-1">{line}</p>;
                })}
              </div>
            ))}
            {/* Legacy impossibilities fallback */}
            {(!scores.realityChecks || scores.realityChecks.length === 0) && scores.impossibilities?.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[#E31B23] mt-0.5 font-bold text-lg">!</span>
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Invisibility Reality Check (from enrichment data) */}
      {enrichment?.llmAwareness?.summary?.score <= 20 && enrichment?.llmAwareness?.summary?.totalChecked > 0 && (
        <div className="bg-[#E31B23]/5 border border-[#E31B23]/20 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-[#E31B23] mb-2">YOU&apos;RE INVISIBLE TO AI</h3>
          <p className="text-sm text-slate-300 mb-2">When your ICP asks ChatGPT or Claude for recommendations, you don&apos;t exist.</p>
          <p className="text-sm text-slate-400">This isn&apos;t a future problem. It&apos;s a now problem. The agencies showing up are getting mindshare you&apos;re not.</p>
          <p className="text-sm text-[#00D4FF] mt-3 font-medium">Your content strategy needs to change. You need to become the answer. When a {intake.statedICP || intake.targetMarket || 'potential client'} asks AI for help, your name should come up. That means publishing content that directly solves their problems — not thought leadership fluff, but specific, actionable answers.</p>
        </div>
      )}

      {/* ===== REVELATIONS ===== */}
      {revelations?.founderTax && <FounderTaxSection data={revelations.founderTax} />}
      {revelations?.pipelineProbability && <PipelineProbabilitySection data={revelations.pipelineProbability} />}
      {revelations?.authorityGap && <AuthorityGapSection data={revelations.authorityGap} />}
      {revelations?.positioningCollision && <PositioningCollisionSection data={revelations.positioningCollision} />}
      {revelations?.trajectoryFork && <TrajectoryForkSection data={revelations.trajectoryFork} />}

      {/* Revelation CTA */}
      {revelations?.cta?.headline && (
        <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#E31B23]/10 border border-slate-700/50 rounded-2xl p-6 mb-6 text-center">
          <p className="text-lg font-bold text-white mb-4">{revelations.cta.headline}</p>
          <a href="[ROADMAP_URL]" className="inline-block px-6 py-3 rounded-xl bg-[#E31B23] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#E31B23]/25 transition-all">
            {revelations.cta.buttonText} &rarr;
          </a>
          <p className="text-sm text-slate-500 mt-3">{revelations.cta.subtext}</p>
        </div>
      )}

      {/* ===== 11. PRIORITY ACTIONS ===== */}
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

      {/* ===== 12. NEXT STEPS CTA ===== */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Next Steps</h2>

        <div className="bg-slate-700/30 rounded-xl p-6 mb-4 border border-[#00D4FF]/20">
          <h3 className="text-lg font-bold text-white mb-2">60-Minute Roadmap Consultation</h3>
          <p className="text-sm text-slate-400 mb-3">Let&apos;s fix this together. In 60 minutes, we&apos;ll:</p>
          <ul className="text-sm text-slate-300 space-y-1 mb-4">
            <li>• Prioritize your positioning fix</li>
            <li>• Map your founder escape route</li>
            <li>• Build your 90-day action plan</li>
          </ul>
          <a
            href="[ROADMAP_URL]"
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
            <h4 className="font-bold text-white mb-1">Coaching & Consulting</h4>
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
