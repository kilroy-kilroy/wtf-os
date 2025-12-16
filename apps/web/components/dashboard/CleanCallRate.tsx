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
    <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[10px] font-bold tracking-wider text-[#999] mb-1">
          CLEAN CALL RATE
        </div>
        <div className="text-[11px] text-[#666] tracking-wide">Calls without major friction</div>
      </div>

      {totalCalls > 0 ? (
        <div className="flex flex-col gap-3">
          {/* Value */}
          <div className="flex items-baseline gap-2">
            <span className="font-anton text-[56px] leading-none text-white">
              {percentage}%
            </span>
          </div>

          {/* Detail */}
          <div className="text-[11px] text-[#999]">
            ({cleanCalls} of {totalCalls} calls)
          </div>

          {/* Progress bar - NO border-radius */}
          <div className="h-1.5 bg-[#0A0A0A] border border-[#333] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(percentage)}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
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
