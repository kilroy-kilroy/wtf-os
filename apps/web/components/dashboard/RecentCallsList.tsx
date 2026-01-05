'use client';

import Link from 'next/link';
import { MacroPattern, MACRO_CATEGORIES } from '@/lib/macro-patterns';

interface RecentCall {
  id: string;
  buyerName: string | null;
  companyName: string | null;
  date: string;
  score: number;
  highlightedPattern?: {
    pattern: MacroPattern;
    isPositive: boolean;
  };
  coachingNote?: string;
}

interface RecentCallsListProps {
  calls: RecentCall[];
}

/**
 * Recent Calls (Evidence Layer)
 *
 * Purpose: Connect insight to reality
 *
 * Rules:
 * - Shows 3 to 5 calls
 * - One macro pattern per call
 * - One-line coaching note
 * - View Call CTA
 * - No duplicate calls
 * - This is a drill-down, not analytics
 */
export function RecentCallsList({ calls }: RecentCallsListProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-[#FFDE59]';
    return 'text-[#E51B23]';
  };

  if (calls.length === 0) {
    return (
      <div className="bg-black border border-[#333] rounded-lg p-6">
        <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
          Recent Calls
        </h2>
        <p className="text-[#666] text-sm mb-4">No calls analyzed yet.</p>
        <Link
          href="/call-lab"
          className="inline-block bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
        >
          Analyze Your First Call
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-black border border-[#333] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
        <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
          Recent Calls
        </h2>
        <span className="text-xs text-[#666]">{calls.length} CALLS</span>
      </div>

      <div className="divide-y divide-[#222]">
        {calls.slice(0, 5).map((call) => (
          <div key={call.id} className="p-4 hover:bg-[#111] transition-colors">
            {/* Call Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">
                  {call.buyerName || 'Unknown'}
                  {call.companyName && (
                    <span className="text-[#666]"> - {call.companyName}</span>
                  )}
                </h3>
                <p className="text-[#666] text-xs mt-1">{call.date}</p>
              </div>
              <span className={`font-anton text-2xl ${getScoreColor(call.score)}`}>
                {call.score}
              </span>
            </div>

            {/* Highlighted Pattern */}
            {call.highlightedPattern && (
              <div className="flex items-center gap-2 mb-2">
                <span className={call.highlightedPattern.isPositive ? 'text-green-400' : 'text-[#E51B23]'}>
                  {call.highlightedPattern.isPositive ? '+' : '−'}
                </span>
                <span className="text-white text-sm">
                  {call.highlightedPattern.pattern.name}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: MACRO_CATEGORIES[call.highlightedPattern.pattern.category].color,
                    color: call.highlightedPattern.pattern.category === 'connection' ? '#000' : '#fff',
                  }}
                >
                  {call.highlightedPattern.pattern.category}
                </span>
              </div>
            )}

            {/* Coaching Note */}
            {call.coachingNote && (
              <p className="text-[#B3B3B3] text-sm mb-3">
                {call.coachingNote}
              </p>
            )}

            {/* View Call CTA */}
            <Link
              href={`/call-lab/report/${call.id}`}
              className="inline-block text-[#FFDE59] text-sm hover:text-white transition-colors"
            >
              View Call →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentCallsList;
