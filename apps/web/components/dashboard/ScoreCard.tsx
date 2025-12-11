'use client';

type Grade = 'Strong' | 'Developing' | 'Needs Work';

interface ScoreGrade {
  grade: Grade;
  icon: string;
  className: string;
}

function getScoreGrade(value: number, max: number): ScoreGrade {
  const percentage = (value / max) * 100;

  if (percentage >= 80) {
    return {
      grade: 'Strong',
      icon: '⚡',
      className: 'bg-yellow-500 text-black',
    };
  }
  if (percentage >= 60) {
    return {
      grade: 'Developing',
      icon: '◆',
      className: 'bg-slate-600 text-white border border-slate-500',
    };
  }
  return {
    grade: 'Needs Work',
    icon: '⚠️',
    className: 'bg-red-500 text-white',
  };
}

interface ScoreCardProps {
  dimension: string;
  value: number;
  max?: number;
  description?: string;
}

export function ScoreCard({
  dimension,
  value,
  max = 100,
  description,
}: ScoreCardProps) {
  const { grade, icon, className } = getScoreGrade(value, max);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <label className="text-slate-400 text-xs font-semibold uppercase">
        {dimension}
      </label>
      {description && (
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      )}
      <div className="flex justify-between items-center mt-2">
        <span className="text-white text-2xl font-bold">
          {value}
          <span className="text-slate-500 text-lg">/{max}</span>
        </span>
        <span className={`text-xs px-2 py-1 rounded font-semibold ${className}`}>
          {icon} {grade}
        </span>
      </div>
    </div>
  );
}

// Multi-score variant for displaying multiple dimensions
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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-white font-bold text-sm mb-3">{title}</h3>
      <div className="space-y-3">
        {scores.map((score) => {
          const max = score.max ?? 100;
          const { grade, icon, className } = getScoreGrade(score.value, max);

          return (
            <div key={score.dimension} className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">{score.dimension}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono">
                  {score.value}/{max}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${className}`}
                >
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
