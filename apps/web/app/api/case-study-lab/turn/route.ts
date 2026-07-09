import { getReport, saveTurn, type ConversationTurn } from "@/lib/case-study-lab/db";
import { runInterviewTurn } from "@/lib/case-study-lab/interview";
import { EMPTY_SLOTS, type AgencyBrand, type CaseStudySlots } from "@repo/prompts";

export const maxDuration = 60;

const MAX_MESSAGE = 2000;
const MAX_TURNS = 40; // safety cap against runaway chats

export async function POST(req: Request): Promise<Response> {
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

  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  if (report.status === "complete") {
    return Response.json({ error: "This case study is already finished." }, { status: 409 });
  }

  const conversation: ConversationTurn[] = Array.isArray(report.conversation)
    ? report.conversation
    : [];
  if (conversation.length >= MAX_TURNS) {
    return Response.json({ error: "That's a long chat — generate what you've got." }, { status: 409 });
  }

  try {
    const turn = await runInterviewTurn({
      conversation,
      slots: (report.slots as CaseStudySlots) ?? EMPTY_SLOTS,
      latestUserMessage: message,
      brand: (report.agency_brand as AgencyBrand) ?? { colors: [], logoUrl: null, name: null },
    });

    const nextConversation: ConversationTurn[] = [
      ...conversation,
      { role: "user", content: message },
      { role: "assistant", content: turn.reply },
    ];
    await saveTurn(id, nextConversation, turn.slots);

    return Response.json({
      reply: turn.reply,
      slots: turn.slots,
      readyToGenerate: turn.readyToGenerate,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
