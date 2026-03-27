'use client';

import type { ActionItem } from '@/lib/admin/get-admin-dashboard-data';
import Link from 'next/link';

interface ActionQueueProps {
  items: ActionItem[];
}

const TYPE_CONFIG: Record<ActionItem['type'], { icon: string; color: string }> = {
  friday_response: { icon: '5', color: 'bg-[#E51B23]' },
  client_inactive: { icon: '!', color: 'bg-yellow-500' },
  new_analysis: { icon: 'A', color: 'bg-[#00D4FF]' },
  new_signup: { icon: '+', color: 'bg-green-500' },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActionQueue({ items }: ActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-8 text-center">
        <p className="text-slate-400 text-sm">Nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const config = TYPE_CONFIG[item.type];
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 border border-slate-700/50 rounded-lg px-4 py-3 hover:border-slate-600/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-7 h-7 rounded-full ${config.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}
              >
                {config.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  <span className="font-medium">{item.clientName}</span>
                  <span className="text-slate-400"> — {item.description}</span>
                </p>
                <p className="text-xs text-slate-500">{timeAgo(item.timestamp)}</p>
              </div>
            </div>
            <Link
              href={item.actionUrl}
              className="shrink-0 px-3 py-1.5 rounded-md bg-slate-700 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
            >
              {item.actionLabel}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
