'use client';

import { useState } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface MethodologyScore {
  name: string;
  score: number;
  color: string;
}

interface MethodologyAlignmentProps {
  // In production, these would come from call analysis data
  scores?: MethodologyScore[];
}

const DEFAULT_METHODOLOGIES: MethodologyScore[] = [
  { name: 'Challenger', score: 72, color: '#E51B23' },
  { name: 'SPIN', score: 68, color: '#FFDE59' },
  { name: 'Sandler', score: 61, color: '#4ADE80' },
  { name: 'MEDDIC', score: 54, color: '#60A5FA' },
  { name: 'Gap Selling', score: 58, color: '#A78BFA' },
  { name: 'Consultative', score: 65, color: '#F472B6' },
  { name: 'Solution Selling', score: 52, color: '#FB923C' },
  { name: 'Baseline', score: 40, color: '#666666' },
];

export function MethodologyAlignment({ scores = DEFAULT_METHODOLOGIES }: MethodologyAlignmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort by score descending
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const topThree = sortedScores.slice(0, 3);

  return (
    <section className="border border-[#333] rounded-lg px-6 py-4">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-anton text-lg uppercase tracking-wide text-[#B3B3B3]">
            Methodology Alignment
          </h2>
          <InfoTooltip content="Shows how your sales approach aligns with recognized methodologies. As your Human-First scores improve, alignment with proven frameworks increases." />
        </div>
        <span className="text-[#666] text-lg">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Summary Line (always visible) */}
      <div className="mt-2 text-sm text-[#B3B3B3]">
        Your calls index closest to:{' '}
        {topThree.map((m, i) => (
          <span key={m.name}>
            <span style={{ color: m.color }} className="font-medium">
              {m.name}
            </span>
            <span className="text-[#666]"> ({m.score}%)</span>
            {i < topThree.length - 1 && <span className="text-[#666]"> • </span>}
          </span>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Explanation */}
          <p className="text-sm text-[#777] max-w-xl">
            As your Human-First scores improve, your alignment with proven methodologies increases.
            The WTF Method serves as the foundation that makes other frameworks work better.
          </p>

          {/* Methodology Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sortedScores.map((methodology) => (
              <div
                key={methodology.name}
                className="bg-[#1A1A1A] border border-[#333] rounded-lg p-3 hover:border-[#555] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#999]">{methodology.name}</span>
                  <span
                    className="font-anton text-lg"
                    style={{ color: methodology.color }}
                  >
                    {methodology.score}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${methodology.score}%`,
                      backgroundColor: methodology.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Note about methodologies */}
          <div className="bg-[#0A0A0A] border border-[#222] rounded p-4">
            <p className="text-xs text-[#666] italic">
              These scores reflect how your conversational patterns align with each methodology's principles.
              WTF Method is the lens through which all analysis is performed - other frameworks are validation, not standards.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
