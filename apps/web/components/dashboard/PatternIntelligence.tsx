'use client';

import Link from 'next/link';

// ============================================
// PATTERN VALIDATION
// ============================================

const VALID_PATTERNS = [
  "The Cultural Handshake",
  "The Peer Validation Engine",
  "The Vulnerability Flip",
  "The Diagnostic Reveal",
  "The Self Diagnosis Pull",
  "The Framework Drop",
  "The Permission Builder",
  "The Mirror Close",
  "The Scenic Route",
  "The Business Blitzer",
  "The Generous Professor",
  "The Advice Avalanche",
  "The Surface Scanner",
  "The Agenda Abandoner",
  "The Passenger",
  "The Premature Solution",
  "The Soft Close Fade",
  "The Over Explain Loop"
];

export function isValidPattern(name: string): boolean {
  return VALID_PATTERNS.includes(name);
}

// ============================================
// TYPES
// ============================================

export interface DetectedPattern {
  id: string;
  name: string;
  category: "connection" | "diagnosis" | "control" | "activation";
  polarity: "positive" | "negative";
  frequency: number;
  percentage: number;
}

interface PatternIntelligenceProps {
  positivePatterns: DetectedPattern[];
  negativePatterns: DetectedPattern[];
  totalCalls: number;
  onPatternClick?: (pattern: DetectedPattern) => void;
}

// ============================================
// COMPONENT
// ============================================

export function PatternIntelligence({
  positivePatterns,
  negativePatterns,
  totalCalls,
  onPatternClick,
}: PatternIntelligenceProps) {
  // Validate and filter patterns
  const validPositive = positivePatterns.filter(p => {
    if (!isValidPattern(p.name)) {
      console.warn(`Invalid pattern detected: ${p.name}`);
      return false;
    }
    return true;
  });

  const validNegative = negativePatterns.filter(p => {
    if (!isValidPattern(p.name)) {
      console.warn(`Invalid pattern detected: ${p.name}`);
      return false;
    }
    return true;
  });

  const topStrengths = validPositive.slice(0, 3);
  const topWeaknesses = validNegative.slice(0, 3);

  const mostConsistentWin = validPositive[0];
  const mostFrequentFriction = validNegative[0];

  // Empty state
  if (topStrengths.length === 0 && topWeaknesses.length === 0) {
    return (
      <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
        <h2 className="font-anton text-xl tracking-wide text-white mb-5">
          PATTERN INTELLIGENCE
        </h2>
        <div className="text-center py-10">
          <p className="text-[#666] mb-5">No patterns detected yet.</p>
          <Link
            href="/call-lab"
            className="bg-[#E51B23] border-2 border-[#E51B23] text-white py-3.5 px-6 font-anton text-[12px] tracking-wider hover:bg-[#FF2930] hover:border-[#FF2930] transition-all inline-block no-underline"
          >
            ANALYZE YOUR FIRST CALL
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
      <h2 className="font-anton text-xl tracking-wide text-white mb-5">
        PATTERN INTELLIGENCE
      </h2>

      {/* Pattern Columns */}
      <div className="grid grid-cols-2 gap-6 pb-6 mb-6 border-b-2 border-[#333]">
        {/* Top Strengths */}
        <div>
          <h3 className="text-[10px] font-bold tracking-wider text-[#FFDE59] mb-3.5">
            ✓ TOP STRENGTHS
          </h3>
          {topStrengths.length === 0 ? (
            <p className="text-[11px] text-[#666] italic">No data yet</p>
          ) : (
            topStrengths.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => onPatternClick?.(pattern)}
                className="flex justify-between items-baseline w-full py-2 text-left bg-transparent border-none cursor-pointer hover:text-[#FFDE59] transition-colors"
              >
                <span className="text-white text-[12px] font-medium hover:text-[#FFDE59]">
                  {pattern.name}
                </span>
                <span className="text-[#666] text-[11px]">
                  ({pattern.frequency})
                </span>
              </button>
            ))
          )}
        </div>

        {/* Top Weaknesses */}
        <div>
          <h3 className="text-[10px] font-bold tracking-wider text-[#E51B23] mb-3.5">
            ! TOP WEAKNESSES
          </h3>
          {topWeaknesses.length === 0 ? (
            <p className="text-[11px] text-[#666] italic">No data yet</p>
          ) : (
            topWeaknesses.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => onPatternClick?.(pattern)}
                className="flex justify-between items-baseline w-full py-2 text-left bg-transparent border-none cursor-pointer hover:text-[#FFDE59] transition-colors"
              >
                <span className="text-white text-[12px] font-medium hover:text-[#FFDE59]">
                  {pattern.name}
                </span>
                <span className="text-[#666] text-[11px]">
                  ({pattern.frequency})
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Most Consistent / Most Frequent */}
      <div className="space-y-5">
        {mostConsistentWin && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold tracking-wider text-[#666]">
              MOST CONSISTENT WIN
            </span>
            <span className="text-[#FFDE59] font-bold text-[14px]">
              {mostConsistentWin.name}
            </span>
            <span className="text-[#999] text-[11px]">
              {mostConsistentWin.frequency} calls ({Math.round(mostConsistentWin.percentage)}%)
            </span>
          </div>
        )}

        {mostFrequentFriction && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold tracking-wider text-[#666]">
              MOST FREQUENT FRICTION
            </span>
            <span className="text-[#E51B23] font-bold text-[14px]">
              {mostFrequentFriction.name}
            </span>
            <span className="text-[#999] text-[11px]">
              {mostFrequentFriction.frequency} calls ({Math.round(mostFrequentFriction.percentage)}%)
            </span>
          </div>
        )}
      </div>

      {/* Coaching Insight */}
      {topStrengths.length > 0 && topWeaknesses.length > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-[#333] flex items-start gap-3">
          <div className="text-2xl leading-none">💡</div>
          <div className="flex-1 text-[12px] leading-relaxed text-white">
            You&apos;re crushing <strong className="text-[#FFDE59]">{topStrengths[0].name}</strong> but{' '}
            <strong className="text-[#E51B23]">{topWeaknesses[0].name}</strong> is costing you deals.
          </div>
        </div>
      )}
    </div>
  );
}

export default PatternIntelligence;
