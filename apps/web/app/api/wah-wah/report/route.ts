import { waitUntil } from "@vercel/functions";
import { getAnalysis, attachLead } from "@/lib/wah-wah/db";
import { onWahWahReportGenerated } from "@/lib/loops";
import { addWahWahSubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function POST(req: Request): Promise<Response> {
  let id: string, email: string, firstName: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    email = String(body.email ?? "").trim().toLowerCase();
    // Optional gate field — captured when freely given, never required.
    firstName = String(body.firstName ?? "").trim().slice(0, 80);
    if (!id || !EMAIL_RE.test(email)) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Enter a real email address" }, { status: 400 });
  }

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return Response.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Persist the lead email onto the report row before anything else.
  try {
    await attachLead(id, email);
  } catch (e) {
    console.error("[wah-wah] attachLead failed:", e);
  }

  // Full lead pipeline — parity with Visibility Lab. All best-effort; never
  // block the user's report on a downstream hiccup. Wah-Wah collects only an
  // email, so the submitted site's hostname stands in for brand/company.
  const hostname = hostnameOf(analysis.url);
  const score = analysis.score as number;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  waitUntil(
    addWahWahSubscriber(email, hostname, firstName || undefined).catch((err) =>
      console.error("[wah-wah] beehiiv subscribe failed:", err)
    )
  );

  waitUntil(
    copperSyncLead({
      email,
      name: firstName || undefined,
      companyName: hostname,
      productName: "Wah-Wah Detector",
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note: `Ran Wah-Wah Detector — Score: ${score}/100 on ${hostname}. View: ${appUrl}/wah-wah/r/${id}`,
    }).catch((err) => console.error("[wah-wah] copper sync failed:", err))
  );

  alertReportGenerated(firstName ? `${firstName} (${email})` : email, "wah-wah", hostname);

  waitUntil(
    onWahWahReportGenerated(email, id, score, hostname, firstName || undefined).catch((err) =>
      console.error("[wah-wah] loops event failed:", err)
    )
  );

  return Response.json({
    url: analysis.url,
    result: analysis.result,
    created_at: analysis.created_at,
  });
}
