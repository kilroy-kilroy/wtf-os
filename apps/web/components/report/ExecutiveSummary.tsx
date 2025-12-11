'use client';

interface ExecutiveSummaryProps {
  overall_score: number;
  dynamics_profile: string;
  summary_text: string;
  call_info?: {
    rep_name?: string;
    prospect_company?: string;
    duration?: string;
    date?: string;
  };
}

function getScoreGrade(score: number): { label: string; color: string } {
  if (score >= 8) return { label: 'Strong', color: 'text-green-400' };
  if (score >= 6) return { label: 'Solid', color: 'text-yellow-400' };
  if (score >= 4) return { label: 'Developing', color: 'text-orange-400' };
  return { label: 'Needs Work', color: 'text-red-400' };
}

/**
 * ExecutiveSummary Component
 *
 * Provides a quick snapshot of call performance for busy reps.
 *
 * Structure:
 * - Score + Grade (visual prominence)
 * - Sales Dynamics Profile (one-liner)
 * - Summary paragraph (emotional arc + strategic insight)
 * - Call metadata (optional)
 */
export function ExecutiveSummary({
  overall_score,
  dynamics_profile,
  summary_text,
  call_info,
}: ExecutiveSummaryProps) {
  const { label, color } = getScoreGrade(overall_score);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">EXECUTIVE SUMMARY</h2>
          {call_info && (
            <div className="text-slate-400 text-sm mt-1 space-x-3">
              {call_info.prospect_company && (
                <span>{call_info.prospect_company}</span>
              )}
              {call_info.date && <span>{call_info.date}</span>}
              {call_info.duration && <span>{call_info.duration}</span>}
            </div>
          )}
        </div>

        {/* Score Badge */}
        <div className="text-right">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${color}`}>
              {overall_score.toFixed(1)}
            </span>
            <span className="text-slate-500 text-xl">/10</span>
          </div>
          <span className={`text-sm font-semibold ${color}`}>{label}</span>
        </div>
      </div>

      {/* Dynamics Profile */}
      <div className="bg-slate-900/50 border-l-4 border-yellow-500 p-3 rounded-r">
        <span className="text-slate-500 text-xs font-semibold">
          SALES DYNAMICS PROFILE
        </span>
        <p className="text-yellow-400 font-bold mt-1">{dynamics_profile}</p>
      </div>

      {/* Summary Text */}
      <p className="text-slate-300 leading-relaxed">{summary_text}</p>
    </div>
  );
}

export default ExecutiveSummary;
