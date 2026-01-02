'use client';

type Trend = 'rising' | 'stable' | 'falling';

interface PatternStat {
  macro_name: string;
  frequency: number;
  total_calls: number;
  trend?: Trend;
}

interface MomentumSectionProps {
  top_positive_pattern?: PatternStat;
  top_negative_pattern?: PatternStat;
  next_call_focus?: string;
}

function getTrendLabel(trend: Trend): string {
  const labels: Record<Trend, string> = {
    rising: 'Getting stronger',
    stable: 'Consistent strength',
    falling: 'Needs attention',
  };
  return labels[trend];
}

function getTrendIcon(trend: Trend): string {
  const icons: Record<Trend, string> = {
    rising: '↗',
    stable: '→',
    falling: '↘',
  };
  return icons[trend];
}

function getTrendColor(trend: Trend): string {
  const colors: Record<Trend, string> = {
    rising: 'text-green-400',
    stable: 'text-[#B3B3B3]',
    falling: 'text-orange-400',
  };
  return colors[trend];
}

export function MomentumSection({
  top_positive_pattern,
  top_negative_pattern,
  next_call_focus,
}: MomentumSectionProps) {
  return (
    <div className="bg-black border border-[#E51B23] rounded-lg p-6">
      <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
        MOMENTUM
      </h2>

      <div className="space-y-4">
        {/* Biggest Win - NEW */}
        {top_positive_pattern && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#FFDE59] p-4 rounded-r">
            <span className="text-[#666] text-xs font-semibold">
              BIGGEST WIN
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#FFDE59] font-bold text-lg">
                {top_positive_pattern.macro_name}
              </span>
              <span className="text-[#FFDE59]">⚡</span>
            </div>
            <p className="text-[#B3B3B3] text-sm mt-1">
              Appearing in {top_positive_pattern.frequency}/
              {top_positive_pattern.total_calls} calls (
              {Math.round(
                (top_positive_pattern.frequency /
                  top_positive_pattern.total_calls) *
                  100
              )}
              %)
            </p>
            {top_positive_pattern.trend && (
              <p
                className={`text-sm mt-1 ${getTrendColor(top_positive_pattern.trend)}`}
              >
                {getTrendIcon(top_positive_pattern.trend)}{' '}
                {getTrendLabel(top_positive_pattern.trend)}
              </p>
            )}
          </div>
        )}

        {/* Biggest Missed Move */}
        {top_negative_pattern && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#E51B23] p-4 rounded-r">
            <span className="text-[#666] text-xs font-semibold">
              BIGGEST MISSED MOVE
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#E51B23] font-bold text-lg">
                {top_negative_pattern.macro_name}
              </span>
            </div>
            <p className="text-[#B3B3B3] text-sm mt-1">
              Appearing in {top_negative_pattern.frequency}/
              {top_negative_pattern.total_calls} calls (
              {Math.round(
                (top_negative_pattern.frequency /
                  top_negative_pattern.total_calls) *
                  100
              )}
              %)
            </p>
          </div>
        )}

        {/* Next Call Focus */}
        {next_call_focus && (
          <div className="bg-[#0A0A0A] border-l-4 border-blue-500 p-4 rounded-r">
            <span className="text-[#666] text-xs font-semibold">
              NEXT CALL FOCUS
            </span>
            <p className="text-white font-medium mt-1">{next_call_focus}</p>
          </div>
        )}

        {/* Empty State */}
        {!top_positive_pattern && !top_negative_pattern && !next_call_focus && (
          <div className="text-center py-8">
            <p className="text-[#666]">
              Analyze some calls to see your momentum
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MomentumSection;
