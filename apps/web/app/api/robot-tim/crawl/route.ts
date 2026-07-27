// apps/web/app/api/robot-tim/crawl/route.ts
import { getSession, saveCrawl } from "@/lib/robot-tim/db";
import { crawlSite } from "@/lib/robot-tim/crawl";
import { maybeStartSynthesis } from "@/lib/robot-tim/synthesis-guard";
import { alertRobotTimCrawlFailed } from "@/lib/slack";

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
  if (session.status !== "interviewing") return Response.json({ ok: true, skipped: true });

  try {
    const crawl = await crawlSite(session.site_url);
    await saveCrawl(id, crawl);
    await maybeStartSynthesis(id);
    return Response.json({ ok: true, pages: crawl.pages.length });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[robot-tim] crawl failed:", e);
    // Crawl failure should not permanently wedge the run; store an empty crawl so
    // synthesis can still proceed on the interview + homepage text alone. Record WHY
    // and page us — the run is about to be marked "complete" while missing half of
    // what the customer paid for, and nothing else surfaces that.
    await saveCrawl(id, { pages: [], homepageText: "", error: detail });
    alertRobotTimCrawlFailed(id, session.site_url, detail);
    await maybeStartSynthesis(id);
    return Response.json({ ok: false }, { status: 502 });
  }
}
