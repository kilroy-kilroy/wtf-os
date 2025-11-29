"use client";

import { PatternRadarData } from "@/lib/dashboard-types";

type Props = {
  data: PatternRadarData;
};

export function PatternRadar({ data }: Props) {
  const maxScore =
    Math.max(...data.skills.map((s) => s.current), 100) || 100;

  return (
    <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
      <h2 className="font-anton text-lg md:text-xl uppercase tracking-wide text-[#FFDE59]">
        Pattern intelligence
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-anton text-xs uppercase text-[#B3B3B3] tracking-wide">
            Top strengths
          </h3>
          <ul className="text-sm text-[#B3B3B3] space-y-1">
            {data.topStrengths.map((s) => (
              <li key={s.name}>
                <span className="text-[#FFDE59] font-semibold">{s.name}</span>{" "}
                <span className="text-xs text-[#777]">
                  {s.current.toFixed(0)} score, {s.delta >= 0 ? "+" : ""}
                  {s.delta.toFixed(1)} recent change
                </span>
              </li>
            ))}
            {!data.topStrengths.length && (
              <li>Analyze a couple of calls to see your strengths.</li>
            )}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-anton text-xs uppercase text-[#B3B3B3] tracking-wide">
            Top weaknesses
          </h3>
          <ul className="text-sm text-[#B3B3B3] space-y-1">
            {data.topWeaknesses.map((s) => (
              <li key={s.name}>
                <span className="text-[#E51B23] font-semibold">{s.name}</span>{" "}
                <span className="text-xs text-[#777]">
                  {s.current.toFixed(0)} score, {s.delta >= 0 ? "+" : ""}
                  {s.delta.toFixed(1)} recent change
                </span>
              </li>
            ))}
            {!data.topWeaknesses.length && (
              <li>We will highlight weaknesses once there is enough data.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="text-sm text-[#B3B3B3]">
          <div className="font-anton text-xs uppercase text-[#B3B3B3] tracking-wide mb-1">
            Most frequent friction
          </div>
          <p>
            {data.mostFrequentMistake ||
              "Once patterns repeat, we will show your most common deal friction here."}
          </p>
        </div>
        <div className="text-sm text-[#B3B3B3]">
          <div className="font-anton text-xs uppercase text-[#B3B3B3] tracking-wide mb-1">
            Most improved skill
          </div>
          <p>
            {data.mostImprovedSkill ||
              "Keep running calls through Call Lab Pro to see what is improving fastest."}
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="font-anton text-xs uppercase text-[#B3B3B3] tracking-wide">
          Skill radar
        </div>
        <div className="space-y-2">
          {data.skills.map((s) => {
            const width = `${Math.max(5, (s.current / maxScore) * 100)}%`;
            const deltaColor =
              s.delta > 0 ? "text-green-400" : s.delta < 0 ? "text-red-400" : "text-[#B3B3B3]";
            return (
              <div key={s.name}>
                <div className="flex items-center justify-between text-xs text-[#B3B3B3] mb-1">
                  <span>{s.name}</span>
                  <span className={deltaColor}>
                    {s.delta > 0 ? "+" : s.delta < 0 ? "" : "±"}
                    {s.delta.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 bg-[#111] rounded">
                  <div
                    className="h-2 rounded bg-gradient-to-r from-[#FFDE59] to-[#E51B23]"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
          {!data.skills.length && (
            <p className="text-xs text-[#777]">
              No skill data yet. Once you analyze a few calls, you will see a radar of your strengths and gaps.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
