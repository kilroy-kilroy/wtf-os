'use client';

import { useState } from 'react';

interface FollowUpQuestion {
  id: string;
  zone: string;
  triggerReason: string;
  question: string;
  type: 'select' | 'number' | 'text' | 'scale';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  unlocks: string;
}

interface FollowUpInsight {
  id: string;
  zone: string;
  title: string;
  body: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  metric?: { label: string; value: string; color: string };
}

export function FollowUpQuestionsSection({
  questions,
  assessmentId,
  existingInsights,
}: {
  questions: FollowUpQuestion[];
  assessmentId: string;
  existingInsights?: FollowUpInsight[];
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [insights, setInsights] = useState<FollowUpInsight[] | null>(existingInsights || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If we already have insights, show them instead of questions
  if (insights && insights.length > 0) {
    return <FollowUpInsightsDisplay insights={insights} />;
  }

  if (!questions || questions.length === 0) return null;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/growthos/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, answers }),
      });

      const result = await res.json();
      if (result.success) {
        setInsights(result.data.followUpInsights);
      } else {
        setError(result.message || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#00D4FF]/5 to-slate-800/50 border border-[#00D4FF]/20 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-8 rounded-full bg-[#00D4FF]" />
        <h2 className="text-lg font-bold text-white">Unlock Deeper Insights</h2>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Based on your scores, we have {questions.length} follow-up questions that will unlock
        significantly deeper analysis. Each question takes seconds to answer.
      </p>

      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.id} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <p className="text-sm font-semibold text-white mb-1">{q.question}</p>
            <p className="text-xs text-[#00D4FF]/70 mb-3">Unlocks: {q.unlocks}</p>

            {q.type === 'select' && q.options && (
              <div className="space-y-1.5">
                {q.options.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                      answers[q.id] === opt.value
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-white'
                        : 'border-slate-600/50 bg-slate-700/30 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={answers[q.id] === opt.value}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      className="w-3.5 h-3.5 mr-3 accent-[#00D4FF]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'scale' && (
              <div>
                {q.helpText && <p className="text-xs text-slate-500 mb-2">{q.helpText}</p>}
                <div className="flex gap-2">
                  {Array.from({ length: (q.max || 5) - (q.min || 1) + 1 }, (_, i) => (q.min || 1) + i).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        answers[q.id] === val
                          ? 'border-[#00D4FF] bg-[#00D4FF]/20 text-[#00D4FF]'
                          : 'border-slate-500 bg-slate-700/80 text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q.type === 'number' && (
              <input
                type="number"
                placeholder={q.placeholder}
                min={q.min}
                max={q.max}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-slate-500">{answeredCount}/{questions.length} answered</p>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="px-6 py-3 rounded-xl bg-[#00D4FF] text-slate-900 font-bold text-sm hover:shadow-lg hover:shadow-[#00D4FF]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Analyzing...' : 'Unlock Deep Dive'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}
    </div>
  );
}

function FollowUpInsightsDisplay({ insights }: { insights: FollowUpInsight[] }) {
  const severityStyles: Record<string, { bg: string; border: string; titleColor: string }> = {
    critical: { bg: 'bg-red-500/5', border: 'border-red-500/20', titleColor: 'text-red-400' },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', titleColor: 'text-amber-400' },
    info: { bg: 'bg-slate-500/5', border: 'border-slate-500/20', titleColor: 'text-slate-300' },
    positive: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', titleColor: 'text-emerald-400' },
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-8 rounded-full bg-[#00D4FF]" />
        <h2 className="text-lg font-bold text-white">Deep Dive Insights</h2>
      </div>
      <div className="space-y-4">
        {insights.map((insight) => {
          const style = severityStyles[insight.severity] || severityStyles.info;
          return (
            <div key={insight.id} className={`${style.bg} border ${style.border} rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${style.titleColor}`}>
                  {insight.title}
                </h3>
                {insight.metric && (
                  <span className="text-sm font-bold" style={{ color: insight.metric.color }}>
                    {insight.metric.value}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300">{insight.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LTVSection({ ltv }: {
  ltv: {
    avgClientValue: number;
    avgClientLifetimeMonths: number;
    ltv: number;
    estimatedCAC: number;
    ltvCacRatio: number;
    ltvCacAssessment: string;
    ltvCacColor: string;
  };
}) {
  function fmtCurrency(amount: number): string {
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
    return '$' + Math.round(amount);
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-white mb-5">Unit Economics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{fmtCurrency(ltv.avgClientValue)}</p>
          <p className="text-xs text-slate-500">Avg Monthly Value</p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{ltv.avgClientLifetimeMonths}mo</p>
          <p className="text-xs text-slate-500">Avg Client Lifetime</p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#00D4FF]">{fmtCurrency(ltv.ltv)}</p>
          <p className="text-xs text-slate-500">Client LTV</p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: ltv.ltvCacColor }}>{ltv.ltvCacRatio}x</p>
          <p className="text-xs text-slate-500">LTV:CAC Ratio</p>
        </div>
      </div>
      <div className="bg-slate-700/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ltv.ltvCacColor }} />
          <p className="text-sm text-slate-300">{ltv.ltvCacAssessment}</p>
        </div>
        <p className="text-xs text-slate-500">
          Estimated CAC: {fmtCurrency(ltv.estimatedCAC)} (based on your lead sources, volume, and close rate)
        </p>
      </div>
    </div>
  );
}
