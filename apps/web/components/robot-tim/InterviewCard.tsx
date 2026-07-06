// apps/web/components/robot-tim/InterviewCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InterviewCard({
  sessionId,
  nodeId,
  ask,
  totalNodes,
}: {
  sessionId: string;
  nodeId: number;
  ask: string;
  totalNodes: number;
}) {
  const [answer, setAnswer] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/robot-tim/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: sessionId, answer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setReaction(json.reaction);
      setAnswer("");
      // A "push" keeps us on the same node; advance/complete reloads the server
      // component to render the next card or the building state.
      if (json.action !== "push") {
        setTimeout(() => router.refresh(), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">
        Question {nodeId + 1} of {totalNodes}
      </p>
      <p className="font-[Anton] text-2xl text-white">{ask}</p>
      {reaction && (
        <div className="rounded-xl border border-[#D75A3F] bg-zinc-900 p-4 text-zinc-100">
          <span className="font-semibold text-[#D75A3F]">Robot-Tim: </span>
          {reaction}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
          placeholder="Say it like you would out loud."
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg text-white" />
        <button type="submit" disabled={busy}
          className="self-start rounded-lg bg-[#D75A3F] px-6 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Robot-Tim is listening…" : reaction ? "Continue" : "Answer"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
