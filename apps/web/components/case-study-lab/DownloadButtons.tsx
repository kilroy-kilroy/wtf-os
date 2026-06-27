"use client";

import { CARD_SIZES, type CardSize } from "@/components/case-study-lab/cardModel";

const LABELS: Record<CardSize, string> = {
  square: "Square (Instagram)",
  portrait: "Portrait (LinkedIn / FB)",
  landscape: "Landscape (Twitter)",
};

export default function DownloadButtons({ id }: { id: string }) {
  const sizes = Object.keys(CARD_SIZES) as CardSize[];
  return (
    <div className="flex flex-wrap gap-3">
      {sizes.map((s) => (
        <a
          key={s}
          href={`/api/case-study-lab/card/${id}?size=${s}`}
          download={`case-study-${s}.png`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-[#333] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a]"
        >
          ⬇ {LABELS[s]}
        </a>
      ))}
    </div>
  );
}
