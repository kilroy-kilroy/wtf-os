import { createAuthServerClient } from '@/lib/supabase-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

// ============================================
// SHARED COMPONENTS
// ============================================

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
      <p className="text-xs text-emerald-400"><strong>Fix:</strong> {lever.recommendation}</p>
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

function RevelationSection({ title, children, color = '#E31B23' }: {
  title: string; children: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-lg font-bold text-white font-anton uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function getOverallLabel(score: number): string {
  if (score >= 4.5) return 'Strong Foundation';
  if (score >= 3.5) return 'Needs Work';
  if (score >= 2.5) return 'Significant Gaps';
  if (score >= 1.5) return 'Critical Issues';
  return 'Red Alert';
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + Math.round(amount);
}

// ============================================
// REVELATION RENDERERS
// ============================================

function FounderTaxSection({ data }: { data: any }) {
  if (!data?.canRender) return null;

  const taxLevel = data.totalFounderTax > 300000 ? 'high' : data.totalFounderTax > 100000 ? 'medium' : 'low';
  const headlineColor = taxLevel === 'high' ? '#E31B23' : taxLevel === 'medium' ? '#f59e0b' : '#22c55e';

  return (
    <RevelationSection title="The Founder Tax" color={headlineColor}>
      <BigNumber value={formatCurrency(data.totalFounderTax) + '/yr'} label="Annual Founder Tax" color={headlineColor} />

      <div className="mt-6 space-y-3">
        <p className="text-sm text-slate-300">
          You&apos;re billing at an implied rate of <strong className="text-white">{formatCurrency(data.founderHourlyEquivalent)}/hr</strong>.
          You spend <strong className="text-white">{data.totalOperationalHours} hrs/week</strong> on operational work.
        </p>

        <div className="bg-slate-700/30 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600/50">
                <th className="text-left text-slate-500 px-4 py-2 font-medium">Component</th>
                <th className="text-right text-slate-500 px-4 py-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-2 text-slate-300">Labor arbitrage (overpaying yourself)</td>
                <td className="px-4 py-2 text-right text-white">{formatCurrency(data.laborArbitrage)}</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-2 text-slate-300">Strategic opportunity cost</td>
                <td className="px-4 py-2 text-right text-white">{formatCurrency(data.strategicOpportunityCost)}</td>
              </tr>
              <tr className="font-bold">
                <td className="px-4 py-2 text-white">Total</td>
                <td className="px-4 py-2 text-right" style={{ color: headlineColor }}>{formatCurrency(data.totalFounderTax)}</td>
              </tr>
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
    : data.referralDependencyStatus === 'moderate' ? '#f59e0b'
    : '#22c55e';

  return (
    <RevelationSection title="The Pipeline Probability" color={statusColor}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <BigNumber value={`${data.referralPercent}%`} label="Referral Dependency" color={statusColor} />
        <BigNumber value={`${data.probabilityOfMajorDisruption}%`} label="3-Year Disruption Risk" color="#f59e0b" />
        <BigNumber value={formatCurrency(data.revenueAtRiskIn3Years)} label="Revenue at Risk" color="#E31B23" />
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
          <p className="text-sm text-red-300">
            This isn&apos;t fear-mongering. It&apos;s actuarial math. One retirement dinner away from crisis.
          </p>
        )}

        <p className="text-sm text-[#00D4FF]">
          <strong>The Fix:</strong> Build ONE channel you control. Content or outbound. Start this month.
        </p>
      </div>
    </RevelationSection>
  );
}

function AuthorityGapSection({ data }: { data: any }) {
  if (!data?.canRender) return null;

  const scoreColor = data.overallAuthorityScore >= 60 ? '#22c55e'
    : data.overallAuthorityScore >= 30 ? '#f59e0b' : '#E31B23';

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

      {/* AI Platform Results */}
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
            <p className="text-xs text-slate-500 mt-1">
              Gaps: {data.problemCoverage.gaps.slice(0, 3).join(', ')}
            </p>
          )}
        </div>
      )}

      {data.competitorComparison && data.competitorComparison.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Who&apos;s surfacing instead:</p>
          <div className="space-y-1">
            {data.competitorComparison.slice(0, 3).map((c: any, i: number) => (
              <div key={i} className="flex justify-between text-xs bg-slate-700/20 rounded-lg px-3 py-2">
                <span className="text-slate-300">{c.name}</span>
                <span className="text-slate-500">{c.whyTheySurface}</span>
              </div>
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
      <BigNumber
        value={`${data.collisionScore}%`}
        label="Collision Score (higher = more misalignment)"
        color={color}
      />

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

      {/* Prospect Narrative */}
      <div className="bg-slate-700/20 border-l-2 rounded-r-lg px-4 py-3 mb-4" style={{ borderColor: color }}>
        <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{data.prospectNarrative.headline}</p>
        <p className="text-sm text-slate-300 italic">&quot;{data.prospectNarrative.story}&quot;</p>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-slate-500">Time on site: <strong className="text-slate-300">{data.prospectNarrative.timeOnSite}</strong></span>
          <span className="text-slate-500">Verdict: <strong style={{ color }}>{data.prospectNarrative.verdict}</strong></span>
        </div>
      </div>

      {data.lostRevenueAnnual > 0 && (
        <p className="text-sm text-red-300 mb-3">
          Annual cost of positioning/proof mismatch: <strong>~{formatCurrency(data.lostRevenueAnnual)}</strong>
        </p>
      )}

      {data.recommendations.length > 0 && (
        <div className="text-sm text-[#00D4FF]">
          <strong>The Fix:</strong>
          <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-300">
            {data.recommendations.slice(0, 3).map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
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
        <p className="text-2xl font-bold text-white">{formatCurrency(data.currentValuation)}</p>
        <p className="text-xs text-slate-500">{data.currentMultiple.toFixed(1)}x revenue</p>
      </div>

      {/* Trajectory Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600/50">
              <th className="text-left text-slate-500 px-3 py-2">Metric</th>
              <th className="text-center text-slate-500 px-3 py-2">Now</th>
              <th className="text-center text-red-400/70 px-3 py-2">Y3 Current</th>
              <th className="text-center text-emerald-400/70 px-3 py-2">Y3 Intervention</th>
              <th className="text-center text-[#00D4FF]/70 px-3 py-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700/50">
              <td className="px-3 py-2 text-slate-300">Revenue</td>
              <td className="px-3 py-2 text-center text-white">{formatCurrency(data.currentValuation / data.currentMultiple)}</td>
              <td className="px-3 py-2 text-center text-red-300">{formatCurrency(data.trajectoryA.year3.revenue)}</td>
              <td className="px-3 py-2 text-center text-emerald-300">{formatCurrency(data.trajectoryB.year3.revenue)}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{formatCurrency(data.gap.revenue)}</td>
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
              <td className="px-3 py-2 text-center text-white">{formatCurrency(data.currentValuation)}</td>
              <td className="px-3 py-2 text-center text-red-400">{formatCurrency(data.trajectoryA.year3.valuation)}</td>
              <td className="px-3 py-2 text-center text-emerald-400">{formatCurrency(data.trajectoryB.year3.valuation)}</td>
              <td className="px-3 py-2 text-center text-[#00D4FF]">+{formatCurrency(data.gap.valuationDifference)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Narratives */}
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

      {/* Key Interventions */}
      {data.keyInterventions && data.keyInterventions.length > 0 && (
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
          {formatCurrency(data.gap.valuationDifference)} in enterprise value. Same 3 years. Same founder.
        </p>
      </div>
    </RevelationSection>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const supabase = await createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login?next=/growthos');

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single();

  if (error || !assessment) notFound();

  const scores = assessment.scores as any;
  const intake = assessment.intake_data as any;
  const enrichment = assessment.enrichment_data as any;
  const zones = scores?.wtfZones;
  const revelations = scores?.revelations;

  if (!scores || !zones) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4 font-anton uppercase tracking-wide">Assessment Processing</h1>
        <p className="text-slate-400">Your assessment is still being processed. Check back shortly.</p>
        <Link href="/growthos" className="inline-block mt-6 text-emerald-400 hover:text-emerald-300 font-medium">
          &larr; Back to GrowthOS
        </Link>
      </div>
    );
  }

  const overallColor = scores.overall >= 4 ? '#00D4FF' : scores.overall >= 2.5 ? '#f59e0b' : '#E31B23';
  const segmentLabel = scores.segmentLabel || 'Agency';
  const realityChecks = scores.realityChecks as Array<{ id: string; type: string; title: string; body: string }> | undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link href="/growthos" className="text-sm text-slate-400 hover:text-slate-200 mb-6 inline-block">
        &larr; Back to GrowthOS
      </Link>

      {/* Header */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2 font-anton uppercase tracking-wide">{intake.agencyName} Business Diagnostic</h1>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 mb-4">
          {segmentLabel}
        </span>

        <div className="inline-flex items-center gap-4 mt-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white"
            style={{ backgroundColor: overallColor + '20', border: `2px solid ${overallColor}40` }}
          >
            <span style={{ color: overallColor }}>{scores.overall.toFixed(1)}</span>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Overall Score</p>
            <p className="text-lg font-bold text-white">{scores.overallLabel || getOverallLabel(scores.overall)}</p>
          </div>
        </div>
      </div>

      {/* WTF ZONES HEATMAP — always visible, top of results */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-5 font-anton uppercase tracking-wide">WTF Zones Heatmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ScoreBar score={zones.revenueQuality.score} label="Revenue Quality" insight={scores.narratives?.revenueQuality || zones.revenueQuality.insight} color={zones.revenueQuality.color} />
          <ScoreBar score={zones.profitability.score} label="Profitability" insight={scores.narratives?.profitability || zones.profitability.insight} color={zones.profitability.color} />
          <ScoreBar score={zones.growthVsChurn.score} label="Growth vs Churn" insight={scores.narratives?.growthVsChurn || zones.growthVsChurn.insight} color={zones.growthVsChurn.color} />
          <ScoreBar score={zones.leadEngine.score} label="Lead Engine" insight={scores.narratives?.leadEngine || zones.leadEngine.insight} color={zones.leadEngine.color} />
          <ScoreBar score={zones.founderLoad.score} label="Founder Load" insight={scores.narratives?.founderLoad || zones.founderLoad.insight} color={zones.founderLoad.color} />
          <ScoreBar score={zones.systemsReadiness.score} label="Systems Readiness" insight={scores.narratives?.systemsReadiness || zones.systemsReadiness.insight} color={zones.systemsReadiness.color} />
          <ScoreBar score={zones.contentPositioning.score} label="Content & Positioning" insight={scores.narratives?.contentPositioning || zones.contentPositioning.insight} color={zones.contentPositioning.color} />
          <ScoreBar score={zones.teamVisibility.score} label="Team Visibility" insight={scores.narratives?.teamVisibility || zones.teamVisibility.insight} color={zones.teamVisibility.color} />
        </div>
      </div>

      {/* REALITY CHECKS (conditional) */}
      {realityChecks && realityChecks.length > 0 && (
        <div className="space-y-4 mb-6">
          {realityChecks.map((check: any) => (
            <div
              key={check.id}
              className={`rounded-2xl p-6 border ${
                check.type === 'celebration'
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                check.type === 'celebration' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {check.type === 'celebration' ? '\u2705' : '\uD83D\uDEA8'} {check.title}
              </h3>
              <div className="text-sm text-slate-300 whitespace-pre-line">{check.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legacy impossibilities (backward compat) */}
      {scores.impossibilities && scores.impossibilities.length > 0 && (!realityChecks || realityChecks.length === 0) && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-red-400 mb-4 font-anton uppercase tracking-wide">Reality Checks</h2>
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

      {/* REVELATIONS */}
      {revelations?.founderTax && <FounderTaxSection data={revelations.founderTax} />}
      {revelations?.pipelineProbability && <PipelineProbabilitySection data={revelations.pipelineProbability} />}
      {revelations?.authorityGap && <AuthorityGapSection data={revelations.authorityGap} />}
      {revelations?.positioningCollision && <PositioningCollisionSection data={revelations.positioningCollision} />}
      {revelations?.trajectoryFork && <TrajectoryForkSection data={revelations.trajectoryFork} />}

      {/* CTA */}
      {revelations?.cta?.headline && (
        <div className="bg-gradient-to-r from-[#E31B23]/10 to-[#00D4FF]/10 border border-slate-700/50 rounded-2xl p-8 mb-6 text-center">
          <p className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">{revelations.cta.headline}</p>
          <a
            href="#"
            className="inline-block px-8 py-4 rounded-xl bg-[#E31B23] text-white font-bold text-lg hover:shadow-lg hover:shadow-[#E31B23]/25 hover:-translate-y-0.5 transition-all"
          >
            {revelations.cta.buttonText}
          </a>
          <p className="text-sm text-slate-500 mt-3">{revelations.cta.subtext}</p>
        </div>
      )}

      {/* Growth Levers */}
      {scores.growthLevers && scores.growthLevers.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5 font-anton uppercase tracking-wide">Growth Levers</h2>
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
          <h2 className="text-lg font-bold text-white mb-5 font-anton uppercase tracking-wide">Founder Operating System</h2>
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
                scores.founderOS.burnoutRisk === 'high' ? 'text-amber-400' : 'text-emerald-400'
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

      {/* ENRICHMENT ANALYSIS SECTIONS */}

      {/* Positioning Analysis */}
      {enrichment?.analysis?.positioningCoherence && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">Positioning Analysis</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold" style={{ color: enrichment.analysis.positioningCoherence.score >= 7 ? '#22c55e' : enrichment.analysis.positioningCoherence.score >= 4 ? '#f59e0b' : '#E31B23' }}>
              {enrichment.analysis.positioningCoherence.score}/10
            </div>
            <div>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                enrichment.analysis.positioningCoherence.alignment === 'aligned' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : enrichment.analysis.positioningCoherence.alignment === 'partial' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {enrichment.analysis.positioningCoherence.alignment}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">{enrichment.analysis.positioningCoherence.verdict}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Website Message</p>
              <p className="text-sm text-slate-300">{enrichment.analysis.positioningCoherence.websiteMessage}</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">LinkedIn Message</p>
              <p className="text-sm text-slate-300">{enrichment.analysis.positioningCoherence.linkedinMessage}</p>
            </div>
          </div>
          {enrichment.analysis.positioningCoherence.gaps?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gaps</p>
              <ul className="space-y-1">
                {enrichment.analysis.positioningCoherence.gaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>{gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {enrichment.analysis.positioningCoherence.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Recommendations</p>
              <ul className="space-y-1">
                {enrichment.analysis.positioningCoherence.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-[#00D4FF] flex items-start gap-2">
                    <span className="mt-0.5">→</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Content-Market Fit */}
      {enrichment?.analysis?.contentMarketFit && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">Content-Market Fit</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold" style={{ color: enrichment.analysis.contentMarketFit.score >= 7 ? '#22c55e' : enrichment.analysis.contentMarketFit.score >= 4 ? '#f59e0b' : '#E31B23' }}>
              {enrichment.analysis.contentMarketFit.score}/10
            </div>
            <p className="text-sm text-slate-300">{enrichment.analysis.contentMarketFit.verdict}</p>
          </div>
          {enrichment.analysis.contentMarketFit.topicsVsIcpProblems && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Your Content Topics</p>
                {enrichment.analysis.contentMarketFit.topicsVsIcpProblems.topContentTopics?.map((t: string, i: number) => (
                  <p key={i} className="text-sm text-slate-300">• {t}</p>
                ))}
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">ICP Problems</p>
                {enrichment.analysis.contentMarketFit.topicsVsIcpProblems.topIcpProblems?.map((p: string, i: number) => (
                  <p key={i} className="text-sm text-slate-300">• {p}</p>
                ))}
              </div>
            </div>
          )}
          {enrichment.analysis.contentMarketFit.topicsVsIcpProblems?.overlap !== undefined && (
            <p className="text-sm text-slate-400 mb-3">
              Topic-Problem Overlap: <strong className="text-white">{enrichment.analysis.contentMarketFit.topicsVsIcpProblems.overlap}%</strong>
            </p>
          )}
          {enrichment.analysis.contentMarketFit.gaps?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gaps</p>
              <ul className="space-y-1">
                {enrichment.analysis.contentMarketFit.gaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>{gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {enrichment.analysis.contentMarketFit.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Recommendations</p>
              <ul className="space-y-1">
                {enrichment.analysis.contentMarketFit.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-[#00D4FF] flex items-start gap-2">
                    <span className="mt-0.5">→</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Social Proof Alignment */}
      {enrichment?.analysis?.socialProofAlignment && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">Social Proof Alignment</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold" style={{ color: enrichment.analysis.socialProofAlignment.score >= 7 ? '#22c55e' : enrichment.analysis.socialProofAlignment.score >= 4 ? '#f59e0b' : '#E31B23' }}>
              {enrichment.analysis.socialProofAlignment.score}/10
            </div>
            <p className="text-sm text-slate-300">{enrichment.analysis.socialProofAlignment.verdict}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Case Studies</p>
              <p className="text-sm text-white font-medium">{enrichment.analysis.socialProofAlignment.caseStudyRelevance}</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Testimonials</p>
              <p className="text-sm text-white font-medium">{enrichment.analysis.socialProofAlignment.testimonialStrength}</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Logo Signal</p>
              <p className="text-sm text-white font-medium">{enrichment.analysis.socialProofAlignment.logoSignalStrength}</p>
            </div>
          </div>
          {enrichment.analysis.socialProofAlignment.gaps?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gaps</p>
              <ul className="space-y-1">
                {enrichment.analysis.socialProofAlignment.gaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>{gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {enrichment.analysis.socialProofAlignment.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Recommendations</p>
              <ul className="space-y-1">
                {enrichment.analysis.socialProofAlignment.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-[#00D4FF] flex items-start gap-2">
                    <span className="mt-0.5">→</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ICP Problem Awareness */}
      {enrichment?.analysis?.icpProblemAwareness && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">ICP Problem Awareness</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold" style={{ color: enrichment.analysis.icpProblemAwareness.score >= 7 ? '#22c55e' : enrichment.analysis.icpProblemAwareness.score >= 4 ? '#f59e0b' : '#E31B23' }}>
              {enrichment.analysis.icpProblemAwareness.score}/10
            </div>
            <p className="text-sm text-slate-300">{enrichment.analysis.icpProblemAwareness.verdict}</p>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Problem Coverage: <strong className="text-white">{enrichment.analysis.icpProblemAwareness.coveragePercent}%</strong>
          </p>
          {enrichment.analysis.icpProblemAwareness.problemCoverage?.length > 0 && (
            <div className="bg-slate-700/30 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600/50">
                    <th className="text-left text-slate-500 px-4 py-2 font-medium">Problem</th>
                    <th className="text-center text-slate-500 px-4 py-2 font-medium">Addressed</th>
                    <th className="text-left text-slate-500 px-4 py-2 font-medium">Where</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichment.analysis.icpProblemAwareness.problemCoverage.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="px-4 py-2 text-slate-300">{p.problem}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={p.addressed ? 'text-emerald-400' : 'text-red-400'}>{p.addressed ? '✓' : '✗'}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{p.where || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {enrichment.analysis.icpProblemAwareness.missingProblems?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Missing Problems</p>
              <ul className="space-y-1">
                {enrichment.analysis.icpProblemAwareness.missingProblems.map((p: string, i: number) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {enrichment.analysis.icpProblemAwareness.contentOpportunities?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Content Opportunities</p>
              <ul className="space-y-1">
                {enrichment.analysis.icpProblemAwareness.contentOpportunities.map((opp: string, i: number) => (
                  <li key={i} className="text-sm text-[#00D4FF] flex items-start gap-2">
                    <span className="mt-0.5">→</span>{opp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* LLM Awareness */}
      {enrichment?.llmAwareness?.summary && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-anton uppercase tracking-wide">AI Awareness Check</h2>
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
                  <p className={`text-sm font-bold ${check.agencyMentioned ? 'text-emerald-400' : 'text-red-400'}`}>
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

      {/* Priority Actions */}
      {scores.priorityActions && scores.priorityActions.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-5 font-anton uppercase tracking-wide">Priority Actions</h2>
          <div className="space-y-3">
            {scores.priorityActions.map((action: any, i: number) => (
              <div key={i} className="flex items-start gap-4 bg-slate-700/30 rounded-xl p-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31B23]/10 border border-[#E31B23]/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#E31B23]">{action.priority}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{action.action}</p>
                  <p className="text-xs text-slate-400 mt-1">{action.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-8">
        <Link
          href="/growthos/assessment"
          className="flex-1 text-center py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#00B4D8] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#00D4FF]/25 transition-all"
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
