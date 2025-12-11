'use client';

// ============================================
// TYPES
// ============================================

export interface FocusArea {
  pattern_id: string;
  pattern_name: string;
  reason: string;
  practice_steps: string[];
  progress: number;
  calls_this_week: number;
  target_calls: number;
}

interface WeeklyFocusProps {
  focus: FocusArea;
  weekLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

export function WeeklyFocus({ focus, weekLabel }: WeeklyFocusProps) {
  // Generate week label if not provided
  const defaultWeekLabel = (() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    return `WEEK OF ${formatDate(startOfWeek)}-${endOfWeek.getDate()}`;
  })();

  const progressPercent = focus.target_calls > 0
    ? Math.round((focus.calls_this_week / focus.target_calls) * 100)
    : 0;

  return (
    <section className="bg-[#1A1A1A] border-2 border-[#E51B23] p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-anton text-xl tracking-wide text-white">
          THIS WEEK&apos;S FOCUS
        </h2>
        <div className="bg-[#0A0A0A] border border-[#333] px-3 py-1.5 text-[9px] font-bold tracking-wider text-[#999]">
          {weekLabel || defaultWeekLabel}
        </div>
      </div>

      {/* Focus Card */}
      <div className="flex flex-col gap-5">
        <h3 className="font-anton text-2xl tracking-wide text-[#FFDE59]">
          {focus.pattern_name}
        </h3>

        {/* Why */}
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#999] block mb-2">WHY:</span>
          <p className="text-[13px] leading-relaxed text-white">{focus.reason}</p>
        </div>

        {/* How to Practice */}
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#999] block mb-2">HOW TO PRACTICE:</span>
          <ol className="list-decimal pl-5 flex flex-col gap-2">
            {focus.practice_steps.map((step, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-[#999]">{step}</li>
            ))}
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button className="bg-[#E51B23] border-2 border-[#E51B23] text-white py-3.5 px-6 font-anton text-[12px] tracking-wider hover:bg-[#FF2930] hover:border-[#FF2930] hover:-translate-y-0.5 transition-all w-full text-center">
            📹 WATCH TRAINING (3:47)
          </button>
          <button className="bg-transparent border-2 border-[#333] text-white py-3.5 px-6 font-anton text-[12px] tracking-wider hover:border-white hover:-translate-y-0.5 transition-all w-full text-center">
            📝 DOWNLOAD SCRIPT
          </button>
        </div>

        {/* Progress */}
        <div className="border-t border-[#333] pt-4">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] font-bold tracking-wider text-[#999]">PRACTICE PROGRESS</span>
            <span className="text-[11px] font-semibold text-white">{focus.calls_this_week} of {focus.target_calls} calls</span>
          </div>
          <div className="h-1.5 bg-[#0A0A0A] border border-[#333] overflow-hidden">
            <div
              className="h-full bg-[#FFDE59] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default WeeklyFocus;
