'use client';

import Link from 'next/link';
import { MacroPattern } from '@/lib/macro-patterns';
import { NextCallFocus } from './NextCallFocus';
import { ActivityHistory, type ActivityRecord } from './ActivityHistory';

interface PatternSummary {
  pattern: MacroPattern;
  frequency: number;
  totalCalls: number;
  isPositive: boolean;
}

interface ProDashboardProps {
  userName: string;
  focusPattern: MacroPattern | null;
  focusWhyCostingDeals: string;
  focusCorrectiveMove: string;
  records: ActivityRecord[];
  callCount: number;
  avgScore: number;
  scoreTrend: 'improving' | 'declining' | 'stable';
  topPatterns: PatternSummary[];
  hasCallLabPro: boolean;
  hasDiscoveryLabPro: boolean;
  hasVisibilityLabPro: boolean;
}

export function ProDashboard({
  userName,
  focusPattern,
  focusWhyCostingDeals,
  focusCorrectiveMove,
  records,
  callCount,
  avgScore,
  scoreTrend,
  topPatterns,
  hasCallLabPro,
  hasDiscoveryLabPro,
  hasVisibilityLabPro,
}: ProDashboardProps) {
  const trendIcon = scoreTrend === 'improving' ? '\u2191' : scoreTrend === 'declining' ? '\u2193' : '\u2192';
  const trendColor = scoreTrend === 'improving' ? 'text-green-400' : scoreTrend === 'declining' ? 'text-[#E51B23]' : 'text-slate-400';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {userName ? `Welcome back, ${userName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your SalesOS Pro dashboard</p>
      </div>

      {focusPattern && (
        <NextCallFocus
          pattern={focusPattern}
          whyCostingDeals={focusWhyCostingDeals}
          correctiveMove={focusCorrectiveMove}
        />
      )}

      <section className="border border-slate-700/50 rounded-lg p-5">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Last 30 Days
        </h2>
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <p className="text-2xl font-bold text-white">{callCount}</p>
            <p className="text-xs text-slate-400">Calls Analyzed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{Math.round(avgScore * 10)}</p>
            <p className="text-xs text-slate-400">Avg Score</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${trendColor}`}>{trendIcon}</p>
            <p className="text-xs text-slate-400">Trend</p>
          </div>
        </div>

        {topPatterns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topPatterns.map((p) => (
              <span
                key={p.pattern.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.isPositive
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-[#E51B23]/10 text-[#E51B23]'
                }`}
              >
                {p.pattern.name}
                <span className="text-slate-500">{p.frequency}/{p.totalCalls}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Recent Activity
        </h2>
        {records.length > 0 ? (
          <ActivityHistory records={records.slice(0, 8)} />
        ) : (
          <div className="border border-slate-700/50 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-sm">No activity yet. Run your first analysis to get started.</p>
            <div className="flex justify-center gap-3 mt-4">
              {hasCallLabPro && (
                <Link href="/call-lab-pro" className="px-4 py-2 rounded-md bg-[#E51B23] text-white text-sm font-medium">
                  Call Lab Pro
                </Link>
              )}
              {hasDiscoveryLabPro && (
                <Link href="/discovery-lab-pro" className="px-4 py-2 rounded-md bg-[#FFDE59] text-black text-sm font-medium">
                  Discovery Lab Pro
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
