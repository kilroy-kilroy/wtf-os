// apps/web/app/api/robot-tim/synthesize/route.ts
import { getSession, saveDeliverable } from "@/lib/robot-tim/db";
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

  try {
    const spine = await generateSpine(session.answers);
    const makeover = await generateMakeover(spine, session.crawl ?? { pages: [], homepageText: "" });
    const node7 = await generateNode7(spine, makeover);
    await saveDeliverable(id, { spine, makeover, node7 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[robot-tim] synthesis failed:", e);
    return Response.json({ error: "Synthesis failed" }, { status: 502 });
  }
}
