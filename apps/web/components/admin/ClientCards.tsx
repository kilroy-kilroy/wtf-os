'use client';

import type { ClientCard } from '@/lib/admin/get-admin-dashboard-data';
import type { ClientTrajectory, Momentum } from '@/lib/admin/coaching-intelligence';
import { MACRO_CATEGORIES } from '@/lib/macro-patterns';
import Link from 'next/link';

interface ClientCardsProps {
  cards: ClientCard[];
  trajectories: Record<string, ClientTrajectory>;
}

const MOMENTUM_CONFIG: Record<Momentum, { label: string; glyph: string; tone: string; chipBg: string }> = {
  accelerating: { label: 'Accelerating', glyph: '▲▲', tone: 'text-green-300', chipBg: 'bg-green-500/15 border-green-500/40' },
  steady: { label: 'Steady', glyph: '●', tone: 'text-blue-300', chipBg: 'bg-blue-500/10 border-blue-500/30' },
  slowing: { label: 'Slowing', glyph: '▼', tone: 'text-yellow-300', chipBg: 'bg-yellow-500/10 border-yellow-500/40' },
  stalled: { label: 'Stalled', glyph: '■', tone: 'text-[#E51B23]', chipBg: 'bg-[#E51B23]/15 border-[#E51B23]/50' },
  pre_launch: { label: 'Onboarding', glyph: '○', tone: 'text-slate-300', chipBg: 'bg-slate-500/10 border-slate-500/30' },
};

const FRIDAY_STATUS_CONFIG: Record<ClientCard['fridayStatus'], { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'text-green-400' },
  pending: { label: 'Not yet', color: 'text-slate-400' },
  overdue: { label: 'Overdue', color: 'text-[#E51B23]' },
  not_required: { label: 'N/A', color: 'text-slate-500' },
};

function formatEnrolled(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function lastActivityLabel(daysSince: number | null): string {
  if (daysSince === null) return 'Never logged in';
  if (daysSince === 0) return 'Today';
  if (daysSince === 1) return 'Yesterday';
  return `${daysSince}d ago`;
}

function lastActivityText(
  activity: { daysAgo: number; label: string } | null | undefined,
  daysSinceEnrollment: number
): { text: string; tone: string } {
  if (!activity) {
    return { text: `No activity in ${daysSinceEnrollment}d`, tone: 'text-[#E51B23]' };
  }
  const { daysAgo, label } = activity;
  const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
  const tone =
    daysAgo <= 3 ? 'text-green-300' :
    daysAgo <= 14 ? 'text-slate-300' :
    daysAgo <= 30 ? 'text-yellow-300' :
    'text-[#E51B23]';
  return { text: `${label} · ${when}`, tone };
}

function Sparkline({ values }: { values: (number | null)[] }) {
  if (values.length === 0) return null;
  const numericValues = values.filter((v): v is number => v != null);
  if (numericValues.length === 0) {
    return (
      <div className="w-full h-8 flex items-center">
        <div className="h-px w-full bg-slate-700/60" />
      </div>
    );
  }

  const width = 120;
  const height = 32;
  const min = 0;
  const max = 100;
  const stepX = width / Math.max(values.length - 1, 1);

  const points: string[] = [];
  const dots: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v == null) return;
    const x = i * stepX;
    const y = height - ((v - min) / (max - min)) * height;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    dots.push({ x, y });
  });

  const firstVal = numericValues[0];
  const lastVal = numericValues[numericValues.length - 1];
  const up = lastVal > firstVal;
  const color = up ? '#4ADE80' : lastVal < firstVal ? '#F87171' : '#64748B';

  return (
    <svg width={width} height={height} className="block">
      <line x1="0" y1={height} x2={width} y2={height} stroke="#1E293B" strokeWidth="1" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(' ')}
      />
      {dots.length > 0 && (
        <circle cx={dots[dots.length - 1].x} cy={dots[dots.length - 1].y} r="2" fill={color} />
      )}
    </svg>
  );
}

function ClientCardItem({
  card,
  trajectory,
}: {
  card: ClientCard;
  trajectory: ClientTrajectory | undefined;
}) {
  const momentum = trajectory?.momentum ?? 'pre_launch';
  const mc = MOMENTUM_CONFIG[momentum];
  const fridayConfig = FRIDAY_STATUS_CONFIG[card.fridayStatus];

  const isAttention = momentum === 'stalled' || momentum === 'slowing' || card.fridayStatus === 'submitted';
  const borderClass = isAttention ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-slate-700/50';

  const trendDisplay =
    trajectory?.avgScoreTrend != null
      ? `${trajectory.avgScoreTrend > 0 ? '+' : ''}${trajectory.avgScoreTrend}`
      : null;

  return (
    <div className={`border rounded-lg p-5 ${borderClass}`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-medium truncate">{card.name}</h3>
          <p className="text-xs text-slate-400 truncate">{card.programName}</p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 flex-shrink-0 ${mc.tone} ${mc.chipBg}`}
          title={`Momentum: ${mc.label}`}
        >
          <span className="mr-1 opacity-60">{mc.glyph}</span>
          {mc.label}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <Sparkline values={trajectory?.sparkline ?? new Array(30).fill(null)} />
          <div className="text-[10px] text-slate-500 mt-1">30-day avg score</div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-2 justify-end">
            <span className="text-2xl font-mono text-white leading-none">
              {trajectory?.avgScoreLast14d != null ? trajectory.avgScoreLast14d : '—'}
            </span>
            {trendDisplay && (
              <span
                className={`text-xs font-mono ${
                  trajectory!.avgScoreTrend! > 0
                    ? 'text-green-400'
                    : trajectory!.avgScoreTrend! < 0
                    ? 'text-[#E51B23]'
                    : 'text-slate-500'
                }`}
              >
                {trendDisplay}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {trajectory?.callsLast14d ?? 0} calls · 14d
          </div>
        </div>
      </div>

      {trajectory?.workingOn && (
        <div className="mb-4 p-2.5 rounded-md bg-black/40 border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: MACRO_CATEGORIES[trajectory.workingOn.pattern.category].color }}
            />
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Working on</span>
          </div>
          <div className="text-sm text-white font-medium">
            {trajectory.workingOn.pattern.name}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {trajectory.workingOn.frequency} occurrence{trajectory.workingOn.frequency === 1 ? '' : 's'} · last 30d
          </div>
        </div>
      )}

      {(() => {
        const activityDisplay = lastActivityText(trajectory?.lastActivity ?? null, trajectory?.daysSinceEnrollment ?? 0);
        return (
          <div className="space-y-1.5 text-sm text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Last activity</span>
              <span className={activityDisplay.tone}>{activityDisplay.text}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last login</span>
              <span className={trajectory?.daysSinceLastLogin != null && trajectory.daysSinceLastLogin >= 7 ? 'text-yellow-400' : ''}>
                {lastActivityLabel(trajectory?.daysSinceLastLogin ?? null)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">5-Minute Friday</span>
              <span className={fridayConfig.color}>{fridayConfig.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Enrolled</span>
              <span>{formatEnrolled(card.enrolledAt)}</span>
            </div>
          </div>
        );
      })()}

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between gap-3">
        {trajectory?.nextAction ? (
          <Link
            href={trajectory.nextAction.href}
            className="px-3 py-1.5 rounded-md bg-[#E51B23] text-xs font-medium text-white hover:bg-[#E51B23]/80 transition-colors truncate"
          >
            {trajectory.nextAction.label}
          </Link>
        ) : (
          <span className="text-[11px] text-slate-500 italic">No action needed</span>
        )}
        <Link
          href={`/admin/impersonate/${card.userId}`}
          className="text-xs text-[#00D4FF] hover:underline flex-shrink-0"
          target="_blank"
        >
          View as client →
        </Link>
      </div>
    </div>
  );
}

export function ClientCards({ cards, trajectories }: ClientCardsProps) {
  if (cards.length === 0) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-8 text-center">
        <p className="text-slate-400 text-sm">No active coaching clients.</p>
      </div>
    );
  }

  const orgGroups: { name: string; cards: ClientCard[] }[] = [];
  const soloCards: ClientCard[] = [];
  const orgMap = new Map<string, ClientCard[]>();

  for (const card of cards) {
    if (card.companyName) {
      if (!orgMap.has(card.companyName)) orgMap.set(card.companyName, []);
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
              <ClientCardItem key={card.userId} card={card} trajectory={trajectories[card.userId]} />
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
              <ClientCardItem key={card.userId} card={card} trajectory={trajectories[card.userId]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
