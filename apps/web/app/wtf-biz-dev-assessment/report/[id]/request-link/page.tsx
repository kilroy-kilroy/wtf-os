'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function RequestLinkPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const resp = await fetch('/api/biz-dev/resend-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, assessmentId }),
    });
    if (resp.ok) setSubmitted(true);
    else setError(await resp.text());
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-xl px-6 py-24">
          <p className="font-poppins text-xs uppercase tracking-[0.3em] text-brand mb-4">Sent</p>
          <h1 className="font-anton uppercase tracking-tight leading-[0.95] text-foreground mb-6 text-[clamp(2.5rem,6vw,4rem)]">
            Check your inbox.
          </h1>
          <p className="font-poppins text-lg text-muted-foreground">
            If your email is the one tied to this report, you&apos;ll have a fresh link in a minute.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-6 py-24">
        <p className="font-poppins text-xs uppercase tracking-[0.3em] text-brand mb-4">Magic links are single-use</p>
        <h1 className="font-anton uppercase tracking-tight leading-[0.95] text-foreground mb-6 text-[clamp(2.5rem,6vw,4rem)]">
          Send me a fresh link.
        </h1>
        <p className="font-poppins text-lg text-muted-foreground mb-10">
          Pop in the email you used and I&apos;ll send a new one.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-poppins text-xs uppercase tracking-[0.2em] text-foreground/70 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@youragency.com"
              className="w-full font-poppins bg-transparent border-0 border-b-2 border-foreground/20 px-0 py-3 text-lg focus:outline-none focus:border-brand placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 font-poppins font-semibold uppercase tracking-wider text-sm hover:bg-brand transition-colors"
          >
            Send me a fresh link
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </form>
        {error && <p className="font-poppins text-sm text-scorecard-fail mt-6">{error}</p>}
      </div>
    </main>
  );
}
