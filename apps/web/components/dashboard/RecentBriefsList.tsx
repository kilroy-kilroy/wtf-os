'use client';

import Link from 'next/link';

interface DiscoveryBriefSummary {
  id: string;
  targetCompany: string;
  targetContactName: string | null;
  targetContactTitle: string | null;
  version: string;
  createdAt: string;
  hasLinkedCall: boolean;
}

interface RecentBriefsListProps {
  briefs: DiscoveryBriefSummary[];
}

/**
 * Recent Briefs List (Prep Evidence Layer)
 *
 * Purpose: Show recent Discovery Lab briefs with their status —
 * whether they've been linked to a call or are still pending.
 *
 * Rules:
 * - Shows up to 5 briefs
 * - Version badge (Lite/Pro)
 * - Status: "Called" if linked to a call report, "Prepped" if not
 * - Click through to the brief or linked call
 */
export function RecentBriefsList({ briefs }: RecentBriefsListProps) {
  if (briefs.length === 0) {
    return null;
  }

  return (
    <div className="bg-black border border-[#333] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
        <h2 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider">
          Recent Briefs
        </h2>
        <span className="text-xs text-[#666]">{briefs.length} BRIEFS</span>
      </div>

      <div className="divide-y divide-[#222]">
        {briefs.map((brief) => (
          <div key={brief.id} className="p-4 hover:bg-[#111] transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-medium truncate">
                    {brief.targetCompany}
                  </h3>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      brief.version === 'pro'
                        ? 'bg-[#FFDE59] text-black'
                        : 'bg-[#333] text-[#999]'
                    }`}
                  >
                    {brief.version}
                  </span>
                </div>
                {(brief.targetContactName || brief.targetContactTitle) && (
                  <p className="text-[#666] text-xs truncate">
                    {brief.targetContactName}
                    {brief.targetContactName && brief.targetContactTitle && ' · '}
                    {brief.targetContactTitle}
                  </p>
                )}
                <p className="text-[#555] text-xs mt-1">{brief.createdAt}</p>
              </div>

              <div className="flex items-center gap-3 ml-3">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                    brief.hasLinkedCall
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-[#333]/50 text-[#666]'
                  }`}
                >
                  {brief.hasLinkedCall ? 'Called' : 'Prepped'}
                </span>
                <Link
                  href={`/discovery-lab/report/${brief.id}`}
                  className="text-[#FFDE59] text-sm hover:text-white transition-colors whitespace-nowrap"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentBriefsList;
