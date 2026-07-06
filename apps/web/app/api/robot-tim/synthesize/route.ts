// apps/web/app/api/robot-tim/synthesize/route.ts
import { waitUntil } from "@vercel/functions";
import { getSession, saveDeliverable, markFailed } from "@/lib/robot-tim/db";
import { generateSpine, generateMakeover, generateNode7 } from "@/lib/robot-tim/synthesize";

export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  let id: string;
  try {
    id = String((await req.json()).id ?? "");
    if (!id) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  // Only run when maybeStartSynthesis's CAS has already claimed this session
  // (status flipped interviewing -> synthesizing). Prevents anyone with a
  // session UUID from re-triggering costly Anthropic calls or clobbering an
  // already-complete deliverable.
  if (session.status !== "synthesizing") {
    return Response.json({ ok: true, skipped: true });
  }

  // Return fast; do the actual generation in the background so this request
  // doesn't block on (and risk exceeding budget from) the caller's fetch.
  waitUntil(
    (async () => {
      try {
        const spine = await generateSpine(session.answers);
        const makeover = await generateMakeover(spine, session.crawl ?? { pages: [], homepageText: "" });
        const node7 = await generateNode7(spine, makeover);
        await saveDeliverable(id, { spine, makeover, node7 });
      } catch (e) {
        console.error("[robot-tim] synthesis failed:", e);
        await markFailed(id).catch((e2) =>
          console.error("[robot-tim] markFailed also failed:", e2)
        );
      }
    })()
  );

  return Response.json({ ok: true, started: true });
}
