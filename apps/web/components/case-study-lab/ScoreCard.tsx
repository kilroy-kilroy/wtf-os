import type { ScoreResult } from "@repo/prompts";

const BAND_LABEL: Record<string, string> = {
  needs_work: "Needs work",
  fair: "Fair",
  strong: "Strong",
  exceptional: "Exceptional",
};
const BAND_COLOR: Record<string, string> = {
  needs_work: "#c2410c",
  fair: "#a16207",
  strong: "#15803d",
  exceptional: "#166534",
};

// The scorer/coach panel: the draft's grade against its archetype recipe, plus
// the benchmark-keyed coaching. This is the premium Pro surface — "here's why it
// will (or won't) convert."
export default function ScoreCard({ quality }: { quality: ScoreResult }) {
  const color = BAND_COLOR[quality.band] ?? "#5b6472";
  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-[#e4e7ec] bg-white p-7 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-white" style={{ background: color }}>
          <span className="text-2xl font-extrabold leading-none tabular-nums">{quality.score}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">/ 10</span>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color }}>
            {BAND_LABEL[quality.band] ?? quality.band}
          </div>
          <h2 className="text-lg font-bold text-[#16181d]">Case study coach</h2>
          <p className="text-[13px] text-[#5b6472]">Graded against this archetype&rsquo;s proven recipe.</p>
        </div>
      </div>

      {quality.suggestions.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {quality.suggestions.map((s, i) => (
            <li key={i} className="rounded-md bg-[#f6f7f9] px-4 py-3">
              <div className="text-[13px] font-bold text-[#16181d]">{s.ingredient}</div>
              <div className="mt-0.5 text-[13.5px] leading-relaxed text-[#3a4150]">{s.coaching}</div>
            </li>
          ))}
        </ul>
      )}

      {quality.missing.length > 0 && (
        <div className="mt-4 text-[12.5px] text-[#5b6472]">
          <span className="font-semibold">Missing from the recipe:</span> {quality.missing.join(" · ")}
        </div>
      )}
    </section>
  );
}
