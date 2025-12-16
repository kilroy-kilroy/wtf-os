'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CallCard,
  PatternIntelligence,
  MomentumSection,
  ScoreCard,
  CleanCallRate,
  WeeklyFocus,
  QuickWins,
  PatternDetailModal,
  type DetectedPattern,
  type FocusArea,
  type QuickWin,
} from '@/components/dashboard';

// ============================================
// TYPES
// ============================================

interface CallData {
  id: string;
  buyer_name: string;
  company?: string;
  date: string;
  score: number;
  top_positive_pattern: {
    id: string;
    name: string;
    category: "connection" | "diagnosis" | "control" | "activation";
  } | null;
  top_negative_pattern: {
    id: string;
    name: string;
    category: "connection" | "diagnosis" | "control" | "activation";
  } | null;
  next_step?: string;
}

interface MomentumData {
  biggestWin?: {
    pattern_id: string;
    macro_name: string;
    frequency: number;
    total_calls: number;
    percentage: number;
    trend: "rising" | "stable" | "falling";
  };
  biggestFix?: {
    pattern_id: string;
    macro_name: string;
    frequency: number;
    total_calls: number;
    percentage: number;
  };
  nextFocus: string;
}

interface DashboardClientProps {
  metrics: {
    overallScore: number;
    trustVelocity: number;
    closeDiscipline: number;
    cleanCallPercentage: number;
    cleanCallCount: number;
    totalCalls: number;
  };
  positivePatterns: DetectedPattern[];
  negativePatterns: DetectedPattern[];
  transformedCalls: CallData[];
  momentum: MomentumData;
  weeklyFocus: FocusArea | null;
  quickWins: QuickWin[];
}

// ============================================
// COMPONENT
// ============================================

export function DashboardClient({
  metrics,
  positivePatterns,
  negativePatterns,
  transformedCalls,
  momentum,
  weeklyFocus,
  quickWins,
}: DashboardClientProps) {
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);

  const handlePatternClick = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern);
  };

  const handleCloseModal = () => {
    setSelectedPattern(null);
  };

  return (
    <div className="min-h-screen bg-black py-8 px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-anton text-[48px] tracking-wide text-white">Dashboard</h1>
            <p className="text-[#666] text-sm">Your sales call performance</p>
          </div>
          <Link href="/call-lab">
            <button className="bg-[#E51B23] text-white px-8 py-4 font-anton text-sm tracking-wide hover:bg-[#FF2930] transition-colors">
              Analyze New Call
            </button>
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScoreCard
            label="OVERALL SCORE"
            subtitle={`Average across ${metrics.totalCalls} calls`}
            value={metrics.overallScore}
            maxValue={100}
          />
          <ScoreCard
            label="TRUST VELOCITY"
            subtitle="How fast you build trust"
            value={metrics.trustVelocity}
            maxValue={100}
          />
          <ScoreCard
            label="CLOSE DISCIPLINE"
            subtitle="Next step commitment rate"
            value={metrics.closeDiscipline}
            maxValue={100}
          />
          <CleanCallRate
            percentage={metrics.cleanCallPercentage}
            cleanCalls={metrics.cleanCallCount}
            totalCalls={metrics.totalCalls}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Recent Calls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-anton text-lg tracking-wide text-white">
                Recent Calls
              </h2>
              <button className="text-[#E51B23] text-sm font-semibold underline hover:text-[#FF2930]">
                View All
              </button>
            </div>

            {transformedCalls.length > 0 ? (
              <div className="space-y-4">
                {transformedCalls.map((call) => (
                  <CallCard key={call.id} call={call} />
                ))}
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border-2 border-[#333] p-8 text-center">
                <p className="text-[#666]">No calls analyzed yet</p>
                <Link href="/call-lab">
                  <Button className="mt-4 bg-[#E51B23] hover:bg-[#FF2930]">
                    Analyze Your First Call
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <PatternIntelligence
              positivePatterns={positivePatterns}
              negativePatterns={negativePatterns}
              totalCalls={metrics.totalCalls}
              onPatternClick={handlePatternClick}
            />

            <MomentumSection
              biggestWin={momentum.biggestWin}
              biggestFix={momentum.biggestFix}
              nextFocus={momentum.nextFocus}
            />

            {/* Weekly Focus */}
            {weeklyFocus && (
              <WeeklyFocus focus={weeklyFocus} />
            )}

            {/* Quick Wins */}
            {quickWins.length > 0 && (
              <QuickWins wins={quickWins} />
            )}
          </div>
        </div>
      </div>

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <PatternDetailModal
          pattern={selectedPattern}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default DashboardClient;
