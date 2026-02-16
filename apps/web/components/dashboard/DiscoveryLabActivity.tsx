'use client';

import Link from 'next/link';

interface DiscoveryLabActivityProps {
  totalBriefs: number;
  liteBriefs: number;
  proBriefs: number;
  companiesResearched: number;
  prepToCallRate: number | null;
  prepAdvantage: number | null;
}

/**
 * Discovery Lab Activity (Prep Intelligence Summary)
 *
 * Purpose: Show Discovery Lab usage at a glance — briefs created,
 * companies researched, and the connection between prep and call performance.
 *
 * Rules:
 * - Four metrics max
 * - Prep Advantage only shown when enough linked pairs exist
 * - This is prep activity, not call analysis
 */
export function DiscoveryLabActivity({
  totalBriefs,
  liteBriefs,
  proBriefs,
  companiesResearched,
  prepToCallRate,
  prepAdvantage,
}: DiscoveryLabActivityProps) {
  const metrics = [
    {
      label: 'BRIEFS CREATED',
      value: totalBriefs.toString(),
      detail: totalBriefs > 0 ? `${liteBriefs} Lab · ${proBriefs} Pro` : null,
    },
    {
      label: 'COMPANIES RESEARCHED',
      value: companiesResearched.toString(),
      detail: null,
    },
    {
      label: 'PREP → CALL RATE',
      value: prepToCallRate !== null ? `${Math.round(prepToCallRate)}%` : '—',
      detail: prepToCallRate !== null ? 'Briefs linked to analyzed calls' : 'Link briefs to calls to track',
    },
    {
      label: 'PREP ADVANTAGE',
      value: prepAdvantage !== null ? `+${Math.round(prepAdvantage)}` : '—',
      detail: prepAdvantage !== null ? 'Score boost on prepped calls' : 'Needs 3+ linked calls',
      color: prepAdvantage !== null && prepAdvantage > 0 ? 'text-green-400' : undefined,
    },
  ];

  return (
    <div className="bg-black border border-[#333] rounded-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FFDE59]" />
          <h2 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wider">
            Discovery Lab
          </h2>
        </div>
        <Link
          href="/discovery-lab-pro"
          className="text-xs text-[#666] hover:text-white transition-colors uppercase tracking-wider"
        >
          New Brief →
        </Link>
      </div>

      {totalBriefs === 0 ? (
        <div className="text-center py-4">
          <p className="text-[#666] text-sm mb-3">
            No discovery briefs yet. Research your next prospect before the call.
          </p>
          <Link
            href="/discovery-lab-pro"
            className="inline-block bg-[#FFDE59] text-black px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#E5C84F] transition-colors"
          >
            Create First Brief
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className={`font-anton text-2xl ${metric.color || 'text-white'}`}>
                {metric.value}
              </div>
              <div className="text-[10px] text-[#666] uppercase tracking-wider mt-1">
                {metric.label}
              </div>
              {metric.detail && (
                <div className="text-[10px] text-[#555] mt-1">
                  {metric.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiscoveryLabActivity;
