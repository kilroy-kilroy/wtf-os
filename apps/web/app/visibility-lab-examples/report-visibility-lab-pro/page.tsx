'use client';

import { ProReport } from '@/components/visibility-lab-pro/ProReport';
import { VisibilityLabProReport } from '@/lib/visibility-lab-pro/types';
import Link from 'next/link';

/**
 * Synthetic Visibility Lab Pro Report
 *
 * Uses a fictional B2B consulting firm to showcase the full Pro report.
 * Renders the real ProReport component with hardcoded data.
 */
const SYNTHETIC_PRO_REPORT: VisibilityLabProReport = {
  // Meta
  brandName: 'Apex Revenue Partners',
  operatorName: 'Marcus Chen',
  generatedAt: new Date().toISOString(),
  tier: 'pro',

  // Executive Diagnosis
  executiveSummary:
    "Apex Revenue Partners has genuine CRO and paid media expertise buried under corporate mediocrity. Your team delivers 3x conversion lifts but the market can't find you. Directive Consulting owns your keywords. Refine Labs owns your narrative. You're an invisible expert in a market that rewards the loudest voice — and right now, you're whispering into the void. The fix isn't more tactics. It's a complete visibility engine rebuild with founder-led content at the center.",
  diagnosisSeverity: 'Serious',

  // KVI
  kvi: {
    searchVisibility: {
      score: 18,
      evidence: 'Zero organic rankings for core terms. Not in top 50 for "B2B SaaS growth agency." Blog has 3 posts from 2024.',
    },
    socialAuthority: {
      score: 25,
      evidence: 'CEO LinkedIn averages 12 likes/post. No team amplification. Company page has 340 followers vs. Directive\'s 15K.',
    },
    contentVelocity: {
      score: 12,
      evidence: 'Podcast dormant 7 months. No YouTube. Blog cadence: ~1 post per quarter. Zero repurposing engine.',
    },
    darkSocialPenetration: {
      score: 22,
      evidence: 'No presence in B2B Slack communities (Pavilion, RevGenius, Exit Five). Not mentioned in subreddit discussions.',
    },
    competitiveShareOfVoice: {
      score: 15,
      evidence: 'Directive and Refine Labs dominate branded search. Apex appears in zero comparison articles or "best of" lists.',
    },
    founderSignalStrength: {
      score: 30,
      evidence: 'Marcus has 2,100 LinkedIn connections but posts irregularly. No speaking engagements found. No bylined articles.',
    },
    compositeScore: 20,
  },

  // Brand Archetype
  brandArchetype: {
    name: 'The Invisible Expert',
    reasoning:
      'Genuine expertise with zero amplification. Clients love the work but the market doesn\'t know you exist. Classic pattern: over-index on delivery, under-index on demand generation for yourself.',
  },

  // Narrative Forensics
  narrativeForensics: {
    overallConsistencyScore: 3,
    websiteVsLinkedIn: {
      finding:
        'Website says "full-service growth partner" while LinkedIn bio says "CRO specialist." Mixed signals on core offering.',
      alignmentScore: 4,
    },
    claimVsReality: {
      claim: 'Claims to be the go-to growth partner for mid-market B2B SaaS with active content across LinkedIn, YouTube, and a podcast.',
      reality:
        'Podcast dead since Q2 2025. No YouTube channel. LinkedIn engagement below industry average. Google finds nothing for core keywords.',
      dissonanceScore: 8,
      label: 'High Dissonance',
    },
    founderVsBrand: {
      finding:
        'Marcus has more personal credibility (past exit, Drift alum) than the Apex brand communicates. Founder story is completely buried.',
      alignmentScore: 3,
    },
    messageDrift:
      'The website talks about "data-driven marketing" (2024 language) while the market has shifted to "revenue architecture" and "pipeline velocity." You\'re speaking last year\'s language.',
  },

  // Buyer Journey
  buyerJourney: [
    {
      stage: 'Awareness',
      description: 'Buyer recognizes they have a growth problem and starts exploring solutions',
      visibilityGrade: 'F',
      whereProspectsLook: ['Google Search', 'LinkedIn Feed', 'Podcast Apps', 'YouTube'],
      brandPresence: 'Nonexistent. Zero organic touchpoints at this stage.',
      revenueAtRisk: '$180K-$400K ARR in lost deals annually',
    },
    {
      stage: 'Consideration',
      description: 'Buyer compiles a shortlist of 3-5 potential partners to evaluate',
      visibilityGrade: 'D',
      whereProspectsLook: ['G2 Reviews', 'Clutch', 'Peer Recommendations', 'Case Studies'],
      brandPresence: 'G2 profile exists but thin. No Clutch presence. Case studies not publicly accessible.',
      revenueAtRisk: '$120K-$250K ARR in missed shortlists',
    },
    {
      stage: 'Evaluation',
      description: 'Buyer deep-dives into methodology, team, and results before reaching out',
      visibilityGrade: 'C',
      whereProspectsLook: ['Website', 'Team LinkedIn Profiles', 'Content Library', 'Testimonials'],
      brandPresence: 'Website exists but generic. No methodology page. Testimonials buried in footer.',
      revenueAtRisk: '$80K-$150K ARR in lost conversions',
    },
    {
      stage: 'Decision',
      description: 'Buyer makes final selection and negotiates engagement terms',
      visibilityGrade: 'B',
      whereProspectsLook: ['Direct Calls', 'Proposals', 'References', 'Contract Terms'],
      brandPresence: 'Strong in direct conversations. Close rate is actually good when they find you.',
      revenueAtRisk: '$20K-$50K ARR in pricing concessions',
    },
  ],

  // Competitor War Room
  competitorWarRoom: [
    {
      name: 'Directive Consulting',
      archetype: 'The Content Machine',
      positioning: 'Performance marketing for B2B and SaaS — Customer Generation methodology',
      weakness: 'Premium pricing ($15K+/mo minimum) excludes mid-market. Heavy process slows time-to-value.',
      strength: 'Massive content engine: 50K+ LinkedIn, active YouTube, podcast, and named "Customer Generation" framework.',
      threatLevel: 'High',
      threatTrajectory: 'Rising',
      kviComparison: [
        { dimension: 'Search', them: 85, you: 18 },
        { dimension: 'Social', them: 78, you: 25 },
        { dimension: 'Content', them: 90, you: 12 },
        { dimension: 'Dark Social', them: 72, you: 22 },
        { dimension: 'Share of Voice', them: 80, you: 15 },
      ],
      counterPositioning:
        'Position against their enterprise pricing and slow onboarding. Your pitch: "Directive-level strategy, mid-market speed. We start driving pipeline in 30 days, not 90."',
    },
    {
      name: 'Refine Labs',
      archetype: 'The Media Empire',
      positioning: 'Demand gen for B2B — dark social and demand capture pioneered by Chris Walker',
      weakness: 'Post-acquisition identity crisis. Chris Walker gone. Methodology becoming commoditized.',
      strength: 'Brand momentum from 2022-2024 still carries. Framework language ("dark social", "demand capture") embedded in market vocabulary.',
      threatLevel: 'High',
      threatTrajectory: 'Declining',
      kviComparison: [
        { dimension: 'Search', them: 72, you: 18 },
        { dimension: 'Social', them: 65, you: 25 },
        { dimension: 'Content', them: 55, you: 12 },
        { dimension: 'Dark Social', them: 88, you: 22 },
        { dimension: 'Share of Voice', them: 70, you: 15 },
      ],
      counterPositioning:
        'Exploit their leadership vacuum. Position as the next-gen alternative: "Refine Labs taught the market about demand gen. We execute it for mid-market SaaS at half the cost."',
    },
    {
      name: 'Kalungi',
      archetype: 'The Systematizer',
      positioning: 'Full-service B2B SaaS marketing — fractional CMO + execution team (T2D3 framework)',
      weakness: 'Generalist spread. Jack of all trades, master of none. No CRO depth.',
      strength: 'Named T2D3 methodology gives them positioning clarity you lack. Active blog and partner network.',
      threatLevel: 'Medium',
      threatTrajectory: 'Stable',
      kviComparison: [
        { dimension: 'Search', them: 55, you: 18 },
        { dimension: 'Social', them: 42, you: 25 },
        { dimension: 'Content', them: 48, you: 12 },
        { dimension: 'Dark Social', them: 35, you: 22 },
        { dimension: 'Share of Voice', them: 40, you: 15 },
      ],
      counterPositioning:
        'Attack their generalist weakness. Your pitch: "Kalungi gives you a little of everything. We give you the one thing that moves pipeline: conversion architecture."',
    },
  ],

  // Operator Profile
  operatorProfile: {
    personalBrandScore: 32,
    linkedInStrength:
      '2,100 connections, irregular posting (1-2x/month). Posts get 8-15 likes. No viral content. Bio mentions past Drift experience but doesn\'t lead with it.',
    speakingPresence:
      'No speaking engagements found in 2025-2026. No conference appearances. No podcast guest appearances in past 12 months.',
    contentAuthority:
      'Zero bylined articles in industry publications. No guest posts. Blog contributions are generic and infrequent.',
    authoritySignals: [
      'Former Drift employee (pre-acquisition)',
      'Previous startup exit (small but real)',
      '12+ B2B SaaS client relationships',
      'CRO expertise with documented results',
    ],
    networkVisibility:
      'Not active in Pavilion, RevGenius, or Exit Five communities. Missing a massive dark social opportunity.',
    founderDependencyRisk:
      'HIGH — Marcus is the brand, but he\'s not building in public. If he steps back, there\'s no brand equity independent of him.',
    operatorArchetype: {
      name: 'The Reluctant Expert',
      reasoning:
        'Has genuine expertise and war stories but resists self-promotion. Classic technical founder pattern: lets the work speak for itself in a market that rewards the loudest voice.',
      strengths: [
        'Deep domain expertise in CRO and B2B SaaS',
        'Authentic — not a fake guru',
        'Real results to reference',
      ],
      risks: [
        'Competitors will keep winning mindshare by default',
        'Referral pipeline will eventually dry up',
        'Team morale drops when pipeline is unpredictable',
      ],
    },
  },

  // Core Strengths
  coreStrengths: [
    'Documented 3x conversion improvements for B2B SaaS clients — this is your proof, not your secret',
    'Deep paid media capability (Google, LinkedIn, Meta) with benchmarked ROAS data across 12+ accounts',
    'Small team means fast execution and direct founder access — enterprise clients love this',
    'Marcus\'s Drift pedigree gives instant credibility in the SaaS ecosystem if leveraged properly',
    'Existing client base of 12+ B2B SaaS companies is an untapped case study and referral goldmine',
  ],

  // Content Intelligence
  contentIntelligence: [
    {
      topic: 'The $5M-$50M SaaS Growth Ceiling: Why Pipeline Stalls and How to Fix It',
      format: 'Video + Blog',
      competitorNeglect: 'Directive targets enterprise ($50M+). Refine Labs speaks broadly. Nobody owns mid-market SaaS growth content.',
      yourAngle: 'You live in this segment daily. Turn real client patterns into a framework. Name it.',
      opportunityScore: 5,
      repurposingChain: ['YouTube Video', 'LinkedIn Carousel', 'Newsletter Deep-Dive', 'Twitter Thread', 'Podcast Episode'],
      searchVolume: 'Medium',
    },
    {
      topic: 'B2B CRO Beyond Landing Pages: Full-Pipeline Conversion Architecture',
      format: 'Video Teardown',
      competitorNeglect: 'Competitors obsess over top-of-funnel. Nobody teaches mid-funnel and bottom-funnel CRO for B2B.',
      yourAngle: 'This is your unfair advantage. Live teardowns of real funnels (anonymized) prove expertise instantly.',
      opportunityScore: 5,
      repurposingChain: ['YouTube Teardown', 'LinkedIn Before/After', 'Case Study PDF', 'Webinar Replay'],
      searchVolume: 'High',
    },
    {
      topic: 'Why Your B2B Agency Isn\'t Working: The 7 Red Flags',
      format: 'Blog + Social',
      competitorNeglect: 'Agencies don\'t publish content criticizing agencies. This is a white space.',
      yourAngle: 'Contrarian trust play. Prospects who read this will fire their current agency and call you.',
      opportunityScore: 4,
      repurposingChain: ['Blog Post', 'LinkedIn Provocative Post', 'Twitter Thread', 'Lead Magnet Checklist'],
      searchVolume: 'Medium',
    },
    {
      topic: 'The Drift Playbook: What I Learned Building Pipeline at a $1B SaaS Company',
      format: 'Podcast + Video',
      competitorNeglect: 'Nobody else has this story. Competitor founders don\'t have enterprise SaaS experience.',
      yourAngle: 'Marcus\'s personal narrative. This humanizes the brand and builds authority simultaneously.',
      opportunityScore: 4,
      repurposingChain: ['Podcast Episode', 'YouTube Interview', 'LinkedIn Story Post', 'About Page Content'],
      searchVolume: 'Low',
    },
  ],

  // Channel Calendars
  channelCalendars: [
    {
      channel: 'YouTube',
      cadence: 'Weekly (Tuesday 9am ET)',
      topics: [
        'SaaS funnel teardowns (live screen-share CRO audits)',
        'Pipeline playbook episodes with frameworks',
        'Client win breakdowns (anonymized, data-heavy)',
      ],
      teamExecution: 'Marcus presents strategy. CRO Lead does live teardowns. Marketing coordinator handles editing and thumbnails.',
      specificTargets: ['Rank for "B2B SaaS CRO" and "SaaS growth agency"', 'Hit 1K subscribers in 90 days'],
      quickWin: 'Record and publish a 15-min teardown of a public B2B SaaS website. Tag the company. Controversy drives views.',
    },
    {
      channel: 'LinkedIn',
      cadence: 'Daily (Marcus) + 3x/week (team)',
      topics: [
        'Hot takes on B2B marketing trends',
        'Client results (anonymized data points)',
        'Behind-the-scenes of campaign builds',
      ],
      teamExecution: 'Marcus posts daily original content. CRO Lead shares tactical insights 3x/week. Team amplifies within 30 minutes.',
      specificTargets: ['Grow Marcus to 5K followers', 'Average 50+ likes per post within 60 days'],
      quickWin: 'Post a contrarian take on demand gen: "Your demand gen agency is a glorified ad buyer. Here\'s the test." Watch it rip.',
    },
    {
      channel: 'Podcast',
      cadence: 'Bi-weekly (alternating solo + interview)',
      topics: [
        'Revenue Reality Check — CMO interviews on what actually works',
        'Solo episodes breaking down campaign data and results',
      ],
      teamExecution: 'Marcus hosts all episodes. Marketing lead produces, edits, and creates 3 clips per episode.',
      specificTargets: ['Launch with 5 pre-recorded episodes', 'Secure 2 guest spots on SaaStr/Exit Five podcasts'],
      quickWin: 'Record a solo episode: "We spent $500K on B2B ads last year. Here\'s exactly what worked." Ship in 48 hours.',
    },
    {
      channel: 'Events',
      cadence: 'Monthly virtual + quarterly co-hosted',
      topics: [
        '"Pipeline Audit in 60 Minutes" virtual workshops',
        'Co-hosted webinars with SaaS tools in your stack',
      ],
      teamExecution: 'Marcus keynotes. Team runs logistics, follow-up sequences, and recording repurposing.',
      specificTargets: ['75 registrants for first workshop', 'Partner with HubSpot or 6sense for co-branded event'],
      quickWin: 'Schedule a free "Pipeline Audit" workshop for next month. Promote on LinkedIn for 2 weeks. Target 50 registrants.',
    },
  ],

  // 90-Day Battle Plan
  ninetyDayBattlePlan: [
    {
      week: 'Week 1-2',
      focus: 'Foundation Reset',
      tasks: [
        'Rewrite homepage with $5M-$50M SaaS positioning and named methodology ("Revenue Architecture")',
        'Create 3 detailed case studies with real numbers (conversion lifts, pipeline impact, ROAS)',
        'Optimize LinkedIn profiles for Marcus and CRO Lead — authority positioning, not job descriptions',
        'Set up YouTube channel with branded templates and first 2 video scripts',
      ],
      impact: 'High',
      kviImpact: 'Search +5, Social +3',
      resourceLevel: '20 hrs/week',
    },
    {
      week: 'Week 3-6',
      focus: 'Content Engine Ignition',
      tasks: [
        'Publish 4 YouTube videos (2 teardowns + 2 strategy) — full repurposing chain activated',
        'Launch "Revenue Reality Check" podcast with 5 pre-recorded episodes',
        'Begin daily LinkedIn posting cadence — Marcus + team amplification protocol',
        'Publish 2 pillar blog posts targeting "B2B SaaS growth agency" and "B2B CRO consultant"',
      ],
      impact: 'High',
      kviImpact: 'Content +15, Social +10, Search +8',
      resourceLevel: '25 hrs/week',
    },
    {
      week: 'Week 7-10',
      focus: 'Authority Amplification',
      tasks: [
        'Run first "Pipeline Audit" workshop (75 registrant target)',
        'Secure 3 podcast guest appearances (SaaStr, Exit Five, Demand Gen Chat)',
        'Join and actively participate in Pavilion and RevGenius communities',
        'Publish first "Why Your Agency Isn\'t Working" contrarian content piece',
      ],
      impact: 'Medium',
      kviImpact: 'Dark Social +12, Authority +8',
      resourceLevel: '20 hrs/week',
    },
    {
      week: 'Week 11-13',
      focus: 'Pipeline Conversion',
      tasks: [
        'Analyze inbound pipeline from content — target 15 qualified discovery calls',
        'A/B test service positioning: full-service vs. CRO-only entry point',
        'Launch retargeting campaigns for website visitors and content consumers',
        'Plan Q2 event calendar and begin SaaStr Annual sponsorship conversation',
      ],
      impact: 'High',
      kviImpact: 'Share of Voice +10, Overall KVI target: 45+',
      resourceLevel: '15 hrs/week',
    },
  ],

  // Kilroy's Hot Take
  kilroyHotTake: {
    vibeScore: 4,
    vibeCommentary:
      'You\'re the agency equivalent of a Michelin-star chef working at a strip mall food court. The talent is real. The stage is wrong. You\'ve been so busy delivering for clients that you forgot to build the machine that brings them to your door. That ends now.',
    theOneThing:
      'Marcus needs to become the face of mid-market B2B SaaS growth. Not "thought leader" cringe — actual, useful, opinionated content that makes CMOs think "this person understands my exact problem." One YouTube video per week. That\'s the unlock.',
    whatNobodyWillTellYou:
      'Your referral pipeline will dry up within 18 months if you don\'t build an inbound engine. Every agency thinks referrals are forever until they\'re not. The market is shifting to founder-led buying — buyers want to follow a person, not hire a logo. If Marcus doesn\'t step up, a 26-year-old with a podcast and zero experience will eat your pipeline.',
    prognosis: {
      doNothing:
        'Flat or declining revenue. 1-2 client churn events create cash flow crises. Directive continues to eat market share. You become a lifestyle business dependent on 3-4 whale clients.',
      executeWell:
        'KVI hits 45+ by month 3, 65+ by month 6. Inbound pipeline covers 40% of revenue by Q3. Marcus builds a personal brand that generates 5-10 inbound leads/month. You stop competing on price and start competing on authority.',
    },
  },
};

export default function VisibilityLabProExampleReport() {
  return (
    <div>
      {/* Example Banner */}
      <div className="bg-[#FFDE59] text-black text-center py-3 px-4 text-sm font-poppins font-semibold sticky top-0 z-[60]">
        This is an example Pro report with synthetic data.{' '}
        <Link href="/visibility-lab-pro?utm_source=example" className="underline font-bold hover:text-[#E51B23]">
          Run your own Visibility Lab Pro report →
        </Link>
      </div>

      {/* Render real ProReport component */}
      <ProReport
        data={SYNTHETIC_PRO_REPORT}
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
