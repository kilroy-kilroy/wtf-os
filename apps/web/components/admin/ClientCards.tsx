'use client';

import type { ClientCard } from '@/lib/admin/get-admin-dashboard-data';
import Link from 'next/link';

interface ClientCardsProps {
  cards: ClientCard[];
}

const FRIDAY_STATUS_CONFIG: Record<ClientCard['fridayStatus'], { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'text-green-400' },
  pending: { label: 'Not yet', color: 'text-slate-400' },
  overdue: { label: 'Overdue', color: 'text-[#E51B23]' },
  not_required: { label: 'N/A', color: 'text-slate-500' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ClientCardItem({ card }: { card: ClientCard }) {
  const fridayConfig = FRIDAY_STATUS_CONFIG[card.fridayStatus];
  const isInactive = card.daysSinceLastLogin !== null && card.daysSinceLastLogin >= 7;

  return (
    <div
      className={`border rounded-lg p-5 ${
        isInactive ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700/50'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-medium">{card.name}</h3>
          <p className="text-xs text-slate-400">{card.programName}</p>
        </div>
        <Link
          href={`/admin/impersonate/${card.userId}`}
          className="text-xs text-[#00D4FF] hover:underline"
          target="_blank"
        >
          View as client
        </Link>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Last activity</span>
          <span className={isInactive ? 'text-yellow-400' : 'text-slate-300'}>
            {card.lastActivity
              ? `${card.daysSinceLastLogin === 0 ? 'Today' : `${card.daysSinceLastLogin}d ago`}`
              : 'Never logged in'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">5-Minute Friday</span>
          <span className={fridayConfig.color}>{fridayConfig.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Enrolled</span>
          <span className="text-slate-300">{formatDate(card.enrolledAt)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
        {card.fridayStatus === 'submitted' && (
          <Link
            href="/admin/five-minute-friday"
            className="px-3 py-1.5 rounded-md bg-[#E51B23] text-xs font-medium text-white hover:bg-[#E51B23]/80 transition-colors"
          >
            Respond to Friday
          </Link>
        )}
        <Link
          href={`/admin/clients`}
          className="px-3 py-1.5 rounded-md bg-slate-700 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

export function ClientCards({ cards }: ClientCardsProps) {
  if (cards.length === 0) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-8 text-center">
        <p className="text-slate-400 text-sm">No active coaching clients.</p>
      </div>
    );
  }

  // Group cards by company name (org)
  const orgGroups: { name: string; cards: ClientCard[] }[] = [];
  const soloCards: ClientCard[] = [];
  const orgMap = new Map<string, ClientCard[]>();

  for (const card of cards) {
    if (card.companyName) {
      if (!orgMap.has(card.companyName)) {
        orgMap.set(card.companyName, []);
      }
      orgMap.get(card.companyName)!.push(card);
    } else {
      soloCards.push(card);
    }
  }

  orgMap.forEach((groupCards, name) => {
    orgGroups.push({ name, cards: groupCards });
  });
  orgGroups.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      {orgGroups.map((group) => (
        <div key={group.name}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#00D4FF]" />
            {group.name}
            <span className="text-slate-600">({group.cards.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.cards.map((card) => (
              <ClientCardItem key={card.userId} card={card} />
            ))}
          </div>
        </div>
      ))}

      {soloCards.length > 0 && (
        <div>
          {orgGroups.length > 0 && (
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Individual
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {soloCards.map((card) => (
              <ClientCardItem key={card.userId} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
