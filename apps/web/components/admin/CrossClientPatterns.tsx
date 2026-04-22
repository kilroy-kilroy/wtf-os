import type { CoachingIntelligence } from '@/lib/admin/coaching-intelligence';
import { MACRO_CATEGORIES } from '@/lib/macro-patterns';

interface Props {
  intelligence: CoachingIntelligence;
}

function share(clientsAffected: number, total: number): string {
  return total === 0 ? '0/0' : `${clientsAffected}/${total}`;
}

export function CrossClientPatterns({ intelligence }: Props) {
  const { activeClients, topNegativePatterns, topPositivePatterns } = intelligence.crossClient;
  const hasAnySignal = topNegativePatterns.length > 0 || topPositivePatterns.length > 0;

  if (activeClients === 0) return null;

  if (!hasAnySignal) {
    return (
      <div className="border border-slate-700/50 rounded-lg p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Cross-Client Pattern Intelligence
        </h2>
        <p className="text-sm text-slate-400">
          No call analyses from your {activeClients} coaching {activeClients === 1 ? 'client' : 'clients'} yet in the last 30 days. Patterns will surface here as clients submit calls.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-700/50 rounded-lg p-5 bg-gradient-to-br from-slate-900/80 to-slate-900/40">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Cross-Client Pattern Intelligence
        </h2>
        <span className="text-xs text-slate-500">{activeClients} active clients · last 30 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-[#E51B23] font-semibold uppercase tracking-wider mb-2">
            Shared Struggles
          </div>
          {topNegativePatterns.length === 0 ? (
            <p className="text-sm text-slate-500">No negative patterns detected yet.</p>
          ) : (
            <ul className="space-y-2">
              {topNegativePatterns.map((row) => {
                const cat = MACRO_CATEGORIES[row.pattern.category];
                return (
                  <li
                    key={row.pattern.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-md bg-black/30 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: cat.color }}
                        />
                        <span className="text-sm text-white font-medium truncate">
                          {row.pattern.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {row.pattern.correctiveMove || row.pattern.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-mono text-[#E51B23] leading-none">
                        {share(row.clientsAffected, activeClients)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        clients · {row.totalOccurrences} occurrences
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="text-[10px] text-green-400 font-semibold uppercase tracking-wider mb-2">
            Shared Strengths
          </div>
          {topPositivePatterns.length === 0 ? (
            <p className="text-sm text-slate-500">No positive patterns surfaced yet.</p>
          ) : (
            <ul className="space-y-2">
              {topPositivePatterns.map((row) => {
                const cat = MACRO_CATEGORIES[row.pattern.category];
                return (
                  <li
                    key={row.pattern.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-md bg-black/30 border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: cat.color }}
                        />
                        <span className="text-sm text-white font-medium truncate">
                          {row.pattern.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {row.pattern.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-mono text-green-400 leading-none">
                        {share(row.clientsAffected, activeClients)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        clients · {row.totalOccurrences} occurrences
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {topNegativePatterns[0] && (
        <p className="text-xs text-slate-500 mt-4 italic">
          Use this view to drive content and group coaching: one piece addressing &ldquo;
          {topNegativePatterns[0].pattern.name}&rdquo; touches{' '}
          {topNegativePatterns[0].clientsAffected} of {activeClients} clients.
        </p>
      )}
    </div>
  );
}
