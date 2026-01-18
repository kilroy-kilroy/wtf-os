'use client';

interface CoachingNarrativeProps {
  narrative: string;
}

/**
 * Coaching Narrative (Derived Insight)
 *
 * Purpose: Translate patterns into human understanding
 *
 * Example: "Recent calls show strong rapport but delayed activation
 * caused by recurring Scenic Route and Soft Close Fade."
 *
 * Rules:
 * - No charts
 * - No scores
 * - This is interpretation, not measurement
 * - This is where concepts like Trust Velocity live, quietly, as language
 */
export function CoachingNarrative({ narrative }: CoachingNarrativeProps) {
  if (!narrative) {
    return null;
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#FFDE59]">💡</span>
        <h2 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider">
          Coaching Insight
        </h2>
      </div>

      <p className="text-white text-base leading-relaxed">
        {narrative}
      </p>
    </div>
  );
}

export default CoachingNarrative;
