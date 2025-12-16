'use client';

type PatternCategory = 'connection' | 'diagnosis' | 'control' | 'activation';
type PatternStrength = 'STRONG' | 'MEDIUM' | 'DEVELOPING';

interface DetectedPositivePattern {
  macro_id: string;
  macro_name: string;
  category: PatternCategory;
  strength: PatternStrength;
  evidence_quote?: string;
  why_it_worked?: string;
}

interface PositivePatternsSectionProps {
  patterns: DetectedPositivePattern[];
  total_calls?: number;
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

const STRENGTH_BADGES: Record<PatternStrength, { label: string; className: string }> = {
  STRONG: { label: 'Strong', className: 'bg-yellow-500 text-black' },
  MEDIUM: { label: 'Solid', className: 'bg-slate-600 text-white' },
  DEVELOPING: { label: 'Emerging', className: 'bg-slate-700 text-slate-300' },
};

/**
 * PositivePatternsSection Component
 *
 * Displays the positive patterns (strengths) detected in a call.
 * This is the "What Worked" section - celebrating wins before critiques.
 *
 * Design principle: "Acknowledge wins before weaknesses"
 * - Shows what the rep is doing RIGHT
 * - Groups by category for easy scanning
 * - Includes evidence quotes to validate the insight
 */
export function PositivePatternsSection({
  patterns,
  total_calls,
}: PositivePatternsSectionProps) {
  if (patterns.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-white font-bold text-xl mb-4">WHAT WORKED</h2>
        <p className="text-slate-500">No positive patterns detected yet.</p>
      </div>
    );
  }

  // Group patterns by category
  const byCategory = patterns.reduce(
    (acc, pattern) => {
      const cat = pattern.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(pattern);
      return acc;
    },
    {} as Record<PatternCategory, DetectedPositivePattern[]>
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-xl">WHAT WORKED</h2>
        <span className="text-yellow-400 font-bold">
          {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} detected
        </span>
      </div>

      <div className="space-y-4">
        {(Object.keys(byCategory) as PatternCategory[]).map((category) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category].replace('border-', 'bg-')}`} />
              <span className="text-slate-400 text-xs font-semibold uppercase">
                {CATEGORY_LABELS[category]}
              </span>
            </div>

            {byCategory[category].map((pattern) => (
              <div
                key={pattern.macro_id}
                className={`bg-slate-900/50 border-l-4 ${CATEGORY_COLORS[pattern.category]} p-4 rounded-r`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">&#9889;</span>
                    <span className="text-white font-bold">
                      {pattern.macro_name}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${STRENGTH_BADGES[pattern.strength].className}`}
                  >
                    {STRENGTH_BADGES[pattern.strength].label}
                  </span>
                </div>

                {pattern.why_it_worked && (
                  <p className="text-slate-300 text-sm mt-2">
                    {pattern.why_it_worked}
                  </p>
                )}

                {pattern.evidence_quote && (
                  <blockquote className="text-slate-400 text-sm mt-2 pl-3 border-l-2 border-slate-600 italic">
                    &quot;{pattern.evidence_quote}&quot;
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PositivePatternsSection;
