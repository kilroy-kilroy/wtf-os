import { createClient } from "@/lib/supabase-auth-server";
import { getProReport, beginInterview } from "@/lib/case-study-lab/pro-db";
import { runProInterviewTurn } from "@/lib/case-study-lab/pro-interview";
import { ARCHETYPES, EMPTY_PRO_SLOTS, type AgencyBrand, type Archetype } from "@repo/prompts";

export const maxDuration = 60;

// The owner accepted (or overrode) the router's archetype. Record it and run the
// first archetype-specific interview turn, seeded by the pasted win.
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use Case Study Lab Pro." }, { status: 401 });

  let id: string;
  let archetype: Archetype;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    if (!id) throw new Error("missing id");
    if (!ARCHETYPES.includes(body.archetype)) throw new Error("unknown archetype");
    archetype = body.archetype as Archetype;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getProReport(id);
  if (!report || report.user_id !== user.id) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const brand = (report.agency_brand as AgencyBrand) ?? { colors: [], logoUrl: null, name: null };
    const seed = report.raw_win
      ? `I want to build a case study about this client win. Here's what happened:\n\n${report.raw_win}\n\nAsk me your first question.`
      : "I'm ready to build a case study about a client win. Ask me your first question.";

    const turn = await runProInterviewTurn({
      archetype,
      conversation: [],
      slots: EMPTY_PRO_SLOTS,
      latestUserMessage: seed,
      brand,
    });

    await beginInterview(id, archetype, turn.reply, turn.slots);

    return Response.json({ reply: turn.reply, slots: turn.slots, readyToGenerate: turn.readyToGenerate });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
