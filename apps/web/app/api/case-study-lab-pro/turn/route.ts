import { createClient } from "@/lib/supabase-auth-server";
import { getProReport, saveProTurn } from "@/lib/case-study-lab/pro-db";
import { runProInterviewTurn } from "@/lib/case-study-lab/pro-interview";
import { EMPTY_PRO_SLOTS, type AgencyBrand, type Archetype, type ProCaseStudySlots } from "@repo/prompts";
import type { ConversationTurn } from "@/lib/case-study-lab/db";

export const maxDuration = 60;

const MAX_MESSAGE = 2000;
const MAX_TURNS = 40;

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use Case Study Lab Pro." }, { status: 401 });

  let id: string;
  let message: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE);
    if (!id || !message) throw new Error("missing id or message");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getProReport(id);
  if (!report || report.user_id !== user.id) return Response.json({ error: "Not found" }, { status: 404 });
  if (report.status === "complete") {
    return Response.json({ error: "This case study is already finished." }, { status: 409 });
  }

  const conversation: ConversationTurn[] = Array.isArray(report.conversation) ? report.conversation : [];
  if (conversation.length >= MAX_TURNS) {
    return Response.json({ error: "That's a long chat — generate what you've got." }, { status: 409 });
  }

  try {
    const turn = await runProInterviewTurn({
      archetype: report.archetype as Archetype,
      conversation,
      slots: (report.slots as ProCaseStudySlots) ?? EMPTY_PRO_SLOTS,
      latestUserMessage: message,
      brand: (report.agency_brand as AgencyBrand) ?? { colors: [], logoUrl: null, name: null },
    });

    const nextConversation: ConversationTurn[] = [
      ...conversation,
      { role: "user", content: message },
      { role: "assistant", content: turn.reply },
    ];
    await saveProTurn(id, nextConversation, turn.slots);

    return Response.json({ reply: turn.reply, slots: turn.slots, readyToGenerate: turn.readyToGenerate });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
