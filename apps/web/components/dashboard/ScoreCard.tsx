'use client';

// ============================================
// TYPES
// ============================================

type Grade = 'Strong' | 'Developing' | 'Needs Work';

interface ScoreGrade {
  label: Grade;
  icon: string;
  className: string;
}

// ============================================
// HELPERS
// ============================================

function getScoreGrade(value: number, max: number): ScoreGrade {
  const percentage = (value / max) * 100;

  if (percentage >= 80) {
    return {
      label: 'Strong',
      icon: '⚡',
      className: 'bg-[#FFDE59] text-black',
    };
  }
  if (percentage >= 60) {
    return {
      label: 'Developing',
      icon: '◆',
      className: 'bg-[#4A90E2] text-white',
    };
  }
  return {
    label: 'Needs Work',
    icon: '⚠️',
    className: 'bg-[#E51B23] text-white',
  };
}

// ============================================
// SCORE CARD
// ============================================

interface ScoreCardProps {
  label: string;
  subtitle: string;
  value: number;
  maxValue?: number;
}

export function ScoreCard({
  label,
  subtitle,
  value,
  maxValue = 100,
}: ScoreCardProps) {
  const { label: gradeLabel, icon, className } = getScoreGrade(value, maxValue);

  return (
    <div className="bg-[#1A1A1A] border border-[#333] p-5">
      <div className="flex flex-col gap-1 mb-4">
        <span className="text-[11px] font-bold tracking-wide text-[#999]">
          {label}
        </span>
        <span className="text-[10px] text-[#666]">{subtitle}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-anton text-[48px] leading-none text-white">
          {value}
        </span>
        <span className="text-[24px] text-[#666]">/{maxValue}</span>
        <span className={`ml-auto text-[11px] font-bold px-3 py-1 rounded ${className}`}>
          {icon} {gradeLabel}
        </span>
      </div>
    </div>
  );
}

// ============================================
// MULTI SCORE CARD (for reference)
// ============================================

interface MultiScoreCardProps {
  title: string;
  scores: Array<{
    dimension: string;
    value: number;
    max?: number;
  }>;
}

export function MultiScoreCard({ title, scores }: MultiScoreCardProps) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] p-5">
      <h3 className="text-white font-bold text-sm mb-3">{title}</h3>
      <div className="space-y-3">
        {scores.map((score) => {
          const max = score.max ?? 100;
          const { icon, className } = getScoreGrade(score.value, max);

          return (
            <div key={score.dimension} className="flex justify-between items-center">
              <span className="text-[#B3B3B3] text-sm">{score.dimension}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono">
                  {score.value}/{max}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${className}`}>
                  {icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScoreCard;
