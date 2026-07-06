// apps/web/lib/robot-tim/synthesis-guard.ts
import { tryClaimSynthesis } from "@/lib/robot-tim/db";

// Called by BOTH the answer route (last node) and the crawl route. Whichever
// finishes second wins the CAS and fires synthesis exactly once.
export async function maybeStartSynthesis(id: string): Promise<void> {
  const claimed = await tryClaimSynthesis(id);
  if (!claimed) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
  // Fire-and-forget; the synthesize route persists the deliverable.
  fetch(`${appUrl}/api/robot-tim/synthesize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch((e) => console.error("[robot-tim] synthesize kick failed:", e));
}
