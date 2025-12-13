'use client';

import { MacroPattern, MACRO_CATEGORIES } from '@/lib/macro-patterns';

interface NextCallFocusProps {
  pattern: MacroPattern;
  whyCostingDeals: string;
  correctiveMove: string;
  exampleLanguage?: string;
}

/**
 * Next Call Focus (Primary Command Block)
 *
 * Purpose: Tell the user what to fix on the very next call
 *
 * Rules:
 * - Exactly one pattern
 * - Always negative polarity
 * - Always behavioral
 * - This block visually dominates the page
 */
export function NextCallFocus({
  pattern,
  whyCostingDeals,
  correctiveMove,
  exampleLanguage,
}: NextCallFocusProps) {
  const categoryConfig = MACRO_CATEGORIES[pattern.category];

  return (
    <div className="bg-black border-2 border-[#E51B23] rounded-lg p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 rounded-full bg-[#E51B23] animate-pulse" />
        <span className="font-anton text-sm text-[#E51B23] uppercase tracking-wider">
          NEXT CALL FOCUS
        </span>
      </div>

      {/* Pattern Name - Large and Prominent */}
      <h2 className="font-anton text-3xl md:text-4xl text-white uppercase tracking-wide mb-2">
        {pattern.name}
      </h2>

      {/* Category Tag */}
      <div className="mb-6">
        <span
          className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded"
          style={{
            backgroundColor: categoryConfig.color,
            color: pattern.category === 'connection' ? '#000' : '#fff',
          }}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* Why This Pattern Is Costing You */}
      <div className="mb-6">
        <h3 className="font-anton text-sm text-[#666] uppercase tracking-wider mb-2">
          WHY THIS IS COSTING YOU
        </h3>
        <p className="text-[#B3B3B3] text-base leading-relaxed">
          {whyCostingDeals}
        </p>
      </div>

      {/* The Corrective Move */}
      <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 mb-4">
        <h3 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider mb-2">
          THE FIX
        </h3>
        <p className="text-white text-base leading-relaxed font-medium">
          {correctiveMove}
        </p>
      </div>

      {/* Optional Example Language */}
      {exampleLanguage && (
        <div className="mt-4">
          <h3 className="font-anton text-sm text-[#666] uppercase tracking-wider mb-2">
            EXAMPLE LANGUAGE
          </h3>
          <p className="text-[#FFDE59] text-base italic">
            "{exampleLanguage}"
          </p>
        </div>
      )}
    </div>
  );
}

export default NextCallFocus;
