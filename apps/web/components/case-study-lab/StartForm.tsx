"use client";

import { useState } from "react";
import type { AgencyBrand } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function StartForm({
  onStarted,
}: {
  onStarted: (data: { id: string; brand: AgencyBrand; reply: string }) => void;
}) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-lab/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      onStarted({ id: json.id, brand: json.brand, reply: json.reply });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3">
      <ConsoleInput
        type="email"
        required
        value={email}
        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
        placeholder="you@youragency.com"
        aria-label="Your email"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <ConsoleInput
            type="text"
            required
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="youragency.com"
            aria-label="Your agency website"
          />
        </div>
        <ConsoleButton type="submit" disabled={busy} className="whitespace-nowrap">
          {busy ? "⟳ WARMING UP…" : "▶ BUILD MY CASE STUDY"}
        </ConsoleButton>
      </div>
      {error && <p className="font-poppins text-sm text-[#E51B23]">{error}</p>}
      <p className="font-poppins text-xs text-[#808080]">
        We&apos;ll grab your brand colors and walk you through a 7-minute interview about one
        client win, then hand you a shareable case study and ready-to-post images. Your email
        also gets you the newsletter these come from — unsubscribe anytime.
      </p>
    </form>
  );
}
