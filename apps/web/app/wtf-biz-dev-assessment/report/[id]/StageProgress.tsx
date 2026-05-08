type Stage = 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready';

const STAGES: Array<{ id: Stage; label: string; index: number; tagline: string }> = [
  { id: 'all_founder_no_system',    label: 'All Founder, No System',    index: 1, tagline: "You are the sales system, and that is the problem." },
  { id: 'half_built_engine',         label: 'Half-Built Engine',          index: 2, tagline: "Some pieces exist, but nothing compounds yet." },
  { id: 'engine_online_hire_ready', label: 'Engine Online, Hire-Ready',  index: 3, tagline: "Your system is documented, repeatable, and ready for a hire." },
];

export function StageProgress({ stage }: { stage: Stage }) {
  const current = STAGES.find(s => s.id === stage) ?? STAGES[0];

  return (
    <header className="mb-16">
      <p className="font-poppins text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
        You are at stage {current.index} of 3
      </p>
      <h1 className="font-anton uppercase leading-[0.95] tracking-tight text-foreground text-[clamp(2.5rem,7vw,5rem)] mb-3">
        {current.label}
      </h1>
      <p className="font-poppins text-lg md:text-xl text-brand-ink italic max-w-2xl">
        &ldquo;{current.tagline}&rdquo;
      </p>

      <ol className="mt-10 grid grid-cols-3 gap-0 border-t-2 border-foreground" aria-label="Stage progress">
        {STAGES.map((s) => {
          const isActive = s.id === stage;
          const isPast = s.index < current.index;
          return (
            <li
              key={s.id}
              className={[
                'pt-4 pr-4 relative',
                isActive ? 'border-t-[6px] border-brand -mt-[2px]' : '',
              ].join(' ')}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={[
                    'font-anton text-2xl tabular-nums',
                    isActive ? 'text-brand' : isPast ? 'text-foreground' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  0{s.index}
                </span>
                <span
                  className={[
                    'font-poppins text-xs uppercase tracking-wider leading-tight',
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
