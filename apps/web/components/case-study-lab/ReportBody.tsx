import type { CaseStudy } from "@repo/prompts";

export default function ReportBody({
  result,
  accent,
  clientLogoUrl,
}: {
  result: CaseStudy;
  accent: string;
  clientLogoUrl: string | null;
}) {
  return (
    <article className="w-full rounded-lg bg-[#0b0b0b] p-8 text-white">
      <header className="mb-8 flex items-center gap-4">
        {clientLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clientLogoUrl} alt={result.clientName} className="h-12 w-auto" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded font-bold"
            style={{ background: accent }}
          >
            {result.clientName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-bold">{result.clientName}</div>
          <div className="text-sm text-[#9aa0a6]">{result.clientDescriptor}</div>
        </div>
      </header>

      <h1 className="mb-8 text-3xl font-black leading-tight">{result.headline}</h1>

      <div className="mb-10 flex flex-wrap gap-8">
        {result.results.map((r, i) => (
          <div key={i}>
            <div className="text-4xl font-black" style={{ color: accent }}>
              {r.value}
            </div>
            <div className="text-sm text-[#c8c8c8]">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-10 space-y-4">
        {result.issues.map((it, i) => (
          <div key={i} className="border-l-2 pl-4" style={{ borderColor: accent }}>
            <div className="font-semibold text-[#e6e6e6]">{it.issue}</div>
            <div className="text-sm text-[#9aa0a6]">{it.solution}</div>
          </div>
        ))}
      </div>

      {result.quote ? (
        <blockquote className="mb-10 text-lg italic text-[#e6e6e6]">
          "{result.quote.text}"
          <footer className="mt-2 text-sm not-italic text-[#808080]">
            — {result.quote.attribution}
          </footer>
        </blockquote>
      ) : null}

      <div className="mb-2 text-xl font-bold" style={{ color: accent }}>
        {result.cta}
      </div>
      {result.teamCredit ? (
        <p className="text-sm text-[#808080]">{result.teamCredit}</p>
      ) : null}
    </article>
  );
}
