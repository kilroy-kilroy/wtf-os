/**
 * Follow-Up Questions Engine
 *
 * After the initial assessment is scored, this generates targeted follow-up
 * questions based on the agency's specific weak zones and data gaps.
 * The goal: make the report dramatically deeper without making the initial
 * form any longer. Users answer 3-5 follow-up questions that unlock
 * richer diagnostics tailored to their situation.
 */

import type { AssessmentResult, IntakeData, WTFZones } from './scoring';

// ============================================
// TYPES
// ============================================

export interface FollowUpQuestion {
  id: string;
  zone: string;               // which scored zone triggered this
  triggerReason: string;       // why this question matters for this agency
  question: string;            // the actual question text
  type: 'select' | 'number' | 'text' | 'scale';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  priority: number;            // lower = more important, used for ordering
  unlocks: string;             // what answering this unlocks in the report
}

export interface FollowUpAnswers {
  [questionId: string]: string | number;
}

export interface FollowUpInsight {
  id: string;
  zone: string;
  title: string;
  body: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  metric?: { label: string; value: string; color: string };
}

// ============================================
// QUESTION GENERATION
// ============================================

/**
 * Generate follow-up questions based on initial assessment scores.
 * Returns 3-7 questions targeting the agency's weakest areas and
 * biggest data gaps.
 */
export function generateFollowUpQuestions(
  data: IntakeData,
  result: AssessmentResult
): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const zones = result.wtfZones;
  const revenue = data.lastYearRevenue || data.annualRevenue || 0;

  // ---- CLIENT CONCENTRATION (always ask — high signal, never collected) ----
  questions.push({
    id: 'top3ClientRevenuePct',
    zone: 'growthVsChurn',
    triggerReason: 'Client concentration is one of the biggest hidden risks in agencies',
    question: 'What percentage of your revenue comes from your top 3 clients?',
    type: 'select',
    options: [
      { value: '<20%', label: 'Less than 20% — well diversified' },
      { value: '20-40%', label: '20-40% — moderately concentrated' },
      { value: '40-60%', label: '40-60% — concentrated' },
      { value: '60-80%', label: '60-80% — dangerously concentrated' },
      { value: '80%+', label: '80%+ — existential risk' },
    ],
    priority: 1,
    unlocks: 'Client concentration risk analysis and revenue stability score',
  });

  // ---- PRICING POWER (always ask — never collected, huge signal) ----
  questions.push({
    id: 'lastPriceIncrease',
    zone: 'profitability',
    triggerReason: 'Pricing power directly indicates market position and margin trajectory',
    question: 'When did you last raise your prices?',
    type: 'select',
    options: [
      { value: '<6months', label: 'In the last 6 months' },
      { value: '6-12months', label: '6-12 months ago' },
      { value: '1-2years', label: '1-2 years ago' },
      { value: '2years+', label: 'More than 2 years ago' },
      { value: 'never', label: 'Never raised prices' },
    ],
    priority: 2,
    unlocks: 'Pricing power assessment and margin trajectory forecast',
  });

  // ---- CONDITIONAL: Churn deep dive (if Growth vs Churn is weak) ----
  if (zones.growthVsChurn.score <= 3) {
    questions.push({
      id: 'primaryChurnReason',
      zone: 'growthVsChurn',
      triggerReason: `Your net growth rate scored ${zones.growthVsChurn.score}/5 — understanding WHY clients leave changes the fix`,
      question: 'What is the #1 reason clients leave?',
      type: 'select',
      options: [
        { value: 'budget', label: 'Budget cuts / cost reduction' },
        { value: 'results', label: 'Didn\'t see results fast enough' },
        { value: 'inhouse', label: 'Brought it in-house' },
        { value: 'competitor', label: 'Went to a competitor' },
        { value: 'contact', label: 'Key contact left the company' },
        { value: 'scope', label: 'Project completed / scope ended' },
        { value: 'relationship', label: 'Relationship issues / communication' },
        { value: 'unknown', label: 'Don\'t know (we don\'t track it)' },
      ],
      priority: 3,
      unlocks: 'Root cause churn analysis and targeted retention playbook',
    });
  }

  // ---- CONDITIONAL: Sales cycle (if Lead Engine is weak) ----
  if (zones.leadEngine.score <= 3) {
    questions.push({
      id: 'avgSalesCycleDays',
      zone: 'leadEngine',
      triggerReason: `Your lead engine scored ${zones.leadEngine.score}/5 — pipeline velocity tells us if it's a volume or conversion problem`,
      question: 'What is your average sales cycle (first contact to signed contract)?',
      type: 'select',
      options: [
        { value: '<14days', label: 'Less than 2 weeks' },
        { value: '14-30days', label: '2-4 weeks' },
        { value: '30-60days', label: '1-2 months' },
        { value: '60-90days', label: '2-3 months' },
        { value: '90days+', label: '3+ months' },
      ],
      priority: 4,
      unlocks: 'Pipeline velocity analysis and conversion bottleneck identification',
    });
  }

  // ---- CONDITIONAL: Capacity (if revenue/FTE is low or high) ----
  if (zones.revenueQuality.score <= 2 || zones.revenueQuality.score >= 4) {
    questions.push({
      id: 'teamCapacity',
      zone: 'revenueQuality',
      triggerReason: zones.revenueQuality.score <= 2
        ? `Revenue/FTE scored ${zones.revenueQuality.score}/5 — are you overstaffed or underutilized?`
        : `Revenue/FTE scored ${zones.revenueQuality.score}/5 — you may be at capacity risk`,
      question: 'How would you describe your team\'s current workload?',
      type: 'select',
      options: [
        { value: 'underutilized', label: 'Underutilized — we could take on significantly more work' },
        { value: 'comfortable', label: 'Comfortable — some room to grow without hiring' },
        { value: 'full', label: 'Full — one more client and we need to hire' },
        { value: 'overloaded', label: 'Overloaded — we\'re already stretched thin' },
      ],
      priority: 5,
      unlocks: 'Capacity utilization analysis and growth-without-hiring assessment',
    });
  }

  // ---- CONDITIONAL: Delivery quality (if churn is high) ----
  if (zones.growthVsChurn.score <= 2) {
    questions.push({
      id: 'clientSatisfaction',
      zone: 'growthVsChurn',
      triggerReason: 'High churn may signal a delivery problem, not just a market problem',
      question: 'How do your clients rate their experience working with you?',
      type: 'scale',
      helpText: '1 = frequent complaints, 5 = consistently excellent feedback',
      min: 1,
      max: 5,
      priority: 6,
      unlocks: 'Delivery quality correlation with churn and service improvement recommendations',
    });
  }

  // ---- CONDITIONAL: Founder replacement readiness (if founder load is high + revenue > $1M) ----
  if (zones.founderLoad.score <= 2 && revenue > 1000000) {
    questions.push({
      id: 'hasSecondInCommand',
      zone: 'founderLoad',
      triggerReason: `Delegation scored ${zones.founderLoad.score}/5 at $${Math.round(revenue / 1000)}K — the bottleneck fix depends on your bench strength`,
      question: 'Do you have a clear #2 (COO, director, senior lead) who could run day-to-day operations?',
      type: 'select',
      options: [
        { value: 'yes', label: 'Yes — they already run most of operations' },
        { value: 'partial', label: 'Partially — someone is growing into it' },
        { value: 'no', label: 'No — it\'s all me' },
      ],
      priority: 7,
      unlocks: 'Founder extraction roadmap with specific delegation sequence',
    });
  }

  // ---- CONDITIONAL: Gross margin (if profitability is concerning) ----
  if (zones.profitability.score <= 3) {
    questions.push({
      id: 'costStructure',
      zone: 'profitability',
      triggerReason: `Net margin scored ${zones.profitability.score}/5 — knowing where the money goes changes the fix`,
      question: 'What percentage of revenue goes to direct labor (employees + contractors doing client work)?',
      type: 'select',
      options: [
        { value: '<40%', label: 'Less than 40%' },
        { value: '40-55%', label: '40-55%' },
        { value: '55-70%', label: '55-70%' },
        { value: '70%+', label: 'More than 70%' },
      ],
      priority: 8,
      unlocks: 'Cost structure analysis: overhead vs COGS breakdown and margin improvement path',
    });
  }

  // Sort by priority and return top 5 (keep it fast)
  return questions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// ============================================
// FOLLOW-UP INSIGHTS GENERATION
// ============================================

const CONCENTRATION_MIDPOINTS: Record<string, number> = {
  '<20%': 15, '20-40%': 30, '40-60%': 50, '60-80%': 70, '80%+': 85,
};

const SALES_CYCLE_LABELS: Record<string, string> = {
  '<14days': 'under 2 weeks',
  '14-30days': '2-4 weeks',
  '30-60days': '1-2 months',
  '60-90days': '2-3 months',
  '90days+': '3+ months',
};

/**
 * Generate insights from follow-up answers. These get added to the report
 * as a "Deep Dive" section showing the extra analysis their answers unlocked.
 */
export function generateFollowUpInsights(
  data: IntakeData,
  result: AssessmentResult,
  answers: FollowUpAnswers
): FollowUpInsight[] {
  const insights: FollowUpInsight[] = [];
  const revenue = data.lastYearRevenue || data.annualRevenue || 0;

  // ---- CLIENT CONCENTRATION ----
  if (answers.top3ClientRevenuePct) {
    const pct = CONCENTRATION_MIDPOINTS[answers.top3ClientRevenuePct as string] || 30;

    if (pct >= 60) {
      const top3Revenue = revenue * (pct / 100);
      insights.push({
        id: 'client-concentration',
        zone: 'growthVsChurn',
        title: 'Client Concentration: Existential Risk',
        body: `${pct}% of your revenue (${formatCurrency(top3Revenue)}) comes from 3 clients. If you lose even one, you're looking at a ${Math.round(pct / 3)}% revenue hit overnight. This isn't diversification — it's dependency. Your pipeline probability numbers are actually worse than we calculated because a single relationship failure has outsized impact.`,
        severity: 'critical',
        metric: { label: 'Top 3 Client Concentration', value: `${pct}%`, color: '#E31B23' },
      });
    } else if (pct >= 40) {
      insights.push({
        id: 'client-concentration',
        zone: 'growthVsChurn',
        title: 'Client Concentration: Watch Carefully',
        body: `${pct}% in your top 3 is above the comfort zone (under 30%). You're not in crisis, but one client departure hits harder than it should. Priority: make sure no single client exceeds 15% of revenue.`,
        severity: 'warning',
        metric: { label: 'Top 3 Client Concentration', value: `${pct}%`, color: '#f59e0b' },
      });
    } else {
      insights.push({
        id: 'client-concentration',
        zone: 'growthVsChurn',
        title: 'Client Concentration: Healthy',
        body: `${pct}% in your top 3 is well-diversified. No single client departure would be catastrophic. This gives you pricing power and the ability to fire bad-fit clients.`,
        severity: 'positive',
        metric: { label: 'Top 3 Client Concentration', value: `${pct}%`, color: '#22c55e' },
      });
    }
  }

  // ---- PRICING POWER ----
  if (answers.lastPriceIncrease) {
    const pricing = answers.lastPriceIncrease as string;
    if (pricing === 'never' || pricing === '2years+') {
      const yearsStale = pricing === 'never' ? 3 : 2;
      const inflationLoss = Math.round(revenue * 0.03 * yearsStale);
      insights.push({
        id: 'pricing-power',
        zone: 'profitability',
        title: 'Pricing Power: Eroding',
        body: `You haven't raised prices in ${pricing === 'never' ? 'ever' : '2+ years'}. With ~3% annual inflation alone, that's roughly ${formatCurrency(inflationLoss)} in purchasing power you've silently given away. This directly explains margin pressure. Agencies that raise prices annually by 5-8% see margin improvement without adding clients.`,
        severity: 'critical',
        metric: { label: 'Estimated Inflation Loss', value: formatCurrency(inflationLoss), color: '#E31B23' },
      });
    } else if (pricing === '1-2years') {
      insights.push({
        id: 'pricing-power',
        zone: 'profitability',
        title: 'Pricing Power: Needs Attention',
        body: `Last price increase was 1-2 years ago. You're behind inflation and your costs have risen. Schedule an annual pricing review. Most agencies can increase rates 5-8% annually without losing clients — the ones who leave over a 5% increase were your worst clients anyway.`,
        severity: 'warning',
        metric: { label: 'Price Freshness', value: '1-2 years stale', color: '#f59e0b' },
      });
    } else {
      insights.push({
        id: 'pricing-power',
        zone: 'profitability',
        title: 'Pricing Power: Active',
        body: `Recent price increases signal confidence in your value delivery. Keep this cadence — annual pricing reviews are a hallmark of well-run agencies.`,
        severity: 'positive',
        metric: { label: 'Price Freshness', value: 'Current', color: '#22c55e' },
      });
    }
  }

  // ---- CHURN ROOT CAUSE ----
  if (answers.primaryChurnReason) {
    const reason = answers.primaryChurnReason as string;
    const churnRecommendations: Record<string, { title: string; body: string; severity: FollowUpInsight['severity'] }> = {
      budget: {
        title: 'Churn Driver: Budget Cuts',
        body: 'Budget-driven churn means you\'re seen as a cost, not an investment. The fix: reframe your reporting around ROI and business outcomes, not deliverables. When the CFO reviews costs, your line item should scream "revenue driver" not "expense."',
        severity: 'warning',
      },
      results: {
        title: 'Churn Driver: Results Expectations',
        body: 'Results-based churn is a scoping and expectation problem. You\'re either overpromising in sales, underdelivering in execution, or not communicating progress well enough. Implement monthly business reviews with clear KPI tracking from day one.',
        severity: 'critical',
      },
      inhouse: {
        title: 'Churn Driver: In-Housing',
        body: 'In-housing is a positioning problem. If clients can replace you with a hire, your offering isn\'t differentiated enough. The fix: offer strategic value that a single hire can\'t replicate — proprietary methodology, cross-client insights, technology leverage.',
        severity: 'warning',
      },
      competitor: {
        title: 'Churn Driver: Competitor Wins',
        body: 'Losing to competitors means your value proposition isn\'t defensible. Either your differentiation is weak, your proof is thin, or your relationship isn\'t deep enough. This connects directly to your positioning collision score.',
        severity: 'critical',
      },
      contact: {
        title: 'Churn Driver: Champion Loss',
        body: 'Contact-driven churn is actually manageable. The fix: always have 2-3 relationships at each client, not just one champion. Multi-thread your accounts — decision maker, user, and executive sponsor.',
        severity: 'info',
      },
      scope: {
        title: 'Churn Driver: Project Completion',
        body: 'Project-based churn isn\'t really churn — it\'s a business model gap. If engagements naturally end, either build in retainer upsells from day one, or accept project-based economics and make sure your pipeline matches the cycle.',
        severity: 'info',
      },
      relationship: {
        title: 'Churn Driver: Relationship Issues',
        body: 'Relationship-driven churn is a process and people problem. Implement structured account management: proactive check-ins, response time SLAs, and escalation protocols. The clients who leave over communication are giving you a gift — fix it before the bigger ones notice.',
        severity: 'warning',
      },
      unknown: {
        title: 'Churn Driver: Unknown',
        body: 'You don\'t know why clients leave. That\'s the problem before the problem. Implement exit interviews — a simple 5-minute call or survey when a client churns. You can\'t fix what you don\'t measure.',
        severity: 'critical',
      },
    };

    const rec = churnRecommendations[reason];
    if (rec) {
      insights.push({
        id: 'churn-root-cause',
        zone: 'growthVsChurn',
        ...rec,
      });
    }
  }

  // ---- SALES CYCLE ----
  if (answers.avgSalesCycleDays) {
    const cycle = answers.avgSalesCycleDays as string;
    const monthlyLeads = data.monthlyLeads || 0;
    const label = SALES_CYCLE_LABELS[cycle] || cycle;

    if (cycle === '90days+') {
      const pipelineValue = monthlyLeads * 3 * (data.avgClientValue || 0);
      insights.push({
        id: 'sales-cycle',
        zone: 'leadEngine',
        title: 'Sales Cycle: Revenue Delayed',
        body: `A ${label} sales cycle means you need 3+ months of pipeline to maintain cash flow. At ${monthlyLeads} leads/month, your active pipeline should hold ~${formatCurrency(pipelineValue)} at any time. If it doesn't, you'll hit revenue gaps. Long cycles also mean your lead volume problem is actually worse than it looks — you need more leads earlier.`,
        severity: 'warning',
        metric: { label: 'Sales Cycle', value: label, color: '#f59e0b' },
      });
    } else if (cycle === '<14days') {
      insights.push({
        id: 'sales-cycle',
        zone: 'leadEngine',
        title: 'Sales Cycle: Fast Close',
        body: `${label} is fast for agency services. Either you have exceptional positioning that removes friction, or your deals are smaller/simpler. If your average deal value is low, consider whether faster cycles are coming at the cost of deal size.`,
        severity: 'positive',
        metric: { label: 'Sales Cycle', value: label, color: '#22c55e' },
      });
    }
  }

  // ---- TEAM CAPACITY ----
  if (answers.teamCapacity) {
    const capacity = answers.teamCapacity as string;
    if (capacity === 'overloaded' && result.wtfZones.revenueQuality.score <= 2) {
      insights.push({
        id: 'capacity-mismatch',
        zone: 'revenueQuality',
        title: 'Capacity Crisis: Overloaded AND Underperforming',
        body: 'Your team is overloaded but revenue/FTE is below benchmark. This means you\'re busy doing work that doesn\'t pay well enough. The problem isn\'t capacity — it\'s pricing and scope. You\'re doing too much work for too little money.',
        severity: 'critical',
        metric: { label: 'Utilization', value: 'Overloaded', color: '#E31B23' },
      });
    } else if (capacity === 'underutilized') {
      insights.push({
        id: 'capacity-opportunity',
        zone: 'revenueQuality',
        title: 'Capacity Opportunity: Room to Grow',
        body: 'You have spare capacity. That means you can grow revenue without hiring — the highest-leverage position possible. Focus 100% on lead gen and sales, not hiring. Every new client goes straight to margin.',
        severity: 'positive',
        metric: { label: 'Utilization', value: 'Underutilized', color: '#22c55e' },
      });
    }
  }

  // ---- CLIENT SATISFACTION ----
  if (answers.clientSatisfaction) {
    const sat = Number(answers.clientSatisfaction);
    if (sat <= 2 && result.wtfZones.growthVsChurn.score <= 2) {
      insights.push({
        id: 'delivery-churn-link',
        zone: 'growthVsChurn',
        title: 'Churn Root Cause: Delivery Quality',
        body: 'Client satisfaction of ' + sat + '/5 combined with high churn tells a clear story: clients are leaving because the work isn\'t good enough. No amount of marketing or sales fixes this. Invest in delivery quality, project management, and client communication before adding new clients to a broken system.',
        severity: 'critical',
      });
    }
  }

  // ---- SECOND IN COMMAND ----
  if (answers.hasSecondInCommand) {
    const has2ic = answers.hasSecondInCommand as string;
    if (has2ic === 'no') {
      insights.push({
        id: 'no-second-in-command',
        zone: 'founderLoad',
        title: 'No #2: This Is Your Ceiling',
        body: `At ${formatCurrency(revenue)}, with no second-in-command, every operational decision flows through you. Your Founder Tax of ${formatCurrency(result.founderOS.delegationScore < 2 ? revenue * 0.3 : revenue * 0.15)} is structural — it can't decrease until you hire or promote a #2. This is priority #1 over any marketing or sales initiative.`,
        severity: 'critical',
      });
    }
  }

  // ---- COST STRUCTURE ----
  if (answers.costStructure) {
    const cogs = answers.costStructure as string;
    const cogsMap: Record<string, number> = { '<40%': 35, '40-55%': 47, '55-70%': 62, '70%+': 75 };
    const cogsPct = cogsMap[cogs] || 50;
    const grossMargin = 100 - cogsPct;

    if (cogsPct >= 70) {
      insights.push({
        id: 'cost-structure',
        zone: 'profitability',
        title: 'Cost Structure: Labor-Heavy',
        body: `${cogsPct}% of revenue going to direct labor leaves only ${grossMargin}% gross margin to cover everything else — overhead, tools, marketing, and your own compensation. Healthy agencies target 45-55% COGS. You either need to raise prices, reduce scope, or improve delivery efficiency (templates, AI, automation).`,
        severity: 'critical',
        metric: { label: 'Gross Margin', value: `${grossMargin}%`, color: '#E31B23' },
      });
    } else if (cogsPct < 40) {
      insights.push({
        id: 'cost-structure',
        zone: 'profitability',
        title: 'Cost Structure: Efficient',
        body: `${cogsPct}% COGS gives you a ${grossMargin}% gross margin — above the agency benchmark. You have room to invest in growth, absorb client dips, and build reserves. Protect this efficiency as you scale.`,
        severity: 'positive',
        metric: { label: 'Gross Margin', value: `${grossMargin}%`, color: '#22c55e' },
      });
    }
  }

  return insights;
}

// ============================================
// LTV CALCULATIONS (from existing data)
// ============================================

export interface LTVMetrics {
  avgClientValue: number;
  avgClientLifetimeMonths: number;
  ltv: number;
  estimatedCAC: number;
  ltvCacRatio: number;
  ltvCacAssessment: string;
  ltvCacColor: string;
}

/**
 * Calculate LTV metrics from existing intake data.
 * No new form fields required — we derive everything from what's already collected.
 */
export function calculateLTVMetrics(data: IntakeData): LTVMetrics | null {
  const lastMonthRevenue = data.lastMonthRevenue || 0;
  const currentClients = data.currentClients || data.clientCount || 0;
  const monthlyLeads = data.monthlyLeads || 0;

  if (!lastMonthRevenue || !currentClients) return null;

  const avgClientValue = lastMonthRevenue / currentClients;

  // Estimate average client lifetime from churn data
  let avgClientLifetimeMonths: number;
  if (data.clientsLostAnnual) {
    const churnMidpoints: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 };
    const annualChurn = churnMidpoints[data.clientsLostAnnual] || 4;
    const monthlyChurnRate = (annualChurn / 12) / currentClients;
    avgClientLifetimeMonths = monthlyChurnRate > 0 ? Math.round(1 / monthlyChurnRate) : 36;
  } else if (data.avgClientLifetime) {
    avgClientLifetimeMonths = data.avgClientLifetime;
  } else {
    avgClientLifetimeMonths = 18; // industry default
  }

  const ltv = avgClientValue * avgClientLifetimeMonths;

  // Estimate CAC: marketing spend is hard to know, but we can estimate from
  // lead volume and close rate as a proxy
  const closeRate = typeof data.closeRate === 'string'
    ? parseFloat(data.closeRate.replace(/[^0-9.]/g, '') || '25') / 100
    : (data.closeRate || 25) / 100;
  const leadsPerClient = monthlyLeads > 0 && closeRate > 0
    ? 1 / closeRate
    : 5; // fallback

  // Estimate cost per lead at $100-$300 depending on channel mix
  const referralPct = data.referralPercent || 0;
  const paidPct = data.paidPercent || 0;
  const estimatedCPL = (referralPct * 50 + paidPct * 300 + (100 - referralPct - paidPct) * 150) / 100;
  const estimatedCAC = Math.round(leadsPerClient * estimatedCPL);

  const ltvCacRatio = estimatedCAC > 0 ? Math.round((ltv / estimatedCAC) * 10) / 10 : 0;

  let ltvCacAssessment: string;
  let ltvCacColor: string;
  if (ltvCacRatio >= 5) {
    ltvCacAssessment = 'Excellent — strong unit economics. You can afford to invest more in acquisition.';
    ltvCacColor = '#22c55e';
  } else if (ltvCacRatio >= 3) {
    ltvCacAssessment = 'Healthy — your unit economics work. Focus on scaling what\'s working.';
    ltvCacColor = '#00D4FF';
  } else if (ltvCacRatio >= 1.5) {
    ltvCacAssessment = 'Thin — your unit economics barely work. Either increase LTV (raise prices, extend retention) or reduce CAC.';
    ltvCacColor = '#f59e0b';
  } else {
    ltvCacAssessment = 'Broken — you\'re spending more to acquire clients than they\'re worth. Fix retention, pricing, or acquisition costs immediately.';
    ltvCacColor = '#E31B23';
  }

  return {
    avgClientValue: Math.round(avgClientValue),
    avgClientLifetimeMonths,
    ltv: Math.round(ltv),
    estimatedCAC,
    ltvCacRatio,
    ltvCacAssessment,
    ltvCacColor,
  };
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + Math.round(amount);
}
