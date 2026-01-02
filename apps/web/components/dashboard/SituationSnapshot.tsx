'use client';

import { useState } from 'react';

interface SituationSnapshotProps {
  callsInRange: number;
  overallScore: number;
  trendVsPrevious: number; // positive = improving, negative = declining
  timeRange?: string;
}

/**
 * Situation Snapshot (Quick Context)
 *
 * Purpose: Quick grounding without vanity metrics
 *
 * Rules:
 * - Three numbers max
 * - Every metric has a tooltip explaining how it is derived from macro patterns
 * - No pattern names here
 */
export function SituationSnapshot({
  callsInRange,
  overallScore,
  trendVsPrevious,
  timeRange = 'Last 30 Days',
}: SituationSnapshotProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const metrics = [
    {
      id: 'calls',
      label: 'CALLS ANALYZED',
      value: callsInRange,
      format: (v: number) => v.toString(),
      tooltip: 'Total number of calls analyzed in the selected time period.',
    },
    {
      id: 'score',
      label: 'CALL QUALITY',
      value: overallScore,
      format: (v: number) => v.toString(),
      suffix: '/100',
      tooltip: 'Aggregate score derived from positive pattern frequency minus negative pattern frequency across all 18 macro patterns.',
    },
    {
      id: 'trend',
      label: 'VS PREVIOUS',
      value: trendVsPrevious,
      format: (v: number) => (v >= 0 ? `+${v}` : v.toString()),
      suffix: '%',
      color: trendVsPrevious >= 0 ? 'text-green-400' : 'text-[#E51B23]',
      tooltip: 'Change in call quality score compared to the previous equivalent time period.',
    },
  ];

  return (
    <div className="bg-black border border-[#333] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-anton text-xs text-[#666] uppercase tracking-wider">
          {timeRange}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="relative text-center cursor-help"
            onMouseEnter={() => setActiveTooltip(metric.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <div className={`font-anton text-2xl md:text-3xl ${metric.color || 'text-white'}`}>
              {metric.format(metric.value)}
              {metric.suffix && (
                <span className="text-sm text-[#666]">{metric.suffix}</span>
              )}
            </div>
            <div className="text-[10px] text-[#666] uppercase tracking-wider mt-1">
              {metric.label}
            </div>

            {/* Tooltip */}
            {activeTooltip === metric.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#1A1A1A] border border-[#333] rounded text-xs text-[#B3B3B3] text-left z-10">
                {metric.tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#333]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SituationSnapshot;
