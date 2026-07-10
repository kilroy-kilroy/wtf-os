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
      <a
        href={`/api/case-study-lab/pdf/${id}`}
        download="case-study.pdf"
        target="_blank"
        rel="noreferrer"
        className="rounded border border-[#16181d] bg-[#16181d] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        ⬇ One-pager PDF
      </a>
      {sizes.map((s) => (
        <a
          key={s}
          href={`/api/case-study-lab/card/${id}?size=${s}`}
          download={`case-study-${s}.png`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-[#d5d9e0] px-4 py-2 text-sm text-[#16181d] hover:bg-[#f6f7f9]"
        >
          ⬇ {LABELS[s]}
        </a>
      ))}
    </div>
  );
}
