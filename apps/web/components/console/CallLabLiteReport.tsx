'use client';

import { useMemo } from 'react';
import { ConsoleMarkdownRenderer } from './ConsoleMarkdownRenderer';
import { parseLiteReportHeader } from '@/lib/call-lab/report-format';

interface CallLabLiteReportProps {
  content: string;
}

function LiteScoreBadge({ score, effectiveness }: { score: number; effectiveness: string }) {
  // Lite scores are on a 0–10 scale.
  const grade =
    effectiveness ||
    (score >= 8.5 ? 'Strong' : score >= 7 ? 'Solid' : score >= 5.5 ? 'Developing' : 'Needs Work');

  return (
    <div className="flex flex-col items-center justify-center bg-[#FFDE59] rounded-lg px-6 py-4 min-w-[120px] shrink-0">
      <span className="font-anton text-5xl text-black leading-none">
        {Number.isInteger(score) ? score : score.toFixed(1)}
        <span className="text-2xl">/10</span>
      </span>
      <span className="text-xs font-poppins font-semibold text-black uppercase tracking-wider mt-1">SCORE</span>
      <span className="text-xs font-poppins font-bold text-black mt-1 uppercase">{grade}</span>
    </div>
  );
}

export function CallLabLiteReport({ content }: CallLabLiteReportProps) {
  const { call, duration, score, effectiveness, dynamicsProfile, body } = useMemo(
    () => parseLiteReportHeader(content),
    [content],
  );

  return (
    <div className="space-y-8">
      {/* Styled Executive Header */}
      <div className="bg-[#1A1A1A] border-2 border-[#E51B23] p-6 rounded">
        <h2 className="font-anton text-xl text-[#E51B23] mb-4">📊 EXECUTIVE SUMMARY</h2>

        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="text-sm text-[#B3B3B3] space-y-1">
              <div><strong className="text-white">Call:</strong> {call || 'N/A'}</div>
              <div><strong className="text-white">Duration:</strong> {duration || 'N/A'}</div>
              {dynamicsProfile && (
                <div className="mt-2 p-2 bg-[#0a0a0a] rounded">
                  <span className="text-xs text-[#666]">DYNAMICS PROFILE</span>
                  <p className="text-[#FFDE59] font-bold">{dynamicsProfile}</p>
                </div>
              )}
            </div>
          </div>
          {score !== null && <LiteScoreBadge score={score} effectiveness={effectiveness} />}
        </div>
      </div>

      {/* Remaining report body, rendered faithfully as markdown */}
      <ConsoleMarkdownRenderer content={body} />
    </div>
  );
}
