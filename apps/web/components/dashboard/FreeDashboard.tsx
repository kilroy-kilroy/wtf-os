'use client';

import Link from 'next/link';
import { ActivityHistory, type ActivityRecord } from './ActivityHistory';

interface FreeDashboardProps {
  records: ActivityRecord[];
  userName: string;
}

export function FreeDashboard({ records, userName }: FreeDashboardProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {userName ? `Welcome back, ${userName}` : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Your SalesOS toolkit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ToolCard
          name="Call Lab"
          description="Analyze a sales call transcript"
          href="/call-lab"
          color="#E51B23"
        />
        <ToolCard
          name="Discovery Lab"
          description="Research a prospect before the call"
          href="/discovery-lab"
          color="#FFDE59"
        />
        <ToolCard
          name="Visibility Lab"
          description="Audit your online presence"
          href="/visibility-lab"
          color="#00D4FF"
        />
      </div>

      {records.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          <ActivityHistory records={records.slice(0, 5)} />
        </section>
      )}

      <div className="border border-slate-700/50 rounded-lg p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <h3 className="text-white font-medium mb-2">Go Pro</h3>
        <p className="text-slate-400 text-sm mb-4">
          {records.length > 0
            ? `You've run ${records.length} ${records.length === 1 ? 'analysis' : 'analyses'}. Upgrade to Pro to unlock pattern tracking, coaching insights, and longitudinal trends.`
            : 'Upgrade to Pro for deeper call analysis, pattern tracking, and personalized coaching.'}
        </p>
        <Link
          href="/upgrade"
          className="inline-block px-4 py-2 rounded-md bg-[#E51B23] text-white text-sm font-medium hover:bg-[#E51B23]/80 transition-colors"
        >
          See Pro Plans
        </Link>
      </div>
    </div>
  );
}

function ToolCard({ name, description, href, color }: {
  name: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="border border-slate-700/50 rounded-lg p-5 hover:border-slate-600/50 transition-colors group"
    >
      <div
        className="w-2 h-2 rounded-full mb-3"
        style={{ backgroundColor: color }}
      />
      <h3 className="text-white font-medium group-hover:text-slate-200">{name}</h3>
      <p className="text-slate-400 text-xs mt-1">{description}</p>
    </Link>
  );
}
