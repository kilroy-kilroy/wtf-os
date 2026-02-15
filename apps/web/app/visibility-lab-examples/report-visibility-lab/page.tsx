'use client';

import { Dashboard } from '@/components/visibility-lab/Dashboard';
import { AnalysisReport } from '@/lib/visibility-lab/types';
import Link from 'next/link';

/**
 * Synthetic Visibility Lab Report
 *
 * Uses a fictional B2B consulting firm to showcase the full report.
 * Renders the real Dashboard component with hardcoded data.
 */
const SYNTHETIC_REPORT: AnalysisReport = {
  brandName: 'Apex Revenue Partners',
  executiveSummary:
    "Apex Revenue Partners is an **Invisible Expert** hiding behind a generic website and zero organic reach. Your team has deep CRO and paid media chops, but the market doesn't know you exist. Competitors like Directive and Refine Labs are eating your lunch with thought leadership while you rely on referrals and hope. The talent is real — the signal is nonexistent.",
  visibilityScore: 34,
  brandArchetype: {
    name: 'Invisible Expert',
    reasoning:
      "Strong delivery capability buried under generic positioning. No founder-led content, no unique frameworks, no public proof of results. Pattern matches: relies on word-of-mouth while competitors build media engines.",
  },
  vvvAudit: {
    vibes:
      'Corporate and safe. Website reads like every other B2B agency — no personality, no edge, no reason to remember you.',
    vision:
      "Vague 'help B2B companies grow revenue' messaging. No specificity on ideal client size ($5M-$50M SaaS), no unique methodology name, no bold claim.",
    values:
      "Implied 'data-driven' and 'ROI-focused' but every competitor says the same thing. No proof, no case studies visible on first scroll, no contrarian stance.",
    clarityScore: 4,
  },
  vibeRadar: [
    { subject: 'Clarity', A: 4, fullMark: 10 },
    { subject: 'Consistency', A: 5, fullMark: 10 },
    { subject: 'Frequency', A: 2, fullMark: 10 },
    { subject: 'Differentiation', A: 3, fullMark: 10 },
    { subject: 'Authority', A: 4, fullMark: 10 },
  ],
  narrativeDissonance: {
    claim:
      'Claims to be the go-to growth partner for mid-market B2B SaaS, active on LinkedIn and running a podcast.',
    reality:
      "Podcast hasn't published in 7 months. LinkedIn posts average 12 likes. No YouTube presence. Website blog has 3 posts from 2024. Google search for 'B2B revenue consultants' returns zero Apex results in top 50.",
    dissonanceScore: 8,
    label: 'High Dissonance',
  },
  coreStrengths: [
    'Proven CRO expertise — 3x conversion improvements cited by past clients on G2',
    'Deep paid media capability (Google, LinkedIn, Meta) with documented ROAS benchmarks',
    'Small team = fast execution and direct founder access for enterprise clients',
    'Existing client base of 12+ B2B SaaS companies provides case study goldmine',
  ],
  visibilityLeaks: [
    {
      zone: "Google Search ('B2B SaaS growth agency')",
      buyerBehavior:
        'CMOs and VPs of Marketing search for growth partners when pipeline stalls — they find Directive, Refine Labs, Metadata.io',
      brandStatus: 'Not ranking in top 50 results',
      revenueRisk: 'Critical',
    },
    {
      zone: 'LinkedIn Thought Leadership',
      buyerBehavior:
        "B2B buyers follow 3-5 'growth voices' and hire from that shortlist",
      brandStatus: 'Founder posts sporadically with no engagement loop',
      revenueRisk: 'High',
    },
    {
      zone: 'YouTube Search / Dark Social',
      buyerBehavior:
        'Buyers share expert video breakdowns in private Slack channels and peer groups',
      brandStatus: 'Zero video content — completely absent from this channel',
      revenueRisk: 'High',
    },
  ],
  competitors: [
    {
      name: 'Directive Consulting',
      positioning: 'Performance marketing for B2B and SaaS — Customer Generation methodology',
      weakness: 'Premium pricing excludes mid-market; process-heavy onboarding',
      strength: 'Massive content engine, 50K+ LinkedIn followers, active YouTube',
      threatLevel: 'High',
    },
    {
      name: 'Refine Labs',
      positioning: 'Demand gen for B2B — dark social and demand capture framework',
      weakness: 'Post-acquisition identity shift; less founder-led energy now',
      strength: 'Chris Walker built a media empire that still generates inbound',
      threatLevel: 'High',
    },
    {
      name: 'Metadata.io',
      positioning: 'AI-powered demand generation platform for B2B marketers',
      weakness: 'Product-led, not service-led — different buying motion',
      strength: 'Strong brand awareness and community in B2B marketing circles',
      threatLevel: 'Medium',
    },
    {
      name: 'Kalungi',
      positioning: 'Full-service B2B SaaS marketing for companies without a CMO',
      weakness: 'Generalist approach — spread thin across too many services',
      strength: 'T2D3 framework gives them a named methodology',
      threatLevel: 'Medium',
    },
  ],
  contentGaps: [
    {
      topic: 'The $5M-$50M SaaS Growth Ceiling (Why Pipeline Stalls)',
      competitorNeglect:
        'Directive targets enterprise; Refine Labs speaks to all B2B. Nobody owns the mid-market SaaS narrative.',
      yourAdvantage:
        'Your ICP IS this segment — you live in their revenue problems daily',
      opportunityScore: 5,
    },
    {
      topic: 'CRO for B2B SaaS (Beyond Landing Page Tests)',
      competitorNeglect:
        'Competitors focus on top-of-funnel demand gen, not conversion optimization through the full pipeline',
      yourAdvantage:
        'Your documented 3x conversion improvements are proof — turn them into a framework',
      opportunityScore: 4,
    },
    {
      topic: 'Why Your B2B Agency Isn\'t Working (Red Flags Guide)',
      competitorNeglect:
        'Nobody publishes honest content about when to fire your agency',
      yourAdvantage:
        'Contrarian angle builds trust — prospects who read this will hire you instead',
      opportunityScore: 4,
    },
  ],
  youtubeStrategy: {
    channel: 'YouTube',
    topics: [
      'The $5M SaaS Growth Ceiling: 3 Pipeline Fixes That Actually Work',
      'B2B CRO Teardown: Why Your Demo Page Converts at 2% (Live Audit)',
      'We Analyzed 50 B2B SaaS Funnels — Here\'s What Winners Do Differently',
    ],
    frequency: 'Weekly 12-18min deep dives',
    teamExecution:
      'CEO (Marcus) presents strategy and client frameworks. CRO Lead does live teardowns and screen-share audits.',
    specificTargets: [
      'Compete directly with Directive\'s YouTube for B2B SaaS keywords',
      'Repurpose: Full video → LinkedIn clips → Newsletter breakdown → Twitter thread',
    ],
  },
  podcastStrategy: {
    channel: 'Podcast',
    topics: [
      'Revenue Reality Check — interviews with B2B SaaS CMOs on what actually moves pipeline',
      'Monthly solo episodes breaking down real campaign data (anonymized client wins)',
    ],
    frequency: 'Bi-weekly 25-35min episodes',
    teamExecution:
      'CEO hosts interviews. Marketing lead produces clips and show notes.',
    specificTargets: [
      'Guest on SaaS-focused podcasts (SaaStr, Demand Gen Chat, Exit Five)',
      'Transcribe episodes into long-form blog posts for SEO',
    ],
  },
  eventStrategy: {
    channel: 'Events',
    topics: [
      'Virtual Workshop: "Pipeline Audit in 60 Minutes" for SaaS marketing teams',
      'Quarterly webinar series with client CMOs sharing results',
    ],
    frequency: 'Monthly virtual + quarterly co-hosted events',
    teamExecution:
      'CEO keynotes and runs workshops. Team handles logistics and follow-up sequences.',
    specificTargets: [
      'Sponsor SaaStr Annual and Pavilion events for enterprise visibility',
      'Capture workshop recordings for YouTube and podcast repurposing',
    ],
  },
  ninetyDayPlan: [
    {
      week: 'Week 1-2',
      focus: 'Foundation Reset',
      tasks: [
        'Rewrite website homepage with specific ICP ($5M-$50M SaaS) and named methodology',
        'Create 3 detailed case studies from existing client wins with real numbers',
        'Optimize LinkedIn profiles for CEO and CRO Lead with authority positioning',
      ],
      impact: 'High',
    },
    {
      week: 'Week 3-6',
      focus: 'Content Engine Ignition',
      tasks: [
        'Publish 4 YouTube videos (teardowns + strategy) — repurpose to all channels',
        'Launch "Revenue Reality Check" podcast with 3 pre-recorded episodes',
        'Write and publish 2 pillar blog posts targeting "B2B SaaS growth agency" keywords',
      ],
      impact: 'High',
    },
    {
      week: 'Week 7-10',
      focus: 'Authority Amplification',
      tasks: [
        'Run first "Pipeline Audit" virtual workshop (target 75 registrants)',
        'Guest on 3 B2B marketing podcasts',
        'Launch LinkedIn engagement strategy — daily posts from CEO with CRO insights',
      ],
      impact: 'Medium',
    },
    {
      week: 'Week 11-13',
      focus: 'Pipeline Conversion',
      tasks: [
        'Analyze inbound leads from content — target 15 qualified discovery calls',
        'A/B test service positioning (full-service vs. CRO-only entry point)',
        'Plan Q2 event calendar and begin SaaStr sponsorship conversations',
      ],
      impact: 'High',
    },
  ],
};

export default function VisibilityLabExampleReport() {
  return (
    <div>
      {/* Example Banner */}
      <div className="bg-[#FFDE59] text-black text-center py-3 px-4 text-sm font-poppins font-semibold sticky top-0 z-[60]">
        This is an example report with synthetic data.{' '}
        <Link href="/visibility-lab?utm_source=example" className="underline font-bold hover:text-[#E51B23]">
          Run your own Visibility Lab report →
        </Link>
      </div>

      {/* Render real Dashboard component */}
      <Dashboard
        data={SYNTHETIC_REPORT}
        onReset={() => {
          window.location.href = '/visibility-lab-examples';
        }}
      />

      {/* Back to Examples */}
      <div className="bg-black text-center py-8">
        <Link
          href="/visibility-lab-examples"
          className="text-[#B3B3B3] hover:text-[#FFDE59] text-sm uppercase tracking-wider font-anton"
        >
          ← Back to all Visibility Lab examples
        </Link>
      </div>
    </div>
  );
}
