'use client';

type PatternCategory = 'connection' | 'diagnosis' | 'control' | 'activation';
type PatternSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

interface CounterPattern {
  counter_id: string;
  counter_name: string;
  rationale: string;
}

interface DetectedNegativePattern {
  macro_id: string;
  macro_name: string;
  category: PatternCategory;
  severity: PatternSeverity;
  evidence_quote?: string;
  why_it_hurts?: string;
  fix_suggestion?: string;
  counter?: CounterPattern;
}

interface NegativePatternsWithCountersProps {
  patterns: DetectedNegativePattern[];
}

const CATEGORY_COLORS: Record<PatternCategory, string> = {
  connection: 'border-blue-500',
  diagnosis: 'border-purple-500',
  control: 'border-orange-500',
  activation: 'border-green-500',
};

const CATEGORY_LABELS: Record<PatternCategory, string> = {
  connection: 'Connection',
  diagnosis: 'Diagnosis',
  control: 'Control',
  activation: 'Activation',
};

const SEVERITY_BADGES: Record<PatternSeverity, { label: string; className: string }> = {
  HIGH: { label: 'Critical', className: 'bg-red-500 text-white' },
  MEDIUM: { label: 'Watch', className: 'bg-orange-500 text-white' },
  LOW: { label: 'Minor', className: 'bg-slate-600 text-white' },
};

/**
 * NegativePatternsWithCounters Component
 *
 * Displays negative patterns (weaknesses) with their positive counter-patterns.
 * This is the "What to Watch" section with actionable remedies.
 *
 * Key innovation: Counter-pairing
 * - Each negative pattern links to the positive pattern that fixes it
 * - Creates a clear path from weakness to strength
 * - Rationale explains WHY the counter-pattern helps
 *
 * Design principle: "Show the remedy, not just the problem"
 */
export function NegativePatternsWithCounters({
  patterns,
}: NegativePatternsWithCountersProps) {
  if (patterns.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-white font-bold text-xl mb-4">WHAT TO WATCH</h2>
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-green-400 font-medium">
            No significant friction detected. Clean execution.
          </p>
        </div>
      </div>
    );
  }

  // Sort by severity: HIGH first, then MEDIUM, then LOW
  const sortedPatterns = [...patterns].sort((a, b) => {
    const order: Record<PatternSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl">WHAT TO WATCH</h2>
        <span className="text-red-400 font-bold">
          {patterns.length} area{patterns.length !== 1 ? 's' : ''} to improve
        </span>
      </div>

      <div className="space-y-4">
        {sortedPatterns.map((pattern) => (
          <div
            key={pattern.macro_id}
            className="bg-slate-900/50 rounded-lg overflow-hidden"
          >
            {/* Negative Pattern */}
            <div className={`border-l-4 border-red-500 p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">!</span>
                  <span className="text-white font-bold">
                    {pattern.macro_name}
                  </span>
                  <span className="text-slate-500 text-xs">
                    ({CATEGORY_LABELS[pattern.category]})
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${SEVERITY_BADGES[pattern.severity].className}`}
                >
                  {SEVERITY_BADGES[pattern.severity].label}
                </span>
              </div>

              {pattern.why_it_hurts && (
                <p className="text-slate-300 text-sm mt-2">
                  {pattern.why_it_hurts}
                </p>
              )}

              {pattern.evidence_quote && (
                <blockquote className="text-slate-400 text-sm mt-2 pl-3 border-l-2 border-red-600/50 italic">
                  &quot;{pattern.evidence_quote}&quot;
                </blockquote>
              )}

              {pattern.fix_suggestion && (
                <div className="mt-3 text-sm">
                  <span className="text-slate-500 font-semibold">FIX: </span>
                  <span className="text-slate-300">{pattern.fix_suggestion}</span>
                </div>
              )}
            </div>

            {/* Counter Pattern */}
            {pattern.counter && (
              <div className="border-l-4 border-green-500 p-4 bg-green-900/10">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#8594;</span>
                  <span className="text-slate-400 text-xs font-semibold">
                    COUNTER-PATTERN:
                  </span>
                  <span className="text-green-400 font-bold">
                    {pattern.counter.counter_name}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {pattern.counter.rationale}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NegativePatternsWithCounters;
