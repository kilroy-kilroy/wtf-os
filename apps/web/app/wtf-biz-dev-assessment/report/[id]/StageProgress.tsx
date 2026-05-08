type Stage = 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready';

const STAGES: Array<{ id: Stage; label: string; index: number }> = [
  { id: 'all_founder_no_system',    label: 'All Founder, No System',      index: 1 },
  { id: 'half_built_engine',         label: 'Half-Built Engine',           index: 2 },
  { id: 'engine_online_hire_ready', label: 'Engine Online, Hire-Ready',   index: 3 },
];

export function StageProgress({ stage }: { stage: Stage }) {
  const currentIndex = STAGES.find(s => s.id === stage)?.index ?? 1;

  return (
    <div className="mb-12 p-6 border border-border rounded-lg bg-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4 text-center">
        Your current stage
      </p>
      <div className="flex items-center justify-between gap-2 relative">
        <div className="absolute left-8 right-8 top-5 h-0.5 bg-border -z-0" />
        {STAGES.map((s) => {
          const isActive = s.id === stage;
          const isPast = s.index < currentIndex;
          return (
            <div key={s.id} className="flex flex-col items-center flex-1 relative z-10">
              <div className={[
                'h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2',
                isActive ? 'bg-accent text-accent-foreground border-accent ring-4 ring-accent/20'
                : isPast ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border',
              ].join(' ')}>
                {s.index}
              </div>
              <p className={[
                'mt-2 text-xs text-center max-w-28',
                isActive ? 'font-bold text-foreground' : 'text-muted-foreground',
              ].join(' ')}>
                {s.label}
              </p>
              {isActive && (
                <p className="mt-1 text-xs text-accent font-semibold">YOU ARE HERE</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
