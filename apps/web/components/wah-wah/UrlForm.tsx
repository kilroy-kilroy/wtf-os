"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wah-wah/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      router.push(`/wah-wah/r/${json.id}`);
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
            required
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="youragency.com"
            aria-label="Homepage URL"
          />
        </div>
        <ConsoleButton type="submit" disabled={busy} className="whitespace-nowrap">
          {busy ? "⟳ LISTENING FOR WAH-WAH…" : "▶ SCORE MY HOMEPAGE"}
        </ConsoleButton>
      </div>
      {error && <p className="font-poppins text-sm text-[#E51B23]">{error}</p>}
    </form>
  );
}
