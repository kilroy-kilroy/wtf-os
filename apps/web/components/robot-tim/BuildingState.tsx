// apps/web/components/robot-tim/BuildingState.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuildingState() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-white">
      <p className="font-[Anton] text-3xl">Building your Spine…</p>
      <p className="text-zinc-400">
        Robot-Tim is reading your whole site and assembling your positioning. This takes a minute or two — this page
        updates itself.
      </p>
    </div>
  );
}
