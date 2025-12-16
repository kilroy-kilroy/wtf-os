'use client';

import { useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  example_phrase: string;
  time_to_implement: string;
  related_pattern_id: string;
}

interface QuickWinsProps {
  wins: QuickWin[];
}

// ============================================
// COMPONENT
// ============================================

export function QuickWins({ wins }: QuickWinsProps) {
  const [completedWins, setCompletedWins] = useState<Set<string>>(new Set());

  const handleMarkComplete = (winId: string) => {
    setCompletedWins(prev => new Set(prev).add(winId));
  };

  if (wins.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#1A1A1A] border-2 border-[#FFDE59] p-6">
      <h2 className="font-anton text-xl tracking-wide text-white">⚡ QUICK WINS</h2>
      <p className="text-[11px] text-[#666] tracking-wide mt-2">Fix these in your next call</p>

      <div className="flex flex-col gap-4 mt-4">
        {wins.map(win => {
          const isCompleted = completedWins.has(win.id);

          return (
            <div
              key={win.id}
              className={`bg-[#0A0A0A] border border-[#333] p-5 transition-all ${
                isCompleted ? 'opacity-50' : 'hover:border-[#FFDE59]'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-[14px] font-bold text-[#FFDE59] flex-1">{win.title}</h3>
                <span className="text-[10px] text-[#999] bg-[#1A1A1A] px-2.5 py-1 border border-[#333] whitespace-nowrap ml-3">
                  {win.time_to_implement}
                </span>
              </div>

              {/* Description */}
              <p className="text-[12px] leading-relaxed text-[#999] mb-4">{win.description}</p>

              {/* Example */}
              <div className="bg-[#1A1A1A] border-l-[3px] border-[#FFDE59] px-4 py-3 mb-4">
                <div className="text-[9px] font-bold tracking-wider text-[#FFDE59] mb-1.5">SAY THIS:</div>
                <div className="text-[13px] leading-relaxed text-white italic">&ldquo;{win.example_phrase}&rdquo;</div>
              </div>

              {/* Action */}
              {!isCompleted ? (
                <button
                  onClick={() => handleMarkComplete(win.id)}
                  className="bg-transparent border-2 border-[#FFDE59] text-[#FFDE59] py-3 px-6 font-anton text-[11px] tracking-wider hover:bg-[#FFDE59] hover:text-black transition-all w-full"
                >
                  GOT IT ✓
                </button>
              ) : (
                <div className="bg-[#FFDE59] text-black py-3 font-anton text-[11px] tracking-wider text-center">
                  ✓ LEARNED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default QuickWins;
