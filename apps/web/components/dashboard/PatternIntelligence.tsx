'use client';

interface PatternFrequency {
  macro_id: string;
  macro_name: string;
  count: number;
}

interface PatternIntelligenceProps {
  positivePatterns: PatternFrequency[];
  negativePatterns: PatternFrequency[];
  totalCalls: number;
}

/**
 * PatternIntelligence Component
 *
 * IMPORTANT: This component correctly separates positive and negative patterns.
 * The old (broken) logic would show the same pattern in both strengths AND weaknesses
 * because it just sorted by frequency without considering polarity.
 *
 * The FIX: We receive pre-separated positive and negative patterns from the data layer,
 * ensuring no pattern ever appears in both columns.
 */
export function PatternIntelligence({
  positivePatterns,
  negativePatterns,
  totalCalls,
}: PatternIntelligenceProps) {
  const topStrengths = positivePatterns.slice(0, 3);
  const topWeaknesses = negativePatterns.slice(0, 3);

  const mostConsistentWin = positivePatterns[0];
  const mostFrequentFriction = negativePatterns[0];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-white font-bold text-lg mb-4">PATTERN INTELLIGENCE</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Strengths */}
        <div>
          <h3 className="text-green-400 font-semibold text-sm mb-3">
            TOP STRENGTHS
          </h3>
          <div className="space-y-2">
            {topStrengths.length > 0 ? (
              topStrengths.map((pattern) => (
                <div
                  key={pattern.macro_id}
                  className="flex justify-between items-center"
                >
                  <span className="text-slate-300 text-sm">
                    {pattern.macro_name}
                  </span>
                  <span className="text-yellow-400 text-sm font-mono">
                    ({pattern.count})
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Weaknesses */}
        <div>
          <h3 className="text-red-400 font-semibold text-sm mb-3">
            TOP WEAKNESSES
          </h3>
          <div className="space-y-2">
            {topWeaknesses.length > 0 ? (
              topWeaknesses.map((pattern) => (
                <div
                  key={pattern.macro_id}
                  className="flex justify-between items-center"
                >
                  <span className="text-slate-300 text-sm">
                    {pattern.macro_name}
                  </span>
                  <span className="text-red-400 text-sm font-mono">
                    ({pattern.count})
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {(mostConsistentWin || mostFrequentFriction) && (
        <div className="border-t border-slate-700 mt-4 pt-4 grid grid-cols-2 gap-4">
          {mostConsistentWin && (
            <div>
              <span className="text-slate-500 text-xs">MOST CONSISTENT WIN</span>
              <p className="text-yellow-400 font-medium">
                {mostConsistentWin.macro_name}
              </p>
              <p className="text-slate-400 text-xs">
                {mostConsistentWin.count}/{totalCalls} calls (
                {Math.round((mostConsistentWin.count / totalCalls) * 100)}%)
              </p>
            </div>
          )}
          {mostFrequentFriction && (
            <div>
              <span className="text-slate-500 text-xs">
                MOST FREQUENT FRICTION
              </span>
              <p className="text-red-400 font-medium">
                {mostFrequentFriction.macro_name}
              </p>
              <p className="text-slate-400 text-xs">
                {mostFrequentFriction.count}/{totalCalls} calls (
                {Math.round((mostFrequentFriction.count / totalCalls) * 100)}%)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to aggregate patterns from call data
 *
 * This is the CORRECT implementation that separates positive and negative patterns.
 * It should be used in the data layer before passing to PatternIntelligence.
 */
export interface CallPatternData {
  detected_positive_patterns: Array<{ macro_id: string; macro_name: string }>;
  detected_negative_patterns: Array<{ macro_id: string; macro_name: string }>;
}

export function aggregatePatternIntelligence(calls: CallPatternData[]): {
  positivePatterns: PatternFrequency[];
  negativePatterns: PatternFrequency[];
  totalCalls: number;
} {
  const positiveMap = new Map<string, { name: string; count: number }>();
  const negativeMap = new Map<string, { name: string; count: number }>();

  for (const call of calls) {
    // Aggregate positive patterns
    for (const pattern of call.detected_positive_patterns) {
      const existing = positiveMap.get(pattern.macro_id);
      if (existing) {
        existing.count++;
      } else {
        positiveMap.set(pattern.macro_id, {
          name: pattern.macro_name,
          count: 1,
        });
      }
    }

    // Aggregate negative patterns (completely separate)
    for (const pattern of call.detected_negative_patterns) {
      const existing = negativeMap.get(pattern.macro_id);
      if (existing) {
        existing.count++;
      } else {
        negativeMap.set(pattern.macro_id, {
          name: pattern.macro_name,
          count: 1,
        });
      }
    }
  }

  // Convert to sorted arrays
  const positivePatterns: PatternFrequency[] = Array.from(positiveMap.entries())
    .map(([id, data]) => ({
      macro_id: id,
      macro_name: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  const negativePatterns: PatternFrequency[] = Array.from(negativeMap.entries())
    .map(([id, data]) => ({
      macro_id: id,
      macro_name: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    positivePatterns,
    negativePatterns,
    totalCalls: calls.length,
  };
}

export default PatternIntelligence;
