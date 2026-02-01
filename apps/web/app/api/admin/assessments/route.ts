import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

/**
 * Admin API: Product Intelligence
 *
 * Returns aggregate data for content creation across ALL products.
 *
 * Usage:
 *   GET /api/admin/assessments                              — agency assessment intelligence (default)
 *   GET /api/admin/assessments?product=call-lab             — Call Lab Lite intelligence
 *   GET /api/admin/assessments?product=call-lab-pro         — Call Lab Pro intelligence
 *   GET /api/admin/assessments?product=discovery-lab        — Discovery Lab Lite intelligence
 *   GET /api/admin/assessments?product=discovery-lab-pro    — Discovery Lab Pro intelligence
 *   GET /api/admin/assessments?product=assessments          — agency assessment intelligence
 *   GET /api/admin/assessments?product=all                  — all products combined
 *   GET /api/admin/assessments?detail=true                  — include individual records
 *   GET /api/admin/assessments?segment=growth               — filter assessments by segment
 *   GET /api/admin/assessments?id=<uuid>&product=<product>  — single record detail
 */

type Product = 'call-lab' | 'call-lab-pro' | 'discovery-lab' | 'discovery-lab-pro' | 'assessments' | 'all';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const product = (searchParams.get('product') || 'assessments') as Product;
    const singleId = searchParams.get('id');
    const includeDetail = searchParams.get('detail') === 'true';
    const segmentFilter = searchParams.get('segment');
    const limit = parseInt(searchParams.get('limit') || '500');

    // ---- SINGLE RECORD LOOKUP ----
    if (singleId) {
      return handleSingleLookup(supabase, product, singleId);
    }

    // ---- AGGREGATE BY PRODUCT ----
    if (product === 'all') {
      const [assessments, callLab, callLabPro, discoveryLab, discoveryLabPro] = await Promise.all([
        buildAssessmentIntelligence(supabase, limit, segmentFilter, includeDetail),
        buildCallLabIntelligence(supabase, 'lite', limit, includeDetail),
        buildCallLabIntelligence(supabase, 'pro', limit, includeDetail),
        buildDiscoveryIntelligence(supabase, 'lite', limit, includeDetail),
        buildDiscoveryIntelligence(supabase, 'pro', limit, includeDetail),
      ]);

      return NextResponse.json({
        assessments,
        callLab,
        callLabPro,
        discoveryLab,
        discoveryLabPro,
        generatedAt: new Date().toISOString(),
      });
    }

    switch (product) {
      case 'call-lab':
        return NextResponse.json(await buildCallLabIntelligence(supabase, 'lite', limit, includeDetail));
      case 'call-lab-pro':
        return NextResponse.json(await buildCallLabIntelligence(supabase, 'pro', limit, includeDetail));
      case 'discovery-lab':
        return NextResponse.json(await buildDiscoveryIntelligence(supabase, 'lite', limit, includeDetail));
      case 'discovery-lab-pro':
        return NextResponse.json(await buildDiscoveryIntelligence(supabase, 'pro', limit, includeDetail));
      case 'assessments':
      default:
        return NextResponse.json(await buildAssessmentIntelligence(supabase, limit, segmentFilter, includeDetail));
    }
  } catch (error) {
    console.error('Admin intelligence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// SINGLE RECORD LOOKUP
// ============================================

async function handleSingleLookup(supabase: any, product: Product, id: string) {
  let table: string;
  let sanitizer: (r: any) => any;

  switch (product) {
    case 'call-lab':
    case 'call-lab-pro':
      table = 'call_lab_reports';
      sanitizer = sanitizeCallLabReport;
      break;
    case 'discovery-lab':
    case 'discovery-lab-pro':
      table = 'discovery_briefs';
      sanitizer = sanitizeDiscoveryBrief;
      break;
    default:
      table = 'assessments';
      sanitizer = sanitizeAssessment;
  }

  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  return NextResponse.json({ record: sanitizer(data) });
}

// ============================================
// CALL LAB INTELLIGENCE
// ============================================

async function buildCallLabIntelligence(supabase: any, tier: 'lite' | 'pro', limit: number, includeDetail: boolean) {
  const { data: reports, error } = await supabase
    .from('call_lab_reports')
    .select('*')
    .eq('tier', tier)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !reports || reports.length === 0) {
    return { product: `call-lab${tier === 'pro' ? '-pro' : ''}`, aggregate: null, count: 0, message: 'No reports found', generatedAt: new Date().toISOString() };
  }

  const n = reports.length;

  // Score distributions
  const overallScores: number[] = [];
  const openingScores: number[] = [];
  const discoveryScores: number[] = [];
  const diagnosticScores: number[] = [];
  const valueScores: number[] = [];
  const objectionScores: number[] = [];
  const commitmentScores: number[] = [];
  const humanFirstScores: number[] = [];
  const trustVelocities: number[] = [];
  const agendaControls: number[] = [];
  const patternDensities: number[] = [];

  // Pattern tracking
  const patternCounts: Record<string, number> = {};
  const primaryPatternCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};
  const callTypeCounts: Record<string, number> = {};

  for (const r of reports) {
    if (r.overall_score) overallScores.push(Number(r.overall_score));
    if (r.opening_score) openingScores.push(Number(r.opening_score));
    if (r.discovery_score) discoveryScores.push(Number(r.discovery_score));
    if (r.diagnostic_score) diagnosticScores.push(Number(r.diagnostic_score));
    if (r.value_score) valueScores.push(Number(r.value_score));
    if (r.objection_score) objectionScores.push(Number(r.objection_score));
    if (r.commitment_score) commitmentScores.push(Number(r.commitment_score));
    if (r.human_first_score) humanFirstScores.push(Number(r.human_first_score));
    if (r.trust_velocity) trustVelocities.push(Number(r.trust_velocity));
    if (r.agenda_control) agendaControls.push(Number(r.agenda_control));
    if (r.pattern_density) patternDensities.push(Number(r.pattern_density));

    if (r.patterns_detected) {
      for (const p of r.patterns_detected) {
        patternCounts[p] = (patternCounts[p] || 0) + 1;
      }
    }
    if (r.primary_pattern) {
      primaryPatternCounts[r.primary_pattern] = (primaryPatternCounts[r.primary_pattern] || 0) + 1;
    }

    const outcome = r.outcome || 'unknown';
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;

    if (r.call_type) {
      callTypeCounts[r.call_type] = (callTypeCounts[r.call_type] || 0) + 1;
    }
  }

  // Rank skills weakest to strongest
  const skills = [
    { name: 'Opening & Positioning', scores: openingScores },
    { name: 'Discovery Quality', scores: discoveryScores },
    { name: 'Diagnostic Depth', scores: diagnosticScores },
    { name: 'Value Articulation', scores: valueScores },
    { name: 'Objection Navigation', scores: objectionScores },
    { name: 'Commitment & Close', scores: commitmentScores },
    { name: 'Human-First Index', scores: humanFirstScores },
  ].filter(s => s.scores.length > 0).sort((a, b) => avg(a.scores) - avg(b.scores));

  const response: any = {
    product: `call-lab${tier === 'pro' ? '-pro' : ''}`,
    count: n,
    generatedAt: new Date().toISOString(),
    aggregate: {
      sampleSize: n,

      benchmarks: {
        overallScore: { avg: avg(overallScores), median: median(overallScores), p25: percentile(overallScores, 25), p75: percentile(overallScores, 75) },
        skills: Object.fromEntries(skills.map(s => [s.name, { avg: avg(s.scores), median: median(s.scores) }])),
        trustVelocity: { avg: avg(trustVelocities), median: median(trustVelocities) },
        agendaControl: { avg: avg(agendaControls), median: median(agendaControls) },
        patternDensity: { avg: avg(patternDensities), median: median(patternDensities) },
      },

      weakestSkill: skills[0] ? { name: skills[0].name, avg: avg(skills[0].scores) } : null,
      strongestSkill: skills[skills.length - 1] ? { name: skills[skills.length - 1].name, avg: avg(skills[skills.length - 1].scores) } : null,

      topPatterns: topN(patternCounts, 15),
      topPrimaryPatterns: topN(primaryPatternCounts, 10),
      outcomes: outcomeCounts,
      callTypes: callTypeCounts,

      winRate: outcomeCounts.won
        ? Math.round((outcomeCounts.won / Object.values(outcomeCounts).reduce((a, b) => a + b, 0)) * 100)
        : null,

      contentInsights: generateCallLabInsights(overallScores, skills, patternCounts, outcomeCounts, n),
    },
  };

  if (includeDetail) {
    response.reports = reports.map(sanitizeCallLabReport);
  }

  return response;
}

function generateCallLabInsights(
  overallScores: number[],
  skills: Array<{ name: string; scores: number[] }>,
  patterns: Record<string, number>,
  outcomes: Record<string, number>,
  n: number
): string[] {
  const insights: string[] = [];

  if (overallScores.length > 0) {
    insights.push(`Average call score across ${n} analyzed calls: ${avg(overallScores).toFixed(1)}/10.`);
  }

  if (skills.length > 0) {
    insights.push(
      `Weakest skill: ${skills[0].name} at ${avg(skills[0].scores).toFixed(1)}/10. Strongest: ${skills[skills.length - 1].name} at ${avg(skills[skills.length - 1].scores).toFixed(1)}/10.`
    );
  }

  const topPattern = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0];
  if (topPattern) {
    insights.push(`Most common pattern: "${topPattern[0]}" — in ${Math.round((topPattern[1] / n) * 100)}% of calls.`);
  }

  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0);
  if (outcomes.won && totalOutcomes > 0) {
    insights.push(`Win rate: ${Math.round((outcomes.won / totalOutcomes) * 100)}% across ${totalOutcomes} calls with tracked outcomes.`);
  }

  const below5 = overallScores.filter(s => s < 5).length;
  if (below5 > 0) {
    insights.push(`${Math.round((below5 / n) * 100)}% of calls scored below 5/10.`);
  }

  return insights;
}

function sanitizeCallLabReport(r: any) {
  return {
    id: r.id,
    buyerName: r.buyer_name,
    companyName: r.company_name,
    callType: r.call_type,
    tier: r.tier,
    overallScore: r.overall_score,
    scores: {
      opening: r.opening_score,
      discovery: r.discovery_score,
      diagnostic: r.diagnostic_score,
      value: r.value_score,
      objection: r.objection_score,
      commitment: r.commitment_score,
      humanFirst: r.human_first_score,
    },
    metrics: {
      trustVelocity: r.trust_velocity,
      agendaControl: r.agenda_control,
      patternDensity: r.pattern_density,
    },
    patternsDetected: r.patterns_detected,
    primaryPattern: r.primary_pattern,
    improvementHighlight: r.improvement_highlight,
    outcome: r.outcome,
    createdAt: r.created_at,
  };
}

// ============================================
// DISCOVERY LAB INTELLIGENCE
// ============================================

async function buildDiscoveryIntelligence(supabase: any, version: 'lite' | 'pro', limit: number, includeDetail: boolean) {
  const { data: briefs, error } = await supabase
    .from('discovery_briefs')
    .select('*')
    .eq('version', version)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !briefs || briefs.length === 0) {
    return { product: `discovery-lab${version === 'pro' ? '-pro' : ''}`, aggregate: null, count: 0, message: 'No briefs found', generatedAt: new Date().toISOString() };
  }

  const n = briefs.length;

  const offerCounts: Record<string, number> = {};
  const titleCounts: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};
  const questionCounts: number[] = [];

  for (const b of briefs) {
    if (b.what_you_sell) {
      const offer = categorizeOffer(b.what_you_sell);
      offerCounts[offer] = (offerCounts[offer] || 0) + 1;
    }

    if (b.target_company) {
      companyCounts[b.target_company] = (companyCounts[b.target_company] || 0) + 1;
    }

    if (b.target_contact_title) {
      const title = normalizeTitle(b.target_contact_title);
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    }

    if (b.authority_questions) questionCounts.push(Array.isArray(b.authority_questions) ? b.authority_questions.length : 0);
  }

  const response: any = {
    product: `discovery-lab${version === 'pro' ? '-pro' : ''}`,
    count: n,
    generatedAt: new Date().toISOString(),
    aggregate: {
      sampleSize: n,
      topOfferCategories: topN(offerCounts, 10),
      topTargetTitles: topN(titleCounts, 10),
      repeatCompanies: topN(companyCounts, 10).filter(c => c.count > 1),
      avgQuestionsGenerated: questionCounts.length > 0 ? avg(questionCounts) : null,
      contentInsights: generateDiscoveryInsights(offerCounts, titleCounts, n),
    },
  };

  if (includeDetail) {
    response.briefs = briefs.map(sanitizeDiscoveryBrief);
  }

  return response;
}

function generateDiscoveryInsights(
  offers: Record<string, number>,
  titles: Record<string, number>,
  n: number
): string[] {
  const insights: string[] = [];

  const topOffer = Object.entries(offers).sort((a, b) => b[1] - a[1])[0];
  if (topOffer) {
    insights.push(`Most common offer category: "${topOffer[0]}" — ${Math.round((topOffer[1] / n) * 100)}% of briefs.`);
  }

  const topTitle = Object.entries(titles).sort((a, b) => b[1] - a[1])[0];
  if (topTitle) {
    insights.push(`Most targeted title: "${topTitle[0]}".`);
  }

  insights.push(`${n} discovery briefs generated.`);

  return insights;
}

function categorizeOffer(whatYouSell: string): string {
  const lower = whatYouSell.toLowerCase();
  if (lower.includes('seo') || lower.includes('search engine')) return 'SEO';
  if (lower.includes('content') && (lower.includes('marketing') || lower.includes('strategy'))) return 'Content Marketing';
  if (lower.includes('paid') || lower.includes('ppc') || lower.includes('google ads') || lower.includes('meta ads')) return 'Paid Media';
  if (lower.includes('web') && (lower.includes('design') || lower.includes('develop'))) return 'Web Design/Dev';
  if (lower.includes('brand')) return 'Branding';
  if (lower.includes('social media')) return 'Social Media';
  if (lower.includes('email')) return 'Email Marketing';
  if (lower.includes('pr') || lower.includes('public relation')) return 'PR';
  if (lower.includes('saas') || lower.includes('software')) return 'SaaS/Software';
  if (lower.includes('consult')) return 'Consulting';
  if (lower.includes('recruit') || lower.includes('staffing') || lower.includes('talent')) return 'Recruiting/Staffing';
  if (lower.includes('video') || lower.includes('production')) return 'Video/Production';
  if (lower.includes('market')) return 'Marketing (General)';
  return 'Other';
}

function normalizeTitle(title: string): string {
  const lower = title.toLowerCase().trim();
  if (lower.includes('ceo') || lower.includes('chief executive')) return 'CEO';
  if (lower.includes('cmo') || lower.includes('chief marketing')) return 'CMO';
  if (lower.includes('cto') || lower.includes('chief tech')) return 'CTO';
  if (lower.includes('cfo') || lower.includes('chief financial')) return 'CFO';
  if (lower.includes('coo') || lower.includes('chief operating')) return 'COO';
  if (lower.includes('vp') || lower.includes('vice president')) {
    if (lower.includes('marketing')) return 'VP Marketing';
    if (lower.includes('sales')) return 'VP Sales';
    return 'VP (Other)';
  }
  if (lower.includes('director')) {
    if (lower.includes('marketing')) return 'Director of Marketing';
    if (lower.includes('sales')) return 'Director of Sales';
    return 'Director (Other)';
  }
  if (lower.includes('head of')) return 'Head of Department';
  if (lower.includes('manager')) return 'Manager';
  if (lower.includes('founder') || lower.includes('owner')) return 'Founder/Owner';
  return title.length > 30 ? title.slice(0, 30) + '...' : title;
}

function sanitizeDiscoveryBrief(b: any) {
  return {
    id: b.id,
    version: b.version,
    whatYouSell: b.what_you_sell,
    targetCompany: b.target_company,
    contactName: b.target_contact_name,
    contactTitle: b.target_contact_title,
    marketConcerns: b.market_concerns,
    hasMarketIntel: !!b.market_intel && Object.keys(b.market_intel).length > 0,
    hasCompanyIntel: !!b.company_intel && Object.keys(b.company_intel).length > 0,
    hasProspectIntel: !!b.prospect_intel && Object.keys(b.prospect_intel).length > 0,
    questionCount: Array.isArray(b.authority_questions) ? b.authority_questions.length : 0,
    createdAt: b.created_at,
  };
}

// ============================================
// ASSESSMENT INTELLIGENCE
// ============================================

async function buildAssessmentIntelligence(supabase: any, limit: number, segmentFilter: string | null, includeDetail: boolean) {
  const { data: assessments, error } = await supabase
    .from('assessments')
    .select('id, user_id, intake_data, scores, enrichment_data, overall_score, status, created_at, completed_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !assessments || assessments.length === 0) {
    return { product: 'assessments', aggregate: null, count: 0, message: 'No completed assessments found', generatedAt: new Date().toISOString() };
  }

  let filtered = assessments;
  if (segmentFilter) {
    filtered = assessments.filter((a: any) => {
      const seg = a.scores?.segmentLabel?.toLowerCase() || '';
      return seg.includes(segmentFilter.toLowerCase());
    });
  }

  const n = filtered.length;
  if (n === 0) {
    return { product: 'assessments', aggregate: null, count: 0, message: 'No matching assessments', generatedAt: new Date().toISOString() };
  }

  const zoneScores: Record<string, number[]> = {
    revenueQuality: [], profitability: [], growthVsChurn: [], leadEngine: [],
    founderLoad: [], systemsReadiness: [], contentPositioning: [], teamVisibility: [],
  };

  const overallScores: number[] = [];
  const segments: Record<string, number> = {};
  const realityCheckCounts: Record<string, number> = {};
  const bottleneckCounts: Record<string, number> = {};
  const growthLeverCounts: Record<string, number> = {};
  const followUpInsightCounts: Record<string, number> = {};
  const revenues: number[] = [];
  const teamSizes: number[] = [];
  const founderHours: number[] = [];
  const referralPcts: number[] = [];
  const delegationScores: number[] = [];
  const ltvRatios: number[] = [];
  const churnReasons: Record<string, number> = {};
  const pricingStates: Record<string, number> = {};
  const concentrationLevels: Record<string, number> = {};

  for (const a of filtered) {
    const scores = a.scores as any;
    const intake = a.intake_data as any;
    if (!scores?.wtfZones) continue;

    for (const zone of Object.keys(zoneScores)) {
      if (scores.wtfZones[zone]?.score !== undefined) zoneScores[zone].push(scores.wtfZones[zone].score);
    }
    if (scores.overall) overallScores.push(scores.overall);
    const seg = scores.segmentLabel || 'unknown';
    segments[seg] = (segments[seg] || 0) + 1;
    if (scores.realityChecks) for (const c of scores.realityChecks) realityCheckCounts[`${c.type}:${c.id}`] = (realityCheckCounts[`${c.type}:${c.id}`] || 0) + 1;
    if (scores.founderOS?.bottleneckAreas) for (const area of scores.founderOS.bottleneckAreas) bottleneckCounts[area] = (bottleneckCounts[area] || 0) + 1;
    if (scores.growthLevers) for (const l of scores.growthLevers) growthLeverCounts[`${l.impact}:${l.name}`] = (growthLeverCounts[`${l.impact}:${l.name}`] || 0) + 1;
    if (scores.followUpInsights) for (const ins of scores.followUpInsights) followUpInsightCounts[`${ins.severity}:${ins.id}`] = (followUpInsightCounts[`${ins.severity}:${ins.id}`] || 0) + 1;
    if (scores.followUpAnswers) {
      const ans = scores.followUpAnswers;
      if (ans.primaryChurnReason) churnReasons[ans.primaryChurnReason] = (churnReasons[ans.primaryChurnReason] || 0) + 1;
      if (ans.lastPriceIncrease) pricingStates[ans.lastPriceIncrease] = (pricingStates[ans.lastPriceIncrease] || 0) + 1;
      if (ans.top3ClientRevenuePct) concentrationLevels[ans.top3ClientRevenuePct] = (concentrationLevels[ans.top3ClientRevenuePct] || 0) + 1;
    }
    const rev = intake.lastYearRevenue || intake.annualRevenue;
    if (rev) revenues.push(Number(rev));
    if (intake.teamSize) teamSizes.push(Number(intake.teamSize));
    if (intake.founderWeeklyHours) founderHours.push(Number(intake.founderWeeklyHours));
    if (intake.referralPercent) referralPcts.push(Number(intake.referralPercent));
    if (scores.founderOS?.delegationScore) delegationScores.push(scores.founderOS.delegationScore);
    if (scores.ltvMetrics?.ltvCacRatio) ltvRatios.push(scores.ltvMetrics.ltvCacRatio);
  }

  const response: any = {
    product: 'assessments',
    count: n,
    generatedAt: new Date().toISOString(),
    aggregate: {
      sampleSize: n,
      benchmarks: {
        overallScore: avg(overallScores),
        zones: Object.fromEntries(
          Object.entries(zoneScores).map(([zone, s]) => [zone, {
            avg: avg(s), median: median(s), p25: percentile(s, 25), p75: percentile(s, 75), distribution: distribution5(s),
          }])
        ),
        revenue: revenues.length > 0 ? { avg: avg(revenues), median: median(revenues), min: Math.min(...revenues), max: Math.max(...revenues) } : null,
        teamSize: { avg: avg(teamSizes), median: median(teamSizes) },
        founderWeeklyHours: { avg: avg(founderHours), median: median(founderHours) },
        referralDependency: { avg: avg(referralPcts), median: median(referralPcts) },
        delegationScore: { avg: avg(delegationScores), median: median(delegationScores) },
        ltvCacRatio: { avg: avg(ltvRatios), median: median(ltvRatios) },
      },
      segments,
      topRealityChecks: topN(realityCheckCounts, 10),
      topBottlenecks: topN(bottleneckCounts, 10),
      topGrowthLevers: topN(growthLeverCounts, 10),
      topFollowUpInsights: topN(followUpInsightCounts, 10),
      patterns: {
        churnReasons: Object.keys(churnReasons).length > 0 ? churnReasons : null,
        pricingStates: Object.keys(pricingStates).length > 0 ? pricingStates : null,
        concentrationLevels: Object.keys(concentrationLevels).length > 0 ? concentrationLevels : null,
      },
      contentInsights: generateAssessmentInsights(zoneScores, overallScores, referralPcts, founderHours, delegationScores, n),
    },
  };

  if (includeDetail) {
    response.assessments = filtered.map(sanitizeAssessment);
  }

  return response;
}

function generateAssessmentInsights(
  zoneScores: Record<string, number[]>, overallScores: number[],
  referralPcts: number[], founderHours: number[], delegationScores: number[], n: number
): string[] {
  const insights: string[] = [];
  const weakest = Object.entries(zoneScores).map(([z, s]) => ({ zone: z, avg: avg(s) })).sort((a, b) => a.avg - b.avg)[0];
  if (weakest) insights.push(`Across ${n} agencies, ${formatZoneName(weakest.zone)} is the weakest area at ${weakest.avg.toFixed(1)}/5.`);
  const highRef = referralPcts.filter(p => p >= 60).length;
  if (highRef > 0) insights.push(`${Math.round((highRef / n) * 100)}% of agencies get 60%+ of leads from referrals.`);
  const over50 = founderHours.filter(h => h >= 50).length;
  if (over50 > 0) insights.push(`${Math.round((over50 / n) * 100)}% of founders work 50+ hours/week. Average: ${avg(founderHours).toFixed(0)} hours.`);
  const lowDel = delegationScores.filter(d => d < 2.5).length;
  if (lowDel > 0) insights.push(`${Math.round((lowDel / n) * 100)}% of founders score below 2.5/5 on delegation.`);
  const critical = overallScores.filter(s => s < 2.5).length;
  const strong = overallScores.filter(s => s >= 4).length;
  insights.push(`Score distribution: ${Math.round((critical / n) * 100)}% critical, ${Math.round((strong / n) * 100)}% strong.`);
  return insights;
}

function sanitizeAssessment(a: any) {
  return {
    id: a.id,
    agencyName: a.intake_data?.agencyName,
    segment: a.scores?.segmentLabel,
    overallScore: a.overall_score,
    zones: a.scores?.wtfZones ? Object.fromEntries(
      Object.entries(a.scores.wtfZones).map(([k, v]: [string, any]) => [k, v.score])
    ) : null,
    founderOS: a.scores?.founderOS ? {
      delegationScore: a.scores.founderOS.delegationScore,
      burnoutRisk: a.scores.founderOS.burnoutRisk,
      bottleneckAreas: a.scores.founderOS.bottleneckAreas,
    } : null,
    ltvMetrics: a.scores?.ltvMetrics || null,
    realityChecks: a.scores?.realityChecks?.map((c: any) => ({ id: c.id, type: c.type, title: c.title })) || [],
    followUpInsights: a.scores?.followUpInsights || null,
    revelations: a.scores?.revelations ? {
      founderTax: a.scores.revelations.founderTax?.totalFounderTax,
      pipelineDisruptionRisk: a.scores.revelations.pipelineProbability?.probabilityOfMajorDisruption,
      authorityScore: a.scores.revelations.authorityGap?.overallAuthorityScore,
      positioningCollision: a.scores.revelations.positioningCollision?.collisionScore,
      valuationGap: a.scores.revelations.trajectoryFork?.gap?.valuationDifference,
    } : null,
    intake: {
      revenue: a.intake_data?.lastYearRevenue || a.intake_data?.annualRevenue,
      teamSize: a.intake_data?.teamSize,
      founderHours: a.intake_data?.founderWeeklyHours,
      referralPct: a.intake_data?.referralPercent,
      currentClients: a.intake_data?.currentClients || a.intake_data?.clientCount,
      coreOffer: a.intake_data?.coreOffer,
      differentiator: a.intake_data?.differentiator,
    },
    createdAt: a.created_at,
    completedAt: a.completed_at,
  };
}

// ============================================
// SHARED HELPERS
// ============================================

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const frac = index - lower;
  if (lower + 1 < sorted.length) return Math.round((sorted[lower] + frac * (sorted[lower + 1] - sorted[lower])) * 100) / 100;
  return sorted[lower];
}

function distribution5(arr: number[]): Record<string, number> {
  const d: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const v of arr) d[String(Math.min(5, Math.max(1, Math.round(v))))]++;
  return d;
}

function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number; pct: number }> {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([key, count]) => ({ key, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

function formatZoneName(zone: string): string {
  const names: Record<string, string> = {
    revenueQuality: 'Revenue Quality', profitability: 'Profitability', growthVsChurn: 'Growth vs Churn',
    leadEngine: 'Lead Engine', founderLoad: 'Founder Load', systemsReadiness: 'Systems Readiness',
    contentPositioning: 'Content & Positioning', teamVisibility: 'Team Visibility',
  };
  return names[zone] || zone;
}
