"use client";

import { useState } from "react";
import { ARCHETYPES, type Archetype, type RouterOutput } from "@repo/prompts";
import { ConsoleButton } from "@/components/console";

const LABEL: Record<Archetype, string> = {
  proof: "Proof Machine",
  transformation: "Transformation Story",
  big_idea: "Big Idea",
  craft: "Craft Showcase",
  method: "Method Demonstration",
};
const BLURB: Record<Archetype, string> = {
  proof: "Lead with the numbers — the result is the hero.",
  transformation: "Tell the arc over time — a change of state no metric captures.",
  big_idea: "Lead with the one-sentence reframe that made it work.",
  craft: "Show the work itself — the deliverable is the proof.",
  method: "Demonstrate your named, repeatable system.",
};

export default function ProRouterCard({
  recommendation,
  busy,
  onChosen,
}: {
  recommendation: RouterOutput;
  busy: boolean;
  onChosen: (archetype: Archetype) => void;
}) {
  const [selected, setSelected] = useState<Archetype>(recommendation.archetype);

  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="rounded-lg border border-[#2a2a2a] bg-[#101010] p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E51B23]">
          Recommended · {recommendation.confidence} confidence
        </div>
        <h2 className="mt-1 text-xl font-bold">{LABEL[recommendation.archetype]}</h2>
        <p className="mt-1 text-sm text-[#c8c8c8]">{recommendation.why}</p>
        {recommendation.secondary !== "none" && (
          <p className="mt-2 text-xs text-[#9aa0a6]">
            Reinforce with a <span className="font-semibold">{LABEL[recommendation.secondary]}</span> layer.
          </p>
        )}
        {recommendation.missingIngredients.length > 0 && (
          <p className="mt-2 text-xs text-[#9aa0a6]">
            To gather: {recommendation.missingIngredients.join(" · ")}
          </p>
        )}
      </div>

      <div className="text-sm text-[#9aa0a6]">Use this, or pick a different shape:</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ARCHETYPES.map((a) => {
          const isSel = a === selected;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setSelected(a)}
              className={
                "rounded-lg border px-4 py-3 text-left transition-colors " +
                (isSel
                  ? "border-[#E51B23] bg-[#1a0a0b]"
                  : "border-[#2a2a2a] bg-[#101010] hover:border-[#444]")
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{LABEL[a]}</span>
                {a === recommendation.archetype && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#E51B23]">
                    Recommended
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-[#9aa0a6]">{BLURB[a]}</div>
            </button>
          );
        })}
      </div>

      <ConsoleButton
        type="button"
        disabled={busy}
        onClick={() => onChosen(selected)}
        className="self-start"
      >
        {busy ? "⟳ STARTING THE INTERVIEW…" : `▶ Build a ${LABEL[selected]}`}
      </ConsoleButton>
    </div>
  );
}
