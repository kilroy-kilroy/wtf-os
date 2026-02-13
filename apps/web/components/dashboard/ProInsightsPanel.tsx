'use client';

interface OneThingEntry {
  callId: string;
  behavior: string;
  callDate: string;
}

interface ProInsightsPanelProps {
  oneThingTracker: OneThingEntry[];
  avgProScores: {
    label: string;
    value: number;
  }[];
  totalProReports: number;
}

/**
 * Pro Insights Panel (Call Lab Pro Aggregation)
 *
 * Purpose: Surface aggregate intelligence from Call Lab Pro reports
 * that is only visible per-report today — "The One Thing" tracker
 * and performance dimension averages.
 *
 * Rules:
 * - Only shown when user has Pro reports
 * - "The One Thing" shows last 3-5 recommendations
 * - Performance scores show averaged dimensions across all Pro reports
 * - This is trend intelligence, not single-call data
 */
export function ProInsightsPanel({
  oneThingTracker,
  avgProScores,
  totalProReports,
}: ProInsightsPanelProps) {
  if (totalProReports === 0) {
    return null;
  }

  return (
    <div className="bg-black border border-[#333] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#E51B23]" />
            <h2 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider">
              Pro Insights
            </h2>
          </div>
          <span className="text-xs text-[#666]">
            {totalProReports} PRO {totalProReports === 1 ? 'REPORT' : 'REPORTS'}
          </span>
        </div>
      </div>

      {/* The One Thing Tracker */}
      {oneThingTracker.length > 0 && (
        <div className="px-6 py-4 border-b border-[#222]">
          <h3 className="font-anton text-xs text-[#E51B23] uppercase tracking-wider mb-3">
            THE ONE THING — Recent Focus Areas
          </h3>
          <div className="space-y-3">
            {oneThingTracker.map((entry, i) => (
              <div
                key={entry.callId}
                className={`flex items-start gap-3 ${i > 0 ? 'opacity-60' : ''}`}
              >
                <div className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-[#666]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {entry.behavior}
                  </p>
                  <p className="text-[#555] text-xs mt-0.5">{entry.callDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Dimension Averages */}
      {avgProScores.length > 0 && (
        <div className="px-6 py-4">
          <h3 className="font-anton text-xs text-[#666] uppercase tracking-wider mb-3">
            Performance Averages
          </h3>
          <div className="space-y-2">
            {avgProScores.map((score) => (
              <div key={score.label} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#B3B3B3] truncate">
                      {score.label}
                    </span>
                    <span className="text-xs text-white font-medium ml-2">
                      {score.value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(score.value / 10) * 100}%`,
                        backgroundColor:
                          score.value >= 7
                            ? '#4ade80'
                            : score.value >= 5
                            ? '#FFDE59'
                            : '#E51B23',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProInsightsPanel;
