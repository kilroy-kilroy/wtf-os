import type { BigIdeaView } from "@/lib/case-study-lab/view";

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

// Big Idea render — same brand envelope as ReportBody, but the hero is the
// insight itself: an oversized called-out reframe, with the tension, how it
// showed up, and supporting proof beneath it.
export default function BigIdeaTemplate({ view }: { view: BigIdeaView }) {
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">The Big Idea</span>
      </div>

      <div className="px-10 pb-8 pt-10">
        {v.kicker && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: v.accent }}>{v.kicker}</p>
        )}
        <h1 className="mb-3 max-w-[24ch] font-serif text-[34px] font-semibold leading-[1.18] tracking-tight text-balance">{v.headline}</h1>
        {v.dek && <p className="mb-8 max-w-[60ch] text-[15px] leading-relaxed text-[#5b6472]">{v.dek}</p>}

        {v.insight && (
          <figure className="my-8 border-y-2 py-8 text-center" style={{ borderColor: v.accent }}>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: v.accent }}>The Idea</div>
            <blockquote className="mx-auto max-w-[28ch] font-serif text-[27px] font-semibold leading-[1.28] tracking-tight text-balance">
              {v.insight}
            </blockquote>
          </figure>
        )}

        {v.manifestation && (
          <div className="mt-8">
            <div className="mb-3 inline-block border-b-2 border-[#16181d] pb-2 text-xs font-bold uppercase tracking-[0.14em]">
              How it showed up
            </div>
            <p className="max-w-[62ch] text-[15px] leading-relaxed text-[#3a4150]">{v.manifestation}</p>
          </div>
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
