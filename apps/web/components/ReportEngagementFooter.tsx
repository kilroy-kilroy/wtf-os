'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export type ToolKey = 'call-lab-instant' | 'visibility' | 'discovery' | 'biz-dev' | 'growthos';

const TOOLS: Record<ToolKey, { label: string; entry: string; blurb: string }> = {
  'call-lab-instant': { label: 'Call Lab', entry: '/call-lab-instant', blurb: 'Score a sales call instantly' },
  'visibility': { label: 'Visibility Lab', entry: '/visibility-lab', blurb: 'See how AI sees your brand' },
  'discovery': { label: 'Discovery Lab', entry: '/discovery-lab', blurb: 'Research any prospect' },
  'biz-dev': { label: 'Biz Dev Assessment', entry: '/wtf-biz-dev-assessment', blurb: 'Grade your growth engine' },
  'growthos': { label: 'GrowthOS', entry: '/growthos', blurb: 'Assess your agency' },
};

export default function ReportEngagementFooter({
  currentTool,
  email,
  reportId,
  reportUrl,
}: {
  currentTool: ToolKey;
  email?: string | null;
  reportId?: string;
  reportUrl?: string;
}) {
  const [authed, setAuthed] = useState(false);

  // Hide the account CTA for users who already have a session.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthed(!!data.user)).catch(() => {});
  }, []);

  // Best-effort re-engagement ping (once we know the lead's email).
  useEffect(() => {
    if (!email || !reportId) return;
    fetch('/api/lead-tools/revisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tool: currentTool, reportId, reportUrl }),
    }).catch(() => {});
  }, [email, reportId, reportUrl, currentTool]);

  const current = TOOLS[currentTool];
  const others = (Object.keys(TOOLS) as ToolKey[]).filter((k) => k !== currentTool && k !== 'growthos').slice(0, 3);
  const signupHref = `/login?mode=signup${email ? `&email=${encodeURIComponent(email)}` : ''}&next=/labs`;

  return (
    <div className="max-w-5xl mx-auto px-4 mt-12 mb-8 font-poppins">
      {!authed && (
        <div className="bg-[#1A1A1A] border border-[#333333] p-8 relative mb-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23]" />
          <h3 className="font-anton text-xl text-white mb-2">SAVE THIS REPORT — CREATE YOUR FREE ACCOUNT</h3>
          <p className="text-[#B3B3B3] text-sm mb-5">
            Keep all your reports in one place, track changes over time, and unlock the full platform.
          </p>
          <Link
            href={signupHref}
            className="inline-block bg-[#E51B23] text-white py-3 px-6 font-anton text-sm font-bold tracking-[2px] hover:bg-[#FFDE59] hover:text-black transition-all"
          >
            [ CREATE FREE ACCOUNT ]
          </Link>
        </div>
      )}

      <div className="bg-[#111] border border-[#333333] p-8">
        <h3 className="font-anton text-lg text-white mb-1">RUN ANOTHER ANALYSIS</h3>
        <p className="text-[#B3B3B3] text-sm mb-5">Keep the momentum going.</p>
        <Link
          href={current.entry}
          className="inline-block border border-[#FFDE59] text-[#FFDE59] py-2.5 px-5 font-anton text-sm tracking-[1px] hover:bg-[#FFDE59] hover:text-black transition-all mb-6"
        >
          [ RUN {current.label.toUpperCase()} AGAIN ]
        </Link>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {others.map((k) => (
            <Link
              key={k}
              href={TOOLS[k].entry}
              className="block border border-[#333333] p-4 hover:border-[#FFDE59] transition-colors group"
            >
              <div className="font-anton text-sm text-white group-hover:text-[#FFDE59]">{TOOLS[k].label}</div>
              <div className="text-[#888888] text-xs mt-1">{TOOLS[k].blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
