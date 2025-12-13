'use client';

import { useState } from 'react';
import {
  MACRO_PATTERNS,
  MACRO_CATEGORIES,
  MacroCategory,
  MacroPattern,
} from '@/lib/macro-patterns';

interface PatternDataItem {
  patternId: string;
  frequency: number;      // How many calls showed this pattern
  totalCalls: number;     // Total calls in period
  trend: 'up' | 'down' | 'stable';
  representativeQuote?: string;
  coachingNote?: string;
}

interface PatternIntelligenceGridProps {
  patternData: PatternDataItem[];
  totalCalls: number;
}

/**
 * Pattern Intelligence (Core Diagnostic)
 *
 * Purpose: Expose the real shape of the user's selling behavior
 *
 * Rules:
 * - Only the 18 canonical macro patterns, grouped by category
 * - Each pattern shows: polarity indicator, frequency, trend, expandable details
 * - Every pattern appears once and only once
 * - No strengths vs weaknesses lists
 * - Sorting is by frequency within category
 * - Patterns are facts, not judgments
 */
export function PatternIntelligenceGrid({
  patternData,
  totalCalls,
}: PatternIntelligenceGridProps) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  const categories: MacroCategory[] = ['connection', 'diagnosis', 'control', 'activation'];

  // Create a map for quick lookup
  const dataMap = new Map(patternData.map((d) => [d.patternId, d]));

  // Get pattern data or defaults
  const getPatternData = (pattern: MacroPattern): PatternDataItem => {
    return dataMap.get(pattern.id) || {
      patternId: pattern.id,
      frequency: 0,
      totalCalls,
      trend: 'stable' as const,
    };
  };

  // Sort patterns by frequency within each category
  const getPatternsByCategory = (category: MacroCategory) => {
    const patterns = MACRO_PATTERNS.filter((p) => p.category === category);
    return patterns.sort((a, b) => {
      const aData = getPatternData(a);
      const bData = getPatternData(b);
      return bData.frequency - aData.frequency;
    });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-400">↑</span>;
      case 'down':
        return <span className="text-[#E51B23]">↓</span>;
      default:
        return <span className="text-[#666]">→</span>;
    }
  };

  const getPolarityIndicator = (polarity: 'positive' | 'negative') => {
    return polarity === 'positive' ? (
      <span className="text-green-400 text-lg">+</span>
    ) : (
      <span className="text-[#E51B23] text-lg">−</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
          Pattern Intelligence
        </h2>
        <span className="text-xs text-[#666]">18 CANONICAL PATTERNS</span>
      </div>

      {categories.map((category) => {
        const categoryConfig = MACRO_CATEGORIES[category];
        const patterns = getPatternsByCategory(category);

        return (
          <div key={category} className="bg-black border border-[#333] rounded-lg overflow-hidden">
            {/* Category Header */}
            <div
              className="px-4 py-3 border-b border-[#333]"
              style={{ borderLeftWidth: 4, borderLeftColor: categoryConfig.color }}
            >
              <span className="font-anton text-sm uppercase tracking-wider" style={{ color: categoryConfig.color }}>
                {categoryConfig.label}
              </span>
            </div>

            {/* Patterns List */}
            <div className="divide-y divide-[#222]">
              {patterns.map((pattern) => {
                const data = getPatternData(pattern);
                const isExpanded = expandedPattern === pattern.id;
                const frequencyPercent = totalCalls > 0 ? Math.round((data.frequency / totalCalls) * 100) : 0;

                return (
                  <div key={pattern.id}>
                    {/* Pattern Row */}
                    <button
                      onClick={() => setExpandedPattern(isExpanded ? null : pattern.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#111] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {getPolarityIndicator(pattern.polarity)}
                        <span className="text-white text-sm font-medium">
                          {pattern.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Frequency */}
                        <span className="text-[#B3B3B3] text-sm">
                          {data.frequency}/{totalCalls}
                          <span className="text-[#666] ml-1">({frequencyPercent}%)</span>
                        </span>

                        {/* Trend */}
                        {getTrendIcon(data.trend)}

                        {/* Expand Icon */}
                        <span className="text-[#666] text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 py-4 bg-[#0A0A0A] border-t border-[#222]">
                        <p className="text-[#B3B3B3] text-sm mb-3">
                          {pattern.description}
                        </p>

                        {data.representativeQuote && (
                          <div className="mb-3">
                            <span className="text-[#666] text-xs uppercase tracking-wider">Quote:</span>
                            <p className="text-[#FFDE59] text-sm italic mt-1">
                              "{data.representativeQuote}"
                            </p>
                          </div>
                        )}

                        {data.coachingNote && (
                          <div className="bg-[#1A1A1A] border-l-2 border-[#FFDE59] p-3">
                            <span className="text-[#666] text-xs uppercase tracking-wider">Coaching Note:</span>
                            <p className="text-white text-sm mt-1">
                              {data.coachingNote}
                            </p>
                          </div>
                        )}

                        {pattern.polarity === 'negative' && pattern.correctiveMove && (
                          <div className="mt-3 bg-[#1A1A1A] border-l-2 border-[#E51B23] p-3">
                            <span className="text-[#666] text-xs uppercase tracking-wider">Corrective Move:</span>
                            <p className="text-white text-sm mt-1">
                              {pattern.correctiveMove}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PatternIntelligenceGrid;
