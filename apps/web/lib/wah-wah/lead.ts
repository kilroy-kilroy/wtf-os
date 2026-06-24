import { waitUntil } from "@vercel/functions";
import { attachLead } from "@/lib/wah-wah/db";
import { onWahWahReportGenerated } from "@/lib/loops";
import { addWahWahSubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Capture the lead and fan out to the full pipeline for a Wah-Wah report.
 *
 * Persists the email onto the report row, then fires Beehiiv / Copper / Slack /
 * Loops. Everything downstream is best-effort and non-blocking (`waitUntil`) —
 * the caller's response is never held up by a third-party hiccup. Wah-Wah
 * collects only an email, so the submitted site's hostname stands in for
 * brand/company.
 *
 * Shared by the analyze route (upfront capture) so the lead lifecycle is
 * identical no matter where the email is collected.
 */
export async function captureWahWahLead(params: {
  id: string;
  email: string;
  firstName?: string;
  url: string;
  score: number;
}): Promise<void> {
  const { id, email, firstName, url, score } = params;
  const hostname = hostnameOf(url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  // Persist the lead email onto the report row before anything else.
  try {
    await attachLead(id, email);
  } catch (e) {
    console.error("[wah-wah] attachLead failed:", e);
  }

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
}
