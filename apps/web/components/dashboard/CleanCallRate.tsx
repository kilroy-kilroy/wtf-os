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
  if (percentage >= 60) return 'text-[#FFDE59]';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-[#E51B23]';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-[#FFDE59]';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-[#E51B23]';
}

export function CleanCallRate({ clean_count, total_count }: CleanCallRateProps) {
  const percentage =
    total_count > 0 ? Math.round((clean_count / total_count) * 100) : 0;
  const label = getCleanCallLabel(percentage);
  const color = getCleanCallColor(percentage);

  return (
    <div className="bg-black border border-[#E51B23] rounded-lg p-4">
      <h3 className="text-[#B3B3B3] text-xs font-semibold uppercase mb-2">
        CLEAN CALL RATE
      </h3>

      {total_count > 0 ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${color}`}>{percentage}%</span>
            <span className="text-[#666] text-sm">
              ({clean_count} of {total_count} calls)
            </span>
          </div>
          <p className="text-[#B3B3B3] text-sm mt-2">{label}</p>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-[#333] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-[#666] text-sm">No calls analyzed yet</p>
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
