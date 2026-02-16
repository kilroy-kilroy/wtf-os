'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ActivityRecord {
  id: string;
  toolType: 'call_lab' | 'discovery_lab' | 'visibility_lab' | 'assessment';
  toolLabel: string;
  version: 'lab' | 'pro' | null;
  title: string;
  subtitle: string | null;
  score: number | null;
  status: string;
  createdAt: string;
  href: string;
}

interface ActivityHistoryProps {
  records: ActivityRecord[];
}

const TOOL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'call_lab', label: 'Call Lab' },
  { key: 'discovery_lab', label: 'Discovery Lab' },
  { key: 'visibility_lab', label: 'Visibility Lab' },
  { key: 'assessment', label: 'Assessment' },
] as const;

const TOOL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  call_lab: { bg: 'bg-[#E51B23]/10', text: 'text-[#E51B23]', dot: 'bg-[#E51B23]' },
  discovery_lab: { bg: 'bg-[#FFDE59]/10', text: 'text-[#FFDE59]', dot: 'bg-[#FFDE59]' },
  visibility_lab: { bg: 'bg-[#00D4FF]/10', text: 'text-[#00D4FF]', dot: 'bg-[#00D4FF]' },
  assessment: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
};

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-400';
  if (score >= 50) return 'text-[#FFDE59]';
  return 'text-[#E51B23]';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Activity History
 *
 * Purpose: Give users a single, filterable record of ALL tool usage
 * so they have a reason to log in and review their history.
 *
 * Rules:
 * - Shows ALL records, not just recent 5
 * - Filterable by tool type
 * - Each record links to its full report
 * - Grouped by date for scanability
 * - Version badge (Lab/Pro) where applicable
 * - Score displayed where applicable
 */
export function ActivityHistory({ records }: ActivityHistoryProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filtered = activeFilter === 'all'
    ? records
    : records.filter((r) => r.toolType === activeFilter);

  // Group by date
  const grouped = filtered.reduce<Record<string, ActivityRecord[]>>((acc, record) => {
    const dateKey = formatDate(record.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});

  const dateGroups = Object.entries(grouped);

  // Counts per tool type for filter badges
  const counts: Record<string, number> = { all: records.length };
  for (const r of records) {
    counts[r.toolType] = (counts[r.toolType] || 0) + 1;
  }

  return (
    <div className="bg-black border border-[#333] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#333]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
            Activity History
          </h2>
          <span className="text-xs text-[#666]">
            {filtered.length} {filtered.length === 1 ? 'RECORD' : 'RECORDS'}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {TOOL_FILTERS.map((filter) => {
            const count = counts[filter.key] || 0;
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-[#1A1A1A] text-[#666] hover:text-white hover:bg-[#222]'
                }`}
              >
                {filter.label}
                {count > 0 && (
                  <span className={`ml-1.5 ${isActive ? 'text-[#666]' : 'text-[#444]'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[#666] text-sm mb-4">
            {activeFilter === 'all'
              ? 'No activity yet. Use any of the tools to start building your history.'
              : `No ${TOOL_FILTERS.find((f) => f.key === activeFilter)?.label} records yet.`}
          </p>
          {activeFilter === 'all' && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/call-lab"
                className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
              >
                Analyze a Call
              </Link>
              <Link
                href="/discovery-lab-pro"
                className="bg-[#FFDE59] text-black px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#E5C84F] transition-colors"
              >
                Prep a Call
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#222]">
          {dateGroups.map(([dateLabel, dateRecords]) => (
            <div key={dateLabel}>
              {/* Date Group Header */}
              <div className="px-6 py-2 bg-[#0A0A0A] border-b border-[#1A1A1A]">
                <span className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">
                  {dateLabel}
                </span>
              </div>

              {/* Records in this date group */}
              {dateRecords.map((record) => {
                const colors = TOOL_COLORS[record.toolType] || TOOL_COLORS.call_lab;

                return (
                  <Link
                    key={record.id}
                    href={record.href}
                    className="block px-6 py-4 hover:bg-[#111] transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Tool indicator + details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Tool color dot */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-medium truncate">
                              {record.title}
                            </span>
                            {record.version && (
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  record.version === 'pro'
                                    ? 'bg-[#FFDE59] text-black'
                                    : 'bg-[#333] text-[#999]'
                                }`}
                              >
                                {record.version === 'pro' ? 'PRO' : 'LAB'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`${colors.text} font-semibold uppercase tracking-wider`}>
                              {record.toolLabel}
                            </span>
                            {record.subtitle && (
                              <>
                                <span className="text-[#333]">/</span>
                                <span className="text-[#666] truncate">{record.subtitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score + time + arrow */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {record.score !== null && (
                          <span className={`font-anton text-xl ${getScoreColor(record.score)}`}>
                            {Math.round(record.score)}
                          </span>
                        )}
                        <span className="text-[#555] text-xs whitespace-nowrap">
                          {formatTime(record.createdAt)}
                        </span>
                        <span className="text-[#333] group-hover:text-[#FFDE59] transition-colors">
                          &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityHistory;
