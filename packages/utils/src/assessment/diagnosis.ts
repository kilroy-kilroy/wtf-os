/**
 * Claude-as-Diagnostician Engine
 *
 * Replaces template-selected copy with actual Claude-generated diagnoses.
 * Each Revelation gets its own prompt with the full Agency Context.
 * Claude produces actual written analysis specific to THIS agency.
 */

import type { IntakeData, AssessmentResult } from './scoring';
import type { EnrichmentResult } from './enrichment';
import {
  type RevelationIntakeData,
  type RevelationsResult,
  getSegment,
  getAnnualRevenue,
  formatCurrency,
  calculateFounderTax,
  calculatePipelineProbability,
  calculateAuthorityGap,
  calculatePositioningCollision,
  calculateTrajectoryFork,
} from './revelations';

// ============================================
// AGENCY CONTEXT
// ============================================

export interface AgencyContext {
  agencyName: string;
  founderName: string;
  website: string;
  segment: string;

  // Financials
  annualRevenue: number;
  targetRevenue: number;
  growthTarget: number;
  lastMonthRevenue: number;
  netProfitMargin: string;
  marginMidpoint: number;
  revenuePerFTE: number;

  // Team
  teamSize: number;
  isSoloFounder: boolean;

  // Clients & Growth
  currentClients: number;
  clientsLostAnnual: string;
  clientsAddedAnnual: string;
  clientsLostMidpoint: number;
  clientsAddedMidpoint: number;
  netClientGrowth: number;
  netGrowthRate: number;
  avgClientValue: number;

  // Pipeline
  leadSources: {
    referral: number;
    inbound: number;
    content: number;
    paid: number;
    outbound: number;
    partnership: number;
  };
  monthlyLeads: number;
  closeRate: string;
  closeRateMidpoint: number;
  activeChannels: number;

  // Founder Load
  founderWeeklyHours: number;
  strategyHoursPerWeek: number;
  operationalHoursPerWeek: number;
  delegation: {
    delivery: number;
    accountMgmt: number;
    marketing: number;
    sales: number;
    average: number;
  };
  lowestDelegationArea: string;

  // Systems
  sops: {
    sales: string;
    delivery: string;
    accountMgmt: string;
    marketing: string;
  };
  documentedCount: number;

  // Positioning (stated)
  statedICP: string;
  targetCompanySize: string;
  targetIndustry: string[];
  coreOffer: string;
  differentiator: string;

  // Content & Visibility
  founderPostsPerWeek: number;
  teamPostsPerWeek: number;
  totalPostsPerWeek: number;
  hasCaseStudies: string;
  hasNamedClients: boolean;

  // Enrichment: Website
  websiteHeadline: string;
  websiteServices: string[];
  websiteTestimonials: { quote: string; attribution: string }[];
  websiteCaseStudies: { client: string; industry: string; companySize: string; description: string }[];
  websiteClientLogos: string[];

  // Enrichment: LinkedIn
  founderHeadline: string;
  founderAbout: string;
  founderFollowers: number;
  founderRecentPosts: { content: string; engagement: number }[];
  companyDescription: string;
  companyFollowers: number;
  companyRecentPosts: { content: string; engagement: number }[];

  // Enrichment: Market Research
  icpProblems: string[];
  competitors: { name: string; website: string; positioning: string }[];

  // Enrichment: AI Discoverability
  aiDiscoverability: {
    queries: string[];
    claude: { found: boolean; context: string; recommended: string[] };
    chatgpt: { found: boolean; context: string; recommended: string[] };
    perplexity: { found: boolean; context: string; recommended: string[] };
    foundInCount: number;
  };

  // Calculated scores (for heatmap reference)
  scores: {
    revenueQuality: number;
    profitability: number;
    growthVsChurn: number;
    leadEngine: number;
    founderLoad: number;
    systemsReadiness: number;
    contentPositioning: number;
    teamVisibility: number;
    overall: number;
  };

  // Segment benchmarks
  benchmarks: {
    revenuePerFTE: { poor: number; ok: number; good: number; great: number };
    founderHours: { concerning: number; typical: number; healthy: number };
    netGrowthRate: { poor: number; ok: number; good: number; great: number };
    delegationAvg: { poor: number; ok: number; good: number };
  };
}

// ============================================
// CONSTANTS
// ============================================

const CLOSE_RATE_MIDPOINTS: Record<string, number> = {
  '<10%': 7,
  '10-20%': 15,
  '20-30%': 25,
  '30-40%': 35,
  '40-50%': 45,
  '50%+': 55,
};

const MARGIN_MIDPOINTS: Record<string, number> = {
  '<5%': 3,
  '5-10%': 7.5,
  '10-15%': 12.5,
  '15-20%': 17.5,
  '20-25%': 22.5,
  '25-30%': 27.5,
  '30%+': 35,
};

const RANGE_MIDPOINTS = {
  clientsLost: { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 } as Record<string, number>,
  clientsAdded: { '0-3': 1.5, '4-8': 6, '9-15': 12, '16-25': 20, '26+': 30 } as Record<string, number>,
};

const SEGMENT_BENCHMARKS: Record<string, AgencyContext['benchmarks']> = {
  startup: {
    revenuePerFTE: { poor: 50000, ok: 80000, good: 120000, great: 180000 },
    founderHours: { concerning: 55, typical: 45, healthy: 40 },
    netGrowthRate: { poor: -10, ok: 5, good: 20, great: 40 },
    delegationAvg: { poor: 1.5, ok: 2.5, good: 3.5 },
  },
  growth: {
    revenuePerFTE: { poor: 80000, ok: 120000, good: 180000, great: 250000 },
    founderHours: { concerning: 55, typical: 45, healthy: 38 },
    netGrowthRate: { poor: -5, ok: 10, good: 25, great: 40 },
    delegationAvg: { poor: 2, ok: 3, good: 3.5 },
  },
  scale: {
    revenuePerFTE: { poor: 100000, ok: 150000, good: 200000, great: 300000 },
    founderHours: { concerning: 50, typical: 42, healthy: 35 },
    netGrowthRate: { poor: -5, ok: 10, good: 20, great: 35 },
    delegationAvg: { poor: 2.5, ok: 3, good: 4 },
  },
  established: {
    revenuePerFTE: { poor: 120000, ok: 180000, good: 250000, great: 350000 },
    founderHours: { concerning: 50, typical: 40, healthy: 32 },
    netGrowthRate: { poor: -5, ok: 5, good: 15, great: 25 },
    delegationAvg: { poor: 3, ok: 3.5, good: 4.5 },
  },
  enterprise: {
    revenuePerFTE: { poor: 150000, ok: 200000, good: 300000, great: 400000 },
    founderHours: { concerning: 45, typical: 38, healthy: 30 },
    netGrowthRate: { poor: -5, ok: 5, good: 10, great: 20 },
    delegationAvg: { poor: 3.5, ok: 4, good: 4.5 },
  },
};

// ============================================
// BUILD AGENCY CONTEXT
// ============================================

export function buildAgencyContext(
  intakeData: IntakeData,
  enrichment: EnrichmentResult | null,
  scores: AssessmentResult,
): AgencyContext {
  const annualRevenue = intakeData.lastYearRevenue || ((intakeData.lastMonthRevenue || 0) * 12) || 0;
  const segment = getSegment(annualRevenue);
  const teamSize = Number(intakeData.teamSize) || 1;
  const revenuePerFTE = annualRevenue / teamSize;
  const targetRevenue = intakeData.targetRevenue || 0;
  const growthTarget = annualRevenue > 0 ? Math.round(((targetRevenue / annualRevenue) - 1) * 100) : 0;
  const marginMidpoint = MARGIN_MIDPOINTS[intakeData.netProfitMargin || ''] || 15;

  const currentClients = intakeData.currentClients || 0;
  const clientsLostMidpoint = RANGE_MIDPOINTS.clientsLost[intakeData.clientsLostAnnual || ''] || 4;
  const clientsAddedMidpoint = RANGE_MIDPOINTS.clientsAdded[intakeData.clientsAddedAnnual || ''] || 6;
  const netClientGrowth = clientsAddedMidpoint - clientsLostMidpoint;
  const netGrowthRate = currentClients > 0 ? Math.round((netClientGrowth / currentClients) * 100) : 0;
  const avgClientValue = currentClients > 0 ? ((intakeData.lastMonthRevenue || 0) / currentClients) * 12 : 0;

  const closeRateMidpoint = CLOSE_RATE_MIDPOINTS[intakeData.closeRate as string || ''] || 25;

  const referral = intakeData.referralPercent || 0;
  const inbound = intakeData.inboundPercent || 0;
  const content = intakeData.contentPercent || 0;
  const paid = intakeData.paidPercent || 0;
  const outbound = intakeData.outboundPercent || 0;
  const partnership = intakeData.partnershipPercent || 0;
  const channels = [referral, inbound, content, paid, outbound, partnership];
  const activeChannels = channels.filter(c => c >= 10).length;

  const delivery = Number(intakeData.ceoDeliveryRating) || 3;
  const accountMgmt = Number(intakeData.ceoAccountMgmtRating) || 3;
  const marketing = Number(intakeData.ceoMarketingRating) || 3;
  const sales = Number(intakeData.ceoSalesRating) || 3;
  const delegationAvg = (delivery + accountMgmt + marketing + sales) / 4;
  const delegationAreas = [
    { name: 'delivery', score: delivery },
    { name: 'account management', score: accountMgmt },
    { name: 'marketing', score: marketing },
    { name: 'sales', score: sales },
  ];
  const lowestDelegationArea = delegationAreas.sort((a, b) => a.score - b.score)[0].name;

  const founderWeeklyHours = intakeData.founderWeeklyHours || 0;
  const strategyHoursPerWeek = intakeData.strategyHoursPerWeek || 0;
  const operationalHoursPerWeek = founderWeeklyHours - strategyHoursPerWeek;

  const sops = {
    sales: intakeData.hasSalesSOP || 'No',
    delivery: intakeData.hasDeliverySOP || 'No',
    accountMgmt: intakeData.hasAccountMgmtSOP || 'No',
    marketing: intakeData.hasMarketingSOP || 'No',
  };
  let documentedCount = 0;
  for (const v of Object.values(sops)) {
    if (v === 'Yes') documentedCount += 1;
    else if (v === 'Partial') documentedCount += 0.5;
  }

  const targetIndustry = Array.isArray(intakeData.targetIndustry)
    ? intakeData.targetIndustry
    : intakeData.targetIndustry ? [intakeData.targetIndustry] : [];

  // Enrichment data
  const website = enrichment?.apify?.website;
  const founderLI = enrichment?.apify?.founderLinkedin;
  const founderPosts = enrichment?.apify?.founderPosts;
  const companyLI = enrichment?.apify?.companyLinkedin;
  const companyPosts = enrichment?.apify?.companyPosts;
  const llm = enrichment?.llmAwareness;

  const websiteHeadline = website?.homepage?.h1?.[0] || website?.homepage?.metaDescription || '';
  const websiteServices = website?.services || [];
  const websiteTestimonials = (website?.testimonials || []).map(t => ({
    quote: t.text,
    attribution: [t.author, t.company].filter(Boolean).join(', '),
  }));
  const websiteCaseStudies = (website?.caseStudies || []).map(cs => ({
    client: cs.clientName || cs.title || 'Unnamed',
    industry: cs.summary?.substring(0, 100) || 'Unknown',
    companySize: 'Unknown',
    description: cs.summary?.substring(0, 300) || '',
  }));
  const websiteClientLogos = website?.clientLogos || [];

  const founderRecentPosts = (founderPosts?.posts || []).slice(0, 5).map(p => ({
    content: p.text.substring(0, 200),
    engagement: p.likes + p.comments + p.shares,
  }));
  const companyRecentPosts = (companyPosts?.posts || []).slice(0, 5).map(p => ({
    content: p.text.substring(0, 200),
    engagement: p.likes + p.comments + p.shares,
  }));

  // ICP problems from Exa
  const icpProblems = (enrichment?.exa?.icpProblems || [])
    .flatMap(r => r.results.slice(0, 3).map(x => x.title))
    .slice(0, 10);

  const competitors = (enrichment?.exa?.competitors?.results || []).slice(0, 5).map(r => ({
    name: r.title,
    website: r.url,
    positioning: r.snippet,
  }));

  // AI discoverability
  const aiFoundCount = [
    llm?.claude?.agencyMentioned,
    llm?.chatgpt?.agencyMentioned,
    llm?.perplexity?.agencyMentioned,
  ].filter(Boolean).length;

  const extractRecommended = (check: any): string[] => {
    if (!check?.available || !check?.competitorsMentioned) return [];
    return check.competitorsMentioned.slice(0, 5);
  };

  const aiDiscoverability = {
    queries: [], // queries are built internally
    claude: {
      found: !!llm?.claude?.agencyMentioned,
      context: llm?.claude?.rawResponse?.substring(0, 500) || '',
      recommended: extractRecommended(llm?.claude),
    },
    chatgpt: {
      found: !!llm?.chatgpt?.agencyMentioned,
      context: llm?.chatgpt?.rawResponse?.substring(0, 500) || '',
      recommended: extractRecommended(llm?.chatgpt),
    },
    perplexity: {
      found: !!llm?.perplexity?.agencyMentioned,
      context: llm?.perplexity?.rawResponse?.substring(0, 500) || '',
      recommended: extractRecommended(llm?.perplexity),
    },
    foundInCount: aiFoundCount,
  };

  const zones = scores.wtfZones || {} as any;
  const contextScores = {
    revenueQuality: zones.revenueQuality?.score || 0,
    profitability: zones.profitability?.score || 0,
    growthVsChurn: zones.growthVsChurn?.score || 0,
    leadEngine: zones.leadEngine?.score || 0,
    founderLoad: zones.founderLoad?.score || 0,
    systemsReadiness: zones.systemsReadiness?.score || 0,
    contentPositioning: zones.contentPositioning?.score || 0,
    teamVisibility: zones.teamVisibility?.score || 0,
    overall: scores.overall || 0,
  };

  return {
    agencyName: intakeData.agencyName || '',
    founderName: intakeData.founderName || '',
    website: intakeData.website || '',
    segment,
    annualRevenue,
    targetRevenue,
    growthTarget,
    lastMonthRevenue: intakeData.lastMonthRevenue || 0,
    netProfitMargin: intakeData.netProfitMargin || '',
    marginMidpoint,
    revenuePerFTE,
    teamSize,
    isSoloFounder: teamSize <= 1,
    currentClients,
    clientsLostAnnual: intakeData.clientsLostAnnual || '',
    clientsAddedAnnual: intakeData.clientsAddedAnnual || '',
    clientsLostMidpoint,
    clientsAddedMidpoint,
    netClientGrowth,
    netGrowthRate,
    avgClientValue,
    leadSources: { referral, inbound, content, paid, outbound, partnership },
    monthlyLeads: intakeData.monthlyLeads || 0,
    closeRate: intakeData.closeRate as string || '',
    closeRateMidpoint,
    activeChannels,
    founderWeeklyHours,
    strategyHoursPerWeek,
    operationalHoursPerWeek,
    delegation: { delivery, accountMgmt, marketing, sales, average: delegationAvg },
    lowestDelegationArea,
    sops,
    documentedCount,
    statedICP: intakeData.statedICP || intakeData.targetMarket || '',
    targetCompanySize: intakeData.targetCompanySize || '',
    targetIndustry,
    coreOffer: intakeData.coreOffer || '',
    differentiator: intakeData.differentiator || '',
    founderPostsPerWeek: intakeData.founderPostsPerWeek || 0,
    teamPostsPerWeek: intakeData.teamPostsPerWeek || 0,
    totalPostsPerWeek: (intakeData.founderPostsPerWeek || 0) + (intakeData.teamPostsPerWeek || 0),
    hasCaseStudies: intakeData.hasCaseStudies || 'No',
    hasNamedClients: intakeData.hasNamedClients === 'Yes',
    websiteHeadline,
    websiteServices,
    websiteTestimonials,
    websiteCaseStudies,
    websiteClientLogos,
    founderHeadline: founderLI?.headline || '',
    founderAbout: founderLI?.about || '',
    founderFollowers: founderLI?.followerCount || 0,
    founderRecentPosts,
    companyDescription: companyLI?.about || '',
    companyFollowers: companyLI?.followerCount || 0,
    companyRecentPosts,
    icpProblems,
    competitors,
    aiDiscoverability,
    scores: contextScores,
    benchmarks: SEGMENT_BENCHMARKS[segment] || SEGMENT_BENCHMARKS.growth,
  };
}

// ============================================
// SYSTEM PROMPT
// ============================================

const DIAGNOSIS_SYSTEM_PROMPT = `You are a senior agency strategist conducting a diagnostic for {agencyName}.

YOUR ROLE:
You're not a report generator. You're a diagnostician. Your job is to see what the founder can't see—the invisible dynamics, compound effects, and trajectory implications of their current situation.

PRINCIPLES:
1. SPECIFICITY: Every sentence should be about THIS agency. If you could copy-paste it to another agency, rewrite it.

2. DOLLARS OVER SCORES: Connect everything to money. "Your delegation is low" means nothing. "You're paying $287K/year in Founder Tax because of your account management bottleneck" means something.

3. DIAGNOSIS OVER JUDGMENT: You're not grading them. You're showing them something true. "Your positioning is weak" is judgment. "There's a collision between what you claim and what you prove—here's the cost" is diagnosis.

4. ONE THING: End with ONE recommended action. Not options. Not a list. The single most important move for THIS agency right now.

5. TRAJECTORY OVER SNAPSHOT: Don't just describe where they are. Show where they're headed, and what changes if they intervene.

VOICE:
- Direct, not aggressive
- Confident, not arrogant
- Specific, not generic
- Strategic peer, not consultant-speak

FORMAT:
- Use the founder's name when it makes sense
- Use specific numbers from their data
- Show your math when calculating costs/projections
- Use markdown formatting (headers, bold, tables) appropriately
- Keep it scannable—short paragraphs, clear structure

CONSTRAINTS:
- 200-400 words per Revelation (quality over length)
- Must reference specific data points from their context
- Must include at least one calculation the founder hasn't done themselves
- Must end with ONE specific, concrete recommended action
- Never use generic phrases like "many agencies", "founders often", "typically should"`;

// ============================================
// REVELATION PROMPTS
// ============================================

function buildFounderTaxPrompt(ctx: AgencyContext): string {
  return `## REVELATION 1: THE FOUNDER TAX

AGENCY CONTEXT:
${JSON.stringify(ctx, null, 2)}

YOUR TASK:
Diagnose the true cost of this founder's operational involvement.

WHAT YOU'RE REVEALING:
The Founder Tax has two components:
1. Labor Arbitrage: The difference between what the founder "pays" themselves per hour for operational work vs. what it would cost to hire
2. Strategic Opportunity Cost: The value of the strategic work they're NOT doing because they're stuck in operations

CALCULATIONS TO PERFORM:
- Implied founder hourly rate = annualRevenue / (teamSize * 2080)
- Hours per area based on delegation scores (lower score = more hours)
- Replacement cost at market rates ($45-110/hr depending on function)
- Strategic hour value for their segment ($200-800/hr)
- Total Founder Tax = Labor Arbitrage + Strategic Opportunity Cost

WHAT TO NOTICE:
- Which specific area is the biggest time sink? Their lowest delegation is ${ctx.lowestDelegationArea} at ${ctx.delegation[ctx.lowestDelegationArea as keyof typeof ctx.delegation]}/5
- Is this appropriate for their stage (${ctx.segment}), or a problem?
- For solo founders: this isn't about delegation failure—it's about first-hire timing
- What's the ONE bottleneck that matters most?

CONTEXT FOR THEIR SEGMENT:
${ctx.segment} agencies typically have:
- Founder hours: ${ctx.benchmarks.founderHours.typical}/week is normal, >${ctx.benchmarks.founderHours.concerning} is concerning
- Delegation avg: ${ctx.benchmarks.delegationAvg.good}+ is healthy

WRITE THE DIAGNOSIS:
200-400 words. Show the math. Be specific about THEIR situation. End with ONE recommended action.`;
}

function buildPipelinePrompt(ctx: AgencyContext): string {
  return `## REVELATION 2: THE PIPELINE PROBABILITY

AGENCY CONTEXT:
${JSON.stringify(ctx, null, 2)}

YOUR TASK:
Diagnose the mathematical fragility of their current pipeline.

WHAT YOU'RE REVEALING:
Pipeline risk isn't about percentages—it's about ceilings and probabilities:
1. Referral Network Ceiling: Referral networks have carrying capacity (~1.5x current clients)
2. Time to Ceiling: How long until they hit the wall at current growth
3. Disruption Probability: Top referrers churn at ~15%/year. Over 3 years, that compounds.
4. Revenue at Risk: The dollar amount exposed to pipeline fragility

CALCULATIONS TO PERFORM:
- Referral ceiling = currentClients * 1.5 = ${ctx.currentClients} * 1.5 = ${Math.round(ctx.currentClients * 1.5)}
- Months to ceiling = ((ceiling - current) / netClientGrowth) * 12
- 3-year referrer retention = (1 - 0.15)^3 = ~61%
- Disruption probability = (1 - retention) * (referralPercent/100)
- Revenue at risk = annualReferralRevenue * disruptionProbability

WHAT TO NOTICE:
- Is their referral dependency (${ctx.leadSources.referral}%) appropriate for their stage (${ctx.segment})? At $300K with 5 clients, 70% referral is fine. At $2M with 40 clients, it's a timebomb.
- How diversified are their channels? They have ${ctx.activeChannels} active channels.
- What's the actual timeline to the wall?
- Is this urgent, or is there runway?

WRITE THE DIAGNOSIS:
200-400 words. Show the math. Make the timeline concrete. End with ONE recommended action.`;
}

function buildAuthorityPrompt(ctx: AgencyContext): string {
  return `## REVELATION 3: THE AUTHORITY GAP

AGENCY CONTEXT:
${JSON.stringify(ctx, null, 2)}

YOUR TASK:
Diagnose where this founder is invisible to buyers who are actively looking.

WHAT YOU'RE REVEALING:
64% of B2B buyers use AI in their research process. If you're not in the AI's recommendations, you're not in the consideration set—not because you're bad, but because you're invisible.

This Revelation connects three things:
1. Content Volume: Are they producing enough to be known? (${ctx.totalPostsPerWeek} posts/week)
2. Proof Density: Do they have case studies, testimonials, named clients? (Case studies: ${ctx.hasCaseStudies}, Named clients: ${ctx.hasNamedClients})
3. AI Discoverability: When their ICP asks AI for help, are they mentioned?

AI DISCOVERABILITY DATA:
- Claude: ${ctx.aiDiscoverability.claude.found ? 'Found' : 'Not found'} — recommended instead: ${ctx.aiDiscoverability.claude.recommended.join(', ') || 'N/A'}
- ChatGPT: ${ctx.aiDiscoverability.chatgpt.found ? 'Found' : 'Not found'} — recommended instead: ${ctx.aiDiscoverability.chatgpt.recommended.join(', ') || 'N/A'}
- Perplexity: ${ctx.aiDiscoverability.perplexity.found ? 'Found' : 'Not found'} — recommended instead: ${ctx.aiDiscoverability.perplexity.recommended.join(', ') || 'N/A'}

Found in ${ctx.aiDiscoverability.foundInCount} of 3 LLMs.

WHAT TO NOTICE:
- If found in all 3: that's rare—acknowledge it
- If found in 0: what does their content/proof situation look like? Is this fixable?
- Who IS being recommended? What are they doing differently?
- Is their content addressing ICP problems, or talking about themselves?

CONTEXT: ICP PROBLEMS FROM RESEARCH
${ctx.icpProblems.join('\n') || 'No ICP problem data available'}

FOUNDER'S RECENT CONTENT TOPICS:
${ctx.founderRecentPosts.map(p => p.content.substring(0, 100)).join('\n') || 'No recent posts found'}

WRITE THE DIAGNOSIS:
200-400 words. Make the invisibility concrete (how many buyers?). End with ONE recommended action.`;
}

function buildPositioningPrompt(ctx: AgencyContext): string {
  return `## REVELATION 4: THE POSITIONING COLLISION

AGENCY CONTEXT:
${JSON.stringify(ctx, null, 2)}

YOUR TASK:
Diagnose the gap between what this founder claims and what their proof demonstrates.

WHAT YOU'RE REVEALING:
The "8-Second Test": When their stated ICP lands on their website, do they see themselves in the proof?

A positioning collision happens when:
- The website says "We serve [X]"
- The case studies show work for [Y]
- Prospects do instant math: "This isn't for me"

This isn't a branding problem. It's a conversion problem with a dollar cost.

DATA TO ANALYZE:
Stated ICP: "${ctx.statedICP}"
Target Industry: ${ctx.targetIndustry.join(', ')}
Target Company Size: ${ctx.targetCompanySize}

Website headline: "${ctx.websiteHeadline}"

Case studies found:
${ctx.websiteCaseStudies.map(cs => `- ${cs.client}: ${cs.industry}`).join('\n') || 'No case studies detected'}

Testimonials found:
${ctx.websiteTestimonials.map(t => `- "${t.quote.substring(0, 100)}" — ${t.attribution}`).join('\n') || 'No testimonials detected'}

WHAT TO CALCULATE:
- How many case studies match the stated ICP? (industry AND size)
- Proof alignment score = matching / total
- Collision score = 1 - alignment
- Lost revenue estimate = collisionScore * monthlyLeads * closeRate * avgClientValue * 12 * 0.3

WHAT TO NOTICE:
- Is there a collision, or are they aligned?
- If collision: is this because they're taking any work, or because they haven't updated proof?
- Is the stated ICP actually what they want, or what they think sounds good?
- What does a prospect actually see in 8 seconds?

WRITE THE DIAGNOSIS:
200-400 words. Walk through the 8-second test from the prospect's POV. End with ONE recommended action—either get aligned proof, or change the positioning to match reality.`;
}

function buildTrajectoryPrompt(ctx: AgencyContext): string {
  return `## REVELATION 5: THE TRAJECTORY FORK

AGENCY CONTEXT:
${JSON.stringify(ctx, null, 2)}

YOUR TASK:
Show this founder two concrete futures—their current trajectory vs. an intervention trajectory—with the valuation gap between them.

WHAT YOU'RE REVEALING:
Small changes compound dramatically. The gap between "keep doing what you're doing" and "make 2-3 key changes" is often 50-100% in enterprise value over 3 years.

TRAJECTORY A (CURRENT PATH) ASSUMPTIONS:
- Client growth decays 10%/year (referral fatigue, founder bandwidth)
- Margin compresses 2 points/year (scope creep, hiring without systems)
- Founder hours increase 5/year (more clients, same bottleneck)
- Valuation multiple decays 15%/year (buyer sees trapped founder)

TRAJECTORY B (INTERVENTION PATH) ASSUMPTIONS:
Based on their specific gaps, model what happens if they:
- Address their biggest bottleneck (${ctx.lowestDelegationArea})
- Build one controlled channel (from Pipeline analysis)
- Align positioning to proof (from Positioning analysis)

Intervention effects:
- Client growth boosted 30% (new channel + better positioning)
- Churn reduced 30% (systems, delegation)
- Margin improves 2 points/year (efficiency)
- Founder hours decrease 5/year (delegation)
- Valuation multiple grows 10%/year (buyer sees scalable business)

VALUATION CALCULATION:
- Current revenue: ${formatCurrency(ctx.annualRevenue)}
- Current multiple: Start at 0.6x, adjust for delegation (<2 = -0.2), net growth (negative = -0.15), systems (<2 = -0.1), margin (>20% = +0.1)
- Project both trajectories year by year
- Valuation = Revenue * Multiple

WHAT TO NOTICE:
- What's the gap in Year 3?
- What are the 2-3 specific interventions that create Trajectory B for THIS agency?
- What does the founder's life look like in each trajectory? (hours, stress, optionality)

WRITE THE DIAGNOSIS:
300-500 words for this one—it's the closer. Include a comparison table (using markdown). Make the gap visceral. End with: "The only difference between these two futures is whether you intervene now."`;
}

// ============================================
// DIAGNOSIS GENERATION
// ============================================

type RevelationType = 'founderTax' | 'pipeline' | 'authority' | 'positioning' | 'trajectory';

const REVELATION_PROMPT_BUILDERS: Record<RevelationType, (ctx: AgencyContext) => string> = {
  founderTax: buildFounderTaxPrompt,
  pipeline: buildPipelinePrompt,
  authority: buildAuthorityPrompt,
  positioning: buildPositioningPrompt,
  trajectory: buildTrajectoryPrompt,
};

function canGenerateRevelation(type: RevelationType, ctx: AgencyContext): boolean {
  switch (type) {
    case 'founderTax':
      return ctx.annualRevenue > 0 && ctx.teamSize > 0;
    case 'pipeline':
      return ctx.currentClients > 0 && ctx.leadSources.referral >= 0;
    case 'authority':
      return ctx.founderPostsPerWeek >= 0;
    case 'positioning':
      return !!(ctx.statedICP && ctx.coreOffer);
    case 'trajectory':
      return ctx.annualRevenue >= 100000 && ctx.currentClients >= 5 && ctx.founderWeeklyHours > 0;
  }
}

async function generateRevelation(
  type: RevelationType,
  ctx: AgencyContext,
): Promise<string | null> {
  if (!canGenerateRevelation(type, ctx)) return null;

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = DIAGNOSIS_SYSTEM_PROMPT.replace('{agencyName}', ctx.agencyName);
  const userPrompt = REVELATION_PROMPT_BUILDERS[type](ctx);

  // Check what enrichment data is missing and add a note
  const missingData: string[] = [];
  if (!ctx.websiteHeadline && !ctx.websiteServices.length) missingData.push('website scrape');
  if (!ctx.founderHeadline && !ctx.founderAbout) missingData.push('founder LinkedIn profile');
  if (!ctx.founderRecentPosts.length) missingData.push('founder LinkedIn posts');
  if (!ctx.icpProblems.length) missingData.push('ICP problem research');
  if (!ctx.aiDiscoverability.claude.found && !ctx.aiDiscoverability.chatgpt.found && !ctx.aiDiscoverability.perplexity.found && ctx.aiDiscoverability.foundInCount === 0) {
    // Only add if none were checked at all
    if (!ctx.aiDiscoverability.claude.context && !ctx.aiDiscoverability.chatgpt.context && !ctx.aiDiscoverability.perplexity.context) {
      missingData.push('AI discoverability checks');
    }
  }

  let finalPrompt = userPrompt;
  if (missingData.length > 0) {
    finalPrompt += `\n\nNOTE: Some enrichment data was unavailable for this analysis.\nMissing: ${missingData.join(', ')}\nAdjust your diagnosis to acknowledge these limitations. Do not make up data—work with what we have and note what we couldn't verify.`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: finalPrompt }],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      console.error(`[Diagnosis] Claude returned ${response.status} for ${type}`);
      return null;
    }

    const data = await response.json();
    const text = data.content
      ?.filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n') || '';

    return text || null;
  } catch (error: any) {
    console.error(`[Diagnosis] Failed to generate ${type}:`, error.message);
    return null;
  }
}

// ============================================
// QUALITY VALIDATION
// ============================================

interface DiagnosisQuality {
  passed: boolean;
  checks: {
    includesTheirData: boolean;
    includesCalculation: boolean;
    endsWithOneRec: boolean;
    appropriateLength: boolean;
    noGenericPhrases: boolean;
  };
}

function validateDiagnosis(diagnosis: string, ctx: AgencyContext): DiagnosisQuality {
  const checks = {
    includesTheirData:
      diagnosis.includes(ctx.agencyName) ||
      diagnosis.includes(formatCurrency(ctx.annualRevenue)) ||
      diagnosis.includes(ctx.currentClients.toString()) ||
      diagnosis.includes(ctx.founderName),

    includesCalculation:
      /\$[\d,]+/.test(diagnosis) &&
      (diagnosis.includes('/') || diagnosis.includes('×') || diagnosis.includes('x') || diagnosis.includes('=')),

    endsWithOneRec: !diagnosis.match(/\d\.\s.*\n\d\.\s.*\n\d\.\s/), // No 3+ item numbered lists at end

    appropriateLength: diagnosis.length >= 400 && diagnosis.length <= 3500,

    noGenericPhrases:
      !diagnosis.includes('many agencies') &&
      !diagnosis.includes('founders often') &&
      !diagnosis.includes('typically should'),
  };

  return {
    passed: Object.values(checks).every(c => c),
    checks,
  };
}

// ============================================
// CTA DETERMINATION
// ============================================

function determineCTA(diagnoses: Record<string, string | null>, ctx: AgencyContext): {
  headline: string;
  buttonText: string;
  subtext: string;
} {
  // Look for dollar amounts in diagnoses to find the biggest gap
  const dollarPattern = /\$[\d,.]+[KMkm]?/g;
  const allDollars: { type: string; amount: number }[] = [];

  for (const [type, text] of Object.entries(diagnoses)) {
    if (!text) continue;
    const matches = text.match(dollarPattern);
    if (matches) {
      for (const m of matches) {
        const num = parseFloat(m.replace(/[$,]/g, ''));
        const multiplier = m.toLowerCase().includes('m') ? 1000000 : m.toLowerCase().includes('k') ? 1000 : 1;
        allDollars.push({ type, amount: num * multiplier });
      }
    }
  }

  // Sort by largest amount
  allDollars.sort((a, b) => b.amount - a.amount);

  const biggest = allDollars[0];
  let headline: string;

  if (biggest) {
    const typeLabels: Record<string, string> = {
      founderTax: `Your agency is paying a ${formatCurrency(biggest.amount)} Founder Tax. Let's talk about getting that back.`,
      pipeline: `${formatCurrency(biggest.amount)} in revenue at risk from pipeline dependency. Let's build a second channel.`,
      positioning: `~${formatCurrency(biggest.amount)}/year in invisible losses from positioning mismatch. Let's fix that.`,
      trajectory: `The difference between your two trajectories is ${formatCurrency(biggest.amount)} in enterprise value. Want to talk about which one you're building?`,
      authority: `You're invisible to ${formatCurrency(biggest.amount)} worth of buyers. Let's change that.`,
    };
    headline = typeLabels[biggest.type] || `There's a ${formatCurrency(biggest.amount)} gap between where you are and where you should be.`;
  } else {
    headline = `${ctx.founderName}, your diagnostic uncovered some things worth talking about. Let's build your roadmap.`;
  }

  return {
    headline,
    buttonText: 'Book Your Roadmap Call',
    subtext: "60 minutes. We'll build your intervention plan.",
  };
}

// ============================================
// MAIN EXPORT
// ============================================

export interface DiagnosisResult {
  founderTax: string | null;
  pipeline: string | null;
  authority: string | null;
  positioning: string | null;
  trajectory: string | null;
  cta: {
    headline: string;
    buttonText: string;
    subtext: string;
  };
  quality: Record<string, DiagnosisQuality | null>;
}

export async function generateDiagnoses(
  intakeData: IntakeData,
  enrichment: EnrichmentResult | null,
  scores: AssessmentResult,
): Promise<DiagnosisResult> {
  console.log(`[Diagnosis] Starting Claude diagnoses for: ${intakeData.agencyName}`);
  const startTime = Date.now();

  const ctx = buildAgencyContext(intakeData, enrichment, scores);

  // Generate all 5 revelations in parallel
  const [founderTax, pipeline, authority, positioning, trajectory] = await Promise.all([
    generateRevelation('founderTax', ctx),
    generateRevelation('pipeline', ctx),
    generateRevelation('authority', ctx),
    generateRevelation('positioning', ctx),
    generateRevelation('trajectory', ctx),
  ]);

  const diagnoses = { founderTax, pipeline, authority, positioning, trajectory };

  // Validate quality
  const quality: Record<string, DiagnosisQuality | null> = {};
  for (const [type, text] of Object.entries(diagnoses)) {
    quality[type] = text ? validateDiagnosis(text, ctx) : null;
  }

  // Determine CTA based on biggest dollar gap
  const cta = determineCTA(diagnoses, ctx);

  const duration = Date.now() - startTime;
  console.log(`[Diagnosis] Complete in ${duration}ms`);

  return {
    ...diagnoses,
    cta,
    quality,
  };
}

// Also keep the calculated revelations available for the heatmap data
export { buildAgencyContext as buildContext };
