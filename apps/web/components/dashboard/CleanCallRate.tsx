'use client';

interface DetectedPattern {
  macro_id: string;
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CallData {
  id: string;
  detected_negative_patterns?: DetectedPattern[];
}

interface CleanCallRateProps {
  clean_count: number;
  total_count: number;
}

/**
 * CleanCallRate Component
 *
 * Replaces the confusing "Red Flag Frequency" metric.
 *
 * OLD (confusing):
 *   RED FLAG FREQUENCY
 *   Your strongest skill: 3
 *   (Lower is better)
 *
 * NEW (clear):
 *   CLEAN CALL RATE
 *   8 out of 12 calls (67%)
 *   No major friction detected
 */

function getCleanCallLabel(percentage: number): string {
  if (percentage >= 80) return 'Consistently clean execution';
  if (percentage >= 60) return 'Mostly solid, some friction';
  if (percentage >= 40) return 'Inconsistent - needs focus';
  return 'High friction rate - priority fix needed';
}

function getCleanCallColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function CleanCallRate({ clean_count, total_count }: CleanCallRateProps) {
  const percentage =
    total_count > 0 ? Math.round((clean_count / total_count) * 100) : 0;
  const label = getCleanCallLabel(percentage);
  const color = getCleanCallColor(percentage);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-slate-400 text-xs font-semibold uppercase mb-2">
        CLEAN CALL RATE
      </h3>

      {total_count > 0 ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${color}`}>{percentage}%</span>
            <span className="text-slate-400 text-sm">
              ({clean_count} of {total_count} calls)
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-2">{label}</p>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 80
                  ? 'bg-green-500'
                  : percentage >= 60
                    ? 'bg-yellow-500'
                    : percentage >= 40
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-slate-500 text-sm">No calls analyzed yet</p>
      )}
    </div>
  );
}

/**
 * Helper function to calculate clean call rate from call data
 *
 * A call is "clean" if it has no HIGH severity negative patterns
 */
export function calculateCleanCallRate(calls: CallData[]): {
  clean_count: number;
  total_count: number;
} {
  const cleanCalls = calls.filter((call) => {
    const hasHighSeverityIssues = call.detected_negative_patterns?.some(
      (p) => p.severity === 'HIGH'
    );
    return !hasHighSeverityIssues;
  });

  return {
    clean_count: cleanCalls.length,
    total_count: calls.length,
  };
}

export default CleanCallRate;
