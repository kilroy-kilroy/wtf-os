'use client';

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
}

// ============================================
// COMPONENT
// ============================================

export function PatternIntelligence({
  positivePatterns,
  negativePatterns,
  totalCalls,
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

  return (
    <div className="bg-[#1A1A1A] border border-[#333]">
      <div className="p-6">
        <h2 className="font-anton text-lg uppercase tracking-wide text-white mb-5">
          PATTERN INTELLIGENCE
        </h2>

        <div className="grid grid-cols-2 gap-5 pb-6 mb-6 border-b border-[#333]">
          {/* Top Strengths */}
          <div>
            <h3 className="text-[11px] font-bold tracking-wide text-[#FFDE59] mb-3">
              TOP STRENGTHS
            </h3>
            <div className="space-y-2">
              {topStrengths.length > 0 ? (
                topStrengths.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex justify-between items-baseline"
                  >
                    <span className="text-white text-[12px]">
                      {pattern.name}
                    </span>
                    <span className="text-[#666] text-[11px]">
                      ({pattern.frequency})
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[#666] text-[12px]">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Weaknesses */}
          <div>
            <h3 className="text-[11px] font-bold tracking-wide text-[#E51B23] mb-3">
              TOP WEAKNESSES
            </h3>
            <div className="space-y-2">
              {topWeaknesses.length > 0 ? (
                topWeaknesses.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex justify-between items-baseline"
                  >
                    <span className="text-white text-[12px]">
                      {pattern.name}
                    </span>
                    <span className="text-[#666] text-[11px]">
                      ({pattern.frequency})
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[#666] text-[12px]">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Most Consistent / Most Frequent */}
        <div className="space-y-4">
          {mostConsistentWin && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wide text-[#666]">
                MOST CONSISTENT WIN
              </span>
              <span className="text-[#FFDE59] font-semibold text-[13px]">
                {mostConsistentWin.name}
              </span>
              <span className="text-[#999] text-[11px]">
                {mostConsistentWin.frequency} calls ({Math.round(mostConsistentWin.percentage)}%)
              </span>
            </div>
          )}

          {mostFrequentFriction && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wide text-[#666]">
                MOST FREQUENT FRICTION
              </span>
              <span className="text-[#E51B23] font-semibold text-[13px]">
                {mostFrequentFriction.name}
              </span>
              <span className="text-[#999] text-[11px]">
                {mostFrequentFriction.frequency} calls ({Math.round(mostFrequentFriction.percentage)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatternIntelligence;
