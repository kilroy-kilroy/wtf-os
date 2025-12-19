'use client';

import Link from 'next/link';

interface FollowUpItem {
  callId: string;
  callName: string;
  riskNote: string;
  recommendedFollowUp: string;
}

interface FollowUpIntelligenceProps {
  items: FollowUpItem[];
}

/**
 * Follow-Up Intelligence
 *
 * Purpose: Protect deals after the conversation ends
 *
 * Triggered by: Weak or missing Activation & Close patterns
 *
 * Rules:
 * - Only appears when action is required
 * - No generic follow-up advice
 */
export function FollowUpIntelligence({ items }: FollowUpIntelligenceProps) {
  if (items.length === 0) {
    return null; // Only appears when action is required
  }

  return (
    <div className="bg-black border border-[#E51B23] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#333] bg-[#E51B23]/10">
        <div className="flex items-center gap-2">
          <span className="text-[#E51B23] text-lg">⚠</span>
          <h2 className="font-anton text-lg text-[#E51B23] uppercase tracking-wider">
            Follow-Up Required
          </h2>
        </div>
        <p className="text-[#B3B3B3] text-xs mt-1">
          These deals may be at risk based on weak activation patterns
        </p>
      </div>

      <div className="divide-y divide-[#222]">
        {items.map((item) => (
          <div key={item.callId} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-white font-medium">{item.callName}</h3>
              <Link
                href={`/call-lab/report/${item.callId}`}
                className="text-[#FFDE59] text-sm hover:text-white transition-colors"
              >
                View Call →
              </Link>
            </div>

            <div className="mb-3">
              <span className="text-[#666] text-xs uppercase tracking-wider">Risk:</span>
              <p className="text-[#E51B23] text-sm mt-1">{item.riskNote}</p>
            </div>

            <div className="bg-[#1A1A1A] border-l-2 border-[#FFDE59] p-3">
              <span className="text-[#666] text-xs uppercase tracking-wider">Recommended Action:</span>
              <p className="text-white text-sm mt-1">{item.recommendedFollowUp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FollowUpIntelligence;
