// ============================================
// SYNTHETIC ASSESSMENT DATA
// ============================================

const SAMPLE_INTAKE = {
  agencyName: "Apex Digital",
  founderName: "Sarah Chen",
};

const SAMPLE_ZONES = {
  revenueQuality: { score: 3.2, color: "#00D4FF", insight: "Revenue per FTE sits at $128K \u2014 solid for a 12-person shop, but you\u2019re leaving $40-60K/head on the table vs. top-quartile agencies your size. The issue isn\u2019t volume, it\u2019s margin compression from scope creep and underpriced retainers." },
  profitability: { score: 2.1, color: "#E51B23", insight: "Net margin at 11% is a red flag. After founder comp adjustments, you\u2019re closer to 6%. You\u2019re running a jobs program, not a profit engine. Every untracked hour is money you\u2019re donating to clients." },
  growthVsChurn: { score: 3.8, color: "#00D4FF", insight: "Adding 8 clients while losing 5 nets you 3 \u2014 but the churn rate (31%) means you\u2019re refilling a leaky bucket. The new clients mask the retention problem. Fix churn first, then pour fuel on acquisition." },
  leadEngine: { score: 1.8, color: "#E51B23", insight: "Referrals at 70% is a single point of failure disguised as a compliment. One bad quarter, one lost champion at a client, and your pipeline evaporates. You have no engine \u2014 you have a hope strategy." },
  founderLoad: { score: 2.4, color: "#E51B23", insight: "You\u2019re working 55 hours/week and still doing 40% delivery. That\u2019s not leadership \u2014 that\u2019s the most expensive project manager in the building. The business can\u2019t grow past you if you ARE the business." },
  systemsReadiness: { score: 2.8, color: "#00D4FF", insight: "SOPs exist in your head, not on paper. Onboarding takes 3x longer than it should. You can\u2019t delegate what isn\u2019t documented, and you can\u2019t scale what you can\u2019t delegate." },
  contentPositioning: { score: 3.5, color: "#00D4FF", insight: "Your positioning says \"full-service digital agency\" \u2014 which means nothing to nobody. You\u2019re competing with 47,000 other agencies saying the exact same thing. Your best clients came to you for e-commerce migration expertise. Lead with that." },
  teamVisibility: { score: 1.5, color: "#E51B23", insight: "Your team has zero LinkedIn presence. In a trust-based sale, invisibility is a liability. Buyers Google your people before signing. Right now they find nothing." },
};

const SAMPLE_SCORES = {
  overall: 2.6,
  overallLabel: "Needs Work",
  segmentLabel: "$1-2M Revenue Band",
  wtfZones: SAMPLE_ZONES,
  narratives: {},
  realityChecks: [
    { id: "c1", type: "celebration", title: "Strong Client Relationships", body: "Your 70% referral rate proves clients love your work. That\u2019s rare. The problem isn\u2019t quality \u2014 it\u2019s that you\u2019ve built a reputation moat with no drawbridge. The relationships are an asset; the dependency on them is the vulnerability." },
    { id: "c2", type: "celebration", title: "Growth Despite Constraints", body: "Adding 8 clients in a year while the founder is buried in delivery? That\u2019s impressive. Imagine what happens when Sarah isn\u2019t doing 40% of the production work. You\u2019re growing with one hand tied behind your back." },
    { id: "w1", type: "warning", title: "The Revenue Ceiling Is You", body: "At 55 hours/week with 40% in delivery, Sarah IS the bottleneck. Every hour she spends in Figma or reviewing code is an hour not spent on strategy, sales, or partnerships. The math doesn\u2019t work past $2M without a fundamental restructure of how the founder spends time." },
    { id: "w2", type: "warning", title: "Profitability Is an Illusion", body: "Your 11% net margin disappears when you factor in market-rate founder compensation. You\u2019re subsidizing the business with below-market pay. That\u2019s not profit \u2014 that\u2019s deferred founder debt. If you hired a replacement for everything Sarah does, you\u2019d be at breakeven or negative." },
    { id: "w3", type: "warning", title: "No Pipeline Insurance", body: "Referrals are free until they stop. You have no outbound, no content engine, no paid acquisition. If your top 2 clients churned tomorrow (and took their referrals with them), how many months of runway do you have? The answer should scare you." },
  ],
  ltvMetrics: {
    avgClientValue: 8500,
    avgClientLifetimeMonths: 14,
    ltv: 119000,
    estimatedCAC: 4200,
    ltvCacRatio: 28.3,
    ltvCacColor: "#22c55e",
    ltvCacAssessment: "Your LTV:CAC ratio is exceptional at 28.3x \u2014 but that\u2019s because your CAC is artificially low (referrals are \"free\"). This will collapse the moment you need to buy growth. Budget for real CAC of $15-25K when referrals plateau.",
  },
  growthLevers: [
    { name: "Fix Founder Time Allocation", description: "Move Sarah from 40% delivery to 10% within 90 days by hiring a senior project lead and documenting the top 5 recurring delivery workflows.", impact: "high", currentState: "40% of founder time in delivery, no delegation framework", recommendation: "Hire a senior delivery lead ($90-110K). ROI: frees 16+ hours/week of founder time worth $200+/hr in strategic value." },
    { name: "Build a Content-Led Pipeline", description: "Launch a bi-weekly e-commerce migration insights newsletter targeting your ICP. Repurpose into LinkedIn posts and case studies.", impact: "high", currentState: "Zero content engine, 70% referral dependency", recommendation: "Start with 2 case studies/month from existing client wins. Add a newsletter. Goal: 20% of pipeline from content within 6 months." },
    { name: "Raise Prices 20-30%", description: "Your retainer pricing hasn\u2019t been updated in 18 months. Market rates have moved. Your best clients would pay more \u2014 they\u2019re already getting below-market rates.", impact: "medium", currentState: "Avg retainer $8.5K/mo, below market for your tier", recommendation: "Grandfather existing clients. New clients get updated pricing. Existing clients get a \"value upgrade\" conversation at next renewal." },
    { name: "Reduce Churn Through Quarterly Business Reviews", description: "Implement structured QBRs that tie your work to client business outcomes. Most churn happens because clients forget why they\u2019re paying you.", impact: "medium", currentState: "31% annual churn, no structured review cadence", recommendation: "Template a 30-minute QBR deck. Schedule for all clients. Track leading indicators of churn (engagement drops, missed meetings)." },
  ],
  founderOS: {
    delegationScore: 2.1,
    onVsInRatio: 35,
    burnoutRisk: "high",
    bottleneckAreas: ["Client Delivery", "Sales Calls", "Hiring Decisions", "Quality Review"],
    delegationNarrative: "Sarah is doing the work of 3 people and calling it \"staying close to the work.\" Delegation score of 2.1 means almost nothing leaves her desk without her touching it. This isn\u2019t quality control \u2014 it\u2019s a trust deficit with the team.",
    onVsInNarrative: "Only 35% of time spent working ON the business. Industry benchmark for a $1.5M agency is 60%+. The gap represents ~$300K in unrealized strategic value annually.",
  },
  priorityActions: [
    { priority: 1, action: "Hire a Senior Delivery Lead", why: "Unlocks 16+ hours/week of founder time. Nothing else moves until this happens." },
    { priority: 2, action: "Document Top 5 Delivery SOPs", why: "Can\u2019t delegate without documentation. Start with onboarding, QA, and monthly reporting." },
    { priority: 3, action: "Launch 2 Case Studies This Month", why: "Fastest path to content-led pipeline. Use existing client wins." },
    { priority: 4, action: "Implement QBRs for All Clients", why: "Churn is your biggest silent profit killer. QBRs are the cheapest retention tool." },
    { priority: 5, action: "Raise New Client Pricing 25%", why: "You\u2019re underpriced. Your referral-driven pipeline means clients already trust you enough to pay more." },
  ],
  diagnoses: {
    founderTax: [
      "## Your Hidden $187K Problem",
      "",
      "Sarah, you\u2019re paying a tax you can\u2019t see on your P&L.",
      "",
      "At 55 hours/week, with 40% in delivery and another 25% in account management, your implied hourly rate as a **producer** is $47/hr. That\u2019s what you\u2019d pay a mid-level project manager.",
      "",
      "But here\u2019s the real cost:",
      "",
      "| Activity | Hours/Week | Opportunity Cost |",
      "|---|---|---|",
      "| Client Delivery | 22 | $4,400/week in strategic time lost |",
      "| Account Management | 14 | $2,800/week in growth time lost |",
      "| Admin & Ops | 8 | $1,600/week in leverage lost |",
      "| **Total Founder Tax** | **44** | **$187K/year** |",
      "",
      "### The Compound Effect",
      "Every hour you spend in Figma is an hour you\u2019re NOT:",
      "- Building partnerships that could bring 5 clients at once",
      "- Creating the content engine that replaces referral dependency",
      "- Fixing the pricing that\u2019s leaving $200K+ on the table",
      "- Building the team that lets you take a vacation",
      "",
      "### The Uncomfortable Truth",
      "You don\u2019t have a delegation problem. You have a **trust problem**. You\u2019ve convinced yourself that nobody can do it as well as you. And you\u2019re right \u2014 nobody will do it exactly like you. But \"80% as good, done by someone else\" beats \"100% as good, done by the person who should be running the company\" every single time.",
      "",
      "**The math is simple:** Hire a $100K delivery lead. Free up $187K in founder strategic time. Net gain: $87K minimum, plus the growth you\u2019ve been leaving on the table.",
    ].join("\n"),

    pipeline: [
      "## You\u2019re One Bad Quarter Away From Crisis",
      "",
      "Your pipeline has a name: **Word of Mouth**. That\u2019s not a strategy \u2014 that\u2019s a prayer.",
      "",
      "### The Referral Dependency Trap",
      "- 70% of new business comes from referrals",
      "- 15% from repeat/expansion",
      "- 10% from your website (mostly referral-driven traffic)",
      "- 5% from everything else",
      "",
      "### What Happens When Referrals Slow Down",
      "",
      "Here\u2019s the scenario nobody wants to talk about: Your top client (the one sending you 3 referrals/year) gets acquired. New management brings their own agency. You lose the client AND the referral source.",
      "",
      "**Month 1-3:** Pipeline feels normal (deals already in motion)",
      "**Month 4-6:** Pipeline thins. You start \"networking\" more aggressively.",
      "**Month 7-9:** Cash gets tight. You take a bad-fit client at a discount.",
      "**Month 10-12:** You\u2019re back to year-one hustle mode, but with year-five overhead.",
      "",
      "### The Fix Is Boring (And That\u2019s Why It Works)",
      "",
      "1. **Content engine** \u2014 2 case studies/month, 3 LinkedIn posts/week, 1 newsletter/bi-weekly",
      "2. **Outbound** \u2014 10 personalized outreach emails/week to ICP companies showing signs of replatforming",
      "3. **Partnerships** \u2014 3 technology partner relationships that send you implementation work",
      "",
      "**Goal:** Referrals drop from 70% to 40% of pipeline within 12 months. Not because referrals decrease \u2014 because everything else increases.",
    ].join("\n"),

    authority: [
      "## Nobody Knows You\u2019re an Expert",
      "",
      "Here\u2019s the paradox: Your clients think you\u2019re brilliant. The market has no idea you exist.",
      "",
      "### The Visibility Audit",
      "- **LinkedIn (Sarah):** 847 connections, posts once every 2-3 months, no thought leadership cadence",
      "- **LinkedIn (Team):** Effectively zero presence. Your senior developer has 12 followers.",
      "- **Website:** Last blog post was 8 months ago. Case studies section has 2 entries.",
      "- **Speaking:** Zero conference appearances in the past year",
      "- **Podcast:** Never been a guest. Never hosted.",
      "",
      "### Why This Matters More Than You Think",
      "",
      "Your ICP (mid-market e-commerce brands doing $5-50M) researches agencies for 3-6 months before engaging. During that time, they\u2019re:",
      "- Reading LinkedIn posts from agency founders",
      "- Searching for case studies with companies like theirs",
      "- Asking AI chatbots for recommendations",
      "- Checking if the agency founder has a perspective on their specific challenge",
      "",
      "**You\u2019re invisible during the entire buyer journey.**",
      "",
      "### The Authority Stack (90-Day Sprint)",
      "",
      "1. **Week 1-2:** Publish 3 detailed case studies from your best e-commerce migrations",
      "2. **Week 3-4:** Start a weekly LinkedIn post cadence \u2014 one insight from client work (anonymized)",
      "3. **Month 2:** Launch a monthly \"E-Commerce Migration Briefing\" newsletter",
      "4. **Month 3:** Apply to speak at 2 e-commerce conferences, appear on 2 podcasts",
      "",
      "**The compounding effect:** In 6 months, when someone asks \"Who\u2019s good at e-commerce migrations?\" \u2014 in Slack, on LinkedIn, or to ChatGPT \u2014 your name starts showing up.",
    ].join("\n"),

    positioning: [
      "## You\u2019re Competing With Everyone (And Losing to Specialists)",
      "",
      "\"Full-service digital agency\" is not positioning. It\u2019s a white flag.",
      "",
      "### The Positioning Problem",
      "",
      "When a $20M e-commerce brand needs to migrate from Magento to Shopify Plus, they have two options:",
      "1. **Apex Digital** \u2014 \"Full-service digital agency\" that also does e-commerce",
      "2. **MigrateHQ** (fictional competitor) \u2014 \"We migrate mid-market e-commerce brands to Shopify Plus. It\u2019s all we do.\"",
      "",
      "**Who gets the call?** Not you.",
      "",
      "### What Your Best Clients Actually Say About You",
      "",
      "We looked at your referral patterns. When clients recommend you, they don\u2019t say \"great full-service agency.\" They say:",
      "- \"They saved our migration from being a disaster\"",
      "- \"Sarah\u2019s team actually understands e-commerce operations, not just design\"",
      "- \"They handled our replatforming when two other agencies failed\"",
      "",
      "**Your clients already know your positioning. You\u2019re the only one who doesn\u2019t.**",
      "",
      "### The Positioning Fix",
      "",
      "**From:** \"Apex Digital \u2014 Full-Service Digital Agency\"",
      "**To:** \"Apex Digital \u2014 E-Commerce Migration & Growth for Mid-Market Brands\"",
      "",
      "### What Changes",
      "- Homepage headline speaks to replatforming pain, not generic \"digital solutions\"",
      "- Case studies organized by migration type (Magento \u2192 Shopify, Custom \u2192 Composable, etc.)",
      "- Pricing reflects specialist rates, not generalist rates",
      "- Content strategy focuses on migration-specific topics your ICP is Googling",
      "",
      "### What Doesn\u2019t Change",
      "- You can still do other work for existing clients",
      "- You don\u2019t need to fire anyone or restructure the team",
      "- Referrals will still come in",
      "",
      "**The only thing that changes is what strangers see when they first encounter you.** And strangers are where your next $500K in revenue lives.",
    ].join("\n"),

    trajectory: [
      "## Two Futures: The $4.2M Gap",
      "",
      "Let\u2019s run the math on two versions of Apex Digital, three years from now.",
      "",
      "### Path A: Change Nothing",
      "- Revenue stays flat at $1.5M (churn matches growth)",
      "- Sarah burns out at 55hr/week, eventually scales back",
      "- One key client loss creates a 6-month revenue dip",
      "- Net margin stays at 11% (really 6% adjusted)",
      "- **3-Year Valuation: ~$900K** (0.6x distressed multiple \u2014 buyer sees founder dependency)",
      "",
      "### Path B: Execute the Playbook",
      "- Hire delivery lead \u2192 Sarah moves to 80% strategic",
      "- Content engine \u2192 Pipeline diversifies to 40% non-referral",
      "- Price increase \u2192 Revenue per client grows 25%",
      "- Churn drops from 31% to 18% via QBRs",
      "- **Year 1:** $1.8M revenue, 16% margin",
      "- **Year 2:** $2.4M revenue, 20% margin",
      "- **Year 3:** $3.2M revenue, 22% margin",
      "- **3-Year Valuation: ~$5.1M** (1.6x healthy multiple \u2014 recurring revenue, diversified pipeline, non-founder-dependent)",
      "",
      "### The Gap: $4.2M in Enterprise Value",
      "",
      "That\u2019s not theoretical. That\u2019s the difference between:",
      "- Selling for less than 1 year\u2019s revenue (if you can sell at all)",
      "- Selling for 1.5-2x revenue to a strategic buyer who sees a machine, not a person",
      "",
      "### The First Domino",
      "",
      "Everything starts with hiring that delivery lead. It\u2019s a $100K decision that unlocks a $4.2M outcome. Every month you delay, the gap widens \u2014 not because Path B gets harder, but because Path A compounds the founder dependency that makes the business unsellable.",
      "",
      "**The question isn\u2019t whether you can afford to hire. It\u2019s whether you can afford not to.**",
    ].join("\n"),

    cta: {
      headline: "Sarah, you\u2019re 3 hires and 90 days away from a fundamentally different business.",
    },
  },
};

const SAMPLE_ENRICHMENT = {
  analysis: {
    positioningCoherence: {
      score: 4,
      alignment: "partial",
      verdict: "Your website says \"full-service digital agency\" while your LinkedIn emphasizes e-commerce expertise. Your best clients come to you for migration work, but a stranger visiting your site would never know that. The disconnect is costing you every prospect who lands on your homepage and bounces because they can\u2019t tell if you\u2019re the specialist they need.",
      websiteMessage: "Full-service digital agency offering web design, development, SEO, and digital marketing solutions for businesses of all sizes.",
      linkedinMessage: "Helping mid-market e-commerce brands navigate complex platform migrations and scale their digital operations.",
      gaps: [
        "Website positioning is generic \u2014 doesn\u2019t match the specialist reputation your clients describe",
        "No migration-specific landing pages despite this being your highest-value service",
        "Service page lists 12 offerings with equal weight \u2014 dilutes your core strength",
      ],
      recommendations: [
        "Rewrite homepage to lead with e-commerce migration expertise",
        "Create dedicated migration service pages (Magento \u2192 Shopify, Custom \u2192 Composable)",
        "Add a \"Who We\u2019re For\" section that names your ICP explicitly",
      ],
    },
    contentMarketFit: {
      score: 3,
      verdict: "Your content talks about what you do. Your ICP cares about what they\u2019re struggling with. There\u2019s a 25% overlap between your content topics and the problems your ideal clients are actively searching for solutions to.",
      topicsVsIcpProblems: {
        topContentTopics: ["Web Design Trends", "SEO Tips", "Social Media Strategy", "Agency News"],
        topIcpProblems: ["Platform Migration Risk", "E-commerce Scalability", "Tech Stack Decisions", "Replatforming Timeline", "Post-Migration SEO"],
        overlap: 25,
      },
      gaps: [
        "Zero content about platform migration \u2014 your highest-value service",
        "Blog focuses on generic digital marketing topics that attract the wrong audience",
        "No case studies with measurable migration outcomes",
      ],
      recommendations: [
        "Pause generic content. Focus 100% on migration and e-commerce operations topics for 90 days.",
        "Publish 3 detailed migration case studies with before/after metrics",
        "Create a \"Migration Readiness Assessment\" lead magnet",
      ],
    },
    socialProofAlignment: {
      score: 4,
      verdict: "You have proof, but it\u2019s not working hard enough. Two case studies and scattered testimonials don\u2019t match the depth of work you\u2019ve actually done. Your best social proof is trapped in email threads and Slack messages from happy clients.",
      caseStudyRelevance: "2 case studies \u2014 both strong but generic. Neither highlights migration-specific outcomes.",
      testimonialStrength: "Testimonials exist but are buried in footer. None mention specific business results or migration success.",
      logoSignalStrength: "Client logos are decent mid-market brands but displayed without context. A logo wall without case studies is wasted trust.",
      gaps: [
        "Only 2 published case studies for a 5-year-old agency",
        "No video testimonials or client interview content",
        "Testimonials don\u2019t mention measurable outcomes",
      ],
      recommendations: [
        "Interview your top 5 clients this month. Get video testimonials focused on migration outcomes.",
        "Every case study should include: challenge, approach, measurable result, client quote",
        "Organize social proof by migration type to match buyer intent",
      ],
    },
    icpProblemAwareness: {
      score: 3,
      verdict: "You know your ICP\u2019s problems from working with them daily. But your public-facing content doesn\u2019t reflect that knowledge. A prospect visiting your site would think you\u2019re a generalist who happens to do e-commerce.",
      problemCoverage: [
        { problem: "Platform migration risk & downtime", addressed: false, where: "" },
        { problem: "Scaling infrastructure for growth", addressed: true, where: "Services page, briefly" },
        { problem: "Post-migration SEO preservation", addressed: false, where: "" },
        { problem: "Multi-channel inventory management", addressed: false, where: "" },
        { problem: "Choosing between platforms (Shopify vs Custom)", addressed: false, where: "" },
        { problem: "Integration complexity with existing tools", addressed: true, where: "Case study #2" },
      ],
      coveragePercent: 33,
      missingProblems: [
        "Platform migration risk & downtime fears",
        "Post-migration SEO preservation",
        "Multi-channel inventory management",
        "Platform selection guidance (Shopify vs Custom vs Composable)",
      ],
      contentOpportunities: [
        "\"The Real Cost of a Failed Migration\" \u2014 addresses the #1 fear",
        "\"SEO Migration Checklist: How We Preserved 98% of Organic Traffic\" \u2014 immediate credibility",
        "\"Shopify Plus vs Composable Commerce: A Decision Framework\" \u2014 captures comparison shoppers",
      ],
      recommendations: [
        "Create content that addresses each missing problem within 60 days",
        "Lead blog strategy with ICP pain points, not agency capabilities",
        "Add an FAQ section to migration service pages addressing top objections",
      ],
    },
  },
  llmAwareness: {
    summary: {
      score: 0,
      agencyMentionedIn: 0,
      totalChecked: 3,
      topCompetitors: [] as string[],
      queriesUsed: [
        "Best agency for Magento to Shopify Plus migration mid-market",
        "E-commerce replatforming agency for $10-50M brands",
        "Who can handle complex e-commerce platform migrations without downtime",
      ],
    },
    claude: { available: true, agencyMentioned: false, founderMentioned: false },
    chatgpt: { available: true, agencyMentioned: false, founderMentioned: false },
    perplexity: { available: true, agencyMentioned: false, founderMentioned: false },
  },
};

// ============================================
// COMPONENTS
// ============================================

function ScoreBar({ score, label, narrative, color }: {
  score: number; label: string; narrative: string; color: string;
}) {
  const widthPercent = (score / 5) * 100;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-sm font-anton" style={{ color }}>{score}/5</span>
      </div>
      <div className="h-2 bg-[#333] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%`, backgroundColor: color }} />
      </div>
      <p className="mt-2 text-sm text-[#B3B3B3]">{narrative}</p>
    </div>
  );
}

function GrowthLeverCard({ lever }: { lever: { name: string; description: string; impact: string; currentState: string; recommendation: string } }) {
  const impactColor = lever.impact === "high" ? "bg-[#E51B23]/10 text-[#E51B23] border-[#E51B23]/30"
    : lever.impact === "medium" ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30"
    : "bg-[#333] text-[#666] border-[#333]";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-white">{lever.name}</h4>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${impactColor}`}>{lever.impact} impact</span>
      </div>
      <p className="text-sm text-[#B3B3B3] mb-3">{lever.description}</p>
      <p className="text-xs text-[#666] mb-1"><strong className="text-[#B3B3B3]">Current:</strong> {lever.currentState}</p>
      <p className="text-xs text-[#00D4FF]"><strong>Fix:</strong> {lever.recommendation}</p>
    </div>
  );
}

function AnalysisSection({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
  const scoreColor = score >= 8 ? "#00D4FF" : score >= 5 ? "#00D4FF" : "#E51B23";
  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider">{title}</h2>
        <span className="text-2xl font-anton" style={{ color: scoreColor }}>{score}<span className="text-sm text-[#666]">/10</span></span>
      </div>
      {children}
    </div>
  );
}

function GapsList({ gaps }: { gaps: string[] }) {
  if (!gaps?.length) return null;
  return (
    <div className="mb-3">
      <p className="text-[#E51B23] text-xs font-bold uppercase mb-2">GAPS</p>
      <ul className="space-y-1">{gaps.map((g, i) => <li key={i} className="text-sm text-[#B3B3B3]">&bull; {g}</li>)}</ul>
    </div>
  );
}

function RecommendationsList({ recs }: { recs: string[] }) {
  if (!recs?.length) return null;
  return (
    <div>
      <p className="text-[#00D4FF] text-xs font-bold uppercase mb-2">RECOMMENDATIONS</p>
      <ul className="space-y-1">{recs.map((r, i) => <li key={i} className="text-sm text-[#B3B3B3]">&bull; {r}</li>)}</ul>
    </div>
  );
}

function fmtCurrency(amount: number): string {
  if (amount >= 1000000) return "$" + (amount / 1000000).toFixed(1) + "M";
  if (amount >= 1000) return "$" + Math.round(amount / 1000) + "K";
  return "$" + Math.round(amount);
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm">
            {tableHeaders.length > 0 && (
              <thead>
                <tr className="border-b border-[#333]">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="text-left text-[#666] px-3 py-2 font-medium">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#333]/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[#B3B3B3]">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  }

  function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1);
      if (!inTable) { inTable = true; tableHeaders = cells; }
      else if (cells.every(c => /^[\s\-:]+$/.test(c))) { continue; }
      else { tableRows.push(cells); }
      continue;
    } else if (inTable) { flushTable(); }

    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-anton text-sm text-[#00D4FF] uppercase tracking-wider mt-5 mb-2">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-anton text-base text-white uppercase tracking-wide mt-5 mb-2">{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-anton text-lg text-white uppercase tracking-wide mt-4 mb-2">{line.slice(2)}</h2>);
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-[#333] my-4" />);
    } else if (/^[-*]\s/.test(line.trim())) {
      elements.push(<p key={i} className="text-sm text-[#B3B3B3] ml-4 mb-1">&bull; {renderInline(line.trim().slice(2))}</p>);
    } else if (/^\d+\.\s/.test(line.trim())) {
      const num = line.trim().match(/^(\d+)\.\s/)?.[1];
      const text = line.trim().replace(/^\d+\.\s/, "");
      elements.push(<p key={i} className="text-sm text-[#B3B3B3] ml-4 mb-1"><span className="text-[#00D4FF] font-anton mr-1">{num}.</span>{renderInline(text)}</p>);
    } else if (line.trim() === "") {
      // skip
    } else {
      elements.push(<p key={i} className="text-sm text-[#B3B3B3] mb-2">{renderInline(line)}</p>);
    }
  }
  if (inTable) flushTable();
  return <div className="space-y-0.5">{elements}</div>;
}

function DiagnosisSection({ title, content, color = "#E51B23" }: { title: string; content: string; color?: string }) {
  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="font-anton text-lg text-white uppercase tracking-wider">{title}</h2>
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function WTFAssessmentExample() {
  const scores = SAMPLE_SCORES;
  const intake = SAMPLE_INTAKE;
  const enrichment = SAMPLE_ENRICHMENT;
  const zones = scores.wtfZones;
  const analysis = enrichment.analysis;
  const diagnoses = scores.diagnoses;
  const llm = enrichment.llmAwareness;
  const overallColor = scores.overall >= 4 ? "#00D4FF" : scores.overall >= 2.5 ? "#00D4FF" : "#E51B23";

  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-anton text-xl tracking-wide">
            <span className="text-white">GROWTH</span>
            <span className="text-[#00D4FF]">OS</span>
          </div>
          <a
            href="/growthos"
            className="bg-[#00D4FF] text-black px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#00D4FF]/80 transition-colors"
          >
            Get Your Assessment
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Example Banner */}
        <div className="bg-[#1A1A1A] border-l-4 border-[#00D4FF] p-4">
          <p className="text-sm text-[#B3B3B3]">
            <span className="text-[#00D4FF] font-bold">SAMPLE REPORT</span> &mdash; This is a demo assessment with synthetic data for a fictional agency.
          </p>
        </div>

        {/* ===== HEADER ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-anton text-2xl text-white uppercase tracking-wide mb-1">
                {intake.agencyName}
              </h1>
              <p className="text-[#666] text-sm">
                Business Diagnostic &bull; {scores.segmentLabel}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-anton" style={{ color: overallColor }}>{scores.overall.toFixed(1)}</div>
              <div className="text-[#666] text-xs tracking-wider uppercase">Overall Score</div>
              <div className="text-[#B3B3B3] text-xs mt-1">{scores.overallLabel}</div>
            </div>
          </div>
        </div>

        {/* ===== WTF ZONES HEATMAP ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">
            WTF Zones Heatmap
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <ScoreBar score={zones.revenueQuality.score} label="Revenue Quality" narrative={zones.revenueQuality.insight} color={zones.revenueQuality.color} />
            <ScoreBar score={zones.profitability.score} label="Profitability" narrative={zones.profitability.insight} color={zones.profitability.color} />
            <ScoreBar score={zones.growthVsChurn.score} label="Growth vs Churn" narrative={zones.growthVsChurn.insight} color={zones.growthVsChurn.color} />
            <ScoreBar score={zones.leadEngine.score} label="Lead Engine" narrative={zones.leadEngine.insight} color={zones.leadEngine.color} />
            <ScoreBar score={zones.founderLoad.score} label="Founder Load" narrative={zones.founderLoad.insight} color={zones.founderLoad.color} />
            <ScoreBar score={zones.systemsReadiness.score} label="Systems Readiness" narrative={zones.systemsReadiness.insight} color={zones.systemsReadiness.color} />
            <ScoreBar score={zones.contentPositioning.score} label="Content & Positioning" narrative={zones.contentPositioning.insight} color={zones.contentPositioning.color} />
            <ScoreBar score={zones.teamVisibility.score} label="Team Visibility" narrative={zones.teamVisibility.insight} color={zones.teamVisibility.color} />
          </div>
        </div>

        {/* ===== ENRICHMENT ANALYSIS ===== */}
        <AnalysisSection title="Positioning Coherence" score={analysis.positioningCoherence.score}>
          <p className="text-sm text-[#B3B3B3] mb-4">{analysis.positioningCoherence.verdict}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-1">What Your Website Says</p>
              <p className="text-sm text-[#B3B3B3]">{analysis.positioningCoherence.websiteMessage}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-1">What Your LinkedIn Says</p>
              <p className="text-sm text-[#B3B3B3]">{analysis.positioningCoherence.linkedinMessage}</p>
            </div>
          </div>
          <p className="text-sm text-[#B3B3B3] mb-4">Alignment: <span className="font-bold capitalize text-[#00D4FF]">{analysis.positioningCoherence.alignment}</span></p>
          <GapsList gaps={analysis.positioningCoherence.gaps} />
          <RecommendationsList recs={analysis.positioningCoherence.recommendations} />
        </AnalysisSection>

        <AnalysisSection title="Content-Market Fit" score={analysis.contentMarketFit.score}>
          <p className="text-sm text-[#B3B3B3] mb-4">{analysis.contentMarketFit.verdict}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-2">Your Content Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.contentMarketFit.topicsVsIcpProblems.topContentTopics.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-[#00D4FF]/10 text-[#00D4FF] text-xs">{t}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-2">What Your ICP Cares About</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.contentMarketFit.topicsVsIcpProblems.topIcpProblems.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-[#E51B23]/10 text-[#E51B23] text-xs">{p}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#666] text-xs font-bold uppercase">Content-Problem Overlap</span>
              <span className="text-xs font-bold text-[#00D4FF]">{analysis.contentMarketFit.topicsVsIcpProblems.overlap}%</span>
            </div>
            <div className="h-2 bg-[#333] rounded-full overflow-hidden">
              <div className="h-full bg-[#00D4FF] rounded-full" style={{ width: `${analysis.contentMarketFit.topicsVsIcpProblems.overlap}%` }} />
            </div>
          </div>
          <GapsList gaps={analysis.contentMarketFit.gaps} />
          <RecommendationsList recs={analysis.contentMarketFit.recommendations} />
        </AnalysisSection>

        <AnalysisSection title="Social Proof Alignment" score={analysis.socialProofAlignment.score}>
          <p className="text-sm text-[#B3B3B3] mb-4">{analysis.socialProofAlignment.verdict}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-1">Case Studies</p>
              <p className="text-sm text-[#B3B3B3]">{analysis.socialProofAlignment.caseStudyRelevance}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-1">Testimonials</p>
              <p className="text-sm text-[#B3B3B3]">{analysis.socialProofAlignment.testimonialStrength}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <p className="text-[#666] text-xs font-bold uppercase mb-1">Client Logos</p>
              <p className="text-sm text-[#B3B3B3]">{analysis.socialProofAlignment.logoSignalStrength}</p>
            </div>
          </div>
          <GapsList gaps={analysis.socialProofAlignment.gaps} />
          <RecommendationsList recs={analysis.socialProofAlignment.recommendations} />
        </AnalysisSection>

        <AnalysisSection title="ICP Problem Awareness" score={analysis.icpProblemAwareness.score}>
          <p className="text-sm text-[#B3B3B3] mb-4">{analysis.icpProblemAwareness.verdict}</p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left py-2 text-[#666] text-xs font-bold uppercase">Problem</th>
                  <th className="text-center py-2 text-[#666] text-xs font-bold uppercase w-28">Addressed?</th>
                  <th className="text-left py-2 text-[#666] text-xs font-bold uppercase">Where</th>
                </tr>
              </thead>
              <tbody>
                {analysis.icpProblemAwareness.problemCoverage.map((row, i) => (
                  <tr key={i} className="border-b border-[#333]/50">
                    <td className="py-2 text-[#B3B3B3]">{row.problem}</td>
                    <td className="py-2 text-center">
                      <span className={row.addressed ? "text-[#00D4FF]" : "text-[#E51B23]"}>
                        {row.addressed ? "\u2713" : "\u2717"}
                      </span>
                    </td>
                    <td className="py-2 text-[#666] text-xs">{row.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#666] text-xs font-bold uppercase">Problem Coverage</span>
              <span className="text-xs font-bold text-[#00D4FF]">{analysis.icpProblemAwareness.coveragePercent}%</span>
            </div>
            <div className="h-2 bg-[#333] rounded-full overflow-hidden">
              <div className="h-full bg-[#00D4FF] rounded-full" style={{ width: `${analysis.icpProblemAwareness.coveragePercent}%` }} />
            </div>
          </div>
          <div className="mb-3">
            <p className="text-[#E51B23] text-xs font-bold uppercase mb-2">PROBLEMS YOU&apos;RE NOT ADDRESSING</p>
            <ul className="space-y-1">{analysis.icpProblemAwareness.missingProblems.map((p, i) => <li key={i} className="text-sm text-[#B3B3B3]">&bull; {p}</li>)}</ul>
          </div>
          <div className="mb-3">
            <p className="text-[#00D4FF] text-xs font-bold uppercase mb-2">CONTENT OPPORTUNITIES</p>
            <ul className="space-y-1">{analysis.icpProblemAwareness.contentOpportunities.map((c, i) => <li key={i} className="text-sm text-[#B3B3B3]">&bull; {c}</li>)}</ul>
          </div>
          <RecommendationsList recs={analysis.icpProblemAwareness.recommendations} />
        </AnalysisSection>

        {/* ===== AI DISCOVERABILITY ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider">AI Discoverability</h2>
            <span className="text-2xl font-anton text-[#E51B23]">{llm.summary.score}%</span>
          </div>
          <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-4 mb-4">
            <p className="text-[#E51B23] font-bold text-sm mb-1">You don&apos;t exist to AI.</p>
            <p className="text-sm text-[#B3B3B3]">We asked Claude, ChatGPT, and Perplexity the kinds of questions your ICP would actually type &mdash; real problems, real revenue numbers, asking for specific help. You weren&apos;t mentioned. Not once.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(["claude", "chatgpt", "perplexity"] as const).map(provider => (
              <div key={provider} className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
                <p className="text-[#666] text-xs capitalize mb-1">{provider}</p>
                <p className="text-lg font-anton text-[#E51B23]">{"\u2717"} Not Found</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#666] text-xs font-bold uppercase">AI Awareness Score</span>
            <span className="text-xs font-bold text-[#00D4FF]">{llm.summary.score}%</span>
          </div>
          <div className="h-2 bg-[#333] rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full bg-[#E51B23]" style={{ width: `${Math.max(llm.summary.score, 2)}%` }} />
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
            <p className="text-[#666] text-xs font-bold uppercase mb-2">What Buyers Are Asking AI Right Now</p>
            <div className="mb-3 space-y-1">
              {llm.summary.queriesUsed.map((q, i) => (
                <p key={i} className="text-sm text-white bg-black/50 rounded px-3 py-2 italic">&ldquo;{q}&rdquo;</p>
              ))}
            </div>
            <p className="text-sm text-[#B3B3B3] mb-2">We asked Claude, ChatGPT, and Perplexity these exact questions. You weren&apos;t mentioned. Not once.</p>
            <ul className="space-y-1 text-sm text-[#B3B3B3]">
              <li>&bull; AI is increasingly how people research purchases</li>
              <li>&bull; Your competitors ARE showing up</li>
              <li>&bull; This gap will widen, not shrink</li>
            </ul>
            <p className="text-sm text-[#00D4FF] mt-3 font-medium">The fix: become the answer. Your ICP is asking questions like &ldquo;{llm.summary.queriesUsed[0]}&rdquo; right now. You need content that answers those exact questions &mdash; not thought leadership, not brand awareness. Specific, tactical answers to specific problems. That&apos;s how you get cited.</p>
          </div>
        </div>

        {/* ===== REALITY CHECKS ===== */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#333] rounded-lg p-6">
            <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">What You&apos;re Doing Right</h2>
            <div className="space-y-4">
              {scores.realityChecks.filter(c => c.type === "celebration").map((check) => (
                <div key={check.id} className="bg-[#1A1A1A] border border-[#333] border-l-4 border-l-green-500/50 rounded p-4">
                  <h3 className="text-sm font-bold text-green-500 mb-2">{check.title}</h3>
                  <p className="text-sm text-[#B3B3B3]">{check.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-lg p-6">
            <h2 className="font-anton text-lg text-[#E51B23] uppercase tracking-wider mb-5">Reality Checks</h2>
            <div className="space-y-4">
              {scores.realityChecks.filter(c => c.type !== "celebration").map((check) => (
                <div key={check.id} className="bg-[#1A1A1A] border border-[#333] border-l-4 border-l-[#E51B23] rounded p-4">
                  <h3 className="text-sm font-bold text-[#E51B23] mb-2">{check.title}</h3>
                  <p className="text-sm text-[#B3B3B3]">{check.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== UNIT ECONOMICS ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">Unit Economics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-white">{fmtCurrency(scores.ltvMetrics.avgClientValue)}</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Avg Monthly</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-white">{scores.ltvMetrics.avgClientLifetimeMonths}mo</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Avg Lifetime</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-[#00D4FF]">{fmtCurrency(scores.ltvMetrics.ltv)}</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Client LTV</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-green-500">{scores.ltvMetrics.ltvCacRatio}x</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">LTV:CAC</p>
            </div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
            <p className="text-sm text-[#B3B3B3]">{scores.ltvMetrics.ltvCacAssessment}</p>
            <p className="text-xs text-[#666] mt-2">Estimated CAC: {fmtCurrency(scores.ltvMetrics.estimatedCAC)} (based on lead sources, volume, and close rate)</p>
          </div>
        </div>

        {/* ===== DIAGNOSES ===== */}
        <DiagnosisSection title="The Founder Tax" content={diagnoses.founderTax} color="#E51B23" />
        <DiagnosisSection title="The Pipeline Probability" content={diagnoses.pipeline} color="#00D4FF" />
        <DiagnosisSection title="The Authority Gap" content={diagnoses.authority} color="#E51B23" />
        <DiagnosisSection title="The Positioning Collision" content={diagnoses.positioning} color="#00D4FF" />
        <DiagnosisSection title="The Trajectory Fork" content={diagnoses.trajectory} color="#00D4FF" />

        {/* ===== GROWTH LEVERS ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">Growth Levers</h2>
          <div className="space-y-4">
            {scores.growthLevers.map((lever, i) => (
              <GrowthLeverCard key={i} lever={lever} />
            ))}
          </div>
        </div>

        {/* ===== FOUNDER OS ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">Founder Operating System</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-[#E51B23]">{scores.founderOS.delegationScore.toFixed(1)}</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Delegation</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-[#E51B23]">{scores.founderOS.onVsInRatio}%</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">ON vs IN</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#E51B23] p-4 rounded text-center">
              <p className="text-2xl font-anton capitalize text-[#E51B23]">{scores.founderOS.burnoutRisk}</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Burnout Risk</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 rounded text-center">
              <p className="text-2xl font-anton text-white">{scores.founderOS.bottleneckAreas.length}</p>
              <p className="text-[#666] text-xs tracking-wider uppercase mt-1">Bottlenecks</p>
            </div>
          </div>
          <p className="text-sm text-[#B3B3B3] mb-2">{scores.founderOS.delegationNarrative}</p>
          <p className="text-sm text-[#666] mb-2">{scores.founderOS.onVsInNarrative}</p>
          <p className="text-sm text-[#666] mt-2">
            <strong className="text-white">Bottlenecks:</strong> {scores.founderOS.bottleneckAreas.join(", ")}
          </p>
        </div>

        {/* ===== PRIORITY ACTIONS ===== */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#00D4FF] uppercase tracking-wider mb-5">Priority Actions</h2>
          <p className="text-sm text-[#666] mb-4">Based on everything above, here&apos;s what matters in order:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left py-2 text-[#666] text-xs font-bold uppercase w-16">#</th>
                  <th className="text-left py-2 text-[#666] text-xs font-bold uppercase">Action</th>
                  <th className="text-left py-2 text-[#666] text-xs font-bold uppercase">Why</th>
                </tr>
              </thead>
              <tbody>
                {scores.priorityActions.map((action) => (
                  <tr key={action.priority} className="border-b border-[#333]/50">
                    <td className="py-3 text-[#00D4FF] font-anton">{action.priority}</td>
                    <td className="py-3 text-white font-medium">{action.action}</td>
                    <td className="py-3 text-[#B3B3B3]">{action.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== CTA ===== */}
        <div className="bg-[#00D4FF] rounded-lg p-8 text-center">
          <p className="font-anton text-black text-sm uppercase tracking-wider mb-2">{diagnoses.cta.headline}</p>
          <h2 className="font-anton text-2xl text-black uppercase tracking-wide mb-6">
            Next Steps
          </h2>
          <div className="bg-black/20 rounded p-6 mb-4 text-left max-w-lg mx-auto">
            <h3 className="font-anton text-black text-lg mb-2">Get Your Own WTF Assessment</h3>
            <p className="text-sm text-black/80 mb-3">Take the 10-minute assessment and get:</p>
            <ul className="text-sm text-black/80 space-y-1 mb-4">
              <li>&bull; Your personalized WTF Zones score across 8 business dimensions</li>
              <li>&bull; AI-powered analysis of your positioning, content, and market visibility</li>
              <li>&bull; Custom growth levers ranked by impact for your agency</li>
              <li>&bull; Your Founder Tax calculation and delegation roadmap</li>
            </ul>
          </div>
          <a
            href="/growthos"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#111] transition-colors"
          >
            Take Your Assessment &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="https://timkilroy.com" target="_blank" rel="noopener noreferrer" className="bg-[#111] border border-[#333] rounded-lg p-5 hover:border-[#00D4FF]/50 transition-colors block">
            <h4 className="font-bold text-white mb-1">Coaching &amp; Consulting</h4>
            <p className="text-xs text-[#666]">Explore our programs &rarr;</p>
          </a>
          <a href="https://agencyinnercircle.com" target="_blank" rel="noopener noreferrer" className="bg-[#111] border border-[#333] rounded-lg p-5 hover:border-[#00D4FF]/50 transition-colors block">
            <h4 className="font-bold text-white mb-1">The Agency Inner Circle</h4>
            <p className="text-xs text-[#666]">Free community for agency owners. Join free &rarr;</p>
          </a>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-[#333] pt-8 mt-2">
          <div className="flex items-center justify-between">
            <div className="font-anton text-sm tracking-wide">
              <span className="text-white">GROWTH</span>
              <span className="text-[#00D4FF]">OS</span>
            </div>
            <span className="text-[#666] text-sm">Example data &bull; Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
