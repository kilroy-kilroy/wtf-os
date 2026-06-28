"use client";

import { useState } from "react";
import type { CaseStudySlots } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

type Msg = { role: "assistant" | "user"; content: string };

export default function InterviewChat({
  id,
  firstReply,
  onReady,
}: {
  id: string;
  firstReply: string;
  onReady: (slots: CaseStudySlots) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: firstReply }]);
  const [input, setInput] = useState("");
  const [slots, setSlots] = useState<CaseStudySlots | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    try {
      const res = await fetch("/api/case-study-lab/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
      setSlots(json.slots);
      setReady(Boolean(json.readyToGenerate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "self-start rounded-lg bg-[#1a1a1a] px-4 py-2 text-white"
                : "self-end rounded-lg bg-[#2a2a2a] px-4 py-2 text-[#c8c8c8]"
            }
          >
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <div className="flex-1">
          <ConsoleInput
            type="text"
            value={input}
            onChange={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder={busy ? "Thinking…" : "Type your answer…"}
            aria-label="Your answer"
          />
        </div>
        <ConsoleButton type="submit" disabled={busy}>
          Send
        </ConsoleButton>
      </form>

      {error && <p className="text-sm text-[#E51B23]">{error}</p>}

      {(ready || (slots && slots.results.length > 0)) && (
        <ConsoleButton
          type="button"
          onClick={() => slots && onReady(slots)}
          className="self-start"
        >
          {ready ? "▶ Looks good — review my case study" : "▶ Generate with what I've got"}
        </ConsoleButton>
      )}
    </div>
  );
}
