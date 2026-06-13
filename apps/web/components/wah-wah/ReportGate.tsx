"use client";

import { useState } from "react";
import { ConsolePanel, ConsoleHeading, ConsoleInput, ConsoleButton } from "@/components/console";

type Flag = { phrase: string; context: string; underneath: string };
export type WahWahResult = { flags: Flag[]; rewrite_teaser: string };

function ReportBody({ result }: { result: WahWahResult }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <ConsoleHeading level={2} variant="yellow">
        The {result.flags.length} worst offenders, and what a prospect actually hears
      </ConsoleHeading>
      {result.flags.map((f, i) => (
        <ConsolePanel key={i}>
          <p className="font-mono text-lg font-bold text-[#E51B23]">
            &ldquo;{f.phrase}&rdquo;
          </p>
          <p className="mt-1 font-poppins text-sm text-[#B3B3B3]">…{f.context}…</p>
          <p className="mt-3 font-poppins text-white">{f.underneath}</p>
        </ConsolePanel>
      ))}
      <ConsolePanel variant="red-highlight">
        <p className="font-anton uppercase tracking-widest text-white/80 text-sm">
          What you could say instead
        </p>
        <p className="mt-2 font-poppins text-xl font-medium text-white">
          {result.rewrite_teaser}
        </p>
        <p className="mt-4 font-poppins text-white/90">
          That one line came from a robot that read your homepage for 30 seconds.
          Imagine what comes out when the robot interviews you the way Tim does — your
          favorite clients, the one who made you want to quit, the thing clients got
          from you that was never on the invoice — then crawls your whole site and hands
          you the rewrite. That is Robot-Tim, and he is coming soon. The human version
          is taking clients now.
        </p>
        <a
          href="https://timkilroy.com/demand-os"
          className="mt-5 inline-block rounded bg-black px-5 py-2.5 font-anton uppercase tracking-wide text-white"
        >
          See how the human version works →
        </a>
      </ConsolePanel>
    </div>
  );
}

export default function ReportGate({
  analysisId,
  flagCount,
  initialResult = null,
}: {
  analysisId: string;
  flagCount: number;
  initialResult?: WahWahResult | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WahWahResult | null>(initialResult);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wah-wah/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: analysisId, email, firstName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setResult(json.result as WahWahResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  if (result) return <ReportBody result={result} />;

  return (
    <ConsolePanel className="w-full">
      <form onSubmit={submit} className="flex w-full flex-col items-center gap-4 text-center">
        <ConsoleHeading level={2}>
          {flagCount} phrase{flagCount === 1 ? "" : "s"} flagged. Want to hear what your
          prospects hear?
        </ConsoleHeading>
        <p className="font-poppins text-[#B3B3B3]">
          The full report shows every flagged phrase, the real thing you were probably
          trying to say underneath it, and one line of what your homepage could say
          instead. The price is your email.
        </p>
        <div className="flex w-full max-w-md flex-col gap-3">
          <ConsoleInput
            type="text"
            value={firstName}
            onChange={(e) => setFirstName((e.target as HTMLInputElement).value)}
            placeholder="First name (optional)"
            aria-label="First name (optional)"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <ConsoleInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                placeholder="you@youragency.com"
                aria-label="Your email"
              />
            </div>
            <ConsoleButton type="submit" disabled={busy} className="whitespace-nowrap">
              {busy ? "PULLING THE REPORT…" : "SHOW ME THE DAMAGE"}
            </ConsoleButton>
          </div>
        </div>
        {error && <p className="font-poppins text-sm text-[#E51B23]">{error}</p>}
        <p className="font-poppins text-xs text-[#808080]">
          Your email also gets you Agency Inner Circle, the newsletter where teardowns
          like this come from. Unsubscribe whenever, no hard feelings.
        </p>
      </form>
    </ConsolePanel>
  );
}
