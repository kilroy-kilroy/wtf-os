'use client';

import Link from 'next/link';
import {
  NextCallFocus,
  SituationSnapshot,
  PatternIntelligenceGrid,
  MomentumSignals,
  RecentCallsList,
  FollowUpIntelligence,
  CoachingNarrative,
} from '@/components/dashboard';
import { MACRO_PATTERNS, getPatternById } from '@/lib/macro-patterns';

/**
 * Example Dashboard Page
 *
 * Public showcase of the Pro dashboard with synthetic data.
 * No auth required - all data is hardcoded.
 */

// Synthetic pattern data - shows Mirror Close working, Soft Close Fade as problem
const SYNTHETIC_PATTERN_DATA = MACRO_PATTERNS.map((pattern) => {
  // Simulate realistic frequency data
  const frequencies: Record<string, number> = {
    // Positive patterns Alex does well
    mirror_close: 7,
    diagnostic_reveal: 6,
    permission_builder: 5,
    cultural_handshake: 4,
    self_diagnosis_pull: 4,
    framework_drop: 3,
    peer_validation_engine: 2,
    generous_professor: 2,
    vulnerability_flip: 1,
    // Negative patterns to work on
    soft_close_fade: 5,
    over_explain_loop: 3,
    premature_solution: 2,
    surface_scanner: 2,
    passenger: 1,
    advice_avalanche: 1,
    agenda_abandoner: 1,
    scenic_route: 0,
    business_blitzer: 0,
  };

  const trends: Record<string, 'up' | 'down' | 'stable'> = {
    mirror_close: 'up',
    soft_close_fade: 'down', // Getting worse - this is the focus
    diagnostic_reveal: 'stable',
    over_explain_loop: 'stable',
  };

  return {
    patternId: pattern.id,
    frequency: frequencies[pattern.id] || 0,
    totalCalls: 8,
    trend: trends[pattern.id] || ('stable' as const),
    representativeQuote:
      pattern.id === 'soft_close_fade'
        ? '"So yeah, just let me know what you think and we can go from there..."'
        : undefined,
    coachingNote:
      frequencies[pattern.id] > 0
        ? `Detected in ${frequencies[pattern.id]} of your last 8 calls.`
        : undefined,
  };
});

// Next Call Focus - Soft Close Fade is the pattern to fix
const softCloseFade = getPatternById('soft_close_fade')!;
const SYNTHETIC_NEXT_FOCUS = {
  pattern: softCloseFade,
  whyCostingDeals:
    "You're building great rapport and diagnosing problems well, but you're leaving deals on the table by ending calls with 'let me know' instead of specific next steps. 3 of your last 5 calls ended without a concrete commitment.",
  correctiveMove:
    "Always propose a specific next step with date/time before the call ends. Try: 'Based on what we discussed, I'd recommend a follow-up call Tuesday at 2pm to walk through the proposal. Does that work?'",
  exampleLanguage:
    "Let's lock in our next conversation now. I have Tuesday at 2pm or Thursday at 10am - which works better for you?",
};

// Momentum signals
const SYNTHETIC_MOMENTUM = {
  mostImproved: {
    pattern: getPatternById('mirror_close')!,
    changeSinceLastPeriod: 15,
    explanation: 'Up from 4 to 7 calls. Your summary closes are landing better.',
  },
  mostRegressed: {
    pattern: getPatternById('soft_close_fade')!,
    changeSinceLastPeriod: -20,
    explanation: 'Down from 2 to 5 occurrences. Focus on concrete next steps.',
  },
  hasEnoughData: true,
};

// Recent calls
const SYNTHETIC_RECENT_CALLS = [
  {
    id: '1',
    buyerName: 'Sarah Chen',
    companyName: 'TechCorp',
    date: 'Dec 12, 2024',
    score: 72,
    highlightedPattern: {
      pattern: getPatternById('mirror_close')!,
      isPositive: true,
    },
    coachingNote: 'Strong diagnostic, weak close. Add specific next step.',
  },
  {
    id: '2',
    buyerName: 'Michael Torres',
    companyName: 'ScaleUp Inc',
    date: 'Dec 10, 2024',
    score: 68,
    highlightedPattern: {
      pattern: getPatternById('soft_close_fade')!,
      isPositive: false,
    },
    coachingNote: 'Great rapport but ended with "let me know" - no commitment.',
  },
  {
    id: '3',
    buyerName: 'Jennifer Park',
    companyName: 'Growth Labs',
    date: 'Dec 8, 2024',
    score: 81,
    highlightedPattern: {
      pattern: getPatternById('diagnostic_reveal')!,
      isPositive: true,
    },
    coachingNote: 'Excellent discovery. They articulated their own problem.',
  },
  {
    id: '4',
    buyerName: 'David Kim',
    companyName: 'Velocity Systems',
    date: 'Dec 5, 2024',
    score: 65,
    highlightedPattern: {
      pattern: getPatternById('over_explain_loop')!,
      isPositive: false,
    },
    coachingNote: 'Talked past the close. They were ready at minute 32.',
  },
  {
    id: '5',
    buyerName: 'Amanda Foster',
    companyName: 'Bright Solutions',
    date: 'Dec 3, 2024',
    score: 77,
    highlightedPattern: {
      pattern: getPatternById('permission_builder')!,
      isPositive: true,
    },
    coachingNote: 'Good micro-commitments throughout. Strong structure.',
  },
];

// Follow-up intelligence
const SYNTHETIC_FOLLOW_UPS = [
  {
    callId: '1',
    callName: 'Sarah Chen - TechCorp',
    riskNote: 'No next step scheduled - deal at risk',
    recommendedFollowUp:
      'Hi Sarah, great speaking with you about the scaling challenges at TechCorp. As discussed, I\'ll send over the case study from a similar company. Can we schedule 30 minutes next Tuesday to walk through how it might apply to your situation?',
  },
  {
    callId: '2',
    callName: 'Michael Torres - ScaleUp Inc',
    riskNote: 'Sent proposal 5 days ago - no response',
    recommendedFollowUp:
      'Michael, following up on the proposal I sent over. I know Q1 planning is intense - would it be helpful if I put together a 90-day implementation timeline to show how this fits into your roadmap?',
  },
];

// Coaching narrative
const SYNTHETIC_COACHING = `Your Mirror Close pattern is your secret weapon - you're reflecting prospect language better than most reps I see. But you're undermining that strength by fading at the finish line.

The pattern is clear: great diagnosis, strong rapport, then "let me know" endings. You're doing 90% of the work and leaving 10% of the value on the table.

One adjustment: Before any call ends, state a specific next step with a date. Not "I'll follow up next week" but "Let's schedule Tuesday at 2pm to review the proposal."`;

export default function ExampleDashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/examples">
              <div className="font-anton text-2xl tracking-wide uppercase">
                <span className="text-white">SALES</span>
                <span className="text-[#E51B23]">OS</span>
              </div>
              <div className="font-anton text-xs text-[#FFDE59] uppercase tracking-wider">
                CALL LAB PRO
              </div>
            </Link>

            {/* User */}
            <div className="hidden md:block border-l border-[#333] pl-6">
              <p className="text-white text-sm font-medium">Alex Morgan</p>
              <p className="text-[#666] text-xs">alex@example.com</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select className="bg-black border border-[#333] text-white text-sm px-3 py-2 rounded focus:border-[#E51B23] outline-none">
              <option value="30">Last 30 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            {/* Primary CTA */}
            <Link
              href="/call-lab-pro?utm_source=example"
              className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Try Call Lab Pro Today
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Next Call Focus */}
        <NextCallFocus
          pattern={SYNTHETIC_NEXT_FOCUS.pattern}
          whyCostingDeals={SYNTHETIC_NEXT_FOCUS.whyCostingDeals}
          correctiveMove={SYNTHETIC_NEXT_FOCUS.correctiveMove}
          exampleLanguage={SYNTHETIC_NEXT_FOCUS.exampleLanguage}
        />

        {/* Situation Snapshot */}
        <SituationSnapshot callsInRange={8} overallScore={72} trendVsPrevious={3} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Pattern Intelligence */}
          <div className="lg:col-span-2 space-y-8">
            <PatternIntelligenceGrid patternData={SYNTHETIC_PATTERN_DATA} totalCalls={8} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <MomentumSignals
              mostImproved={SYNTHETIC_MOMENTUM.mostImproved}
              mostRegressed={SYNTHETIC_MOMENTUM.mostRegressed}
              hasEnoughData={SYNTHETIC_MOMENTUM.hasEnoughData}
            />

            <CoachingNarrative narrative={SYNTHETIC_COACHING} />

            <FollowUpIntelligence items={SYNTHETIC_FOLLOW_UPS} />
          </div>
        </div>

        {/* Recent Calls */}
        <RecentCallsList calls={SYNTHETIC_RECENT_CALLS} />

        {/* CTA Banner */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            This could be your dashboard
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Track your patterns, see your momentum, and get personalized coaching insights
            from every call you analyze.
          </p>
          <Link
            href="/call-lab-pro?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Try Call Lab Pro Today →
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link
                href="/call-lab-pro?utm_source=example"
                className="bg-[#E51B23] text-white px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
              >
                Try Call Lab Pro Today
              </Link>
              <Link
                href="/examples"
                className="text-[#B3B3B3] text-sm hover:text-white transition-colors"
              >
                ← Back to Examples
              </Link>
            </div>

            <div className="flex items-center gap-4 text-sm text-[#666]">
              <span>Example data • Not a real account</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
