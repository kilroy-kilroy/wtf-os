// apps/web/app/api/robot-tim/resolve/route.ts
import { getSessionByStripe } from "@/lib/robot-tim/db";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const stripeId = url.searchParams.get("session_id");
  if (!stripeId) return Response.json({ error: "missing session_id" }, { status: 400 });
  const session = await getSessionByStripe(stripeId);
  if (!session) return Response.json({ id: null }, { status: 202 }); // webhook not done yet
  return Response.json({ id: session.id });
}
