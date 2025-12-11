'use client';

import { type MacroCategory } from '@wtf/patterns';

interface CallCardProps {
  call: {
    id: string;
    name: string;
    company?: string;
    date: string;
    score: number;
    top_positive_pattern?: {
      macro_name: string;
      category: MacroCategory;
    };
    top_negative_pattern?: {
      macro_name: string;
      category: MacroCategory;
    };
    next_step?: string;
  };
  onClick?: () => void;
}

function getCategoryColorClass(category: MacroCategory): string {
  const colors: Record<MacroCategory, string> = {
    connection: 'bg-[#FFDE59] text-black',
    diagnosis: 'bg-blue-500 text-white',
    control: 'bg-orange-500 text-white',
    activation: 'bg-[#E51B23] text-white',
  };
  return colors[category];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-[#FFDE59]';
  return 'text-[#E51B23]';
}

export function CallCard({ call, onClick }: CallCardProps) {
  return (
    <div
      className="bg-black border border-[#333] rounded-lg p-4 hover:border-[#E51B23] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-semibold">
            {call.name}
            {call.company && (
              <span className="text-[#B3B3B3]"> - {call.company}</span>
            )}
          </h3>
          <p className="text-[#666] text-xs mt-1">{call.date}</p>
        </div>
        <span className={`text-2xl font-bold ${getScoreColor(call.score)}`}>
          {call.score}
        </span>
      </div>

      {/* Patterns */}
      <div className="space-y-2 mb-3">
        {/* Positive Pattern */}
        {call.top_positive_pattern && (
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-[#FFDE59] text-sm font-medium">
              {call.top_positive_pattern.macro_name}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${getCategoryColorClass(call.top_positive_pattern.category)}`}
            >
              {call.top_positive_pattern.category}
            </span>
          </div>
        )}

        {/* Negative Pattern */}
        {call.top_negative_pattern && (
          <div className="flex items-center gap-2">
            <span className="text-[#E51B23] text-sm">!</span>
            <span className="text-[#B3B3B3] text-sm font-medium">
              {call.top_negative_pattern.macro_name}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${getCategoryColorClass(call.top_negative_pattern.category)}`}
            >
              {call.top_negative_pattern.category}
            </span>
          </div>
        )}
      </div>

      {/* Next Step */}
      {call.next_step && (
        <div className="border-t border-[#333] pt-2 mt-2">
          <span className="text-[#666] text-xs font-semibold">NEXT: </span>
          <span className="text-[#B3B3B3] text-xs">{call.next_step}</span>
        </div>
      )}
    </div>
  );
}

export default CallCard;
