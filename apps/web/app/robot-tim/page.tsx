// apps/web/app/robot-tim/page.tsx
"use client";

import { useState } from "react";

export default function RobotTimLanding() {
  const [siteUrl, setSiteUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: "robot-tim", siteUrl, firstName, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Something broke");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 bg-black px-6 py-16 text-white">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">Robot-Tim Positioning Engine</p>
      <h1 className="font-[Anton] text-4xl leading-tight sm:text-5xl">
        You know your homepage is going wah wah. Now let a robot version of me fix what it is actually trying to say.
      </h1>
      <p className="text-lg text-zinc-300">
        A $399 async positioning teardown. You answer seven questions, Robot-Tim crawls your whole site, and you walk
        away with a Narrative Spine, a rewritten hero, and a page-by-page punch list.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input required value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="youragency.com"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youragency.com"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <button type="submit" disabled={busy}
          className="rounded-lg bg-[#D75A3F] px-6 py-3 text-lg font-semibold text-white disabled:opacity-50">
          {busy ? "Taking you to checkout…" : "Start — $399"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </main>
  );
}
