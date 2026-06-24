import { normalizeUrl, fetchPage } from "@/lib/wah-wah/extract";
import { findLexiconHits } from "@/lib/wah-wah/lexicon";
import { analyzeCopy } from "@/lib/wah-wah/analyze";
import { saveAnalysis, countRecentByIp } from "@/lib/wah-wah/db";
import { captureWahWahLead, EMAIL_RE } from "@/lib/wah-wah/lead";

export const maxDuration = 60;

const HOURLY_LIMIT = 5;

export async function POST(req: Request): Promise<Response> {
  let url: string;
  let email: string;
  let firstName: string;
  try {
    const body = await req.json();
    if (typeof body.url !== "string" || !body.url.trim()) {
      throw new Error("missing url");
    }
    url = normalizeUrl(body.url.trim());
    // Email is captured upfront — it is the price of the report.
    email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a real email address");
    // Optional field — captured when freely given, never required.
    firstName = String(body.firstName ?? "").trim().slice(0, 80);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (ip && (await countRecentByIp(ip)) >= HOURLY_LIMIT) {
    return Response.json(
      { error: "Easy there. Try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const page = await fetchPage(url);
    const text = [page.title, page.metaDescription, page.h1, page.bodyText].join("\n");
    const hits = findLexiconHits(text);
    const analysis = await analyzeCopy(page, hits);
    const id = await saveAnalysis(url, analysis, ip);

    // Email captured upfront — fire the full lead pipeline (best-effort, never
    // blocks the response) and let the report render in full on the next page.
    await captureWahWahLead({
      id,
      email,
      firstName: firstName || undefined,
      url,
      score: analysis.score,
    });

    return Response.json({
      id,
      score: analysis.score,
      verdict: analysis.verdict,
      flagCount: analysis.flags.length,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Something broke" },
      { status: 502 }
    );
  }
}
