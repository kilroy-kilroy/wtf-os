"use client";

import { useState } from "react";
import type { AgencyBrand, RouterOutput } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function ProStartForm({
  onClassified,
}: {
  onClassified: (data: { id: string; brand: AgencyBrand; recommendation: RouterOutput }) => void;
}) {
  const [url, setUrl] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [rawWin, setRawWin] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawWin.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-lab-pro/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, discipline, rawWin, audience: audience || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      onClassified({ id: json.id, brand: json.brand, recommendation: json.recommendation });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <ConsoleInput
            type="text"
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="youragency.com (for brand colors)"
            aria-label="Your agency website"
          />
        </div>
        <div className="flex-1">
          <ConsoleInput
            type="text"
            value={discipline}
            onChange={(e) => setDiscipline((e.target as HTMLInputElement).value)}
            placeholder="What you do — e.g. Paid social, Branding"
            aria-label="Your discipline"
          />
        </div>
      </div>

      <textarea
        value={rawWin}
        onChange={(e) => setRawWin(e.target.value)}
        required
        rows={5}
        placeholder="Tell me about one client win — what was the problem, what you did, and any results. A few sentences is plenty."
        aria-label="The client win"
        className="w-full rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-[#666] focus:border-[#666] focus:outline-none"
      />

      <ConsoleInput
        type="text"
        value={audience}
        onChange={(e) => setAudience((e.target as HTMLInputElement).value)}
        placeholder="Who reads this? e.g. B2B buying committee (optional)"
        aria-label="Audience"
      />

      <ConsoleButton type="submit" disabled={busy} className="whitespace-nowrap">
        {busy ? "⟳ FINDING THE BEST FORMAT…" : "▶ FIND MY CASE STUDY TYPE"}
      </ConsoleButton>

      {error && <p className="font-poppins text-sm text-[#E51B23]">{error}</p>}
      <p className="font-poppins text-xs text-[#808080]">
        Pro reads your win and picks the best-fit case-study shape of five, runs an interview tuned
        to it, then scores the draft and tells you what would make it convert.
      </p>
    </form>
  );
}
