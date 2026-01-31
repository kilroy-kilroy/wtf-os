/**
 * Revelations Calculation Engine v2
 * Five "holy shit" diagnostic revelations for agency assessments.
 *
 * 1. The Founder Tax
 * 2. The Pipeline Probability
 * 3. The Authority Gap
 * 4. The Positioning Collision
 * 5. The Trajectory Fork
 */

import type { EnrichmentResult, AnalysisResult } from './enrichment';

// ============================================
// TYPES
// ============================================

export interface RevelationIntakeData {
  // Basics
  agencyName: string;
  founderName: string;
  email: string;
  website: string;
  founderLinkedinUrl: string;
  companyLinkedinUrl?: string;
  teamSize: number;

  // Revenue & Financials
  lastYearRevenue: number;
  targetRevenue: number;
  netProfitMargin: string; // dropdown range
  lastMonthRevenue: number;

  // Clients & Churn
  currentClients: number;
  clientsLostAnnual: string;   // range: '0-2', '3-5', '6-10', '11-15', '16+'
  clientsAddedAnnual: string;  // range: '0-3', '4-8', '9-15', '16-25', '26+'
  churnCalibration: string;    // 'Lower', 'About Right', 'Higher'

  // Lead Sources
  referralPercent: number;
  inboundPercent: number;
  contentPercent: number;
  paidPercent: number;
  outboundPercent: number;
  partnershipPercent?: number;
  monthlyLeads: number;
  closeRate: string; // dropdown range

  // Founder Time
  founderWeeklyHours: number;
  strategyHoursPerWeek: number;
  ceoDeliveryRating: number;
  ceoAccountMgmtRating: number;
  ceoMarketingRating: number;
  ceoSalesRating: number;

  // Systems & Documentation
  hasSalesSOP: string;
  hasDeliverySOP: string;
  hasAccountMgmtSOP: string;
  hasMarketingSOP: string;

  // Positioning & ICP
  targetCompanySize: string;
  targetIndustry: string | string[];
  statedICP: string;
  coreOffer: string;
  differentiator: string;

  // Visibility & Proof
  founderPostsPerWeek: number;
  teamPostsPerWeek: number;
  hasCaseStudies: string;
  hasNamedClients: string;
}

export type Segment = 'startup' | 'growth' | 'scale' | 'established' | 'enterprise';

export interface FounderTaxResult {
  canRender: boolean;
  founderHourlyEquivalent: number;
  totalOperationalHours: number;
  founderLaborCost: number;
  replacementCost: number;
  laborArbitrage: number;
  strategicOpportunityCost: number;
  totalFounderTax: number;
  breakdown: {
    delivery: { hours: number; rating: number };
    accountMgmt: { hours: number; rating: number };
    marketing: { hours: number; rating: number };
    sales: { hours: number; rating: number };
  };
  biggestBottleneck: string;
}

export interface PipelineProbabilityResult {
  canRender: boolean;
  netClientGrowth: number;
  referralNetworkCeiling: number;
  monthsToReferralCeiling: number | null;
  probabilityOfMajorDisruption: number;
  revenueAtRiskIn3Years: number;
  referralDependencyStatus: 'critical' | 'high' | 'moderate' | 'healthy';
  activeChannels: number;
  referralPercent: number;
  isGrowing: boolean;
  isShrinking: boolean;
  isFlat: boolean;
}

export interface AuthorityGapResult {
  canRender: boolean;
  contentVolumeScore: number;
  proofScore: number;
  aiDiscoverabilityScore: number;
  overallAuthorityScore: number;
  invisibleToBuyersCount: number;
  totalMarketInquiries: number;
  competitorComparison: Array<{
    name: string;
    contentSignals: number | string;
    proofSignals: number | string;
    whyTheySurface: string;
  }> | null;
  problemCoverage: {
    total: number;
    covered: number;
    percentage: number;
    gaps: string[];
  } | null;
  aiResults: {
    claude: { found: boolean };
    chatgpt: { found: boolean };
    perplexity: { found: boolean };
  };
  competitorsRecommendedInstead: string[];
}

export interface PositioningCollisionResult {
  canRender: boolean;
  collisionScore: number;
  proofAlignmentScore: number;
  websiteAlignmentScore: number;
  caseStudyAnalysis: Array<{
    client: string;
    industry: string;
    size: string;
    matchesICP: boolean;
    industryMatch: boolean;
    sizeMatch: boolean;
  }> | null;
  lostLeadsPerYear: number;
  lostRevenueAnnual: number;
  prospectNarrative: {
    headline: string;
    story: string;
    timeOnSite: string;
    verdict: string;
  };
  stated: {
    icp: string;
    offer: string;
    differentiator: string;
    targetIndustry: string | string[];
    targetSize: string;
  };
  proof: {
    websiteHeadline: string;
    caseStudyIndustries: string[];
    caseStudySizes: string[];
  };
  gapsIdentified: string[];
  recommendations: string[];
}

export interface TrajectoryYear {
  revenue: number;
  clients: number;
  founderHours: number;
  margin: number;
  valuation: number;
}

export interface TrajectoryForkResult {
  canRender: boolean;
  currentValuation: number;
  currentMultiple: number;
  trajectoryA: {
    year1: TrajectoryYear;
    year2: TrajectoryYear;
    year3: TrajectoryYear;
    narrative: string;
  };
  trajectoryB: {
    year1: TrajectoryYear;
    year2: TrajectoryYear;
    year3: TrajectoryYear;
    narrative: string;
  };
  gap: {
    revenue: number;
    clients: number;
    founderHoursSaved: number;
    marginPoints: number;
    valuationDifference: number;
  };
  keyInterventions: Array<{
    action: string;
    impact: string;
    priority: number;
  }>;
}

export interface RevelationsResult {
  founderTax: FounderTaxResult | null;
  pipelineProbability: PipelineProbabilityResult | null;
  authorityGap: AuthorityGapResult | null;
  positioningCollision: PositioningCollisionResult | null;
  trajectoryFork: TrajectoryForkResult | null;
  cta: {
    headline: string;
    buttonText: string;
    subtext: string;
  };
}

// ============================================
// CONSTANTS
// ============================================

const MARKET_RATES = {
  delivery: { junior: 45, mid: 65, senior: 85 },
  accountMgmt: { junior: 40, mid: 55, senior: 75 },
  marketing: { junior: 50, mid: 70, senior: 95 },
  sales: { junior: 55, mid: 80, senior: 110 },
};

const STRATEGIC_HOURLY_VALUE: Record<Segment, number> = {
  startup: 200,
  growth: 350,
  scale: 500,
  established: 650,
  enterprise: 800,
};

const AREA_HOURS_PER_WEEK = {
  delivery: 15,
  accountMgmt: 8,
  marketing: 6,
  sales: 10,
};

const RANGE_MIDPOINTS = {
  clientsLost: { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 } as Record<string, number>,
  clientsAdded: { '0-3': 1.5, '4-8': 6, '9-15': 12, '16-25': 20, '26+': 30 } as Record<string, number>,
};

const REFERRAL_NETWORK_MULTIPLIER = 1.5;
const REFERRER_ANNUAL_CHURN_RATE = 0.15;
const AI_BUYER_USAGE_RATE = 0.64;

const VALUATION_MULTIPLES = {
  distressed: 0.2,
  weak: 0.4,
  average: 0.6,
  healthy: 0.8,
  strong: 1.0,
  premium: 1.2,
};

const TRAJECTORY_ASSUMPTIONS = {
  currentPath: {
    clientGrowthDecay: 0.9,
    marginCompression: 0.02,
    founderHoursIncrease: 5,
    valuationMultipleDecay: 0.85,
  },
  interventionPath: {
    clientGrowthBoost: 1.3,
    churnReduction: 0.7,
    marginImprovement: 0.02,
    founderHoursReduction: 5,
    valuationMultipleGrowth: 1.1,
  },
};

const CLOSE_RATE_MIDPOINTS: Record<string, number> = {
  '<10%': 7,
  '10-20%': 15,
  '20-30%': 25,
  '30-40%': 35,
  '40-50%': 45,
  '50%+': 55,
};

const MARGIN_MIDPOINTS: Record<string, number> = {
  '<5%': 0.03,
  '5-10%': 0.075,
  '10-15%': 0.125,
  '15-20%': 0.175,
  '20-25%': 0.225,
  '25-30%': 0.275,
  '30%+': 0.35,
};

// ============================================
// HELPERS
// ============================================

export function getSegment(annualRevenue: number): Segment {
  if (annualRevenue < 500000) return 'startup';
  if (annualRevenue < 2000000) return 'growth';
  if (annualRevenue < 5000000) return 'scale';
  if (annualRevenue < 10000000) return 'established';
  return 'enterprise';
}

export function getAnnualRevenue(data: RevelationIntakeData): number {
  return data.lastYearRevenue || (data.lastMonthRevenue * 12);
}

function getCloseRateMidpoint(closeRateRange: string): number {
  return CLOSE_RATE_MIDPOINTS[closeRateRange] || 25;
}

function parseMarginMidpoint(marginRange: string): number {
  return MARGIN_MIDPOINTS[marginRange] || 0.15;
}

function involvementMultiplier(score: number): number {
  return (5 - score) / 4; // 1→1.0, 5→0.0
}

function getBiggestBottleneck(data: RevelationIntakeData): string {
  const areas = [
    { name: 'Delivery', score: data.ceoDeliveryRating },
    { name: 'Account Management', score: data.ceoAccountMgmtRating },
    { name: 'Marketing', score: data.ceoMarketingRating },
    { name: 'Sales', score: data.ceoSalesRating },
  ];
  return areas.sort((a, b) => a.score - b.score)[0].name;
}

function getLowestDelegationArea(data: RevelationIntakeData): string {
  const areas = [
    { name: 'delivery', score: data.ceoDeliveryRating },
    { name: 'account management', score: data.ceoAccountMgmtRating },
    { name: 'marketing', score: data.ceoMarketingRating },
    { name: 'sales', score: data.ceoSalesRating },
  ];
  return areas.sort((a, b) => a.score - b.score)[0].name;
}

function getChurnMultiplier(calibration: string): number {
  if (calibration === 'Lower') return 0.6;
  if (calibration === 'Higher') return 1.5;
  return 1.0;
}

function getSystemsScore(data: RevelationIntakeData): number {
  const sops = [data.hasSalesSOP, data.hasDeliverySOP, data.hasAccountMgmtSOP, data.hasMarketingSOP];
  let score = 0;
  for (const s of sops) {
    if (s === 'Yes') score += 1;
    else if (s === 'Partial') score += 0.5;
  }
  return score;
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + Math.round(amount);
}

// ============================================
// REVELATION 1: THE FOUNDER TAX
// ============================================

function canRenderFounderTax(data: RevelationIntakeData): boolean {
  const annualRevenue = getAnnualRevenue(data);
  return (
    annualRevenue >= 100000 &&
    data.teamSize > 0 &&
    data.founderWeeklyHours > 0 &&
    data.ceoDeliveryRating >= 1 && data.ceoDeliveryRating <= 5 &&
    data.ceoAccountMgmtRating >= 1 && data.ceoAccountMgmtRating <= 5 &&
    data.ceoMarketingRating >= 1 && data.ceoMarketingRating <= 5 &&
    data.ceoSalesRating >= 1 && data.ceoSalesRating <= 5
  );
}

export function calculateFounderTax(data: RevelationIntakeData): FounderTaxResult | null {
  if (!canRenderFounderTax(data)) return null;

  try {
    const annualRevenue = getAnnualRevenue(data);
    const segment = getSegment(annualRevenue);

    const founderHourlyEquivalent = annualRevenue / (data.teamSize * 2080);

    const founderDeliveryHours = AREA_HOURS_PER_WEEK.delivery * involvementMultiplier(data.ceoDeliveryRating);
    const founderAccountHours = AREA_HOURS_PER_WEEK.accountMgmt * involvementMultiplier(data.ceoAccountMgmtRating);
    const founderMarketingHours = AREA_HOURS_PER_WEEK.marketing * involvementMultiplier(data.ceoMarketingRating);
    const founderSalesHours = AREA_HOURS_PER_WEEK.sales * involvementMultiplier(data.ceoSalesRating);

    const totalOperationalHours = founderDeliveryHours + founderAccountHours + founderMarketingHours + founderSalesHours;

    const founderLaborCost = totalOperationalHours * 52 * founderHourlyEquivalent;

    const replacementCost = (
      (founderDeliveryHours * MARKET_RATES.delivery.mid) +
      (founderAccountHours * MARKET_RATES.accountMgmt.mid) +
      (founderMarketingHours * MARKET_RATES.marketing.mid) +
      (founderSalesHours * MARKET_RATES.sales.mid)
    ) * 52;

    const laborArbitrage = Math.max(0, founderLaborCost - replacementCost);

    const strategicHourlyValue = STRATEGIC_HOURLY_VALUE[segment];
    const strategicOpportunityCost = totalOperationalHours * 52 * strategicHourlyValue;

    let totalFounderTax = laborArbitrage + strategicOpportunityCost;

    // Cap at 80% of revenue
    if (totalFounderTax > annualRevenue * 0.8) {
      totalFounderTax = Math.round(annualRevenue * 0.8);
    }

    return {
      canRender: true,
      founderHourlyEquivalent: Math.round(founderHourlyEquivalent),
      totalOperationalHours: Math.round(totalOperationalHours),
      founderLaborCost: Math.round(founderLaborCost),
      replacementCost: Math.round(replacementCost),
      laborArbitrage: Math.round(laborArbitrage),
      strategicOpportunityCost: Math.round(strategicOpportunityCost),
      totalFounderTax: Math.round(totalFounderTax),
      breakdown: {
        delivery: { hours: Math.round(founderDeliveryHours), rating: data.ceoDeliveryRating },
        accountMgmt: { hours: Math.round(founderAccountHours), rating: data.ceoAccountMgmtRating },
        marketing: { hours: Math.round(founderMarketingHours), rating: data.ceoMarketingRating },
        sales: { hours: Math.round(founderSalesHours), rating: data.ceoSalesRating },
      },
      biggestBottleneck: getBiggestBottleneck(data),
    };
  } catch (error) {
    console.error('Founder Tax calculation failed:', error);
    return null;
  }
}

// ============================================
// REVELATION 2: THE PIPELINE PROBABILITY
// ============================================

function canRenderPipelineProbability(data: RevelationIntakeData): boolean {
  return (
    data.currentClients >= 3 &&
    !!data.clientsLostAnnual &&
    !!data.clientsAddedAnnual &&
    data.referralPercent >= 0 &&
    data.lastMonthRevenue > 0
  );
}

export function calculatePipelineProbability(data: RevelationIntakeData): PipelineProbabilityResult | null {
  if (!canRenderPipelineProbability(data)) return null;

  try {
    const clientsLostMidpoint = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual] ?? 4;
    const clientsAddedMidpoint = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual] ?? 6;

    const netClientGrowth = clientsAddedMidpoint - clientsLostMidpoint;

    const referralNetworkCeiling = Math.round(data.currentClients * REFERRAL_NETWORK_MULTIPLIER);

    const monthsToReferralCeiling = netClientGrowth > 0
      ? Math.round(((referralNetworkCeiling - data.currentClients) / netClientGrowth) * 12)
      : null;

    const topReferrerRetentionRate = Math.pow(1 - REFERRER_ANNUAL_CHURN_RATE, 3);
    const probabilityOfMajorDisruption = data.referralPercent >= 50
      ? Math.round((1 - topReferrerRetentionRate) * (data.referralPercent / 100) * 100)
      : Math.round((1 - topReferrerRetentionRate) * 0.5 * 100);

    const monthlyReferralRevenue = (data.referralPercent / 100) * data.lastMonthRevenue;
    const annualReferralRevenue = monthlyReferralRevenue * 12;
    const revenueAtRiskIn3Years = Math.round(annualReferralRevenue * (probabilityOfMajorDisruption / 100));

    let referralDependencyStatus: PipelineProbabilityResult['referralDependencyStatus'];
    if (data.referralPercent >= 80) referralDependencyStatus = 'critical';
    else if (data.referralPercent >= 60) referralDependencyStatus = 'high';
    else if (data.referralPercent >= 40) referralDependencyStatus = 'moderate';
    else referralDependencyStatus = 'healthy';

    const channels = [
      data.referralPercent,
      data.inboundPercent,
      data.contentPercent,
      data.paidPercent,
      data.outboundPercent,
      data.partnershipPercent || 0,
    ];
    const activeChannels = channels.filter(c => c >= 10).length;

    return {
      canRender: true,
      netClientGrowth,
      referralNetworkCeiling,
      monthsToReferralCeiling,
      probabilityOfMajorDisruption,
      revenueAtRiskIn3Years,
      referralDependencyStatus,
      activeChannels,
      referralPercent: data.referralPercent,
      isGrowing: netClientGrowth > 0,
      isShrinking: netClientGrowth < 0,
      isFlat: netClientGrowth === 0,
    };
  } catch (error) {
    console.error('Pipeline Probability calculation failed:', error);
    return null;
  }
}

// ============================================
// REVELATION 3: THE AUTHORITY GAP
// ============================================

function canRenderAuthorityGap(data: RevelationIntakeData): boolean {
  return (
    data.founderPostsPerWeek >= 0 &&
    data.monthlyLeads > 0 &&
    !!data.closeRate
  );
}

export function calculateAuthorityGap(
  data: RevelationIntakeData,
  enrichment?: EnrichmentResult | null
): AuthorityGapResult | null {
  if (!canRenderAuthorityGap(data)) return null;

  try {
    const weeklyPosts = data.founderPostsPerWeek + data.teamPostsPerWeek;
    let contentVolumeScore: number;
    if (weeklyPosts >= 7) contentVolumeScore = 100;
    else if (weeklyPosts >= 5) contentVolumeScore = 80;
    else if (weeklyPosts >= 3) contentVolumeScore = 60;
    else if (weeklyPosts >= 1) contentVolumeScore = 40;
    else contentVolumeScore = 10;

    const caseStudyScore = data.hasCaseStudies === 'Yes (3+)' ? 100 : data.hasCaseStudies === 'Some (1-2)' ? 50 : 0;
    const namedClientScore = data.hasNamedClients === 'Yes' ? 100 : 0;
    const proofScore = (caseStudyScore + namedClientScore) / 2;

    // AI Discoverability
    const llm = enrichment?.llmAwareness;
    const aiFoundCount = [
      llm?.claude?.agencyMentioned,
      llm?.chatgpt?.agencyMentioned,
      llm?.perplexity?.agencyMentioned,
    ].filter(Boolean).length;
    const aiDiscoverabilityScore = (aiFoundCount / 3) * 100;

    // Invisible buyers
    const closeRateMidpoint = getCloseRateMidpoint(data.closeRate);
    const totalMarketInquiries = data.monthlyLeads / (closeRateMidpoint / 100);
    const buyersUsingAI = Math.round(totalMarketInquiries * AI_BUYER_USAGE_RATE);
    const invisibleToBuyersCount = aiDiscoverabilityScore < 50
      ? Math.round(buyersUsingAI * (1 - aiDiscoverabilityScore / 100))
      : 0;

    // Competitor comparison
    let competitorComparison: AuthorityGapResult['competitorComparison'] = null;
    if (enrichment?.exa?.competitors?.results && enrichment.exa.competitors.results.length > 0) {
      competitorComparison = enrichment.exa.competitors.results.slice(0, 5).map(comp => ({
        name: comp.title,
        contentSignals: 'Unknown',
        proofSignals: 'Unknown',
        whyTheySurface: 'Strong content presence',
      }));
    }

    // Problem coverage
    let problemCoverage: AuthorityGapResult['problemCoverage'] = null;
    const icpProblems = enrichment?.analysis?.icpProblemAwareness;
    if (icpProblems?.problemCoverage) {
      const covered = icpProblems.problemCoverage.filter(p => p.addressed);
      problemCoverage = {
        total: icpProblems.problemCoverage.length,
        covered: covered.length,
        percentage: icpProblems.coveragePercent || Math.round((covered.length / icpProblems.problemCoverage.length) * 100),
        gaps: icpProblems.missingProblems || [],
      };
    }

    const overallAuthorityScore = Math.round(
      (contentVolumeScore * 0.3) + (proofScore * 0.3) + (aiDiscoverabilityScore * 0.4)
    );

    return {
      canRender: true,
      contentVolumeScore,
      proofScore,
      aiDiscoverabilityScore,
      overallAuthorityScore,
      invisibleToBuyersCount,
      totalMarketInquiries: Math.round(totalMarketInquiries),
      competitorComparison,
      problemCoverage,
      aiResults: {
        claude: { found: !!llm?.claude?.agencyMentioned },
        chatgpt: { found: !!llm?.chatgpt?.agencyMentioned },
        perplexity: { found: !!llm?.perplexity?.agencyMentioned },
      },
      competitorsRecommendedInstead: llm?.summary?.topCompetitors || [],
    };
  } catch (error) {
    console.error('Authority Gap calculation failed:', error);
    return null;
  }
}

// ============================================
// REVELATION 4: THE POSITIONING COLLISION
// ============================================

function canRenderPositioningCollision(data: RevelationIntakeData): boolean {
  return !!(data.statedICP && data.coreOffer && data.targetIndustry && data.targetCompanySize);
}

function checkSizeMatch(caseStudySize: string, targetSize: string): boolean {
  const sizeRanges: Record<string, string[]> = {
    '1-10': ['startup', 'small', '1-10', '<10', 'micro'],
    '11-50': ['small', '11-50', '10-50', 'smb'],
    '51-200': ['medium', 'mid-size', '51-200', '50-200', 'smb'],
    '201-1000': ['mid-market', '201-1000', '200-1000', 'enterprise'],
    '1000+': ['enterprise', 'large', '1000+', '>1000'],
  };
  const targetKeywords = sizeRanges[targetSize] || [];
  return targetKeywords.some(keyword => caseStudySize.toLowerCase().includes(keyword.toLowerCase()));
}

export function calculatePositioningCollision(
  data: RevelationIntakeData,
  enrichment?: EnrichmentResult | null
): PositioningCollisionResult | null {
  if (!canRenderPositioningCollision(data)) return null;

  try {
    const targetIndustries = Array.isArray(data.targetIndustry) ? data.targetIndustry : [data.targetIndustry];

    // Case study analysis from enrichment
    let caseStudyAnalysis: PositioningCollisionResult['caseStudyAnalysis'] = null;
    const websiteCaseStudies = enrichment?.apify?.website?.caseStudies;
    if (websiteCaseStudies && websiteCaseStudies.length > 0) {
      caseStudyAnalysis = websiteCaseStudies.map(cs => {
        const industry = cs.summary?.substring(0, 100) || 'Unknown';
        const industryMatch = targetIndustries.some(ind =>
          industry.toLowerCase().includes(ind.toLowerCase())
        );
        const sizeMatch = false; // Can't reliably determine from scrape
        return {
          client: cs.clientName || cs.title || 'Unnamed',
          industry: industry.substring(0, 50),
          size: 'Unknown',
          matchesICP: industryMatch,
          industryMatch,
          sizeMatch,
        };
      });
    }

    // Proof alignment score
    let proofAlignmentScore = 50;
    if (caseStudyAnalysis && caseStudyAnalysis.length > 0) {
      const matching = caseStudyAnalysis.filter(cs => cs.matchesICP).length;
      proofAlignmentScore = Math.round((matching / caseStudyAnalysis.length) * 100);
    }

    // Website alignment from Claude analysis
    const websiteAlignmentScore = enrichment?.analysis?.positioningCoherence?.score
      ? enrichment.analysis.positioningCoherence.score * 10
      : 50;

    const collisionScore = 100 - Math.round((proofAlignmentScore + websiteAlignmentScore) / 2);

    // Lost leads calculation
    const monthlyTrafficEstimate = data.monthlyLeads * 50;
    const bounceRateIncrease = collisionScore > 50 ? (collisionScore - 50) / 100 : 0;
    const additionalBounces = Math.round(monthlyTrafficEstimate * bounceRateIncrease * 0.5);
    const qualifiedVisitorToLeadRate = data.monthlyLeads / monthlyTrafficEstimate;
    const lostLeadsPerMonth = Math.round(additionalBounces * qualifiedVisitorToLeadRate);
    const lostLeadsPerYear = lostLeadsPerMonth * 12;
    const avgClientValue = data.lastMonthRevenue / data.currentClients;
    const closeRateMidpoint = getCloseRateMidpoint(data.closeRate) / 100;
    const lostRevenueAnnual = Math.round(lostLeadsPerYear * closeRateMidpoint * avgClientValue * 12);

    // Prospect narrative
    const icpLabel = data.statedICP.substring(0, 50);
    const hasMatchingProof = caseStudyAnalysis?.some(cs => cs.matchesICP);
    const prospectNarrative = hasMatchingProof
      ? {
          headline: "Your proof mostly backs up your claims",
          story: `A ${icpLabel} lands on your site, sees your headline, scans your case studies—and at least one looks like their situation. They stay. But you could be stronger.`,
          timeOnSite: "45+ seconds",
          verdict: "Continues exploring",
        }
      : {
          headline: "Your proof tells a different story than your positioning",
          story: `A ${icpLabel} lands on your site. They see you claim to serve them. Then they look at your case studies: different industries, different company sizes. Mental math: "These people say they do this, but all their proof is with different companies. Can they really do it for ME?" The other agency's site shows exactly their situation.`,
          timeOnSite: "8-14 seconds",
          verdict: "Exit. Tab closed.",
        };

    return {
      canRender: true,
      collisionScore,
      proofAlignmentScore,
      websiteAlignmentScore,
      caseStudyAnalysis,
      lostLeadsPerYear,
      lostRevenueAnnual,
      prospectNarrative,
      stated: {
        icp: data.statedICP,
        offer: data.coreOffer,
        differentiator: data.differentiator,
        targetIndustry: data.targetIndustry,
        targetSize: data.targetCompanySize,
      },
      proof: {
        websiteHeadline: enrichment?.apify?.website?.homepage?.h1?.[0] || 'Not captured',
        caseStudyIndustries: caseStudyAnalysis?.map(cs => cs.industry) || [],
        caseStudySizes: caseStudyAnalysis?.map(cs => cs.size) || [],
      },
      gapsIdentified: enrichment?.analysis?.positioningCoherence?.gaps || [],
      recommendations: enrichment?.analysis?.positioningCoherence?.recommendations || [],
    };
  } catch (error) {
    console.error('Positioning Collision calculation failed:', error);
    return null;
  }
}

// ============================================
// REVELATION 5: THE TRAJECTORY FORK
// ============================================

function canRenderTrajectoryFork(data: RevelationIntakeData): boolean {
  return (
    data.lastMonthRevenue > 0 &&
    data.currentClients >= 5 &&
    !!data.clientsLostAnnual &&
    !!data.clientsAddedAnnual &&
    data.founderWeeklyHours > 0 &&
    data.ceoDeliveryRating >= 1 &&
    !!data.netProfitMargin &&
    getAnnualRevenue(data) >= 100000
  );
}

function projectTrajectory(
  type: 'current' | 'intervention',
  baseline: {
    year0: { revenue: number; clients: number; founderHours: number; margin: number; multiple: number };
    netClientGrowth: number;
    clientsLost: number;
    avgClientValue: number;
    delegationScore: number;
  }
): Record<string, any> {
  const assumptions = type === 'current'
    ? TRAJECTORY_ASSUMPTIONS.currentPath
    : TRAJECTORY_ASSUMPTIONS.interventionPath;
  const years: Record<string, any> = {};
  let prevYear = baseline.year0;

  for (let i = 1; i <= 3; i++) {
    let nextYear: any = {};

    if (type === 'current') {
      const curAssumptions = assumptions as typeof TRAJECTORY_ASSUMPTIONS.currentPath;
      const effectiveGrowth = baseline.netClientGrowth * Math.pow(curAssumptions.clientGrowthDecay, i);
      nextYear.clients = Math.max(5, Math.round(prevYear.clients + effectiveGrowth));
      nextYear.revenue = nextYear.clients * baseline.avgClientValue;
      nextYear.founderHours = Math.min(70, prevYear.founderHours + curAssumptions.founderHoursIncrease);
      nextYear.margin = Math.max(0.02, prevYear.margin - curAssumptions.marginCompression);
      nextYear.multiple = Math.max(0.2, prevYear.multiple * curAssumptions.valuationMultipleDecay);

      if (effectiveGrowth < 0) {
        nextYear.founderHours = Math.min(70, nextYear.founderHours + 3);
        nextYear.margin = Math.max(0.02, nextYear.margin - 0.02);
      }
    } else {
      const intAssumptions = assumptions as typeof TRAJECTORY_ASSUMPTIONS.interventionPath;
      const boostedGrowth = baseline.netClientGrowth * intAssumptions.clientGrowthBoost;
      const reducedChurn = baseline.clientsLost * intAssumptions.churnReduction;
      const effectiveGrowth = boostedGrowth + (baseline.clientsLost - reducedChurn);

      nextYear.clients = Math.round(prevYear.clients + effectiveGrowth);
      nextYear.revenue = nextYear.clients * baseline.avgClientValue * 1.05;
      nextYear.founderHours = Math.max(25, prevYear.founderHours - intAssumptions.founderHoursReduction);
      nextYear.margin = Math.min(0.35, prevYear.margin + intAssumptions.marginImprovement);
      nextYear.multiple = Math.min(1.2, prevYear.multiple * intAssumptions.valuationMultipleGrowth);
    }

    nextYear.valuation = Math.round(nextYear.revenue * nextYear.multiple);
    years[`year${i}`] = nextYear;
    prevYear = nextYear;
  }

  return years;
}

function formatTrajectoryYear(year: any): TrajectoryYear {
  return {
    revenue: Math.round(year.revenue),
    clients: Math.round(year.clients),
    founderHours: Math.round(year.founderHours),
    margin: Math.round(year.margin * 100),
    valuation: Math.round(year.valuation),
  };
}

function generateTrajectoryNarrative(type: 'current' | 'intervention', trajectory: any, data: RevelationIntakeData): string {
  if (type === 'current') {
    if (trajectory.year3.clients < data.currentClients * 0.8) {
      return "The spiral compounds. Less clients → more founder delivery → less time for growth → fewer clients. By year 3, you're working more hours for less money.";
    } else if (trajectory.year3.revenue < data.lastMonthRevenue * 12) {
      return "You're not collapsing, but you're slowly shrinking. Death by a thousand cuts rather than a single blow.";
    }
    return "Modest growth continues, but founder hours stay high. You're building a well-paying job, not a valuable asset.";
  }
  return "Hire a delivery lead (year 1), add a non-referral channel (year 1-2), fix positioning/proof (year 1). The compound effect kicks in by year 2.";
}

export function calculateTrajectoryFork(
  data: RevelationIntakeData,
  calculations: { positioningCollision?: PositioningCollisionResult | null }
): TrajectoryForkResult | null {
  if (!canRenderTrajectoryFork(data)) return null;

  try {
    const avgClientValue = data.lastMonthRevenue / data.currentClients;
    const annualClientValue = avgClientValue * 12;
    const annualRevenue = getAnnualRevenue(data);

    const clientsLostMidpoint = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual] ?? 4;
    const clientsAddedMidpoint = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual] ?? 6;
    const netClientGrowth = clientsAddedMidpoint - clientsLostMidpoint;

    const delegationScore = (
      data.ceoDeliveryRating + data.ceoAccountMgmtRating +
      data.ceoMarketingRating + data.ceoSalesRating
    ) / 4;

    const systemsScore = getSystemsScore(data);
    const marginMidpoint = parseMarginMidpoint(data.netProfitMargin);

    // Current valuation multiple
    let currentMultiple = VALUATION_MULTIPLES.average;
    if (delegationScore < 2) currentMultiple -= 0.2;
    if (netClientGrowth < 0) currentMultiple -= 0.15;
    if (systemsScore < 2) currentMultiple -= 0.1;
    if (marginMidpoint > 0.20) currentMultiple += 0.1;
    if (netClientGrowth > 5) currentMultiple += 0.1;
    currentMultiple = Math.max(0.2, Math.min(1.2, currentMultiple));

    const baseline = {
      year0: {
        revenue: annualRevenue,
        clients: data.currentClients,
        founderHours: data.founderWeeklyHours,
        margin: marginMidpoint,
        multiple: currentMultiple,
      },
      netClientGrowth,
      clientsLost: clientsLostMidpoint,
      avgClientValue: annualClientValue,
      delegationScore,
    };

    const trajA = projectTrajectory('current', baseline);
    const trajB = projectTrajectory('intervention', baseline);

    const year3Gap = {
      revenue: trajB.year3.revenue - trajA.year3.revenue,
      clients: trajB.year3.clients - trajA.year3.clients,
      founderHours: trajA.year3.founderHours - trajB.year3.founderHours,
      margin: trajB.year3.margin - trajA.year3.margin,
      valuation: trajB.year3.valuation - trajA.year3.valuation,
    };

    // Key interventions
    const interventions: Array<{ action: string; impact: string; priority: number }> = [];

    if (delegationScore < 3) {
      interventions.push({
        action: `Hire/promote ${getLowestDelegationArea(data)} lead`,
        impact: 'Frees 10-15 hours/week',
        priority: 1,
      });
    }

    if (data.referralPercent >= 60) {
      interventions.push({
        action: 'Build second lead channel (content or outbound)',
        impact: 'Reduces pipeline risk by 40%',
        priority: 2,
      });
    }

    if (calculations.positioningCollision?.collisionScore && calculations.positioningCollision.collisionScore > 40) {
      interventions.push({
        action: 'Align proof with positioning (new case studies, testimonials)',
        impact: `Recover ~${calculations.positioningCollision.lostLeadsPerYear} lost leads/year`,
        priority: 3,
      });
    }

    return {
      canRender: true,
      currentValuation: Math.round(annualRevenue * currentMultiple),
      currentMultiple,
      trajectoryA: {
        year1: formatTrajectoryYear(trajA.year1),
        year2: formatTrajectoryYear(trajA.year2),
        year3: formatTrajectoryYear(trajA.year3),
        narrative: generateTrajectoryNarrative('current', trajA, data),
      },
      trajectoryB: {
        year1: formatTrajectoryYear(trajB.year1),
        year2: formatTrajectoryYear(trajB.year2),
        year3: formatTrajectoryYear(trajB.year3),
        narrative: generateTrajectoryNarrative('intervention', trajB, data),
      },
      gap: {
        revenue: Math.round(year3Gap.revenue),
        clients: Math.round(year3Gap.clients),
        founderHoursSaved: Math.round(year3Gap.founderHours),
        marginPoints: Math.round(year3Gap.margin * 100) / 100,
        valuationDifference: Math.round(year3Gap.valuation),
      },
      keyInterventions: interventions.slice(0, 3),
    };
  } catch (error) {
    console.error('Trajectory Fork calculation failed:', error);
    return null;
  }
}

// ============================================
// CTA GENERATOR
// ============================================

function generateCTA(calculations: Partial<RevelationsResult>): RevelationsResult['cta'] {
  const opportunities = [
    {
      value: calculations.founderTax?.totalFounderTax || 0,
      cta: `Your agency is paying a ${formatCurrency(calculations.founderTax?.totalFounderTax || 0)} Founder Tax. Let's talk about getting that back.`,
    },
    {
      value: calculations.pipelineProbability?.revenueAtRiskIn3Years || 0,
      cta: `${formatCurrency(calculations.pipelineProbability?.revenueAtRiskIn3Years || 0)} in revenue at risk from pipeline dependency. Let's build a second channel.`,
    },
    {
      value: calculations.positioningCollision?.lostRevenueAnnual || 0,
      cta: `~${formatCurrency(calculations.positioningCollision?.lostRevenueAnnual || 0)}/year in invisible losses from positioning/proof mismatch. Let's fix that.`,
    },
    {
      value: calculations.trajectoryFork?.gap?.valuationDifference || 0,
      cta: `The difference between your two trajectories is ${formatCurrency(calculations.trajectoryFork?.gap?.valuationDifference || 0)} in enterprise value. Want to talk about which one you're building?`,
    },
  ];

  const biggest = opportunities.sort((a, b) => b.value - a.value)[0];

  return {
    headline: biggest.cta,
    buttonText: "Book Your Roadmap Call",
    subtext: "60 minutes. We'll build your intervention plan.",
  };
}

// ============================================
// MAIN EXPORT
// ============================================

export function calculateRevelations(
  data: RevelationIntakeData,
  enrichment?: EnrichmentResult | null
): RevelationsResult {
  const founderTax = calculateFounderTax(data);
  const pipelineProbability = calculatePipelineProbability(data);
  const authorityGap = calculateAuthorityGap(data, enrichment);
  const positioningCollision = calculatePositioningCollision(data, enrichment);
  const trajectoryFork = calculateTrajectoryFork(data, { positioningCollision });

  const result: RevelationsResult = {
    founderTax,
    pipelineProbability,
    authorityGap,
    positioningCollision,
    trajectoryFork,
    cta: { headline: '', buttonText: 'Book Your Roadmap Call', subtext: '' },
  };

  result.cta = generateCTA(result);

  return result;
}
