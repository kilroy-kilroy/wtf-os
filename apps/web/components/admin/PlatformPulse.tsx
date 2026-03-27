'use client';

import { useState } from 'react';
import type { PlatformPulse as PulseData } from '@/lib/admin/get-admin-dashboard-data';

interface PlatformPulseProps {
  pulse: PulseData;
}

export function PlatformPulse({ pulse }: PlatformPulseProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-700/50 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-white uppercase tracking-wider">
            Platform Pulse
          </h2>
          <span className="text-xs text-slate-400">
            {pulse.totalUsers} users &middot; {pulse.signupsThisWeek} new this week
          </span>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Users" value={pulse.totalUsers} />
            <Stat label="Free" value={pulse.freeUsers} />
            <Stat label="Pro" value={pulse.proUsers} />
            <Stat label="Coaching" value={pulse.coachingClients} />
            <Stat label="Signups (week)" value={pulse.signupsThisWeek} />
            <Stat label="Signups (month)" value={pulse.signupsThisMonth} />
            <Stat label="Call Analyses (week)" value={pulse.callAnalysesThisWeek} />
            <Stat label="Discovery Reports (week)" value={pulse.discoveryReportsThisWeek} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
