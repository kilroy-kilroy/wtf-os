// apps/web/app/robot-tim/pending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RobotTimPending() {
  const params = useSearchParams();
  const router = useRouter();
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    const stripeId = params.get("session_id");
    if (!stripeId) return;
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/robot-tim/resolve?session_id=${encodeURIComponent(stripeId)}`);
      if (res.ok) {
        const { id } = await res.json();
        if (id && !cancelled) {
          router.replace(`/robot-tim/${id}`);
          return;
        }
      }
      if (!cancelled) {
        setWaited((w) => w + 1);
        setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
      <p className="font-[Anton] text-2xl">Payment received. Waking up Robot-Tim…</p>
      {waited > 8 && (
        <p className="text-sm text-zinc-400">Still setting up — this can take a few seconds. Check your email for a link.</p>
      )}
    </main>
  );
}
