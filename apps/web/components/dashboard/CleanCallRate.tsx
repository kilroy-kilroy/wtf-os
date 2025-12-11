'use client';

// ============================================
// TYPES
// ============================================

interface CleanCallRateProps {
  percentage: number;
  cleanCalls: number;
  totalCalls: number;
}

// ============================================
// HELPERS
// ============================================

function getCleanCallLabel(percentage: number): string {
  if (percentage >= 80) return 'Consistently clean execution';
  if (percentage >= 60) return 'Mostly solid, some friction';
  if (percentage >= 40) return 'Inconsistent - needs focus';
  return 'High friction rate - priority fix needed';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-[#FFDE59]';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-[#E51B23]';
}

// ============================================
// COMPONENT
// ============================================

export function CleanCallRate({ percentage, cleanCalls, totalCalls }: CleanCallRateProps) {
  const label = getCleanCallLabel(percentage);

  return (
    <div className="bg-[#1A1A1A] border border-[#333] p-5">
      <div className="flex flex-col gap-1 mb-4">
        <span className="text-[11px] font-bold tracking-wide text-[#999]">
          CLEAN CALL RATE
        </span>
        <span className="text-[10px] text-[#666]">Calls without major friction</span>
      </div>

      {totalCalls > 0 ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-anton text-[48px] leading-none text-white">
              {percentage}%
            </span>
            <span className="text-[12px] text-[#999]">
              ({cleanCalls} of {totalCalls} calls)
            </span>
          </div>
          <div className="text-[11px] text-[#666] mb-2">{label}</div>

          {/* Progress bar */}
          <div className="h-1 bg-[#333] rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(percentage)}`}
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
 * A call is "clean" if it has no HIGH severity negative patterns
 */
export function calculateCleanCallRate(calls: Array<{ hasHighSeverityIssue: boolean }>): {
  cleanCalls: number;
  totalCalls: number;
  percentage: number;
} {
  const cleanCalls = calls.filter(c => !c.hasHighSeverityIssue).length;
  const totalCalls = calls.length;
  const percentage = totalCalls > 0 ? Math.round((cleanCalls / totalCalls) * 100) : 0;

  return { cleanCalls, totalCalls, percentage };
}

export default CleanCallRate;
