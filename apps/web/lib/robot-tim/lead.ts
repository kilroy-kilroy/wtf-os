import { waitUntil } from "@vercel/functions";
import { onRobotTimPurchased } from "@/lib/loops";
import { addRobotTimSubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";

const ROBOT_TIM_ACV = 39900; // $399 one-time, in cents (Copper convention)

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Fires the full pipeline for a paid Robot-Tim purchase. Unlike the
 * Detector's free lead, this is a WON customer at $399. Best-effort /
 * non-blocking — mirrors captureWahWahLead's fan-out shape.
 */
export async function captureRobotTimCustomer(params: {
  id: string;
  email: string;
  firstName?: string;
  siteUrl: string;
}): Promise<void> {
  const { id, email, firstName, siteUrl } = params;
  const hostname = hostnameOf(siteUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  waitUntil(
    addRobotTimSubscriber(email, hostname, firstName || undefined).catch((e) =>
      console.error("[robot-tim] beehiiv subscribe failed:", e)
    )
  );

  waitUntil(
    copperSyncLead({
      email,
      name: firstName || undefined,
      companyName: hostname,
      productName: "Robot-Tim Positioning Engine",
      opportunityValue: ROBOT_TIM_ACV,
      stageId: COPPER_STAGES.CLOSED_WON,
      note: `Bought Robot-Tim ($399) for ${hostname}. Session: ${appUrl}/robot-tim/${id}`,
    }).catch((e) => console.error("[robot-tim] copper sync failed:", e))
  );

  alertReportGenerated(firstName ? `${firstName} (${email})` : email, "robot-tim", hostname);

  waitUntil(
    onRobotTimPurchased(email, id, hostname, firstName || undefined).catch((e) =>
      console.error("[robot-tim] loops event failed:", e)
    )
  );
}
