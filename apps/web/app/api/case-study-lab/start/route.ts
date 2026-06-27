import { normalizeUrl } from "@/lib/wah-wah/extract";
import { fetchBrand } from "@/lib/case-study-lab/extract";
import { createDraft, countRecentByIp } from "@/lib/case-study-lab/db";
import { runInterviewTurn } from "@/lib/case-study-lab/interview";
import { captureCaseStudyLead, EMAIL_RE } from "@/lib/case-study-lab/lead";
import { EMPTY_SLOTS, type AgencyBrand } from "@repo/prompts";

export const maxDuration = 60;

const HOURLY_LIMIT = 5;

export async function POST(req: Request): Promise<Response> {
  let url: string;
  let email: string;
  try {
    const body = await req.json();
    if (typeof body.url !== "string" || !body.url.trim()) throw new Error("missing url");
    url = normalizeUrl(body.url.trim());
    email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a real email address");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (ip && (await countRecentByIp(ip)) >= HOURLY_LIMIT) {
    return Response.json({ error: "Easy there. Try again in an hour." }, { status: 429 });
  }

  try {
    // Brand grab is best-effort — never block the interview on it.
    let brand: AgencyBrand = { colors: [], logoUrl: null };
    try {
      brand = await fetchBrand(url);
    } catch (e) {
      console.error("[case-study] brand grab failed:", e);
    }

    const turn = await runInterviewTurn({
      conversation: [],
      slots: EMPTY_SLOTS,
      latestUserMessage:
        "I'm ready to build a case study about a client win. Ask me your first question.",
      brand,
    });

    const id = await createDraft({
      email,
      agencyUrl: url,
      brand,
      firstReply: turn.reply,
      slots: turn.slots,
      ip,
    });

    // Email captured up front — fire the full lead pipeline immediately.
    await captureCaseStudyLead({ id, email, agencyUrl: url });

    return Response.json({ id, brand, reply: turn.reply });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
