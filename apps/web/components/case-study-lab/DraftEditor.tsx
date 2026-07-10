"use client";

import { useState } from "react";
import type { CaseStudySlots, AgencyBrand } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function DraftEditor({
  id,
  slots,
  brand,
  onDone,
}: {
  id: string;
  slots: CaseStudySlots;
  brand: AgencyBrand;
  onDone: () => void;
}) {
  const [clientName, setClientName] = useState(slots.clientName ?? "");
  const [anonymized, setAnonymized] = useState(slots.clientAnonymized);
  const [cta, setCta] = useState(slots.cta ?? "Want results like this? Book a call.");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState(brand.name ?? "");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [agencyLogoUploading, setAgencyLogoUploading] = useState(false);
  const firstBrandHex = brand.colors.find((c) => /^#[0-9a-f]{6}$/i.test(c));
  const [accent, setAccent] = useState(firstBrandHex ?? "#E51B23");

  async function uploadLogoFile(file: File, kind: "client" | "agency") {
    const setUploading = kind === "agency" ? setAgencyLogoUploading : setLogoUploading;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("id", id);
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/case-study-lab/logo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (kind === "agency") setAgencyLogoUrl(json.url);
      else setLogoUrl(json.url);
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-lab/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          clientName,
          clientAnonymized: anonymized,
          clientLogoUrl: logoUrl,
          cta,
          agencyName: agencyName || null,
          agencyLogoUrl,
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

      <div className="flex flex-col gap-2 border-b border-[#222] pb-4">
        <ConsoleInput
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName((e.target as HTMLInputElement).value)}
          placeholder="Your agency name"
          aria-label="Agency name"
        />
        <label className="text-sm text-[#9aa0a6]">
          Agency logo (optional — falls back to your name)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadLogoFile(f, "agency").catch((err) => setError(err.message));
            }}
          />
        </label>
        {agencyLogoUploading && <span className="text-xs text-[#9aa0a6]">Uploading logo…</span>}
        {!agencyLogoUploading && agencyLogoUrl && (
          <span className="text-xs text-[#22c55e]">Agency logo uploaded ✓</span>
        )}
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
        <input
          type="checkbox"
          checked={anonymized}
          onChange={(e) => setAnonymized(e.target.checked)}
        />
        Anonymize the client (no name or logo)
      </label>

      {!anonymized && (
        <>
          <ConsoleInput
            type="text"
            value={clientName}
            onChange={(e) => setClientName((e.target as HTMLInputElement).value)}
            placeholder="Client name"
            aria-label="Client name"
          />
          <label className="text-sm text-[#9aa0a6]">
            Client logo (optional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 block text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogoFile(f, "client").catch((err) => setError(err.message));
              }}
            />
          </label>
          {logoUploading && <span className="text-xs text-[#9aa0a6]">Uploading logo…</span>}
          {!logoUploading && logoUrl && <span className="text-xs text-[#22c55e]">Logo uploaded ✓</span>}
        </>
      )}

      <ConsoleInput
        type="text"
        value={cta}
        onChange={(e) => setCta((e.target as HTMLInputElement).value)}
        placeholder="Call to action"
        aria-label="Call to action"
      />

      {error && <p className="text-sm text-[#E51B23]">{error}</p>}

      <ConsoleButton type="button" onClick={generate} disabled={busy || logoUploading || agencyLogoUploading} className="self-start">
        {busy ? "⟳ GENERATING…" : "▶ GENERATE CASE STUDY"}
      </ConsoleButton>
    </div>
  );
}
