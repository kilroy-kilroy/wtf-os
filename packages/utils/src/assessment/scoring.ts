/**
 * Agency Assessment Scoring Engine v3.0
 * WTF Zones + Holy Shit Revelations
 *
 * Calculates WTF Zones heatmap (8 scores), narratives, reality checks,
 * growth levers, founder OS, and priority actions.
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
  teamSize: number;

  // Revenue & Financials (v2 fields)
  lastYearRevenue?: number;
  targetRevenue: number;
  netProfitMargin?: string; // dropdown range: '<5%', '5-10%', etc.
  lastMonthRevenue?: number;

  // Legacy fields (v1 compatibility)
  annualRevenue: number;
  netProfit: number;
  avgClientValue: number;

  // Clients & Churn (v2 fields)
  currentClients?: number;
  clientsLostAnnual?: string;   // range: '0-2', '3-5', '6-10', '11-15', '16+'
  clientsAddedAnnual?: string;  // range: '0-3', '4-8', '9-15', '16-25', '26+'
  churnCalibration?: string;    // 'Lower', 'About Right', 'Higher'

  // Legacy fields (v1 compatibility)
  clientsAddedPerMonth: number;
  clientsLostPerMonth: number;
  newRevenueAnnual: number;
  churnRevenueAnnual: number;
  clientCount: number;
  avgClientLifetime: number;

  // Lead Sources
  referralPercent: number;
  inboundPercent: number;
  contentPercent: number;
  paidPercent: number;
  outboundPercent: number;
  partnershipPercent?: number;
  monthlyLeads: number;
  closeRate: number | string;

  // Founder Time
  ceoDeliveryRating: string | number;
  ceoAccountMgmtRating: string | number;
  ceoMarketingRating: string | number;
  ceoSalesRating: string | number;
  founderWeeklyHours: number;
  strategyHoursPerWeek?: number;

  // Systems & Documentation
  hasSalesSOP: string;
  hasDeliverySOP: string;
  hasAccountMgmtSOP: string;
  hasMarketingSOP: string;

  // Positioning & ICP
  targetMarket: string;
  coreOffer: string;
  statedICP?: string;
  differentiator?: string;
  targetCompanySize?: string;
  targetIndustry?: string | string[];
  targetIndustryOther?: string;

  // Visibility & Proof
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

export interface PriorityAction {
  priority: number;
  action: string;
  why: string;
}

export interface RealityCheck {
  id: string;
  title: string;
  body: string;
  type: 'alert' | 'celebration';
}

export interface AssessmentResult {
  overall: number;
  overallLabel: string;
  segment: string;
  segmentLabel: string;
  wtfZones: WTFZones;
  narratives: Record<string, string>;
  growthLevers: GrowthLever[];
  founderOS: {
    delegationScore: number;
    delegationNarrative: string;
    onVsInRatio: number;
    onVsInNarrative: string;
    bottleneckAreas: string[];
    burnoutRisk: string;
  };
  realityChecks: RealityCheck[];
  impossibilities: string[];
  priorityActions: PriorityAction[];
  benchmarks: Record<string, any>;
}

// ============================================
// CONSTANTS
// ============================================

type Segment = 'startup' | 'growth' | 'scale' | 'established' | 'enterprise';

const RANGE_MIDPOINTS = {
  clientsLost: { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 } as Record<string, number>,
  clientsAdded: { '0-3': 1.5, '4-8': 6, '9-15': 12, '16-25': 20, '26+': 30 } as Record<string, number>,
};

const REVENUE_PER_FTE_BENCHMARKS: Record<Segment, { poor: number; ok: number; good: number; great: number }> = {
  startup: { poor: 80000, ok: 100000, good: 130000, great: 160000 },
  growth: { poor: 100000, ok: 140000, good: 180000, great: 220000 },
  scale: { poor: 140000, ok: 180000, good: 220000, great: 280000 },
  established: { poor: 160000, ok: 200000, good: 260000, great: 320000 },
  enterprise: { poor: 180000, ok: 240000, good: 300000, great: 380000 },
};

const LEAD_VOLUME_BENCHMARKS: Record<Segment, number> = {
  startup: 5, growth: 10, scale: 15, established: 20, enterprise: 30,
};

const MARGIN_MIDPOINTS: Record<string, number> = {
  '<5%': 0.03, '5-10%': 0.075, '10-15%': 0.125,
  '15-20%': 0.175, '20-25%': 0.225, '25-30%': 0.275, '30%+': 0.35,
};

// ============================================
// HELPERS
// ============================================

function getSegment(annualRevenue: number): { segment: Segment; label: string } {
  if (annualRevenue < 500000) return { segment: 'startup', label: 'Startup (<$500K)' };
  if (annualRevenue < 2000000) return { segment: 'growth', label: 'Growth ($500K-$2M)' };
  if (annualRevenue < 5000000) return { segment: 'scale', label: 'Scale ($2M-$5M)' };
  if (annualRevenue < 10000000) return { segment: 'established', label: 'Established ($5M-$10M)' };
  return { segment: 'enterprise', label: 'Enterprise ($10M+)' };
}

function extractRating(ratingInput: string | number): number {
  if (ratingInput === undefined || ratingInput === null || ratingInput === '') return 3;
  if (typeof ratingInput === 'number') return Math.max(1, Math.min(5, Math.round(ratingInput)));
  const match = ratingInput.match(/^(\d)/);
  return match ? parseInt(match[1]) : 3;
}

function parseMarginMidpoint(marginRange: string | undefined): number {
  if (!marginRange) return 0.15;
  return MARGIN_MIDPOINTS[marginRange] || 0.15;
}

function getEffectiveRevenue(data: IntakeData): number {
  return data.lastYearRevenue || data.annualRevenue || 0;
}

function scoreColor(score: number): string {
  if (score >= 4) return '#00D4FF';  // Cyan - positive
  if (score >= 3) return '#f59e0b';  // Yellow - moderate
  return '#E31B23';                   // Red - warning
}

function scoreLabel(score: number): string {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Fair';
  if (score >= 2) return 'Needs Work';
  return 'Critical';
}

// ============================================
// ZONE 1: REVENUE QUALITY (1-5)
// ============================================

function scoreRevenueQuality(data: IntakeData, segment: Segment): ZoneScore {
  const revenue = getEffectiveRevenue(data);
  const revenuePerFTE = revenue / data.teamSize;
  const b = REVENUE_PER_FTE_BENCHMARKS[segment];

  let score: number;
  if (revenuePerFTE >= b.great) score = 5;
  else if (revenuePerFTE >= b.good) score = 4;
  else if (revenuePerFTE >= b.ok) score = 3;
  else if (revenuePerFTE >= b.poor) score = 2;
  else score = 1;

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: revenuePerFTE,
    benchmark: b.good,
    insight: `$${Math.round(revenuePerFTE).toLocaleString()} per FTE`,
  };
}

// ============================================
// ZONE 2: PROFITABILITY (1-5)
// ============================================

function scoreProfitability(data: IntakeData): ZoneScore {
  const margin = data.netProfitMargin
    ? parseMarginMidpoint(data.netProfitMargin)
    : (data.netProfit / 100);
  const marginPercent = Math.round(margin * 100);

  let score: number;
  if (margin >= 0.25) score = 5;
  else if (margin >= 0.20) score = 4;
  else if (margin >= 0.15) score = 3;
  else if (margin >= 0.10) score = 2;
  else score = 1;

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: marginPercent,
    benchmark: 20,
    insight: `${marginPercent}% net margin`,
  };
}

// ============================================
// ZONE 3: GROWTH VS CHURN (1-5)
// ============================================

function scoreGrowthVsChurn(data: IntakeData): ZoneScore {
  let netGrowthRate: number;

  // Use v2 client-based calculation if available
  if (data.clientsLostAnnual && data.clientsAddedAnnual && data.currentClients && data.currentClients > 0) {
    const clientsLost = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual] ?? 4;
    const clientsAdded = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual] ?? 6;
    const netGrowth = clientsAdded - clientsLost;
    netGrowthRate = (netGrowth / data.currentClients) * 100;
  } else {
    // Legacy fallback
    const revenue = getEffectiveRevenue(data);
    const netGrowthRevenue = data.newRevenueAnnual - data.churnRevenueAnnual;
    netGrowthRate = revenue > 0 ? (netGrowthRevenue / revenue) * 100 : 0;
  }

  let score: number;
  if (netGrowthRate >= 30) score = 5;
  else if (netGrowthRate >= 15) score = 4;
  else if (netGrowthRate >= 5) score = 3;
  else if (netGrowthRate >= 0) score = 2;
  else score = 1;

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: netGrowthRate,
    benchmark: 15,
    insight: `Net growth rate: ${netGrowthRate.toFixed(1)}%`,
  };
}

// ============================================
// ZONE 4: LEAD ENGINE (1-5)
// ============================================

function scoreLeadEngine(data: IntakeData, segment: Segment): ZoneScore {
  let score = 3;

  const channels = [
    data.referralPercent, data.inboundPercent, data.contentPercent,
    data.paidPercent, data.outboundPercent, data.partnershipPercent || 0,
  ];
  const activeChannels = channels.filter(c => c >= 10).length;

  if (activeChannels >= 4) score += 1;
  else if (activeChannels <= 1) score -= 1;

  const volumeBenchmark = LEAD_VOLUME_BENCHMARKS[segment];
  if (data.monthlyLeads >= volumeBenchmark * 1.5) score += 1;
  else if (data.monthlyLeads < volumeBenchmark * 0.5) score -= 1;

  if (data.referralPercent >= 70) score -= 1;

  score = Math.max(1, Math.min(5, score));

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: data.monthlyLeads,
    benchmark: volumeBenchmark,
    insight: `${activeChannels} active channels, ${data.monthlyLeads} leads/month`,
  };
}

// ============================================
// ZONE 5: FOUNDER LOAD (1-5)
// ============================================

function scoreFounderLoad(data: IntakeData): ZoneScore {
  const ratings = [
    extractRating(data.ceoDeliveryRating),
    extractRating(data.ceoAccountMgmtRating),
    extractRating(data.ceoMarketingRating),
    extractRating(data.ceoSalesRating),
  ];
  const delegationAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  let score = Math.round(delegationAvg);
  if (data.founderWeeklyHours > 55) score = Math.max(1, score - 1);
  if (data.founderWeeklyHours > 60) score = Math.max(1, score - 1);

  score = Math.max(1, Math.min(5, score));

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: delegationAvg,
    benchmark: 3.5,
    insight: `Delegation avg: ${delegationAvg.toFixed(1)}/5, ${data.founderWeeklyHours}hrs/week`,
  };
}

// ============================================
// ZONE 6: SYSTEMS READINESS (1-5)
// ============================================

function scoreSystemsReadiness(data: IntakeData): ZoneScore {
  const sopFields = [data.hasSalesSOP, data.hasDeliverySOP, data.hasAccountMgmtSOP, data.hasMarketingSOP];

  let documentedCount = 0;
  sopFields.forEach(field => {
    if (field === 'Yes' || field === 'Yes, comprehensive') documentedCount += 1;
    else if (field === 'Partial') documentedCount += 0.5;
  });

  let score: number;
  if (documentedCount >= 4) score = 5;
  else if (documentedCount >= 3) score = 4;
  else if (documentedCount >= 2) score = 3;
  else if (documentedCount >= 1) score = 2;
  else score = 1;

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: documentedCount,
    benchmark: 3,
    insight: `${documentedCount}/4 processes documented`,
  };
}

// ============================================
// ZONE 7: CONTENT & POSITIONING (1-5)
// ============================================

function scoreContentPositioning(data: IntakeData, enrichment?: any): ZoneScore {
  let score = 2;

  const founderPosts = data.founderPostsPerWeek || 0;
  const teamPosts = data.teamPostsPerWeek || 0;
  const totalPosts = founderPosts + teamPosts;

  if (totalPosts >= 5) score += 1;
  else if (totalPosts >= 3) score += 0.5;

  if (data.hasCaseStudies === 'Yes (3+)') score += 1;
  else if (data.hasCaseStudies === 'Some (1-2)') score += 0.5;

  if (data.hasNamedClients === 'Yes') score += 0.5;

  if (enrichment?.positioningScore >= 8) score += 0.5;

  score = Math.max(1, Math.min(5, Math.round(score)));

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: totalPosts,
    benchmark: 5,
    insight: `${totalPosts} posts/week`,
  };
}

// ============================================
// ZONE 8: TEAM VISIBILITY (1-5)
// ============================================

function scoreTeamVisibility(data: IntakeData): ZoneScore {
  let score = 2;
  const teamPosts = data.teamPostsPerWeek || 0;

  if (teamPosts >= 5) score += 2;
  else if (teamPosts >= 3) score += 1.5;
  else if (teamPosts >= 1) score += 1;

  if (data.hasNamedClients === 'Yes') score += 0.5;

  // Solo founder adjustment
  if (data.teamSize === 1) {
    score = Math.max(3, score);
  }

  score = Math.max(1, Math.min(5, Math.round(score)));

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    value: teamPosts,
    benchmark: 5,
    insight: data.teamSize === 1
      ? `Solo operator—team visibility doesn't apply yet.`
      : `Team posting ${teamPosts}x/week`,
  };
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
    zones.teamVisibility.score,
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

function getOverallLabel(score: number): string {
  if (score >= 4.5) return 'Strong Foundation';
  if (score >= 3.5) return 'Needs Work';
  if (score >= 2.5) return 'Significant Gaps';
  if (score >= 1.5) return 'Critical Issues';
  return 'Red Alert';
}

// ============================================
// NARRATIVE COPY MATRIX (v3.0 spec)
// ============================================

function generateNarratives(data: IntakeData, zones: WTFZones): Record<string, string> {
  const n: Record<string, string> = {};
  const revenue = getEffectiveRevenue(data);
  const revenuePerFTE = Math.round(revenue / data.teamSize).toLocaleString();

  const channels = [
    data.referralPercent, data.inboundPercent, data.contentPercent,
    data.paidPercent, data.outboundPercent, data.partnershipPercent || 0,
  ];
  const activeChannels = channels.filter(c => c >= 10).length;

  const ratings = [extractRating(data.ceoDeliveryRating), extractRating(data.ceoAccountMgmtRating), extractRating(data.ceoMarketingRating), extractRating(data.ceoSalesRating)];
  const avgDelegation = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);

  const sopFields = [data.hasSalesSOP, data.hasDeliverySOP, data.hasAccountMgmtSOP, data.hasMarketingSOP];
  let documentedCount = 0;
  sopFields.forEach(field => {
    if (field === 'Yes' || field === 'Yes, comprehensive') documentedCount += 1;
    else if (field === 'Partial') documentedCount += 0.5;
  });

  const founderPosts = data.founderPostsPerWeek || 0;
  const teamPosts = data.teamPostsPerWeek || 0;
  const totalPosts = founderPosts + teamPosts;

  // Margin display
  const marginPercent = data.netProfitMargin
    ? Math.round(parseMarginMidpoint(data.netProfitMargin) * 100)
    : data.netProfit;

  // Net growth rate
  let netGrowthRate = '0';
  if (data.clientsLostAnnual && data.clientsAddedAnnual && data.currentClients && data.currentClients > 0) {
    const clientsLost = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual] ?? 4;
    const clientsAdded = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual] ?? 6;
    netGrowthRate = (((clientsAdded - clientsLost) / data.currentClients) * 100).toFixed(1);
  } else if (revenue > 0) {
    netGrowthRate = (((data.newRevenueAnnual - data.churnRevenueAnnual) / revenue) * 100).toFixed(1);
  }

  // Revenue Quality
  const rqNarratives: Record<number, string> = {
    5: `$${revenuePerFTE} per FTE is excellent. You're operating at elite efficiency.`,
    4: `$${revenuePerFTE} per FTE is solid. Not elite, but you're not bleeding efficiency.`,
    3: `$${revenuePerFTE} per FTE is average. There's room to tighten operations.`,
    2: `$${revenuePerFTE} per FTE is below benchmark. You're either overstaffed or underpriced.`,
    1: `$${revenuePerFTE} per FTE is a problem. You're running a jobs program, not a business.`,
  };
  n.revenueQuality = rqNarratives[zones.revenueQuality.score] || rqNarratives[3];

  // Profitability
  const profNarratives: Record<number, string> = {
    5: `${marginPercent}% net margin is excellent. You've got real leverage for growth or exit.`,
    4: `${marginPercent}% net margin is good for your segment. Healthy, sustainable.`,
    3: `${marginPercent}% net margin is fine. Not fuck-you money, but you're not drowning.`,
    2: `${marginPercent}% net margin is thin. One bad quarter and you're in trouble.`,
    1: `${marginPercent}% net margin is a crisis. You're working for free (or worse).`,
  };
  n.profitability = profNarratives[zones.profitability.score] || profNarratives[3];

  // Growth vs Churn
  const gcNarratives: Record<number, string> = {
    5: `Net growth of ${netGrowthRate}% is excellent. You're outpacing churn by a wide margin.`,
    4: `Net growth of ${netGrowthRate}% is healthy. You're outrunning your losses.`,
    3: `Net growth of ${netGrowthRate}% is okay. You're growing, but churn is eating into it.`,
    2: `Net growth of ${netGrowthRate}% is concerning. Churn is almost matching new business.`,
    1: `Net growth of ${netGrowthRate}%. You're shrinking. Stop everything and fix retention.`,
  };
  n.growthVsChurn = gcNarratives[zones.growthVsChurn.score] || gcNarratives[3];

  // Lead Engine
  const leNarratives: Record<number, string> = {
    5: `${activeChannels} active channels with ${data.monthlyLeads} leads/month. Diversified and strong.`,
    4: `${activeChannels} active channels with ${data.monthlyLeads} leads/month. Solid foundation.`,
    3: `${activeChannels} active channels with ${data.monthlyLeads} leads/month. Workable, but not bulletproof.`,
    2: `${activeChannels} channels, ${data.monthlyLeads} leads/month. One bad quarter away from panic.`,
    1: `${activeChannels} channel generating ${data.monthlyLeads} leads/month. This is not a lead engine. It's hope.`,
  };
  n.leadEngine = leNarratives[zones.leadEngine.score] || leNarratives[3];

  // Founder Load
  if (data.teamSize === 1) {
    n.founderLoad = `Solo operator at ${data.founderWeeklyHours}hrs/week. The question isn't delegation—it's when you make your first key hire.`;
  } else {
    const flNarratives: Record<number, string> = {
      5: `Delegation avg ${avgDelegation}/5. You've built a business, not a job. Congrats.`,
      4: `Delegation avg ${avgDelegation}/5 at ${data.founderWeeklyHours}hrs/week. Getting there. Keep delegating.`,
      3: `Delegation avg ${avgDelegation}/5 at ${data.founderWeeklyHours}hrs/week. You're still too involved in delivery.`,
      2: `Delegation avg ${avgDelegation}/5 at ${data.founderWeeklyHours}hrs/week. You're a bottleneck. The business can't grow past you.`,
      1: `Delegation avg ${avgDelegation}/5 at ${data.founderWeeklyHours}hrs/week. You ARE the business. That's not a flex.`,
    };
    n.founderLoad = flNarratives[zones.founderLoad.score] || flNarratives[3];
  }

  // Systems Readiness
  const srNarratives: Record<number, string> = {
    5: `All processes documented. You could hand this off tomorrow.`,
    4: `${documentedCount}/4 processes documented. Most of the playbook exists.`,
    3: `${documentedCount}/4 processes documented. Getting there, but gaps remain.`,
    2: `${documentedCount}/4 processes documented. Too much lives in your head.`,
    1: `Zero documented processes. Everything lives in your head. You can't scale this.`,
  };
  n.systemsReadiness = srNarratives[zones.systemsReadiness.score] || srNarratives[3];

  // Content & Positioning
  const cpNarratives: Record<number, string> = {
    5: `Posting ${totalPosts}x/week with strong case studies. Content engine is running.`,
    4: `Posting ${totalPosts}x/week with some case studies. Good volume, building proof.`,
    3: `Posting ${totalPosts}x/week. Decent volume, but proof points are thin.`,
    2: `Posting ${totalPosts}x/week. Sporadic at best. Your ICP isn't seeing you.`,
    1: `Posting ${totalPosts}x/week. You're invisible. That's a choice.`,
  };
  n.contentPositioning = cpNarratives[zones.contentPositioning.score] || cpNarratives[3];

  // Team Visibility
  if (data.teamSize === 1) {
    n.teamVisibility = `Solo operator—team visibility doesn't apply yet. Focus on your own content first.`;
  } else {
    const tvNarratives: Record<number, string> = {
      5: `Team posting ${teamPosts}x/week. Your people are building authority alongside you.`,
      4: `Team posting ${teamPosts}x/week. Good start on distributed authority.`,
      3: `Team posting ${teamPosts}x/week. Some visibility, but room to grow.`,
      2: `Team posting ${teamPosts}x/week. Your people are mostly invisible.`,
      1: `Team posts: 0/week. Your people are invisible. That's wasted leverage.`,
    };
    n.teamVisibility = tvNarratives[zones.teamVisibility.score] || tvNarratives[3];
  }

  return n;
}

// ============================================
// REALITY CHECKS (v3.0 spec)
// ============================================

function detectRealityChecks(data: IntakeData, zones: WTFZones): RealityCheck[] {
  const checks: RealityCheck[] = [];
  const revenue = getEffectiveRevenue(data);

  const ratings = [extractRating(data.ceoDeliveryRating), extractRating(data.ceoAccountMgmtRating), extractRating(data.ceoMarketingRating), extractRating(data.ceoSalesRating)];
  const bottleneckAreas: string[] = [];
  if (extractRating(data.ceoDeliveryRating) <= 2) bottleneckAreas.push('Delivery');
  if (extractRating(data.ceoAccountMgmtRating) <= 2) bottleneckAreas.push('Account Management');
  if (extractRating(data.ceoMarketingRating) <= 2) bottleneckAreas.push('Marketing');
  if (extractRating(data.ceoSalesRating) <= 2) bottleneckAreas.push('Sales');
  const biggestBottleneck = bottleneckAreas[0] || 'delivery';

  // Check 1: Referral Dependency
  if (data.referralPercent >= 70) {
    checks.push({
      id: 'referral-dependency',
      type: 'alert',
      title: 'REFERRAL DEPENDENCY ALERT',
      body: `${data.referralPercent}% of your leads come from referrals.\n\nThat sounds great until you realize:\n• You don't control it\n• It doesn't scale\n• One key referrer leaves, and your pipeline craters\n\nReferrals are dessert. You need a main course.`,
    });
  }

  // Check 2: Growth Target Mismatch
  let netGrowthRate = 0;
  if (data.clientsLostAnnual && data.clientsAddedAnnual && data.currentClients && data.currentClients > 0) {
    const clientsLost = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual] ?? 4;
    const clientsAdded = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual] ?? 6;
    netGrowthRate = ((clientsAdded - clientsLost) / data.currentClients) * 100;
  } else if (revenue > 0) {
    netGrowthRate = ((data.newRevenueAnnual - data.churnRevenueAnnual) / revenue) * 100;
  }
  const targetGrowthPercent = revenue > 0 ? ((data.targetRevenue / revenue - 1) * 100) : 0;

  if (netGrowthRate > targetGrowthPercent && netGrowthRate > 0) {
    // Crushing it — celebration
    checks.push({
      id: 'crushing-it',
      type: 'celebration',
      title: 'CRUSHING IT',
      body: `Your net growth rate of ${netGrowthRate.toFixed(1)}% exceeds your ${targetGrowthPercent.toFixed(0)}% target.\n\nKeep doing what you're doing.`,
    });
  } else if (targetGrowthPercent > (netGrowthRate * 1.5) && netGrowthRate > 0) {
    checks.push({
      id: 'growth-target-mismatch',
      type: 'alert',
      title: 'REALITY CHECK',
      body: `You're targeting ${targetGrowthPercent.toFixed(0)}% growth while your net growth rate is ${netGrowthRate.toFixed(1)}%.\n\nThat's ambition. But the math doesn't support it without intervention.\n\nEither:\n1. Fix churn first\n2. Dramatically increase lead gen\n3. Adjust your target to reality`,
    });
  }

  // Check 5: Solo Founder Reality
  if (data.teamSize === 1 && data.founderWeeklyHours > 50) {
    checks.push({
      id: 'solo-founder-reality',
      type: 'alert',
      title: 'SOLO FOUNDER REALITY',
      body: `You're doing everything at ${data.founderWeeklyHours} hours/week.\n\nThis isn't a delegation problem—it's a first-hire decision.\n\nBased on your time, ${biggestBottleneck} is the biggest unlock.\nConsider a part-time contractor before a full-time hire.`,
    });
  }

  return checks;
}

// ============================================
// GROWTH LEVERS
// ============================================

function detectGrowthLevers(data: IntakeData, zones: WTFZones): GrowthLever[] {
  const levers: GrowthLever[] = [];

  if (zones.growthVsChurn.score <= 2) {
    levers.push({
      name: 'Fix Churn',
      impact: 'high',
      description: 'Revenue churn is destroying growth. Fix retention before adding leads.',
      currentState: `Net growth rate: ${zones.growthVsChurn.value.toFixed(1)}%`,
      recommendation: 'Implement 30/60/90 day client health checks and QBRs.',
    });
  }

  if (zones.founderLoad.score <= 2) {
    levers.push({
      name: 'Founder Bottleneck',
      impact: 'high',
      description: "You are the constraint. The business can't grow past you.",
      currentState: `Delegation avg: ${zones.founderLoad.value.toFixed(1)}/5`,
      recommendation: 'Hire or promote a #2. Delegate delivery first, then accounts.',
    });
  }

  if (zones.leadEngine.score <= 2) {
    levers.push({
      name: 'Lead Engine',
      impact: 'high',
      description: 'Not enough qualified leads to sustain growth.',
      currentState: `${data.monthlyLeads} leads/month`,
      recommendation: 'Build a second channel beyond referrals. Content or outbound.',
    });
  }

  if (zones.revenueQuality.score <= 2) {
    levers.push({
      name: 'Revenue Per Head',
      impact: 'medium',
      description: 'Too many people for the revenue generated.',
      currentState: `$${Math.round(zones.revenueQuality.value).toLocaleString()}/FTE`,
      recommendation: 'Raise prices, reduce scope creep, or restructure team.',
    });
  }

  if (zones.systemsReadiness.score <= 2) {
    levers.push({
      name: 'Systems Gap',
      impact: 'medium',
      description: "No documented processes means you can't delegate or scale.",
      currentState: `${zones.systemsReadiness.value}/4 documented`,
      recommendation: 'Document your top 3 processes this month. Start with delivery.',
    });
  }

  if (zones.contentPositioning.score <= 2) {
    levers.push({
      name: 'Visibility',
      impact: 'medium',
      description: "Your market doesn't know you exist.",
      currentState: `${data.founderPostsPerWeek || 0} founder posts/week`,
      recommendation: 'Post 3x/week on LinkedIn. Share case studies and insights.',
    });
  }

  return levers;
}

// ============================================
// FOUNDER OS
// ============================================

function analyzeFounderOS(data: IntakeData) {
  const ratings = [
    extractRating(data.ceoDeliveryRating),
    extractRating(data.ceoAccountMgmtRating),
    extractRating(data.ceoMarketingRating),
    extractRating(data.ceoSalesRating),
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

  return { delegationScore: avgDelegation, onVsInRatio, bottleneckAreas, burnoutRisk };
}

function getDelegationNarrative(score: number): string {
  if (score >= 4.5) return "You've built a machine. The business runs without you in the weeds.";
  if (score >= 3.5) return "Strong delegation. Stay vigilant about creep.";
  if (score >= 2.5) return "Getting there, but you're still too involved in day-to-day.";
  if (score >= 1.5) return "You're doing too much. The business is capped by your capacity.";
  return "You ARE the business. That's not leadership, it's martyrdom.";
}

function getOnVsInNarrative(ratio: number): string {
  if (ratio > 50) return "Healthy balance. You're working on growth, not just execution.";
  if (ratio >= 30) return "Tilted toward execution. Block more strategic time.";
  return "You're trapped in the business. No time for growth work.";
}

// ============================================
// IMPOSSIBILITIES
// ============================================

function detectImpossibilities(data: IntakeData): string[] {
  const impossibilities: string[] = [];
  const revenue = getEffectiveRevenue(data);

  if (data.targetRevenue > revenue * 2) {
    const growthPct = Math.round((data.targetRevenue / revenue - 1) * 100);
    // Only flag churn/leads if they're actually weak — don't contradict good scores
    const hasChurnProblem = data.churnRevenueAnnual > data.newRevenueAnnual * 0.5;
    const hasLeadProblem = data.monthlyLeads < 5;
    if (hasChurnProblem || hasLeadProblem) {
      const fixes = [hasChurnProblem && 'churn', hasLeadProblem && 'lead gen'].filter(Boolean).join(' and ');
      impossibilities.push(`Targeting ${growthPct}% growth. Fix ${fixes} first.`);
    } else {
      impossibilities.push(`Targeting ${growthPct}% growth from $${Math.round(revenue / 1000)}K to $${Math.round(data.targetRevenue / 1000)}K. Aggressive but possible — your fundamentals support it. Focus on capacity and new channels.`);
    }
  }

  if (data.churnRevenueAnnual > data.newRevenueAnnual) {
    impossibilities.push(`Losing more to churn ($${data.churnRevenueAnnual.toLocaleString()}) than gaining ($${data.newRevenueAnnual.toLocaleString()}). Death spiral.`);
  }

  const ceoRatings = [extractRating(data.ceoDeliveryRating), extractRating(data.ceoAccountMgmtRating), extractRating(data.ceoMarketingRating), extractRating(data.ceoSalesRating)];
  const avgDelegation = ceoRatings.reduce((a, b) => a + b, 0) / ceoRatings.length;

  if (avgDelegation < 2 && revenue > 1000000) {
    impossibilities.push(`Running a $${(revenue / 1000000).toFixed(1)}M agency with almost no delegation. Something will break.`);
  }

  return impossibilities;
}

// ============================================
// PRIORITY ACTIONS
// ============================================

function generatePriorityActions(data: IntakeData, zones: WTFZones): PriorityAction[] {
  const actions: PriorityAction[] = [];
  const revenue = getEffectiveRevenue(data);
  const ratings = [extractRating(data.ceoDeliveryRating), extractRating(data.ceoAccountMgmtRating), extractRating(data.ceoMarketingRating), extractRating(data.ceoSalesRating)];
  const avgDelegation = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  if (zones.contentPositioning.score <= 2) {
    actions.push({
      priority: actions.length + 1,
      action: 'Fix positioning/proof mismatch',
      why: "Everything else is noise until this is solved. You can't market a confused message.",
    });
  }

  if (avgDelegation <= 2 && revenue > 1000000) {
    actions.push({
      priority: actions.length + 1,
      action: 'Hire or promote a delivery lead',
      why: `Free yourself from ${data.founderWeeklyHours}+ hrs/week of client work. You're the ceiling.`,
    });
  }

  if (zones.growthVsChurn.score <= 2) {
    actions.push({
      priority: actions.length + 1,
      action: 'Fix churn before adding leads',
      why: `Net growth rate is ${zones.growthVsChurn.value.toFixed(1)}%. New clients are filling a leaky bucket.`,
    });
  }

  if (data.referralPercent >= 70) {
    actions.push({
      priority: actions.length + 1,
      action: 'Build a second lead channel',
      why: `${data.referralPercent}% referral dependency is a single point of failure. Build content or outbound.`,
    });
  }

  if (zones.systemsReadiness.score <= 2) {
    actions.push({
      priority: actions.length + 1,
      action: 'Document your processes',
      why: "You can't delegate what isn't written down. Start with delivery.",
    });
  }

  return actions.slice(0, 5);
}

// ============================================
// MAIN EXPORT
// ============================================

export function calculateAssessment(data: IntakeData): AssessmentResult {
  const revenue = getEffectiveRevenue(data);
  const { segment, label: segmentLabel } = getSegment(revenue);

  const wtfZones: WTFZones = {
    revenueQuality: scoreRevenueQuality(data, segment),
    profitability: scoreProfitability(data),
    growthVsChurn: scoreGrowthVsChurn(data),
    leadEngine: scoreLeadEngine(data, segment),
    founderLoad: scoreFounderLoad(data),
    systemsReadiness: scoreSystemsReadiness(data),
    contentPositioning: scoreContentPositioning(data),
    teamVisibility: scoreTeamVisibility(data),
  };

  const overall = calculateOverallScore(wtfZones);
  const overallLabel = getOverallLabel(overall);
  const narratives = generateNarratives(data, wtfZones);
  const growthLevers = detectGrowthLevers(data, wtfZones);
  const rawFounderOS = analyzeFounderOS(data);
  const founderOS = {
    ...rawFounderOS,
    delegationNarrative: getDelegationNarrative(rawFounderOS.delegationScore),
    onVsInNarrative: getOnVsInNarrative(rawFounderOS.onVsInRatio),
  };
  const impossibilities = detectImpossibilities(data);
  const realityChecks = detectRealityChecks(data, wtfZones);
  const priorityActions = generatePriorityActions(data, wtfZones);

  return {
    overall,
    overallLabel,
    segment,
    segmentLabel,
    wtfZones,
    narratives,
    growthLevers,
    founderOS,
    realityChecks,
    impossibilities,
    priorityActions,
    benchmarks: REVENUE_PER_FTE_BENCHMARKS,
  };
}
