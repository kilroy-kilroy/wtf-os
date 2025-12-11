'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  CallCard,
  PatternIntelligence,
  MomentumSection,
  ScoreCard,
  CleanCallRate,
} from '@/components/dashboard';

// Demo data - in production, this would come from the database
const DEMO_CALLS = [
  {
    id: '1',
    name: 'Amlan Das',
    company: 'Made by Das',
    date: 'Dec 10, 2024',
    score: 72,
    top_positive_pattern: {
      macro_name: 'The Cultural Handshake',
      category: 'connection' as const,
    },
    top_negative_pattern: {
      macro_name: 'The Scenic Route',
      category: 'connection' as const,
    },
    next_step: 'Lock in calendar invite',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    company: 'Velocity Partners',
    date: 'Dec 9, 2024',
    score: 85,
    top_positive_pattern: {
      macro_name: 'The Diagnostic Reveal',
      category: 'diagnosis' as const,
    },
    top_negative_pattern: {
      macro_name: 'The Soft Close Fade',
      category: 'activation' as const,
    },
    next_step: 'Send proposal by Friday',
  },
  {
    id: '3',
    name: 'Mike Thompson',
    company: 'GrowthCo',
    date: 'Dec 8, 2024',
    score: 64,
    top_positive_pattern: {
      macro_name: 'The Vulnerability Flip',
      category: 'connection' as const,
    },
    top_negative_pattern: {
      macro_name: 'The Generous Professor',
      category: 'diagnosis' as const,
    },
    next_step: 'Follow up on budget discussion',
  },
];

const DEMO_PATTERN_INTELLIGENCE = {
  positivePatterns: [
    { macro_id: 'cultural_handshake', macro_name: 'The Cultural Handshake', count: 9 },
    { macro_id: 'diagnostic_reveal', macro_name: 'The Diagnostic Reveal', count: 7 },
    { macro_id: 'vulnerability_flip', macro_name: 'The Vulnerability Flip', count: 5 },
  ],
  negativePatterns: [
    { macro_id: 'soft_close_fade', macro_name: 'The Soft Close Fade', count: 7 },
    { macro_id: 'scenic_route', macro_name: 'The Scenic Route', count: 5 },
    { macro_id: 'generous_professor', macro_name: 'The Generous Professor', count: 3 },
  ],
  totalCalls: 12,
};

const DEMO_MOMENTUM = {
  top_positive_pattern: {
    macro_name: 'The Cultural Handshake',
    frequency: 9,
    total_calls: 12,
    trend: 'rising' as const,
  },
  top_negative_pattern: {
    macro_name: 'The Soft Close Fade',
    frequency: 7,
    total_calls: 12,
  },
  next_call_focus: 'Practice asking for the decision in the last 5 minutes',
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">Your sales call performance</p>
          </div>
          <Link href="/call-lab">
            <Button size="lg" className="bg-red-600 hover:bg-red-700">
              Analyze New Call
            </Button>
          </Link>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScoreCard
            dimension="Overall Score"
            value={74}
            max={100}
            description="Average across 12 calls"
          />
          <ScoreCard
            dimension="Trust Velocity"
            value={82}
            max={100}
            description="How fast you build trust"
          />
          <ScoreCard
            dimension="Close Discipline"
            value={58}
            max={100}
            description="Next step commitment rate"
          />
          <CleanCallRate clean_count={8} total_count={12} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Calls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Recent Calls</h2>
              <button className="text-slate-400 text-sm hover:text-white">
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_CALLS.map((call) => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          </div>

          {/* Right Column - Intelligence & Momentum */}
          <div className="space-y-6">
            <PatternIntelligence
              positivePatterns={DEMO_PATTERN_INTELLIGENCE.positivePatterns}
              negativePatterns={DEMO_PATTERN_INTELLIGENCE.negativePatterns}
              totalCalls={DEMO_PATTERN_INTELLIGENCE.totalCalls}
            />

            <MomentumSection
              top_positive_pattern={DEMO_MOMENTUM.top_positive_pattern}
              top_negative_pattern={DEMO_MOMENTUM.top_negative_pattern}
              next_call_focus={DEMO_MOMENTUM.next_call_focus}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-white font-bold mb-2">Call Lab</h3>
            <p className="text-slate-400 text-sm mb-4">
              Get instant feedback on your sales calls
            </p>
            <Link href="/call-lab">
              <Button className="w-full">Launch Call Lab</Button>
            </Link>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-white font-bold mb-2">Rep Trends</h3>
            <p className="text-slate-400 text-sm mb-4">
              Track your performance over time
            </p>
            <Button className="w-full" disabled>
              Coming in Phase 2
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
