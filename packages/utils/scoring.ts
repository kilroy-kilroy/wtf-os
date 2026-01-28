/**
 * Agency Assessment Scoring Engine v3
 * Ported from wtf-grader scoring-v2.js + benchmarks-v2.js
 *
 * Calculates WTF Zones heatmap, growth levers, founder OS analysis,
 * and impossibility detection with segment-based benchmarks.
 */

// ============================================
// TYPES
// ============================================

export interface IntakeData {
  agencyName: string;
  founderName: string;
  email: string;
  website: string;
  founderLinkedinUrl?: string;
  companyLinkedinUrl?: string;
  annualRevenue: number;
  targetRevenue: number;
  netProfit: number;
  teamSize: number;
  avgClientValue: number;
  clientsAddedPerMonth: number;
  clientsLostPerMonth: number;
  newRevenueAnnual: number;
  churnRevenueAnnual: number;
  clientCount: number;
  avgClientLifetime: number;
  referralPercent: number;
  inboundPercent: number;
  contentPercent: number;
  paidPercent: number;
  outboundPercent: number;
  partnershipPercent?: number;
  monthlyLeads: number;
  closeRate: number;
  ceoDeliveryRating: string;
  ceoAccountMgmtRating: string;
  ceoMarketingRating: string;
  ceoSalesRating: string;
  founderWeeklyHours: number;
  strategyHoursPerWeek?: number;
  hasSalesSOP: string;
  hasDeliverySOP: string;
  hasAccountMgmtSOP: string;
  hasMarketingSOP: string;
  targetMarket: string;
  coreOffer: string;
  founderPostsPerWeek?: number;
  teamPostsPerWeek?: number;
  hasCaseStudies: string;
  hasNamedClients: string;
}

export interface ZoneScore {
  score: number;
  label: string;
  color: string;
  value: number;
  benchmark: number;
  insight: string;
}

export interface WTFZones {
  revenueQuality: ZoneScore;
  profitability: ZoneScore;
  growthVsChurn: ZoneScore;
  leadEngine: ZoneScore;
  founderLoad: ZoneScore;
  systemsReadiness: ZoneScore;
  contentPositioning: ZoneScore;
  teamVisibility: ZoneScore;
}

export interface GrowthLever {
  name: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  currentState: string;
  recommendation: string;
}

export interface AssessmentResult {
  overall: number;
  segment: string;
  segmentLabel: string;
  wtfZones: WTFZones;
  growthLevers: GrowthLever[];
  founderOS: {
    delegationScore: number;
    onVsInRatio: number;
    bottleneckAreas: string[];
    burnoutRisk: string;
  };
  impossibilities: string[];
  benchmarks: Record<string, any>;
}

// ============================================
// BENCHMARKS
// ============================================

type Segment = 'startup' | 'growth' | 'scale' | 'enterprise';

interface SegmentBenchmarks {
  revenuePerFTE: { poor: number; fair: number; good: number; excellent: number };
  netProfit: { poor: number; fair: number; good: number; excellent: number };
  netGrowthRate: { poor: number; fair: number; good: number; excellent: number };
  churnRate: { poor: number; fair: number; good: number; excellent: number };
}

const BENCHMARKS: Record<Segment, SegmentBenchmarks> = {
  startup: {
    revenuePerFTE: { poor: 80000, fair: 120000, good: 150000, excellent: 200000 },
    netProfit: { poor: 5, fair: 12, good: 20, excellent: 30 },
    netGrowthRate: { poor: -5, fair: 5, good: 20, excellent: 40 },
    churnRate: { poor: 40, fair: 25, good: 15, excellent: 8 }
  },
  growth: {
    revenuePerFTE: { poor: 100000, fair: 150000, good: 200000, excellent: 250000 },
    netProfit: { poor: 8, fair: 15, good: 22, excellent: 30 },
    netGrowthRate: { poor: -10, fair: 5, good: 15, excellent: 30 },
    churnRate: { poor: 35, fair: 20, good: 12, excellent: 6 }
  },
  scale: {
    revenuePerFTE: { poor: 120000, fair: 175000, good: 225000, excellent: 300000 },
    netProfit: { poor: 10, fair: 18, good: 25, excellent: 35 },
    netGrowthRate: { poor: -15, fair: 3, good: 12, excellent: 25 },
    churnRate: { poor: 30, fair: 18, good: 10, excellent: 5 }
  },
  enterprise: {
    revenuePerFTE: { poor: 150000, fair: 200000, good: 275000, excellent: 350000 },
    netProfit: { poor: 12, fair: 20, good: 28, excellent: 38 },
    netGrowthRate: { poor: -20, fair: 2, good: 10, excellent: 20 },
    churnRate: { poor: 25, fair: 15, good: 8, excellent: 4 }
  }
};

function getSegment(annualRevenue: number): { segment: Segment; label: string } {
  if (annualRevenue < 500000) return { segment: 'startup', label: 'Startup (<$500K)' };
  if (annualRevenue < 2000000) return { segment: 'growth', label: 'Growth ($500K-$2M)' };
  if (annualRevenue < 10000000) return { segment: 'scale', label: 'Scale ($2M-$10M)' };
  return { segment: 'enterprise', label: 'Enterprise ($10M+)' };
}

function scoreFromBenchmark(value: number, benchmarks: { poor: number; fair: number; good: number; excellent: number }): { score: number; label: string; color: string } {
  if (value >= benchmarks.excellent) return { score: 5, label: 'Excellent', color: '#10B981' };
  if (value >= benchmarks.good) return { score: 4, label: 'Good', color: '#34D399' };
  if (value >= benchmarks.fair) return { score: 3, label: 'Fair', color: '#F59E0B' };
  if (value >= benchmarks.poor) return { score: 2, label: 'Needs Work', color: '#F97316' };
  return { score: 1, label: 'Critical', color: '#EF4444' };
}

// ============================================
// ZONE SCORING
// ============================================

function scoreRevenueQuality(data: IntakeData, benchmarks: SegmentBenchmarks): ZoneScore {
  const revenuePerFTE = data.annualRevenue / data.teamSize;
  const { score, label, color } = scoreFromBenchmark(revenuePerFTE, benchmarks.revenuePerFTE);
  return {
    score, label, color,
    value: revenuePerFTE,
    benchmark: benchmarks.revenuePerFTE.good,
    insight: score <= 2
      ? `At $${Math.round(revenuePerFTE).toLocaleString()}/FTE, you're overstaffed or undercharging.`
      : `$${Math.round(revenuePerFTE).toLocaleString()}/FTE is ${label.toLowerCase()} for your segment.`
  };
}

function scoreProfitability(data: IntakeData, benchmarks: SegmentBenchmarks): ZoneScore {
  const { score, label, color } = scoreFromBenchmark(data.netProfit, benchmarks.netProfit);
  return {
    score, label, color,
    value: data.netProfit,
    benchmark: benchmarks.netProfit.good,
    insight: score <= 2
      ? `${data.netProfit}% net margin means you're working for free (or close to it).`
      : `${data.netProfit}% net margin is ${label.toLowerCase()} for your segment.`
  };
}

function scoreGrowthVsChurn(data: IntakeData, benchmarks: SegmentBenchmarks): ZoneScore {
  const netGrowthRevenue = data.newRevenueAnnual - data.churnRevenueAnnual;
  const netGrowthRate = data.annualRevenue > 0 ? (netGrowthRevenue / data.annualRevenue) * 100 : 0;
  const { score, label, color } = scoreFromBenchmark(netGrowthRate, benchmarks.netGrowthRate);
  return {
    score, label, color,
    value: netGrowthRate,
    benchmark: benchmarks.netGrowthRate.good,
    insight: netGrowthRate < 0
      ? `You're shrinking at ${Math.abs(netGrowthRate).toFixed(1)}% annually. Churn is eating growth.`
      : `Net growth of ${netGrowthRate.toFixed(1)}% is ${label.toLowerCase()}.`
  };
}

function scoreLeadEngine(data: IntakeData): ZoneScore {
  // Score based on channel diversity and volume
  let score = 3;
  const channels = [data.referralPercent, data.inboundPercent, data.contentPercent, data.paidPercent, data.outboundPercent];
  const activeChannels = channels.filter(c => c > 10).length;

  if (data.referralPercent > 60) score -= 1; // Over-dependent on referrals
  if (activeChannels >= 3) score += 1;
  if (data.monthlyLeads >= 20 && data.closeRate >= 25) score += 1;
  if (data.monthlyLeads < 5) score -= 1;

  score = Math.max(1, Math.min(5, score));
  const label = score >= 4 ? 'Good' : score >= 3 ? 'Fair' : score >= 2 ? 'Needs Work' : 'Critical';
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444';

  return {
    score, label, color,
    value: data.monthlyLeads,
    benchmark: 15,
    insight: data.referralPercent > 60
      ? `${data.referralPercent}% referral-dependent. One dry spell and you're in trouble.`
      : `${activeChannels} active lead channels with ${data.monthlyLeads} leads/month.`
  };
}

function scoreFounderLoad(data: IntakeData, segment: Segment): ZoneScore {
  const ratings = [
    extractRating(data.ceoDeliveryRating),
    extractRating(data.ceoAccountMgmtRating),
    extractRating(data.ceoMarketingRating),
    extractRating(data.ceoSalesRating)
  ];
  const avgDelegation = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  let score = Math.round(avgDelegation);
  if (data.founderWeeklyHours > 55) score = Math.max(1, score - 1);

  score = Math.max(1, Math.min(5, score));
  const label = score >= 4 ? 'Good' : score >= 3 ? 'Fair' : score >= 2 ? 'Needs Work' : 'Critical';
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444';

  return {
    score, label, color,
    value: avgDelegation,
    benchmark: segment === 'startup' ? 2.5 : 3.5,
    insight: score <= 2
      ? `You're the bottleneck. Delegation avg: ${avgDelegation.toFixed(1)}/5 at ${data.founderWeeklyHours}hrs/week.`
      : `Delegation avg: ${avgDelegation.toFixed(1)}/5. ${data.founderWeeklyHours}hrs/week.`
  };
}

function scoreSystemsReadiness(data: IntakeData, segment: Segment): ZoneScore {
  const sops = [data.hasSalesSOP, data.hasDeliverySOP, data.hasAccountMgmtSOP, data.hasMarketingSOP];
  const documented = sops.filter(s => s?.includes('Yes, comprehensive')).length;
  const partial = sops.filter(s => s?.includes('Partial')).length;

  let score = 1 + documented + (partial * 0.5);
  score = Math.max(1, Math.min(5, Math.round(score)));

  const label = score >= 4 ? 'Good' : score >= 3 ? 'Fair' : score >= 2 ? 'Needs Work' : 'Critical';
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444';

  return {
    score, label, color,
    value: documented,
    benchmark: segment === 'startup' ? 1 : 3,
    insight: documented === 0
      ? `Zero documented processes. Everything lives in your head. You can't scale this.`
      : `${documented}/4 processes fully documented.`
  };
}

function scoreContentPositioning(data: IntakeData): ZoneScore {
  let score = 2;
  const founderPosts = data.founderPostsPerWeek || 0;

  if (founderPosts >= 3) score += 1;
  if (founderPosts >= 5) score += 1;
  if (data.hasCaseStudies?.includes('multiple')) score += 1;
  if (data.hasNamedClients === 'Yes') score += 0.5;

  score = Math.max(1, Math.min(5, Math.round(score)));
  const label = score >= 4 ? 'Good' : score >= 3 ? 'Fair' : score >= 2 ? 'Needs Work' : 'Critical';
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444';

  return {
    score, label, color,
    value: founderPosts,
    benchmark: 3,
    insight: founderPosts < 2
      ? `Posting ${founderPosts}x/week. You're invisible to your market.`
      : `Posting ${founderPosts}x/week with ${data.hasCaseStudies?.includes('multiple') ? 'multiple' : 'few'} case studies.`
  };
}

function scoreTeamVisibility(data: IntakeData): ZoneScore {
  let score = 2;
  const teamPosts = data.teamPostsPerWeek || 0;

  if (teamPosts >= 3) score += 1;
  if (teamPosts >= 7) score += 1;
  if (data.hasNamedClients === 'Yes') score += 1;

  score = Math.max(1, Math.min(5, Math.round(score)));
  const label = score >= 4 ? 'Good' : score >= 3 ? 'Fair' : score >= 2 ? 'Needs Work' : 'Critical';
  const color = score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444';

  return {
    score, label, color,
    value: teamPosts,
    benchmark: 5,
    insight: teamPosts < 2
      ? `Team is invisible. ${teamPosts} posts/week won't build authority.`
      : `Team posting ${teamPosts}x/week.`
  };
}

// ============================================
// GROWTH LEVERS
// ============================================

function detectGrowthLevers(data: IntakeData, zones: WTFZones, benchmarks: SegmentBenchmarks): GrowthLever[] {
  const levers: GrowthLever[] = [];

  if (zones.growthVsChurn.score <= 2) {
    levers.push({
      name: 'Fix Churn',
      impact: 'high',
      description: 'Revenue churn is destroying growth. Fix retention before adding leads.',
      currentState: `Losing $${data.churnRevenueAnnual.toLocaleString()}/yr to churn`,
      recommendation: 'Implement 30/60/90 day client health checks and QBRs.'
    });
  }

  if (zones.founderLoad.score <= 2) {
    levers.push({
      name: 'Founder Bottleneck',
      impact: 'high',
      description: 'You are the constraint. The business can\'t grow past you.',
      currentState: `Delegation avg: ${zones.founderLoad.value.toFixed(1)}/5`,
      recommendation: 'Hire or promote a #2. Delegate delivery first, then accounts.'
    });
  }

  if (zones.leadEngine.score <= 2) {
    levers.push({
      name: 'Lead Engine',
      impact: 'high',
      description: 'Not enough qualified leads to sustain growth.',
      currentState: `${data.monthlyLeads} leads/month at ${data.closeRate}% close rate`,
      recommendation: 'Build a second channel beyond referrals. Content or outbound.'
    });
  }

  if (zones.revenueQuality.score <= 2) {
    levers.push({
      name: 'Revenue Per Head',
      impact: 'medium',
      description: 'Too many people for the revenue generated.',
      currentState: `$${Math.round(zones.revenueQuality.value).toLocaleString()}/FTE`,
      recommendation: 'Raise prices, reduce scope creep, or restructure team.'
    });
  }

  if (zones.systemsReadiness.score <= 2) {
    levers.push({
      name: 'Systems Gap',
      impact: 'medium',
      description: 'No documented processes means you can\'t delegate or scale.',
      currentState: `${zones.systemsReadiness.value}/4 documented`,
      recommendation: 'Document your top 3 processes this month. Start with delivery.'
    });
  }

  if (zones.contentPositioning.score <= 2) {
    levers.push({
      name: 'Visibility',
      impact: 'medium',
      description: 'Your market doesn\'t know you exist.',
      currentState: `${data.founderPostsPerWeek || 0} founder posts/week`,
      recommendation: 'Post 3x/week on LinkedIn. Share case studies and insights.'
    });
  }

  return levers;
}

// ============================================
// FOUNDER OS
// ============================================

function analyzeFounderOS(data: IntakeData, segment: Segment) {
  const ratings = [
    extractRating(data.ceoDeliveryRating),
    extractRating(data.ceoAccountMgmtRating),
    extractRating(data.ceoMarketingRating),
    extractRating(data.ceoSalesRating)
  ];
  const avgDelegation = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  const strategyHours = data.strategyHoursPerWeek || 0;
  const onVsInRatio = data.founderWeeklyHours > 0
    ? Math.round((strategyHours / data.founderWeeklyHours) * 100)
    : 0;

  const bottleneckAreas: string[] = [];
  if (extractRating(data.ceoDeliveryRating) <= 2) bottleneckAreas.push('Delivery');
  if (extractRating(data.ceoAccountMgmtRating) <= 2) bottleneckAreas.push('Account Management');
  if (extractRating(data.ceoMarketingRating) <= 2) bottleneckAreas.push('Marketing');
  if (extractRating(data.ceoSalesRating) <= 2) bottleneckAreas.push('Sales');

  let burnoutRisk = 'low';
  if (data.founderWeeklyHours > 55 && avgDelegation < 2.5) burnoutRisk = 'critical';
  else if (data.founderWeeklyHours > 50 && avgDelegation < 3) burnoutRisk = 'high';
  else if (data.founderWeeklyHours > 45) burnoutRisk = 'moderate';

  return {
    delegationScore: avgDelegation,
    onVsInRatio,
    bottleneckAreas,
    burnoutRisk
  };
}

// ============================================
// IMPOSSIBILITIES
// ============================================

function detectImpossibilities(data: IntakeData, benchmarks: SegmentBenchmarks): string[] {
  const impossibilities: string[] = [];

  if (data.targetRevenue > data.annualRevenue * 2) {
    impossibilities.push(`Targeting ${Math.round((data.targetRevenue / data.annualRevenue - 1) * 100)}% growth while losing ${data.clientsLostPerMonth} clients/month. Fix churn first.`);
  }

  if (data.churnRevenueAnnual > data.newRevenueAnnual) {
    impossibilities.push(`Losing more to churn ($${data.churnRevenueAnnual.toLocaleString()}) than gaining from new clients ($${data.newRevenueAnnual.toLocaleString()}). You're on a death spiral.`);
  }

  const ceoRatings = [
    extractRating(data.ceoDeliveryRating),
    extractRating(data.ceoAccountMgmtRating),
    extractRating(data.ceoMarketingRating),
    extractRating(data.ceoSalesRating)
  ];
  const avgDelegation = ceoRatings.reduce((a, b) => a + b, 0) / ceoRatings.length;

  if (avgDelegation < 2 && data.annualRevenue > 1000000) {
    impossibilities.push(`Running a $${(data.annualRevenue / 1000000).toFixed(1)}M agency with almost no delegation. Something will break.`);
  }

  return impossibilities;
}

// ============================================
// OVERALL SCORE
// ============================================

function calculateOverallScore(zones: WTFZones): number {
  const scores = [
    zones.revenueQuality.score,
    zones.profitability.score,
    zones.growthVsChurn.score,
    zones.leadEngine.score,
    zones.founderLoad.score,
    zones.systemsReadiness.score,
    zones.contentPositioning.score,
    zones.teamVisibility.score
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

// ============================================
// HELPERS
// ============================================

function extractRating(ratingString: string): number {
  if (!ratingString) return 3;
  const match = ratingString.match(/^(\d)/);
  return match ? parseInt(match[1]) : 3;
}

// ============================================
// MAIN EXPORT
// ============================================

export function calculateAssessment(data: IntakeData): AssessmentResult {
  const { segment, label: segmentLabel } = getSegment(data.annualRevenue);
  const benchmarks = BENCHMARKS[segment];

  const wtfZones: WTFZones = {
    revenueQuality: scoreRevenueQuality(data, benchmarks),
    profitability: scoreProfitability(data, benchmarks),
    growthVsChurn: scoreGrowthVsChurn(data, benchmarks),
    leadEngine: scoreLeadEngine(data),
    founderLoad: scoreFounderLoad(data, segment),
    systemsReadiness: scoreSystemsReadiness(data, segment),
    contentPositioning: scoreContentPositioning(data),
    teamVisibility: scoreTeamVisibility(data)
  };

  const overall = calculateOverallScore(wtfZones);
  const growthLevers = detectGrowthLevers(data, wtfZones, benchmarks);
  const founderOS = analyzeFounderOS(data, segment);
  const impossibilities = detectImpossibilities(data, benchmarks);

  return {
    overall,
    segment,
    segmentLabel,
    wtfZones,
    growthLevers,
    founderOS,
    impossibilities,
    benchmarks
  };
}
