"use client";

import { useState } from "react";
import type { CaseStudySlots } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function DraftEditor({
  id,
  slots,
  onDone,
}: {
  id: string;
  slots: CaseStudySlots;
  onDone: () => void;
}) {
  const [clientName, setClientName] = useState(slots.clientName ?? "");
  const [anonymized, setAnonymized] = useState(slots.clientAnonymized);
  const [cta, setCta] = useState(slots.cta ?? "Want results like this? Book a call.");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append("id", id);
    form.append("file", file);
    const res = await fetch("/api/case-study-lab/logo", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed");
    setLogoUrl(json.url);
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
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="mt-1 block text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f).catch((err) => setError(err.message));
              }}
            />
          </label>
          {logoUrl && <span className="text-xs text-[#22c55e]">Logo uploaded ✓</span>}
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

      <ConsoleButton type="button" onClick={generate} disabled={busy} className="self-start">
        {busy ? "⟳ GENERATING…" : "▶ GENERATE CASE STUDY"}
      </ConsoleButton>
    </div>
  );
}
