'use client';

import { MacroPattern, MACRO_CATEGORIES } from '@/lib/macro-patterns';

interface MomentumSignalsProps {
  mostImproved?: {
    pattern: MacroPattern;
    changeSinceLastPeriod: number;  // percentage points
    explanation: string;
  };
  mostRegressed?: {
    pattern: MacroPattern;
    changeSinceLastPeriod: number;
    explanation: string;
  };
  hasEnoughData: boolean;
}

/**
 * Momentum Signals
 *
 * Purpose: Show change, not totals
 *
 * Rules:
 * - Only shown when there is enough historical data
 * - No scores without context
 */
export function MomentumSignals({
  mostImproved,
  mostRegressed,
  hasEnoughData,
}: MomentumSignalsProps) {
  if (!hasEnoughData) {
    return (
      <div className="bg-black border border-[#333] rounded-lg p-6">
        <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
          Momentum Signals
        </h2>
        <p className="text-[#666] text-sm">
          Analyze more calls to see momentum data. Requires at least 5 calls across 2 periods.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black border border-[#333] rounded-lg p-6">
      <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-6">
        Momentum Signals
      </h2>

      <div className="space-y-4">
        {/* Most Improved */}
        {mostImproved && (
          <div className="bg-[#0A0A0A] border-l-4 border-green-500 p-4 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-lg">↑</span>
                <span className="font-anton text-white uppercase">
                  {mostImproved.pattern.name}
                </span>
              </div>
              <span className="text-green-400 font-bold">
                +{mostImproved.changeSinceLastPeriod}%
              </span>
            </div>
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
              style={{
                backgroundColor: MACRO_CATEGORIES[mostImproved.pattern.category].color,
                color: mostImproved.pattern.category === 'connection' ? '#000' : '#fff',
              }}
            >
              {MACRO_CATEGORIES[mostImproved.pattern.category].label}
            </span>
            <p className="text-[#B3B3B3] text-sm">
              {mostImproved.explanation}
            </p>
          </div>
        )}

        {/* Most Regressed */}
        {mostRegressed && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#E51B23] p-4 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#E51B23] text-lg">↓</span>
                <span className="font-anton text-white uppercase">
                  {mostRegressed.pattern.name}
                </span>
              </div>
              <span className="text-[#E51B23] font-bold">
                {mostRegressed.changeSinceLastPeriod}%
              </span>
            </div>
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
              style={{
                backgroundColor: MACRO_CATEGORIES[mostRegressed.pattern.category].color,
                color: mostRegressed.pattern.category === 'connection' ? '#000' : '#fff',
              }}
            >
              {MACRO_CATEGORIES[mostRegressed.pattern.category].label}
            </span>
            <p className="text-[#B3B3B3] text-sm">
              {mostRegressed.explanation}
            </p>
          </div>
        )}

        {!mostImproved && !mostRegressed && (
          <p className="text-[#666] text-sm">
            No significant momentum changes detected this period.
          </p>
        )}
      </div>
    </div>
  );
}

export default MomentumSignals;
