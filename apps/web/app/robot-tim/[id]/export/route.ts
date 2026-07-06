// apps/web/app/robot-tim/[id]/export/route.ts
import { getSession } from "@/lib/robot-tim/db";
import { generateRobotTimHTML, htmlToPdf } from "@repo/pdf";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.status !== "complete" || !session.spine || !session.makeover || !session.node7) {
    return new Response("Not ready", { status: 404 });
  }
  const hostname = (() => {
    try {
      return new URL(session.site_url).hostname;
    } catch {
      return session.site_url;
    }
  })();
  const html = generateRobotTimHTML({
    hostname,
    spine: session.spine,
    makeover: session.makeover,
    node7: session.node7,
  });
  const pdf = await htmlToPdf(html);
  return new Response(pdf as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="robot-tim-${hostname}.pdf"`,
    },
  });
}
