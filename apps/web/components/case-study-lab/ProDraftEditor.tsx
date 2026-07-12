"use client";

import { useState } from "react";
import type { ProCaseStudySlots, AgencyBrand, Archetype } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function ProDraftEditor({
  id,
  archetype,
  slots,
  brand,
  onDone,
}: {
  id: string;
  archetype: Archetype;
  slots: ProCaseStudySlots;
  brand: AgencyBrand;
  onDone: () => void;
}) {
  const [clientName, setClientName] = useState(slots.clientName ?? "");
  const [anonymized, setAnonymized] = useState(slots.clientAnonymized);
  const [cta, setCta] = useState(slots.cta ?? "Want results like this? Book a call.");
  const [ctaUrl, setCtaUrl] = useState("");
  const [agencyName, setAgencyName] = useState(brand.name ?? "");
  const firstBrandHex = brand.colors.find((c) => /^#[0-9a-f]{6}$/i.test(c));
  const [accent, setAccent] = useState(firstBrandHex ?? "#E51B23");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const craftNeedsAssets = archetype === "craft";

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-lab-pro/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          clientName,
          clientAnonymized: anonymized,
          cta,
          ctaUrl: ctaUrl || null,
          agencyName: agencyName || null,
          accent,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-white">
      <h2 className="text-xl font-bold">Quick review before we generate</h2>

      {craftNeedsAssets && (
        <p className="rounded-md border border-[#5a3a00] bg-[#1a1200] px-4 py-3 text-sm text-[#f0c060]">
          This is a Craft Showcase — the work is the proof. Uploading the pieces isn&apos;t wired up
          yet, so generation will ask for at least one image.
        </p>
      )}

      <div className="flex flex-col gap-2 border-b border-[#222] pb-4">
        <ConsoleInput
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName((e.target as HTMLInputElement).value)}
          placeholder="Your agency name"
          aria-label="Agency name"
        />
        <label className="flex items-center gap-2 text-sm text-[#9aa0a6]">
          Brand color
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent((e.target as HTMLInputElement).value)}
            aria-label="Brand color"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={anonymized} onChange={(e) => setAnonymized(e.target.checked)} />
        Anonymize the client (no name)
      </label>

      {!anonymized && (
        <ConsoleInput
          type="text"
          value={clientName}
          onChange={(e) => setClientName((e.target as HTMLInputElement).value)}
          placeholder="Client name"
          aria-label="Client name"
        />
      )}

      <ConsoleInput
        type="text"
        value={cta}
        onChange={(e) => setCta((e.target as HTMLInputElement).value)}
        placeholder="Call to action"
        aria-label="Call to action"
      />
      <ConsoleInput
        type="url"
        value={ctaUrl}
        onChange={(e) => setCtaUrl((e.target as HTMLInputElement).value)}
        placeholder="CTA link — your booking or contact page (optional)"
        aria-label="CTA link"
      />

      {error && <p className="text-sm text-[#E51B23]">{error}</p>}

      <ConsoleButton type="button" onClick={generate} disabled={busy} className="self-start">
        {busy ? "⟳ GENERATING & SCORING…" : "▶ GENERATE CASE STUDY"}
      </ConsoleButton>
    </div>
  );
}
