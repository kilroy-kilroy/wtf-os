import type { TransformationView } from "@/lib/case-study-lab/view";

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

// Transformation Story render — same brand envelope as ReportBody, but the body
// is an arc: starting state -> ordered phase timeline -> outcome stats -> end state.
export default function TransformationTemplate({ view }: { view: TransformationView }) {
  const v = view;
  return (
    <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg bg-white text-[#16181d] shadow-xl">
      <div className="flex items-center gap-4 px-10 py-5 text-white" style={{ background: v.accent }}>
        {v.agencyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.agencyLogoUrl} alt={v.agencyName ?? "Agency"} className="h-8 w-auto" />
        ) : v.agencyName ? (
          <span className="text-lg font-extrabold tracking-wide">{v.agencyName}</span>
        ) : null}
        {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl && <span className="opacity-60">×</span>}
        {v.clientLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.clientLogoUrl} alt={v.clientName} className="h-8 w-auto rounded bg-white/95 px-2 py-1" />
        ) : (
          <span className="text-base font-semibold opacity-95">{v.clientName}</span>
        )}
        <span className="flex-1" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">Transformation</span>
      </div>

      <div className="px-10 pb-8 pt-10">
        {v.kicker && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: v.accent }}>{v.kicker}</p>
        )}
        <h1 className="mb-3 max-w-[24ch] font-serif text-[34px] font-semibold leading-[1.18] tracking-tight text-balance">{v.headline}</h1>
        {v.dek && <p className="mb-8 max-w-[60ch] text-[15px] leading-relaxed text-[#5b6472]">{v.dek}</p>}

        {v.startingState && (
          <div className="mb-9 rounded-lg bg-[#f6f7f9] px-7 py-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5b6472]">Where they started</div>
            <p className="text-[15px] leading-relaxed">{v.startingState}</p>
          </div>
        )}

        {v.phases.length > 0 && (
          <>
            <div className="mb-5 inline-block border-b-2 border-[#16181d] pb-2 text-xs font-bold uppercase tracking-[0.14em]">
              The Journey
            </div>
            <ol className="relative ml-3 border-l-2 border-[#e4e7ec]">
              {v.phases.map((p, i) => (
                <li key={i} className="relative pb-8 pl-8 last:pb-0">
                  <span
                    className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: v.accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <p className="text-[15.5px] font-bold">{p.label}</p>
                    {p.timeframe && (
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#5b6472]">{p.timeframe}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#5b6472]">{p.detail}</p>
                </li>
              ))}
            </ol>
          </>
        )}

        {v.stats.length > 0 && (
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {v.stats.map((s, i) => (
              <div key={i} className="rounded-lg bg-[#f6f7f9] px-5 py-5">
                <div className="flex items-baseline gap-1 text-[36px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: v.accent }}>
                  <span className="text-base">{ARROW[s.direction]}</span>{s.value}
                </div>
                <div className="mt-2 text-[12.5px] leading-snug text-[#5b6472]">{s.caption}</div>
              </div>
            ))}
          </div>
        )}

        {v.endState && (
          <div className="mt-9 rounded-lg px-7 py-6 text-white" style={{ background: v.accent }}>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] opacity-80">Where they are now</div>
            <p className="text-[15px] font-medium leading-relaxed">{v.endState}</p>
          </div>
        )}

        {v.quote && (
          <blockquote className="mt-9 rounded-r-lg bg-[#f6f7f9] px-8 py-7" style={{ borderLeft: `4px solid ${v.accent}` }}>
            <p className="mb-3 font-serif text-[19px] leading-snug">&ldquo;{v.quote.text}&rdquo;</p>
            <div className="text-[13px] text-[#5b6472]">{v.quote.attribution}</div>
          </blockquote>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5 border-t border-[#e4e7ec] px-10 py-6">
        {v.ctaHref ? (
          <a href={v.ctaHref} target="_blank" rel="noreferrer" className="inline-block rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: v.accent }}>{v.cta} →</a>
        ) : (
          <span className="text-sm font-bold" style={{ color: v.accent }}>{v.cta}</span>
        )}
        {v.poweredByHref && (
          <span className="text-[11.5px] text-[#5b6472]">
            Powered by <a href={v.poweredByHref} className="font-semibold" style={{ color: v.accent }} target="_blank" rel="noreferrer">Case Study Lab</a>
          </span>
        )}
      </div>
    </article>
  );
}
