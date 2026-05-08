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
      <main className="min-h-screen p-12 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Check your inbox</h1>
        <p className="text-muted-foreground">
          If your email is the one tied to this report, you&apos;ll have a fresh link in a minute.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-12 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Request a new link to your report</h1>
      <p className="text-muted-foreground mb-6">
        Magic links are single-use. Pop in the email you used and I&apos;ll send a fresh one.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@youragency.com"
          className="w-full rounded border border-border bg-background px-4 py-3"
        />
        <button
          type="submit"
          className="rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
        >
          Send me a fresh link
        </button>
      </form>
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </main>
  );
}
