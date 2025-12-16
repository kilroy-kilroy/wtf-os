'use client';

import Link from 'next/link';
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

export function CallCard({ call }: CallCardProps) {
  // Validate patterns
  const validPositive = call.top_positive_pattern && isValidPattern(call.top_positive_pattern.name)
    ? call.top_positive_pattern
    : null;
  const validNegative = call.top_negative_pattern && isValidPattern(call.top_negative_pattern.name)
    ? call.top_negative_pattern
    : null;

  const handleGenerateEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement email generation
    console.log('Generate email for call:', call.id);
  };

  return (
    <Link
      href={`/call-lab/report/${call.id}`}
      className="block bg-[#1A1A1A] border-2 border-[#333] p-6 hover:border-[#E51B23] hover:-translate-y-0.5 transition-all cursor-pointer no-underline"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-base font-bold text-white leading-tight">
            {call.buyer_name}
            {call.company && (
              <span className="font-normal text-[#666]"> — {call.company}</span>
            )}
          </h3>
          <p className="text-[11px] text-[#666] tracking-wide mt-1.5">{call.date}</p>
        </div>
        <span className={`font-anton text-[40px] leading-none ${getScoreColor(call.score)}`}>
          {call.score}
        </span>
      </div>

      {/* Patterns */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Positive Pattern */}
        {validPositive && (
          <div className="flex items-center gap-2.5 p-2.5 bg-[#0A0A0A] border-l-[3px] border-[#FFDE59]">
            <span className="text-[#FFDE59] font-bold text-base w-5 text-center">✓</span>
            <span className="text-white text-[12px] font-semibold flex-1">
              {validPositive.name}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide px-2.5 py-1"
              style={{
                backgroundColor: getCategoryColor(validPositive.category),
                color: '#000000'
              }}
            >
              {validPositive.category.toUpperCase()}
            </span>
          </div>
        )}

        {/* Negative Pattern */}
        {validNegative && (
          <div className="flex items-center gap-2.5 p-2.5 bg-[#0A0A0A] border-l-[3px] border-[#E51B23]">
            <span className="text-[#E51B23] font-bold text-base w-5 text-center">!</span>
            <span className="text-white text-[12px] font-semibold flex-1">
              {validNegative.name}
            </span>
            <span
              className="text-[9px] font-bold tracking-wide px-2.5 py-1"
              style={{
                backgroundColor: getCategoryColor(validNegative.category),
                color: '#000000'
              }}
            >
              {validNegative.category.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Next Step & Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#333]">
        {call.next_step && (
          <div className="text-[12px] text-[#999] leading-relaxed">
            <span className="font-bold tracking-wide text-[#E51B23]">NEXT:</span> {call.next_step}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3" onClick={e => e.preventDefault()}>
          <button
            onClick={handleGenerateEmail}
            className="flex-1 bg-[#0A0A0A] border border-[#333] text-white py-2.5 px-4 text-[10px] font-semibold tracking-wide hover:bg-[#E51B23] hover:border-[#E51B23] transition-all text-center"
          >
            📧 GENERATE EMAIL
          </button>
          <Link
            href={`/call-lab/report/${call.id}`}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-[#0A0A0A] border border-[#333] text-white py-2.5 px-4 text-[10px] font-semibold tracking-wide hover:bg-[#E51B23] hover:border-[#E51B23] transition-all text-center no-underline"
          >
            📄 FULL REPORT
          </Link>
        </div>
      </div>

      {/* Click Hint */}
      <div className="pt-3 mt-3 border-t border-[#333]">
        <span className="text-[10px] font-bold tracking-wider text-[#666]">
          CLICK FOR FULL ANALYSIS →
        </span>
      </div>
    </Link>
  );
}

export default CallCard;
