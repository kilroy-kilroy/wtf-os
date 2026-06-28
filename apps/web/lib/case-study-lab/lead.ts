import { waitUntil } from "@vercel/functions";
import { attachLead } from "@/lib/case-study-lab/db";
import { EMAIL_RE } from "@/lib/wah-wah/lead";
import { addCaseStudySubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";
import { onCaseStudyReportGenerated } from "@/lib/loops";

export { EMAIL_RE };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Capture the lead and fan out for a Case Study Lab report. Fires up front on
 * /start so the lead is kept even if the interview is abandoned. All downstream
 * calls are best-effort and non-blocking (`waitUntil`).
 */
export async function captureCaseStudyLead(params: {
  id: string;
  email: string;
  agencyUrl: string;
}): Promise<void> {
  const { id, email, agencyUrl } = params;
  const hostname = hostnameOf(agencyUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  try {
    await attachLead(id, email);
  } catch (e) {
    console.error("[case-study] attachLead failed:", e);
  }

  waitUntil(
    addCaseStudySubscriber(email, hostname).catch((err) =>
      console.error("[case-study] beehiiv subscribe failed:", err)
    )
  );

  waitUntil(
    copperSyncLead({
      email,
      companyName: hostname,
      productName: "Case Study Lab",
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note: `Started Case Study Lab on ${hostname}. View: ${appUrl}/case-study-lab/r/${id}`,
    }).catch((err) => console.error("[case-study] copper sync failed:", err))
  );

  alertReportGenerated(email, "case-study", hostname);

  waitUntil(
    onCaseStudyReportGenerated(email, id, hostname).catch((err) =>
      console.error("[case-study] loops event failed:", err)
    )
  );
}
