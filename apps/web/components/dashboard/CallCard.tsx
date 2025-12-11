'use client';

import { isValidPattern } from './PatternIntelligence';

// ============================================
// TYPES
// ============================================

type Category = "connection" | "diagnosis" | "control" | "activation";

interface DetectedPattern {
  id: string;
  name: string;
  category: Category;
}

interface CallCardProps {
  call: {
    id: string;
    buyer_name: string;
    company?: string;
    date: string;
    score: number;
    top_positive_pattern: DetectedPattern | null;
    top_negative_pattern: DetectedPattern | null;
    next_step?: string;
  };
  onClick?: () => void;
}

// ============================================
// HELPERS
// ============================================

function getCategoryColor(category: Category): string {
  const colors: Record<Category, string> = {
    connection: "#FFDE59",
    diagnosis: "#4A90E2",
    control: "#FF8C42",
    activation: "#E51B23",
  };
  return colors[category];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-[#FFDE59]';
  return 'text-[#E51B23]';
}

// ============================================
// COMPONENT
// ============================================

export function CallCard({ call, onClick }: CallCardProps) {
  // Validate patterns
  const validPositive = call.top_positive_pattern && isValidPattern(call.top_positive_pattern.name)
    ? call.top_positive_pattern
    : null;
  const validNegative = call.top_negative_pattern && isValidPattern(call.top_negative_pattern.name)
    ? call.top_negative_pattern
    : null;

  return (
    <div
      className="bg-[#1A1A1A] border border-[#333] p-5 hover:border-[#E51B23] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-bold text-base">
            {call.buyer_name}
            {call.company && (
              <span className="font-normal text-[#999]"> - {call.company}</span>
            )}
          </h3>
          <p className="text-[#666] text-[11px] mt-1">{call.date}</p>
        </div>
        <span className={`font-anton text-[32px] leading-none ${getScoreColor(call.score)}`}>
          {call.score}
        </span>
      </div>

      {/* Patterns */}
      <div className="space-y-2 mb-4">
        {/* Positive Pattern */}
        {validPositive && (
          <div
            className="flex items-center gap-2 p-2 bg-[#0A0A0A] border-l-[3px] border-[#FFDE59]"
          >
            <span className="text-[#FFDE59] font-bold text-sm">✓</span>
            <span className="text-white text-[11px] font-semibold flex-1">
              {validPositive.name}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide px-2 py-0.5 rounded"
              style={{
                backgroundColor: getCategoryColor(validPositive.category),
                color: validPositive.category === 'connection' ? '#000' : '#FFF'
              }}
            >
              {validPositive.category.toUpperCase()}
            </span>
          </div>
        )}

        {/* Negative Pattern */}
        {validNegative && (
          <div
            className="flex items-center gap-2 p-2 bg-[#0A0A0A] border-l-[3px] border-[#E51B23]"
          >
            <span className="text-[#E51B23] font-bold text-sm">!</span>
            <span className="text-white text-[11px] font-semibold flex-1">
              {validNegative.name}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide px-2 py-0.5 rounded"
              style={{
                backgroundColor: getCategoryColor(validNegative.category),
                color: validNegative.category === 'connection' ? '#000' : '#FFF'
              }}
            >
              {validNegative.category.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Next Step */}
      {call.next_step && (
        <div className="text-[11px] text-[#999]">
          <span className="font-bold text-[#E51B23]">NEXT:</span> {call.next_step}
        </div>
      )}
    </div>
  );
}

export default CallCard;
