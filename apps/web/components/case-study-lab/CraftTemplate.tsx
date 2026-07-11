import type { CraftView } from "@/lib/case-study-lab/view";

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

// Craft Showcase render — same brand envelope as ReportBody, but the hero is the
// WORK itself: an image-forward gallery (hero piece full-bleed, the rest in a
// grid), with the brief and the key craft decision framing it.
export default function CraftTemplate({ view }: { view: CraftView }) {
  const v = view;
  const [hero, ...rest] = v.assets;
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">The Work</span>
      </div>

      <div className="px-10 pb-8 pt-10">
        {v.kicker && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: v.accent }}>{v.kicker}</p>
        )}
        <h1 className="mb-3 max-w-[24ch] font-serif text-[34px] font-semibold leading-[1.18] tracking-tight text-balance">{v.headline}</h1>
        {v.dek && <p className="mb-8 max-w-[60ch] text-[15px] leading-relaxed text-[#5b6472]">{v.dek}</p>}
      </div>

      {/* The work leads — hero piece full-bleed, the rest in a grid. */}
      {hero && (
        <figure className="mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.url} alt={hero.caption ?? v.clientName} className="w-full" />
          {hero.caption && (
            <figcaption className="px-10 py-3 text-[12.5px] text-[#5b6472]">{hero.caption}</figcaption>
          )}
        </figure>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {rest.map((a, i) => (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.caption ?? v.clientName} className="w-full" />
              {a.caption && (
                <figcaption className="px-10 py-3 text-[12.5px] text-[#5b6472] sm:px-5">{a.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      <div className="px-10 pb-8 pt-8">
        {v.craftDecision && (
          <div className="rounded-lg bg-[#f6f7f9] px-7 py-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: v.accent }}>The Craft</div>
            <p className="text-[15px] leading-relaxed">{v.craftDecision}</p>
          </div>
        )}

        {v.stats.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <blockquote className="mt-8 rounded-r-lg bg-[#f6f7f9] px-8 py-7" style={{ borderLeft: `4px solid ${v.accent}` }}>
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
