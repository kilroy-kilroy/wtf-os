# GROWTHOS ASSESSMENT: IMPLEMENTATION SPECIFICATION
## Version 2.0 — "The Holy Shit Diagnostic"

---

# PART 1: DATA COLLECTION (REVISED FORM)

## Stage 1: Intake Gate (unchanged)
| Field | Type | Required |
|-------|------|----------|
| founderName | string | Yes |
| email | string | Yes |
| website | URL | Yes |

---

## Stage 2: Assessment Form (REVISED)

### Section 1 — Agency Basics (4 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Agency Name | `agencyName` | string | Yes | |
| Founder LinkedIn URL | `founderLinkedinUrl` | URL | Yes | |
| Company LinkedIn URL | `companyLinkedinUrl` | URL | No | |
| Team Size (including founder) | `teamSize` | number | Yes | Minimum 1 |

---

### Section 2 — Revenue & Financials (4 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Last Year's Annual Revenue | `lastYearRevenue` | currency | Yes | Dropdown ranges or exact |
| This Year's Target Revenue | `targetRevenue` | currency | Yes | |
| Net Profit Margin | `netProfitMargin` | percentage | Yes | Dropdown: <5%, 5-10%, 10-15%, 15-20%, 20-25%, 25-30%, 30%+ |
| Last Month's Revenue | `lastMonthRevenue` | currency | Yes | Used for avg client value calc |

**Calculated (not asked):**
```
growthTarget = ((targetRevenue - lastYearRevenue) / lastYearRevenue) * 100
annualizedCurrentRevenue = lastMonthRevenue * 12
```

**Removed:** `avgMonthlyRetainer` — we calculate this from revenue/clients

---

### Section 3 — Clients & Churn (4 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Current Active Clients | `currentClients` | number | Yes | |
| Clients Lost (past 12 months) | `clientsLostAnnual` | select | Yes | Options: 0-2, 3-5, 6-10, 11-15, 16+ |
| New Clients Added (past 12 months) | `clientsAddedAnnual` | select | Yes | Options: 0-3, 4-8, 9-15, 16-25, 26+ |
| Churn Calibration | `churnCalibration` | select | Yes | Shown AFTER calculation; Options: Lower, About Right, Higher |

**Calculated & Displayed for Calibration:**
```
avgClientValue = lastMonthRevenue / currentClients
clientsLostMidpoint = midpoint of selected range (e.g., "3-5" → 4)
clientsAddedMidpoint = midpoint of selected range
estimatedMonthlyChurn = (clientsLostMidpoint / 12) * avgClientValue
churnRatePercent = (estimatedMonthlyChurn / lastMonthRevenue) * 100
```

**Display before churnCalibration field:**
> "Based on your inputs, you're losing approximately **$X/month** to churn (**X%** of monthly revenue). Does that feel right?"

**Churn Calibration Adjustment:**
```
if churnCalibration == "Lower": churnMultiplier = 0.6
if churnCalibration == "About Right": churnMultiplier = 1.0
if churnCalibration == "Higher": churnMultiplier = 1.5
finalMonthlyChurn = estimatedMonthlyChurn * churnMultiplier
finalChurnRate = churnRatePercent * churnMultiplier
```

---

### Section 4 — Lead Sources (8 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Referral % | `referralPercent` | percentage | Yes | All 6 must sum to 100 |
| Inbound/Website % | `inboundPercent` | percentage | Yes | |
| Content/Social % | `contentPercent` | percentage | Yes | |
| Paid Ads % | `paidPercent` | percentage | Yes | |
| Outbound % | `outboundPercent` | percentage | Yes | |
| Partnerships % | `partnershipPercent` | percentage | No | Default 0 |
| Qualified Leads Per Month | `monthlyLeads` | number | Yes | |
| Close Rate | `closeRate` | percentage | Yes | Dropdown: <10%, 10-20%, 20-30%, 30-40%, 40-50%, 50%+ |

**Validation:** Sum of all channel percentages must equal 100%

---

### Section 5 — Founder Time (6 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Your Weekly Hours | `founderWeeklyHours` | number | Yes | |
| Hours on Strategy/Growth | `strategyHoursPerWeek` | number | Yes | Must be ≤ founderWeeklyHours |

**Founder Involvement Ratings (1-5 scale each):**

*"How much do YOU personally handle in each area? 1 = I do almost everything, 5 = Fully delegated"*

| Field | ID | Type |
|-------|-----|------|
| Client Deliverables | `ceoDeliveryRating` | 1-5 scale |
| Account Management | `ceoAccountMgmtRating` | 1-5 scale |
| Marketing | `ceoMarketingRating` | 1-5 scale |
| Sales & BD | `ceoSalesRating` | 1-5 scale |

---

### Section 6 — Systems & Documentation (4 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Sales Process Documented? | `hasSalesSOP` | select | Yes | Yes / Partial / No |
| Delivery Process Documented? | `hasDeliverySOP` | select | Yes | Yes / Partial / No |
| Account Management Documented? | `hasAccountMgmtSOP` | select | Yes | Yes / Partial / No |
| Marketing Process Documented? | `hasMarketingSOP` | select | Yes | Yes / Partial / No |

---

### Section 7 — Positioning & ICP (6 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Target Client Company Size | `targetCompanySize` | select | Yes | Options: 1-10, 11-50, 51-200, 201-1000, 1000+ employees |
| Target Client Industry | `targetIndustry` | select | Yes | Multi-select from list + "Other" |
| Who is your ideal client? | `statedICP` | textarea | Yes | Free text, max 500 chars |
| What is your core offer? | `coreOffer` | textarea | Yes | Free text, max 500 chars |
| What makes you different? | `differentiator` | textarea | Yes | Free text, max 500 chars |

---

### Section 8 — Visibility & Proof (5 fields)
| Field | ID | Type | Required | Notes |
|-------|-----|------|----------|-------|
| Founder LinkedIn Posts/Week | `founderPostsPerWeek` | number | Yes | |
| Team LinkedIn Posts/Week | `teamPostsPerWeek` | number | Yes | Can be 0 |
| Published Case Studies? | `hasCaseStudies` | select | Yes | Yes (3+) / Some (1-2) / No |
| Display Client Logos/Names? | `hasNamedClients` | select | Yes | Yes / No |

---

## TOTAL FORM FIELDS: 33 (down from 34, but more usable)

---

# PART 2: ENRICHMENT PIPELINE (REVISED)

## Phase 1 — External Data Collection (unchanged scope)

| Source | Data Returned |
|--------|---------------|
| Apify — Website | Headlines, services, case studies, testimonials, client logos, blog posts |
| Apify — Founder LinkedIn | Headline, about, follower count, connection count |
| Apify — Founder Posts | Last 20 posts with engagement metrics |
| Apify — Company LinkedIn | Description, follower count |
| Apify — Company Posts | Last 20 posts with engagement metrics |
| Exa — ICP Problems | Top 10 pain points for stated ICP |
| Exa — Competitors | Top 20 competing agencies |
| LLM — AI Discoverability | 3 queries each to Claude/ChatGPT/Perplexity |

## Phase 2 — Analysis (REVISED for new revelations)

| Analysis | Input | Output |
|----------|-------|--------|
| Positioning Coherence | Website + LinkedIn + stated ICP/offer | Score 1-10, specific mismatches, prospect mental math narrative |
| Content-Market Fit | LinkedIn posts vs ICP problems from Exa | Score 1-10, topic gap analysis |
| Competitor Authority Analysis | **NEW** — Exa competitors + their content signals | Competitor content volume, proof points, coverage % |
| AI Discoverability | LLM responses | Found/not found per platform, competitor recommendations |

---

# PART 3: CALCULATION ENGINE

## Segment Determination (unchanged)
```javascript
function getSegment(annualRevenue) {
  if (annualRevenue < 500000) return 'startup'      // <$500K
  if (annualRevenue < 2000000) return 'growth'      // $500K-$2M
  if (annualRevenue < 5000000) return 'scale'       // $2M-$5M
  if (annualRevenue < 10000000) return 'established' // $5M-$10M
  return 'enterprise'                                // $10M+
}
```

---

## REVELATION 1: THE FOUNDER TAX

### Required Data
| Variable | Source | Fallback |
|----------|--------|----------|
| `annualRevenue` | `lastYearRevenue` or `lastMonthRevenue * 12` | — |
| `teamSize` | Form | — |
| `founderWeeklyHours` | Form | — |
| `ceoDeliveryRating` | Form (1-5) | — |
| `ceoAccountMgmtRating` | Form (1-5) | — |
| `ceoMarketingRating` | Form (1-5) | — |
| `ceoSalesRating` | Form (1-5) | — |
| `strategyHoursPerWeek` | Form | — |

### Benchmark Tables
```javascript
const MARKET_RATES = {
  delivery: { junior: 45, mid: 65, senior: 85 },      // $/hour
  accountMgmt: { junior: 40, mid: 55, senior: 75 },
  marketing: { junior: 50, mid: 70, senior: 95 },
  sales: { junior: 55, mid: 80, senior: 110 }
}

const STRATEGIC_HOURLY_VALUE = {
  startup: 200,      // <$500K — founder strategic time worth
  growth: 350,       // $500K-$2M
  scale: 500,        // $2M-$5M
  established: 650,  // $5M-$10M
  enterprise: 800    // $10M+
}
```

### Calculation
```javascript
function calculateFounderTax(data) {
  const segment = getSegment(data.annualRevenue)
  
  // Step 1: Calculate founder's implied hourly rate
  const founderHourlyEquivalent = data.annualRevenue / (data.teamSize * 2080)
  
  // Step 2: Estimate hours spent in each area based on delegation scores
  // Lower score = more personal involvement
  // Score 1 = 100% of area hours, Score 5 = 0% of area hours
  const involvementMultiplier = (score) => (5 - score) / 4  // 1→1.0, 5→0.0
  
  const AREA_HOURS_PER_WEEK = {
    delivery: 15,      // Max hours if doing everything
    accountMgmt: 8,
    marketing: 6,
    sales: 10
  }
  
  const founderDeliveryHours = AREA_HOURS_PER_WEEK.delivery * involvementMultiplier(data.ceoDeliveryRating)
  const founderAccountHours = AREA_HOURS_PER_WEEK.accountMgmt * involvementMultiplier(data.ceoAccountMgmtRating)
  const founderMarketingHours = AREA_HOURS_PER_WEEK.marketing * involvementMultiplier(data.ceoMarketingRating)
  const founderSalesHours = AREA_HOURS_PER_WEEK.sales * involvementMultiplier(data.ceoSalesRating)
  
  const totalOperationalHours = founderDeliveryHours + founderAccountHours + founderMarketingHours + founderSalesHours
  
  // Step 3: Calculate what founder is "paying" themselves
  const founderLaborCost = totalOperationalHours * 52 * founderHourlyEquivalent
  
  // Step 4: Calculate what it would cost to hire
  const replacementCost = (
    (founderDeliveryHours * MARKET_RATES.delivery.mid) +
    (founderAccountHours * MARKET_RATES.accountMgmt.mid) +
    (founderMarketingHours * MARKET_RATES.marketing.mid) +
    (founderSalesHours * MARKET_RATES.sales.mid)
  ) * 52
  
  // Step 5: Labor arbitrage (what they're overpaying by doing it themselves)
  const laborArbitrage = Math.max(0, founderLaborCost - replacementCost)
  
  // Step 6: Strategic opportunity cost
  const strategicHourlyValue = STRATEGIC_HOURLY_VALUE[segment]
  const strategicOpportunityCost = totalOperationalHours * 52 * strategicHourlyValue
  
  // Step 7: Total Founder Tax
  const totalFounderTax = laborArbitrage + strategicOpportunityCost
  
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
      sales: { hours: Math.round(founderSalesHours), rating: data.ceoSalesRating }
    },
    biggestBottleneck: getBiggestBottleneck(data)  // Area with lowest delegation score
  }
}

function canRenderFounderTax(data) {
  return (
    data.annualRevenue > 0 &&
    data.teamSize > 0 &&
    data.founderWeeklyHours > 0 &&
    data.ceoDeliveryRating >= 1 && data.ceoDeliveryRating <= 5 &&
    data.ceoAccountMgmtRating >= 1 && data.ceoAccountMgmtRating <= 5 &&
    data.ceoMarketingRating >= 1 && data.ceoMarketingRating <= 5 &&
    data.ceoSalesRating >= 1 && data.ceoSalesRating <= 5
  )
}
```

### Edge Cases
| Condition | Handling |
|-----------|----------|
| All delegation scores = 5 | Founder Tax = $0, show congratulations variant |
| Team size = 1 (solo) | Skip "replacement cost" framing, focus on opportunity cost only |
| Revenue < $100K | Skip section (numbers too small to be meaningful) |
| Calculated tax > revenue | Cap at 80% of revenue, add note about extreme situation |

---

## REVELATION 2: THE PIPELINE PROBABILITY

### Required Data
| Variable | Source | Fallback |
|----------|--------|----------|
| `currentClients` | Form | — |
| `clientsLostMidpoint` | Calculated from `clientsLostAnnual` | — |
| `clientsAddedMidpoint` | Calculated from `clientsAddedAnnual` | — |
| `referralPercent` | Form | — |
| `avgClientValue` | `lastMonthRevenue / currentClients` | — |
| `finalChurnRate` | Calculated with calibration | — |

### Benchmark Tables
```javascript
const RANGE_MIDPOINTS = {
  'clientsLost': { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 },
  'clientsAdded': { '0-3': 1.5, '4-8': 6, '9-15': 12, '16-25': 20, '26+': 30 }
}

const REFERRAL_NETWORK_MULTIPLIER = 1.5  // Network can support ~1.5x current clients at saturation

const REFERRER_ANNUAL_CHURN_RATE = 0.15  // 15% of referrers change jobs/retire/go quiet per year

const PARETO_TOP_REFERRER_CONCENTRATION = 0.6  // Top 20% of referrers generate 60% of referrals
```

### Calculation
```javascript
function calculatePipelineProbability(data) {
  const clientsLostMidpoint = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual]
  const clientsAddedMidpoint = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual]
  
  // Net client growth
  const netClientGrowth = clientsAddedMidpoint - clientsLostMidpoint
  
  // Referral network ceiling
  const referralNetworkCeiling = Math.round(data.currentClients * REFERRAL_NETWORK_MULTIPLIER)
  
  // Months to ceiling (if positive growth)
  const monthsToReferralCeiling = netClientGrowth > 0 
    ? Math.round(((referralNetworkCeiling - data.currentClients) / netClientGrowth) * 12)
    : null  // Already at or past ceiling
  
  // Pipeline disruption probability (3-year horizon)
  // Based on: if top referrers churn at 15%/year, compounded over 3 years
  // And top referrers generate 60% of referrals...
  const topReferrerRetentionRate = Math.pow(1 - REFERRER_ANNUAL_CHURN_RATE, 3)  // ~61% retained after 3 years
  const probabilityOfMajorDisruption = data.referralPercent >= 50 
    ? Math.round((1 - topReferrerRetentionRate) * (data.referralPercent / 100) * 100)
    : Math.round((1 - topReferrerRetentionRate) * 0.5 * 100)  // Lower weight if diversified
  
  // Revenue at risk
  const monthlyReferralRevenue = (data.referralPercent / 100) * data.lastMonthRevenue
  const annualReferralRevenue = monthlyReferralRevenue * 12
  const revenueAtRiskIn3Years = Math.round(annualReferralRevenue * (probabilityOfMajorDisruption / 100))
  
  // Referral dependency status
  let referralDependencyStatus
  if (data.referralPercent >= 80) referralDependencyStatus = 'critical'
  else if (data.referralPercent >= 60) referralDependencyStatus = 'high'
  else if (data.referralPercent >= 40) referralDependencyStatus = 'moderate'
  else referralDependencyStatus = 'healthy'
  
  // Channel diversity score (how many channels contribute 10%+)
  const channels = [
    data.referralPercent,
    data.inboundPercent,
    data.contentPercent,
    data.paidPercent,
    data.outboundPercent,
    data.partnershipPercent || 0
  ]
  const activeChannels = channels.filter(c => c >= 10).length
  
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
    isFlat: netClientGrowth === 0
  }
}

function canRenderPipelineProbability(data) {
  return (
    data.currentClients > 0 &&
    data.clientsLostAnnual &&
    data.clientsAddedAnnual &&
    data.referralPercent >= 0 &&
    data.lastMonthRevenue > 0
  )
}
```

### Edge Cases
| Condition | Handling |
|-----------|----------|
| 0 clients lost AND 0 clients added | Show "insufficient history" variant, skip probability model |
| Referral % = 0 | Skip referral-specific warnings, focus on channel diversity |
| Referral % = 100 | Extreme warning variant |
| Net growth strongly positive (>10/year) | Acknowledge growth but still flag referral risk if >60% |
| currentClients < 5 | Skip ceiling calculation (too small for network effects) |

---

## REVELATION 3: THE AUTHORITY GAP

### Required Data
| Variable | Source | Fallback |
|----------|--------|----------|
| `founderPostsPerWeek` | Form | — |
| `teamPostsPerWeek` | Form | — |
| `hasCaseStudies` | Form | — |
| `hasNamedClients` | Form | — |
| `founderLinkedinFollowers` | Enrichment (Apify) | Skip if unavailable |
| `founderPostEngagement` | Enrichment (Apify) | Skip if unavailable |
| `competitorData` | Enrichment (Exa) | Skip section if unavailable |
| `aiDiscoverability` | Enrichment (LLM queries) | Skip if unavailable |
| `icpProblems` | Enrichment (Exa) | — |
| `contentTopics` | Enrichment (Apify — founder posts) | — |

### Benchmark Tables
```javascript
const AUTHORITY_BENCHMARKS = {
  postsPerWeek: { weak: 1, average: 3, strong: 5 },
  caseStudies: { weak: 0, average: 3, strong: 6 },
  followers: {
    startup: { weak: 500, average: 2000, strong: 5000 },
    growth: { weak: 2000, average: 5000, strong: 10000 },
    scale: { weak: 5000, average: 10000, strong: 25000 },
    established: { weak: 10000, average: 25000, strong: 50000 },
    enterprise: { weak: 25000, average: 50000, strong: 100000 }
  }
}

const AI_BUYER_USAGE_RATE = 0.64  // 64% of B2B buyers use AI in research (per industry data)
```

### Calculation
```javascript
function calculateAuthorityGap(data, enrichment) {
  const segment = getSegment(data.annualRevenue)
  
  // Content volume score (0-100)
  const weeklyPosts = data.founderPostsPerWeek + data.teamPostsPerWeek
  let contentVolumeScore
  if (weeklyPosts >= 7) contentVolumeScore = 100
  else if (weeklyPosts >= 5) contentVolumeScore = 80
  else if (weeklyPosts >= 3) contentVolumeScore = 60
  else if (weeklyPosts >= 1) contentVolumeScore = 40
  else contentVolumeScore = 10
  
  // Proof points score (0-100)
  const caseStudyScore = data.hasCaseStudies === 'Yes (3+)' ? 100 : data.hasCaseStudies === 'Some (1-2)' ? 50 : 0
  const namedClientScore = data.hasNamedClients === 'Yes' ? 100 : 0
  const proofScore = (caseStudyScore + namedClientScore) / 2
  
  // AI Discoverability
  const aiPlatforms = ['claude', 'chatgpt', 'perplexity']
  const aiFoundCount = aiPlatforms.filter(p => enrichment.aiDiscoverability?.[p]?.found).length
  const aiDiscoverabilityScore = (aiFoundCount / 3) * 100
  
  // Calculate invisible buyer loss
  // If they get X leads/month, total market interest ≈ X / close rate
  const closeRateMidpoint = getCloseRateMidpoint(data.closeRate)
  const totalMarketInquiries = data.monthlyLeads / (closeRateMidpoint / 100)
  const buyersUsingAI = Math.round(totalMarketInquiries * AI_BUYER_USAGE_RATE)
  const invisibleToBuyersCount = aiDiscoverabilityScore < 50 
    ? Math.round(buyersUsingAI * (1 - aiDiscoverabilityScore / 100))
    : 0
  
  // Competitor analysis (if available)
  let competitorComparison = null
  if (enrichment.competitors && enrichment.competitors.length > 0) {
    const topCompetitors = enrichment.competitors.slice(0, 5)
    competitorComparison = topCompetitors.map(comp => ({
      name: comp.name,
      contentSignals: comp.contentCount || 'Unknown',
      proofSignals: comp.caseStudyCount || 'Unknown',
      whyTheySurface: comp.surfaceReason || 'Strong content presence'
    }))
  }
  
  // ICP problem coverage
  let problemCoverage = null
  if (enrichment.icpProblems && enrichment.contentTopics) {
    const coveredProblems = enrichment.icpProblems.filter(problem =>
      enrichment.contentTopics.some(topic => 
        topic.toLowerCase().includes(problem.toLowerCase()) ||
        problem.toLowerCase().includes(topic.toLowerCase())
      )
    )
    problemCoverage = {
      total: enrichment.icpProblems.length,
      covered: coveredProblems.length,
      percentage: Math.round((coveredProblems.length / enrichment.icpProblems.length) * 100),
      gaps: enrichment.icpProblems.filter(p => !coveredProblems.includes(p))
    }
  }
  
  // Overall authority score (0-100)
  const overallAuthorityScore = Math.round(
    (contentVolumeScore * 0.3) +
    (proofScore * 0.3) +
    (aiDiscoverabilityScore * 0.4)
  )
  
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
      claude: enrichment.aiDiscoverability?.claude || { found: false },
      chatgpt: enrichment.aiDiscoverability?.chatgpt || { found: false },
      perplexity: enrichment.aiDiscoverability?.perplexity || { found: false }
    },
    competitorsRecommendedInstead: enrichment.aiDiscoverability?.competitorsRecommended || []
  }
}

function canRenderAuthorityGap(data, enrichment) {
  return (
    data.founderPostsPerWeek >= 0 &&
    data.monthlyLeads > 0 &&
    data.closeRate
    // Note: enrichment data is optional — section renders with reduced depth
  )
}

function getCloseRateMidpoint(closeRateRange) {
  const midpoints = {
    '<10%': 7,
    '10-20%': 15,
    '20-30%': 25,
    '30-40%': 35,
    '40-50%': 45,
    '50%+': 55
  }
  return midpoints[closeRateRange] || 25
}
```

### Edge Cases
| Condition | Handling |
|-----------|----------|
| Enrichment completely fails | Show form-based metrics only, skip competitor/AI sections |
| Found in all 3 AI platforms | Congratulations variant |
| 0 posts per week | Extreme "invisible by choice" variant |
| No case studies AND no named clients | "Zero proof" callout |
| monthlyLeads = 0 | Skip "invisible buyer" calculation |

---

## REVELATION 4: THE POSITIONING COLLISION

### Required Data
| Variable | Source | Fallback |
|----------|--------|----------|
| `statedICP` | Form | — |
| `coreOffer` | Form | — |
| `differentiator` | Form | — |
| `targetIndustry` | Form | — |
| `targetCompanySize` | Form | — |
| `websiteHeadline` | Enrichment (Apify) | Skip comparison if unavailable |
| `websiteServices` | Enrichment (Apify) | — |
| `caseStudies` | Enrichment (Apify) | — |
| `testimonials` | Enrichment (Apify) | — |
| `positioningCoherenceAnalysis` | Enrichment (Claude analysis) | — |

### Calculation
```javascript
function calculatePositioningCollision(data, enrichment) {
  // Parse case studies to check ICP match
  let caseStudyAnalysis = null
  if (enrichment.caseStudies && enrichment.caseStudies.length > 0) {
    caseStudyAnalysis = enrichment.caseStudies.map(cs => {
      // Check if case study matches stated ICP
      const industryMatch = cs.industry && data.targetIndustry.some(ind => 
        cs.industry.toLowerCase().includes(ind.toLowerCase())
      )
      const sizeMatch = cs.companySize && checkSizeMatch(cs.companySize, data.targetCompanySize)
      
      return {
        client: cs.clientName || 'Unnamed',
        industry: cs.industry || 'Unknown',
        size: cs.companySize || 'Unknown',
        matchesICP: industryMatch && sizeMatch,
        industryMatch,
        sizeMatch
      }
    })
  }
  
  // Calculate proof/positioning alignment
  let proofAlignmentScore = 50  // Default if no case studies
  if (caseStudyAnalysis && caseStudyAnalysis.length > 0) {
    const matchingCaseStudies = caseStudyAnalysis.filter(cs => cs.matchesICP).length
    proofAlignmentScore = Math.round((matchingCaseStudies / caseStudyAnalysis.length) * 100)
  }
  
  // Website/stated alignment (from Claude analysis)
  const websiteAlignmentScore = enrichment.positioningCoherenceAnalysis?.score 
    ? enrichment.positioningCoherenceAnalysis.score * 10  // Convert 1-10 to 0-100
    : 50
  
  // Overall collision score (higher = more collision/misalignment)
  const collisionScore = 100 - Math.round((proofAlignmentScore + websiteAlignmentScore) / 2)
  
  // Calculate annual cost of collision
  // Assumption: Poor positioning = higher bounce rate = lost opportunities
  // If collision score > 50, estimate lost opportunities
  const monthlyTrafficEstimate = data.monthlyLeads * 50  // Rough traffic:lead ratio
  const bounceRateIncrease = collisionScore > 50 ? (collisionScore - 50) / 100 : 0  // 0-50% increase
  const additionalBounces = Math.round(monthlyTrafficEstimate * bounceRateIncrease * 0.5)  // Only qualified visitors
  const qualifiedVisitorToLeadRate = data.monthlyLeads / monthlyTrafficEstimate
  const lostLeadsPerMonth = Math.round(additionalBounces * qualifiedVisitorToLeadRate)
  const lostLeadsPerYear = lostLeadsPerMonth * 12
  const avgClientValue = data.lastMonthRevenue / data.currentClients
  const closeRateMidpoint = getCloseRateMidpoint(data.closeRate) / 100
  const lostRevenueAnnual = Math.round(lostLeadsPerYear * closeRateMidpoint * avgClientValue * 12)
  
  // Generate the "prospect mental math" narrative
  const prospectNarrative = generateProspectNarrative(data, enrichment, caseStudyAnalysis)
  
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
      targetSize: data.targetCompanySize
    },
    proof: {
      websiteHeadline: enrichment.websiteHeadline || 'Not captured',
      caseStudyIndustries: caseStudyAnalysis?.map(cs => cs.industry) || [],
      caseStudySizes: caseStudyAnalysis?.map(cs => cs.size) || []
    },
    gapsIdentified: enrichment.positioningCoherenceAnalysis?.gaps || [],
    recommendations: enrichment.positioningCoherenceAnalysis?.recommendations || []
  }
}

function generateProspectNarrative(data, enrichment, caseStudyAnalysis) {
  // Build the "8 seconds on your site" story
  const icpLabel = data.statedICP.substring(0, 50)
  const hasMatchingProof = caseStudyAnalysis?.some(cs => cs.matchesICP)
  
  if (hasMatchingProof) {
    return {
      headline: "Your proof mostly backs up your claims",
      story: `A ${icpLabel} lands on your site, sees your headline, scans your case studies—and at least one looks like their situation. They stay. But you could be stronger.`,
      timeOnSite: "45+ seconds",
      verdict: "Continues exploring"
    }
  } else {
    const mismatchExample = caseStudyAnalysis?.[0]
    return {
      headline: "Your proof tells a different story than your positioning",
      story: `A ${icpLabel} lands on your site. They see you claim to serve them. Then they look at your case studies: ${mismatchExample?.industry || 'different industries'}, ${mismatchExample?.size || 'different company sizes'}. Mental math: "These people say they do this, but all their proof is with different companies. Can they really do it for ME?" The other agency's site shows exactly their situation.`,
      timeOnSite: "8-14 seconds",
      verdict: "Exit. Tab closed."
    }
  }
}

function canRenderPositioningCollision(data, enrichment) {
  return (
    data.statedICP &&
    data.coreOffer &&
    data.targetIndustry &&
    data.targetCompanySize
    // Enrichment optional — renders with reduced depth
  )
}

function checkSizeMatch(caseStudySize, targetSize) {
  // Fuzzy match company sizes
  const sizeRanges = {
    '1-10': ['startup', 'small', '1-10', '<10', 'micro'],
    '11-50': ['small', '11-50', '10-50', 'smb'],
    '51-200': ['medium', 'mid-size', '51-200', '50-200', 'smb'],
    '201-1000': ['mid-market', '201-1000', '200-1000', 'enterprise'],
    '1000+': ['enterprise', 'large', '1000+', '>1000']
  }
  
  const targetKeywords = sizeRanges[targetSize] || []
  return targetKeywords.some(keyword => 
    caseStudySize.toLowerCase().includes(keyword.toLowerCase())
  )
}
```

### Edge Cases
| Condition | Handling |
|-----------|----------|
| No case studies found on website | Note in output, calculate based on other proof points only |
| All case studies match ICP | Congratulations variant — "Your proof backs your claims" |
| Zero proof points (no cases, no logos) | Extreme "zero proof" variant |
| Enrichment completely fails | Show stated positioning, skip collision analysis, suggest manual review |

---

## REVELATION 5: THE TRAJECTORY FORK

### Required Data
| Variable | Source | Fallback |
|----------|--------|----------|
| `annualRevenue` | `lastYearRevenue` or `lastMonthRevenue * 12` | — |
| `currentClients` | Form | — |
| `avgClientValue` | Calculated | — |
| `netClientGrowth` | Calculated from `clientsAdded - clientsLost` | — |
| `finalChurnRate` | Calculated with calibration | — |
| `founderWeeklyHours` | Form | — |
| `delegationScore` | Average of 4 CEO ratings | — |
| `netProfitMargin` | Form | — |
| `totalFounderTax` | Calculated | — |
| `systemsScore` | Calculated from SOPs | — |

### Benchmark Tables
```javascript
const VALUATION_MULTIPLES = {
  distressed: 0.2,      // High owner-dependency, declining
  weak: 0.4,            // Some issues
  average: 0.6,         // Typical agency
  healthy: 0.8,         // Good fundamentals
  strong: 1.0,          // High-performing
  premium: 1.2          // Exceptional
}

const TRAJECTORY_ASSUMPTIONS = {
  currentPath: {
    clientGrowthDecay: 0.9,      // Each year, growth rate decays 10% due to founder constraint
    marginCompression: 0.02,     // Each year, margin compresses 2% due to inefficiency
    founderHoursIncrease: 5,     // Each year, founder works 5 more hours absorbing work
    valuationMultipleDecay: 0.85 // Each year, multiple decreases 15% if declining
  },
  interventionPath: {
    clientGrowthBoost: 1.3,      // 30% improvement from better positioning/systems
    churnReduction: 0.7,         // 30% less churn from better account management
    marginImprovement: 0.02,     // Each year, margin improves 2%
    founderHoursReduction: 5,    // Each year, founder works 5 fewer hours
    valuationMultipleGrowth: 1.1 // Each year, multiple improves 10%
  }
}
```

### Calculation
```javascript
function calculateTrajectoryFork(data, calculations) {
  const avgClientValue = data.lastMonthRevenue / data.currentClients
  const annualClientValue = avgClientValue * 12
  
  // Get baseline metrics
  const clientsLostMidpoint = RANGE_MIDPOINTS.clientsLost[data.clientsLostAnnual]
  const clientsAddedMidpoint = RANGE_MIDPOINTS.clientsAdded[data.clientsAddedAnnual]
  const netClientGrowth = clientsAddedMidpoint - clientsLostMidpoint
  
  const delegationScore = (
    data.ceoDeliveryRating +
    data.ceoAccountMgmtRating +
    data.ceoMarketingRating +
    data.ceoSalesRating
  ) / 4
  
  // Calculate current valuation multiple
  let currentMultiple = VALUATION_MULTIPLES.average
  if (delegationScore < 2) currentMultiple -= 0.2
  if (netClientGrowth < 0) currentMultiple -= 0.15
  if (calculations.systemsScore < 2) currentMultiple -= 0.1
  if (data.netProfitMargin > 20) currentMultiple += 0.1
  if (netClientGrowth > 5) currentMultiple += 0.1
  currentMultiple = Math.max(0.2, Math.min(1.2, currentMultiple))
  
  // PROJECT TRAJECTORY A: Current Path
  const trajectoryA = projectTrajectory('current', {
    year0: {
      revenue: data.lastMonthRevenue * 12,
      clients: data.currentClients,
      founderHours: data.founderWeeklyHours,
      margin: parseMarginMidpoint(data.netProfitMargin),
      multiple: currentMultiple
    },
    netClientGrowth,
    clientsLost: clientsLostMidpoint,
    avgClientValue: annualClientValue,
    delegationScore
  })
  
  // PROJECT TRAJECTORY B: Intervention Path
  const trajectoryB = projectTrajectory('intervention', {
    year0: {
      revenue: data.lastMonthRevenue * 12,
      clients: data.currentClients,
      founderHours: data.founderWeeklyHours,
      margin: parseMarginMidpoint(data.netProfitMargin),
      multiple: currentMultiple
    },
    netClientGrowth,
    clientsLost: clientsLostMidpoint,
    avgClientValue: annualClientValue,
    delegationScore
  })
  
  // Calculate the gap
  const year3Gap = {
    revenue: trajectoryB.year3.revenue - trajectoryA.year3.revenue,
    clients: trajectoryB.year3.clients - trajectoryA.year3.clients,
    founderHours: trajectoryA.year3.founderHours - trajectoryB.year3.founderHours,  // Hours saved
    margin: trajectoryB.year3.margin - trajectoryA.year3.margin,
    valuation: trajectoryB.year3.valuation - trajectoryA.year3.valuation
  }
  
  return {
    canRender: true,
    currentValuation: Math.round(data.lastMonthRevenue * 12 * currentMultiple),
    currentMultiple,
    trajectoryA: {
      year1: formatTrajectoryYear(trajectoryA.year1),
      year2: formatTrajectoryYear(trajectoryA.year2),
      year3: formatTrajectoryYear(trajectoryA.year3),
      narrative: generateTrajectoryNarrative('current', trajectoryA, data)
    },
    trajectoryB: {
      year1: formatTrajectoryYear(trajectoryB.year1),
      year2: formatTrajectoryYear(trajectoryB.year2),
      year3: formatTrajectoryYear(trajectoryB.year3),
      narrative: generateTrajectoryNarrative('intervention', trajectoryB, data)
    },
    gap: {
      revenue: Math.round(year3Gap.revenue),
      clients: Math.round(year3Gap.clients),
      founderHoursSaved: Math.round(year3Gap.founderHours),
      marginPoints: Math.round(year3Gap.margin * 100) / 100,
      valuationDifference: Math.round(year3Gap.valuation)
    },
    keyInterventions: identifyKeyInterventions(data, calculations)
  }
}

function projectTrajectory(type, baseline) {
  const assumptions = TRAJECTORY_ASSUMPTIONS[type === 'current' ? 'currentPath' : 'interventionPath']
  const years = {}
  
  let prevYear = baseline.year0
  
  for (let i = 1; i <= 3; i++) {
    let nextYear = {}
    
    if (type === 'current') {
      // Current path: decay and compression
      const effectiveGrowth = baseline.netClientGrowth * Math.pow(assumptions.clientGrowthDecay, i)
      nextYear.clients = Math.max(5, Math.round(prevYear.clients + effectiveGrowth))
      nextYear.revenue = nextYear.clients * baseline.avgClientValue
      nextYear.founderHours = Math.min(70, prevYear.founderHours + assumptions.founderHoursIncrease)
      nextYear.margin = Math.max(0.02, prevYear.margin - assumptions.marginCompression)
      nextYear.multiple = Math.max(0.2, prevYear.multiple * assumptions.valuationMultipleDecay)
      
      // If shrinking, accelerate decline
      if (effectiveGrowth < 0) {
        nextYear.founderHours = Math.min(70, nextYear.founderHours + 3)  // Extra hours absorbing
        nextYear.margin = Math.max(0.02, nextYear.margin - 0.02)  // Extra margin compression
      }
    } else {
      // Intervention path: improvement
      const boostedGrowth = baseline.netClientGrowth * assumptions.clientGrowthBoost
      const reducedChurn = baseline.clientsLost * assumptions.churnReduction
      const effectiveGrowth = boostedGrowth + (baseline.clientsLost - reducedChurn)
      
      nextYear.clients = Math.round(prevYear.clients + effectiveGrowth)
      nextYear.revenue = nextYear.clients * baseline.avgClientValue * 1.05  // Slight price increase
      nextYear.founderHours = Math.max(25, prevYear.founderHours - assumptions.founderHoursReduction)
      nextYear.margin = Math.min(0.35, prevYear.margin + assumptions.marginImprovement)
      nextYear.multiple = Math.min(1.2, prevYear.multiple * assumptions.valuationMultipleGrowth)
    }
    
    nextYear.valuation = Math.round(nextYear.revenue * nextYear.multiple)
    years[`year${i}`] = nextYear
    prevYear = nextYear
  }
  
  return years
}

function formatTrajectoryYear(year) {
  return {
    revenue: Math.round(year.revenue),
    clients: Math.round(year.clients),
    founderHours: Math.round(year.founderHours),
    margin: Math.round(year.margin * 100),  // As percentage
    valuation: Math.round(year.valuation)
  }
}

function generateTrajectoryNarrative(type, trajectory, data) {
  if (type === 'current') {
    if (trajectory.year3.clients < data.currentClients * 0.8) {
      return "The spiral compounds. Less clients → more founder delivery → less time for growth → fewer clients. By year 3, you're working more hours for less money."
    } else if (trajectory.year3.revenue < data.lastMonthRevenue * 12) {
      return "You're not collapsing, but you're slowly shrinking. Death by a thousand cuts rather than a single blow."
    } else {
      return "Modest growth continues, but founder hours stay high. You're building a well-paying job, not a valuable asset."
    }
  } else {
    return "Hire a delivery lead (year 1), add a non-referral channel (year 1-2), fix positioning/proof (year 1). The compound effect kicks in by year 2."
  }
}

function identifyKeyInterventions(data, calculations) {
  const interventions = []
  
  // Check delegation
  const delegationScore = (data.ceoDeliveryRating + data.ceoAccountMgmtRating + data.ceoMarketingRating + data.ceoSalesRating) / 4
  if (delegationScore < 3) {
    const lowestArea = getLowestDelegationArea(data)
    interventions.push({
      action: `Hire/promote ${lowestArea} lead`,
      impact: 'Frees 10-15 hours/week',
      priority: 1
    })
  }
  
  // Check referral dependency
  if (data.referralPercent >= 60) {
    interventions.push({
      action: 'Build second lead channel (content or outbound)',
      impact: 'Reduces pipeline risk by 40%',
      priority: 2
    })
  }
  
  // Check positioning
  if (calculations.positioningCollision?.collisionScore > 40) {
    interventions.push({
      action: 'Align proof with positioning (new case studies, testimonials)',
      impact: `Recover ~${calculations.positioningCollision.lostLeadsPerYear} lost leads/year`,
      priority: 3
    })
  }
  
  return interventions.slice(0, 3)  // Top 3 only
}

function getLowestDelegationArea(data) {
  const areas = [
    { name: 'delivery', score: data.ceoDeliveryRating },
    { name: 'account management', score: data.ceoAccountMgmtRating },
    { name: 'marketing', score: data.ceoMarketingRating },
    { name: 'sales', score: data.ceoSalesRating }
  ]
  return areas.sort((a, b) => a.score - b.score)[0].name
}

function parseMarginMidpoint(marginRange) {
  const midpoints = {
    '<5%': 0.03,
    '5-10%': 0.075,
    '10-15%': 0.125,
    '15-20%': 0.175,
    '20-25%': 0.225,
    '25-30%': 0.275,
    '30%+': 0.35
  }
  return midpoints[marginRange] || 0.15
}

function canRenderTrajectoryFork(data, calculations) {
  return (
    data.lastMonthRevenue > 0 &&
    data.currentClients > 0 &&
    data.clientsLostAnnual &&
    data.clientsAddedAnnual &&
    data.founderWeeklyHours > 0 &&
    data.ceoDeliveryRating >= 1 &&
    data.netProfitMargin
  )
}
```

### Edge Cases
| Condition | Handling |
|-----------|----------|
| Already high-performing (delegation >4, growing >20%) | "Optimization" variant — trajectory B is accelerated version |
| Strongly declining (losing >10 clients/year) | "Urgent intervention" variant with more aggressive assumptions |
| Solo founder (team size = 1) | Adjust narrative — "hire first" instead of "delegate" |
| Revenue < $200K | Simplify valuation discussion (too early for meaningful multiples) |

---

# PART 4: COPY MATRIX

## Revelation 1: The Founder Tax

### Score Variants

**HIGH TAX (>$300K annually, delegation avg <2)**
```
## The Founder Tax: ${formatCurrency(totalFounderTax)}/year

Let me show you a number you've never calculated.

You're billing at an implied rate of ${formatCurrency(founderHourlyEquivalent)}/hour. 
You spend ${totalOperationalHours} hours/week on ${biggestBottleneck}, account management, and sales.

That's ${formatCurrency(founderLaborCost)}/year of your time on work that would cost 
${formatCurrency(replacementCost)} if you hired for it.

But here's what you're not seeing:

Those ${totalOperationalHours} hours/week ALSO cost you ${totalOperationalHours} hours of strategic time. 
At your stage, strategic time—partnerships, positioning, high-ticket sales—is worth 
${formatCurrency(strategicHourlyValue)}/hour.

**Your Annual Founder Tax:**
| Component | Cost |
|-----------|------|
| Labor arbitrage (overpaying yourself for operational work) | ${formatCurrency(laborArbitrage)} |
| Strategic opportunity cost (what you're NOT doing) | ${formatCurrency(strategicOpportunityCost)} |
| **Total** | **${formatCurrency(totalFounderTax)}** |

That's not a bottleneck. That's a self-imposed ceiling.

**The Fix:** Your lowest delegation score is ${biggestBottleneck} at ${lowestScore}/5. 
That's your first hire. Make it in the next 90 days.
```

**MEDIUM TAX ($100K-$300K annually, delegation avg 2-3)**
```
## The Founder Tax: ${formatCurrency(totalFounderTax)}/year

You're doing better than most founders at delegating—but you're still leaving 
${formatCurrency(totalFounderTax)} on the table annually.

**Where it's coming from:**
- ${breakdown.delivery.hours} hours/week on delivery (rating: ${breakdown.delivery.rating}/5)
- ${breakdown.accountMgmt.hours} hours/week on account management (rating: ${breakdown.accountMgmt.rating}/5)
- ${breakdown.sales.hours} hours/week on sales (rating: ${breakdown.sales.rating}/5)

**The strategic cost:**
Every hour you spend in operations is an hour you're not spending on growth. 
At your stage, that strategic time is worth ${formatCurrency(strategicHourlyValue)}/hour.

**Next move:** Your ${biggestBottleneck} score is your constraint. 
One good hire there frees up ${breakdown[biggestBottleneck].hours} hours/week.
```

**LOW TAX (<$100K annually, delegation avg >3)**
```
## The Founder Tax: ${formatCurrency(totalFounderTax)}/year

Good news: you've built real leverage. Most founders at your revenue level are 
paying 3-4x this in founder tax.

**Your delegation scores:**
| Area | Score | Assessment |
|------|-------|------------|
| Delivery | ${breakdown.delivery.rating}/5 | ${breakdown.delivery.rating >= 4 ? '✓ Delegated' : 'Room to improve'} |
| Account Mgmt | ${breakdown.accountMgmt.rating}/5 | ${breakdown.accountMgmt.rating >= 4 ? '✓ Delegated' : 'Room to improve'} |
| Marketing | ${breakdown.marketing.rating}/5 | ${breakdown.marketing.rating >= 4 ? '✓ Delegated' : 'Room to improve'} |
| Sales | ${breakdown.sales.rating}/5 | ${breakdown.sales.rating >= 4 ? '✓ Delegated' : 'Room to improve'} |

**Opportunity:** ${formatCurrency(totalFounderTax)} is still real money. 
One more delegation move—especially in ${biggestBottleneck}—could drop this to near zero.
```

---

## Revelation 2: The Pipeline Probability

### Score Variants

**CRITICAL (referral >80%, negative growth)**
```
## Your Pipeline Has a Countdown Timer

${referralPercent}% of your business comes from referrals. And you're losing more clients 
than you're adding (${netClientGrowth} net/year).

Let me show you the math you haven't done:

**The Ceiling:**
Your referral network has a finite reach. Based on network dynamics, it can support 
approximately ${referralNetworkCeiling} clients at steady state. You have ${currentClients}.

${monthsToReferralCeiling ? `At current growth, you hit that ceiling in ${monthsToReferralCeiling} months.` : 
`You're already there. Your network is tapped out.`}

**The Crash Risk:**
Referral networks don't degrade slowly. They collapse. Your top referrers generate most 
of your business (Pareto rule). When 2-3 of them retire, change jobs, or get busy—your 
pipeline doesn't shrink 30%. It craters 70%.

**3-Year Probability:** ${probabilityOfMajorDisruption}% chance of major pipeline disruption

**Revenue at Risk:** ${formatCurrency(revenueAtRiskIn3Years)}

This isn't fear-mongering. It's actuarial math. One retirement dinner away from crisis.

**The Fix:** Build ONE channel you control. Content or outbound. Start this month.
```

**HIGH RISK (referral 60-80%, flat/slow growth)**
```
## The Referral Trap Timeline

${referralPercent}% referral dependency. Net growth of ${netClientGrowth} clients/year.

**What this means:**
- Your network can support ~${referralNetworkCeiling} clients before saturation
- ${monthsToReferralCeiling ? `You'll hit that ceiling in approximately ${monthsToReferralCeiling} months` : 
  `You may already be approaching saturation`}
- ${probabilityOfMajorDisruption}% probability of significant pipeline disruption within 3 years

**The Hidden Risk:**
You currently have ${activeChannels} channels generating 10%+ of leads. 
Industry benchmark for stability is 3+.

**Channel Breakdown:**
| Channel | % of Leads | Status |
|---------|------------|--------|
| Referrals | ${referralPercent}% | ${referralPercent >= 60 ? '⚠️ Dependency' : '✓'} |
${otherChannelsTable}

**The Fix:** Get one non-referral channel to 20%+ within 12 months.
```

**MODERATE RISK (referral 40-60%)**
```
## Pipeline Health Check

${referralPercent}% referral dependency. You're in a reasonable range, but not safe.

**Your Numbers:**
- Net client growth: ${netClientGrowth}/year
- Active channels (10%+): ${activeChannels}
- Pipeline disruption risk (3yr): ${probabilityOfMajorDisruption}%

**The opportunity:**
Drop referral dependency below 40% and you've got a defensible pipeline. 
That means growing one other channel to 25-30%.

**Suggested focus:** ${suggestedChannel} (based on your current mix)
```

**HEALTHY (<40% referral)**
```
## Pipeline Diversification: Strong

${referralPercent}% referral dependency. ${activeChannels} active channels.

You've built what most agencies never do: a pipeline you control.

**Your Channel Mix:**
${channelBreakdownTable}

**Opportunity:** With this foundation, focus on conversion optimization. 
Your ${closeRate} close rate has more upside than adding new channels.
```

---

## Revelation 3: The Authority Gap

### Score Variants

**INVISIBLE (AI score <20%, content score <40)**
```
## You're Invisible Where Buyers Are Looking

Let me show you something uncomfortable.

When your ICP types "${statedService} agency for ${statedIndustry}" into ChatGPT, 
here's what they see:

| AI Platform | Found You? | Who They Recommend Instead |
|-------------|------------|---------------------------|
| Claude | ${aiResults.claude.found ? '✓ Yes' : '✗ No'} | ${competitorsRecommendedInstead[0] || 'N/A'} |
| ChatGPT | ${aiResults.chatgpt.found ? '✓ Yes' : '✗ No'} | ${competitorsRecommendedInstead[1] || 'N/A'} |
| Perplexity | ${aiResults.perplexity.found ? '✓ Yes' : '✗ No'} | ${competitorsRecommendedInstead[2] || 'N/A'} |

**The Math:**
- You're getting ${monthlyLeads} qualified leads/month
- At your close rate, that's roughly ${totalMarketInquiries} total market inquiries
- ${Math.round(AI_BUYER_USAGE_RATE * 100)}% of B2B buyers use AI in their research
- That's ${invisibleToBuyersCount} potential buyers/month who never see you

**${invisibleToBuyersCount * 12} invisible prospects per year.**

${competitorComparison ? `
**Who's Winning Your Deals:**
| Competitor | Why They Surface |
|------------|-----------------|
${competitorComparison.map(c => `| ${c.name} | ${c.whyTheySurface} |`).join('\n')}
` : ''}

**Your Content Gap:**
- You post: ${founderPostsPerWeek + teamPostsPerWeek}x/week
- Case studies: ${hasCaseStudies}
- ${problemCoverage ? `ICP problem coverage: ${problemCoverage.percentage}% (${problemCoverage.covered}/${problemCoverage.total})` : ''}

**The Fix:** This isn't about posting more. It's about becoming the answer. 
${problemCoverage?.gaps?.length > 0 ? `Start with content about: ${problemCoverage.gaps.slice(0, 3).join(', ')}` : 'Build content around your ICP\'s top 3 problems.'}
```

**WEAK (AI score 20-50%, content score 40-60)**
```
## Authority Gap: Room to Grow

You're showing up in some places, but not consistently.

**AI Discoverability:** ${aiDiscoverabilityScore}%
${aiResultsTable}

**Content Volume:** ${contentVolumeScore}/100
- Weekly posts: ${founderPostsPerWeek + teamPostsPerWeek}
- Benchmark for your stage: ${benchmarkPosts}/week

**Proof Points:** ${proofScore}/100
- Case studies: ${hasCaseStudies}
- Named clients: ${hasNamedClients}

**The Opportunity:**
${invisibleToBuyersCount > 0 ? 
  `Approximately ${invisibleToBuyersCount} qualified prospects/month are researching 
  and not finding you. At your close rate and ACV, that's ${formatCurrency(invisibleBuyerRevenueLoss)}/year in invisible losses.` :
  'Your discoverability is improving. Focus on consistency.'}
```

**STRONG (AI score >50%, content score >60)**
```
## Authority Position: Solid

**AI Discoverability:** ${aiDiscoverabilityScore}%
You're showing up where modern buyers search.

**Content Machine:** ${contentVolumeScore}/100
${founderPostsPerWeek + teamPostsPerWeek}x/week puts you ahead of most competitors.

**Proof Points:** ${proofScore}/100
${hasCaseStudies === 'Yes (3+)' && hasNamedClients === 'Yes' ? 
  'Strong social proof. Your proof backs your positioning.' :
  'Good foundation. More named case studies would strengthen further.'}

**Optimization Opportunity:**
${problemCoverage ? 
  `You're covering ${problemCoverage.percentage}% of ICP problems. Missing: ${problemCoverage.gaps.slice(0, 2).join(', ')}` :
  'Consider mapping content to specific ICP pain points for better AI training.'}
```

---

## Revelation 4: The Positioning Collision

### Score Variants

**SEVERE COLLISION (collision score >60)**
```
## Your Proof Contradicts Your Positioning

**What You Claim:**
- ICP: "${statedICP}"
- Core Offer: "${coreOffer}"  
- Differentiator: "${differentiator}"

**What Your Website Proves:**
${caseStudyAnalysis ? `
| Case Study | Industry | Size | Matches ICP? |
|------------|----------|------|--------------|
${caseStudyAnalysis.map(cs => 
  `| ${cs.client} | ${cs.industry} | ${cs.size} | ${cs.matchesICP ? '✓' : '✗'} |`
).join('\n')}
` : 'No case studies found on your website.'}

**The Collision:**
${prospectNarrative.story}

**Time on site:** ${prospectNarrative.timeOnSite}
**Verdict:** ${prospectNarrative.verdict}

**The Cost:**
Based on traffic patterns and this collision score, you're losing approximately 
${lostLeadsPerYear} qualified prospects per year who calculate themselves out 
in under 15 seconds.

**Annual cost of positioning/proof mismatch: ~${formatCurrency(lostRevenueAnnual)}**

**The Fix:**
${recommendations.length > 0 ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') :
  `1. Get 2-3 case studies that match your stated ICP
2. If you don't have them—either do the work to get them, or change your positioning to match your actual proof`}
```

**MODERATE COLLISION (collision score 30-60)**
```
## Positioning/Proof Alignment: Partial

**Your Positioning:**
- ICP: "${statedICP}"
- Offer: "${coreOffer}"

**Your Proof:**
${proofAlignmentScore}% of your visible case studies match your stated ICP.

${caseStudyAnalysis ? `
**Case Study Analysis:**
${caseStudyAnalysis.map(cs => 
  `- ${cs.client}: ${cs.matchesICP ? '✓ Matches' : '✗ Mismatch'} (${cs.industry}, ${cs.size})`
).join('\n')}
` : ''}

**The Prospect Math:**
${prospectNarrative.story}

**Estimated impact:** ${lostLeadsPerYear} marginal leads/year

**The Fix:**
You're close. ${recommendations.length > 0 ? recommendations[0] : 'One or two more matching case studies would close the gap.'}
```

**ALIGNED (collision score <30)**
```
## Positioning Coherence: Strong

Your proof backs your claims.

**Alignment Score:** ${100 - collisionScore}%

**What's Working:**
- Stated ICP matches your case study profile
- Your differentiator is visible in your proof
- Prospects landing on your site see themselves

**Opportunity:**
${websiteAlignmentScore < 80 ? 
  'Your website copy could be tighter. The messaging is slightly diffuse.' :
  'Maintain this alignment as you add new case studies. Easy to drift over time.'}
```

---

## Revelation 5: The Trajectory Fork

### Primary Display
```
## Your Agency in 3 Years: Two Futures

**Current Valuation:** ${formatCurrency(currentValuation)} (${currentMultiple.toFixed(1)}x revenue)

### Trajectory A: Current Path
We modeled your current metrics forward with no intervention:

| Metric | Now | Year 1 | Year 2 | Year 3 |
|--------|-----|--------|--------|--------|
| Revenue | ${formatCurrency(currentRevenue)} | ${formatCurrency(trajectoryA.year1.revenue)} | ${formatCurrency(trajectoryA.year2.revenue)} | ${formatCurrency(trajectoryA.year3.revenue)} |
| Clients | ${currentClients} | ${trajectoryA.year1.clients} | ${trajectoryA.year2.clients} | ${trajectoryA.year3.clients} |
| Your Hours/Week | ${founderWeeklyHours} | ${trajectoryA.year1.founderHours} | ${trajectoryA.year2.founderHours} | ${trajectoryA.year3.founderHours} |
| Net Margin | ${currentMargin}% | ${trajectoryA.year1.margin}% | ${trajectoryA.year2.margin}% | ${trajectoryA.year3.margin}% |
| Valuation | ${formatCurrency(currentValuation)} | ${formatCurrency(trajectoryA.year1.valuation)} | ${formatCurrency(trajectoryA.year2.valuation)} | ${formatCurrency(trajectoryA.year3.valuation)} |

**Why this trajectory:** ${trajectoryA.narrative}

---

### Trajectory B: Intervention Path
Three changes: ${keyInterventions.map(i => i.action).join(', ')}

| Metric | Now | Year 1 | Year 2 | Year 3 |
|--------|-----|--------|--------|--------|
| Revenue | ${formatCurrency(currentRevenue)} | ${formatCurrency(trajectoryB.year1.revenue)} | ${formatCurrency(trajectoryB.year2.revenue)} | ${formatCurrency(trajectoryB.year3.revenue)} |
| Clients | ${currentClients} | ${trajectoryB.year1.clients} | ${trajectoryB.year2.clients} | ${trajectoryB.year3.clients} |
| Your Hours/Week | ${founderWeeklyHours} | ${trajectoryB.year1.founderHours} | ${trajectoryB.year2.founderHours} | ${trajectoryB.year3.founderHours} |
| Net Margin | ${currentMargin}% | ${trajectoryB.year1.margin}% | ${trajectoryB.year2.margin}% | ${trajectoryB.year3.margin}% |
| Valuation | ${formatCurrency(currentValuation)} | ${formatCurrency(trajectoryB.year1.valuation)} | ${formatCurrency(trajectoryB.year2.valuation)} | ${formatCurrency(trajectoryB.year3.valuation)} |

**The interventions:**
${keyInterventions.map((i, idx) => `${idx + 1}. **${i.action}** — ${i.impact}`).join('\n')}

---

### The Gap

| Metric | Trajectory A (Year 3) | Trajectory B (Year 3) | Difference |
|--------|----------------------|----------------------|------------|
| Revenue | ${formatCurrency(trajectoryA.year3.revenue)} | ${formatCurrency(trajectoryB.year3.revenue)} | +${formatCurrency(gap.revenue)} |
| Your Hours/Week | ${trajectoryA.year3.founderHours} | ${trajectoryB.year3.founderHours} | -${gap.founderHoursSaved} hrs |
| **Valuation** | **${formatCurrency(trajectoryA.year3.valuation)}** | **${formatCurrency(trajectoryB.year3.valuation)}** | **+${formatCurrency(gap.valuationDifference)}** |

**${formatCurrency(gap.valuationDifference)} in enterprise value. Same 3 years. Same founder.**

The question isn't whether you can afford to make changes.
The question is whether you can afford not to.
```

---

# PART 5: SECTION RENDERING RULES

## canRender() Checks

```javascript
const SECTION_REQUIREMENTS = {
  founderTax: {
    required: ['annualRevenue', 'teamSize', 'founderWeeklyHours', 
               'ceoDeliveryRating', 'ceoAccountMgmtRating', 
               'ceoMarketingRating', 'ceoSalesRating'],
    minRevenue: 100000
  },
  pipelineProbability: {
    required: ['currentClients', 'clientsLostAnnual', 'clientsAddedAnnual',
               'referralPercent', 'lastMonthRevenue'],
    minClients: 3
  },
  authorityGap: {
    required: ['founderPostsPerWeek', 'monthlyLeads', 'closeRate'],
    minLeads: 1
  },
  positioningCollision: {
    required: ['statedICP', 'coreOffer', 'targetIndustry', 'targetCompanySize'],
    // Enrichment optional
  },
  trajectoryFork: {
    required: ['lastMonthRevenue', 'currentClients', 'clientsLostAnnual',
               'clientsAddedAnnual', 'founderWeeklyHours', 'ceoDeliveryRating',
               'netProfitMargin'],
    minRevenue: 100000,
    minClients: 5
  }
}

function shouldRenderSection(sectionName, data, enrichment) {
  const requirements = SECTION_REQUIREMENTS[sectionName]
  
  // Check all required fields exist and are valid
  for (const field of requirements.required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return false
    }
  }
  
  // Check minimums
  if (requirements.minRevenue && getAnnualRevenue(data) < requirements.minRevenue) {
    return false
  }
  if (requirements.minClients && data.currentClients < requirements.minClients) {
    return false
  }
  if (requirements.minLeads && data.monthlyLeads < requirements.minLeads) {
    return false
  }
  
  return true
}
```

## Graceful Degradation

| Section | If enrichment fails | If calculation errors |
|---------|--------------------|-----------------------|
| Founder Tax | Full render (no enrichment needed) | Skip section |
| Pipeline Probability | Full render (no enrichment needed) | Skip section |
| Authority Gap | Render with form data only, skip AI/competitor analysis | Skip section |
| Positioning Collision | Render with stated positioning only, skip proof analysis | Skip section |
| Trajectory Fork | Full render (no enrichment needed) | Skip section |

**Error handling:**
```javascript
function renderSection(sectionName, data, enrichment) {
  if (!shouldRenderSection(sectionName, data, enrichment)) {
    return null  // Don't render anything, don't show error
  }
  
  try {
    const calculation = CALCULATION_FUNCTIONS[sectionName](data, enrichment)
    return RENDER_FUNCTIONS[sectionName](calculation)
  } catch (error) {
    console.error(`Section ${sectionName} failed:`, error)
    return null  // Fail silently, skip section
  }
}
```

---

# PART 6: UI/UX SPECIFICATIONS

## Results Page Layout

```
1. HEADER
   - Agency name
   - Overall health indicator (not a score—a label)
   - Revenue segment badge

2. THE FOUNDER TAX (if canRender)
   - Big number headline
   - Breakdown table
   - Bottleneck identification

3. THE PIPELINE PROBABILITY (if canRender)
   - Timeline visualization
   - Risk percentage
   - Channel breakdown

4. THE AUTHORITY GAP (if canRender)  
   - AI discoverability results
   - Competitor comparison (if available)
   - Content gap analysis

5. THE POSITIONING COLLISION (if canRender)
   - Side-by-side: What you say vs What you prove
   - Prospect narrative
   - Cost calculation

6. THE TRAJECTORY FORK (if canRender)
   - Two-column comparison table
   - Gap calculation
   - Key interventions

7. NEXT STEPS CTA
   - Dynamic based on biggest gap identified
   - Consultation offer with specific value prop
```

## Visual Design Notes

- **Big numbers first** — Every section leads with a dollar figure or percentage
- **Tables over prose** — Show the data, then explain
- **Prospect POV quotes** — Use italics for "what the prospect thinks" moments
- **Color coding:**
  - Cyan (#00D4FF): Good scores, positive numbers
  - Red (#E31B23): Problems, warnings, losses
  - Yellow (#f59e0b): Moderate risk, room for improvement
  - Green (#22c55e): Achievements, healthy metrics

---

# PART 7: CTA FRAMEWORK

## Dynamic CTA based on biggest gap

```javascript
function generateCTA(calculations) {
  // Find the biggest opportunity
  const opportunities = [
    { 
      section: 'founderTax',
      value: calculations.founderTax?.totalFounderTax || 0,
      cta: `Your agency is paying a ${formatCurrency(calculations.founderTax.totalFounderTax)} Founder Tax. Let's talk about getting that back.`
    },
    {
      section: 'pipelineProbability', 
      value: calculations.pipelineProbability?.revenueAtRiskIn3Years || 0,
      cta: `${formatCurrency(calculations.pipelineProbability.revenueAtRiskIn3Years)} in revenue at risk from pipeline dependency. Let's build a second channel.`
    },
    {
      section: 'positioningCollision',
      value: calculations.positioningCollision?.lostRevenueAnnual || 0,
      cta: `~${formatCurrency(calculations.positioningCollision.lostRevenueAnnual)}/year in invisible losses from positioning/proof mismatch. Let's fix that.`
    },
    {
      section: 'trajectoryFork',
      value: calculations.trajectoryFork?.gap?.valuationDifference || 0,
      cta: `The difference between your two trajectories is ${formatCurrency(calculations.trajectoryFork.gap.valuationDifference)} in enterprise value. Want to talk about which one you're building?`
    }
  ]
  
  const biggest = opportunities.sort((a, b) => b.value - a.value)[0]
  
  return {
    headline: biggest.cta,
    buttonText: "Book Your Roadmap Call",
    subtext: "60 minutes. We'll build your intervention plan."
  }
}
```

---

# APPENDIX: HELPER FUNCTIONS

```javascript
function formatCurrency(amount) {
  if (amount >= 1000000) {
    return '$' + (amount / 1000000).toFixed(1) + 'M'
  } else if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(0) + 'K'
  }
  return '$' + amount.toFixed(0)
}

function getAnnualRevenue(data) {
  return data.lastYearRevenue || (data.lastMonthRevenue * 12)
}

function getBiggestBottleneck(data) {
  const areas = [
    { name: 'Delivery', score: data.ceoDeliveryRating },
    { name: 'Account Management', score: data.ceoAccountMgmtRating },
    { name: 'Marketing', score: data.ceoMarketingRating },
    { name: 'Sales', score: data.ceoSalesRating }
  ]
  return areas.sort((a, b) => a.score - b.score)[0].name
}

function getSegment(annualRevenue) {
  if (annualRevenue < 500000) return 'startup'
  if (annualRevenue < 2000000) return 'growth'
  if (annualRevenue < 5000000) return 'scale'
  if (annualRevenue < 10000000) return 'established'
  return 'enterprise'
}
```

---

**END OF IMPLEMENTATION SPECIFICATION**
