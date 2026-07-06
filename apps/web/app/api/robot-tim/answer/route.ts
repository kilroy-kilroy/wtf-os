// apps/web/app/api/robot-tim/answer/route.ts
import { getSession, appendAnswer } from "@/lib/robot-tim/db";
import { classifyAnswer } from "@/lib/robot-tim/classify";
import { advanceInterview } from "@/lib/robot-tim/state-machine";
import { maybeStartSynthesis } from "@/lib/robot-tim/synthesis-guard";
import { NODES } from "@repo/prompts";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  let id: string, answer: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    answer = String(body.answer ?? "").trim();
    if (!id || !answer) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Missing id or answer" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "interviewing" || session.interview_complete) {
    return Response.json({ error: "Interview already complete" }, { status: 409 });
  }

  const node = NODES[session.current_node];
  if (!node) return Response.json({ error: "No such node" }, { status: 409 });

  const classification = await classifyAnswer(node, answer, session.pushed);
  const move = advanceInterview(
    { currentNode: session.current_node, pushed: session.pushed },
    { satisfied: classification.satisfied }
  );

  await appendAnswer(
    id,
    session.answers,
    { nodeId: node.id, raw: answer, classification: classification.classification, reaction: classification.reaction },
    move.nextNode,
    move.pushed,
    move.interviewComplete
  );

  if (move.interviewComplete) {
    const fresh = await getSession(id);
    if (fresh && !fresh.crawl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
      waitUntil(
        fetch(`${appUrl}/api/robot-tim/crawl`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch((e) => console.error("[robot-tim] crawl re-kick failed:", e))
      );
    }
    await maybeStartSynthesis(id);
  }

  const nextNode = move.interviewComplete ? null : NODES[move.nextNode] ?? null;
  return Response.json({
    reaction: classification.reaction,
    action: move.action, // "push" | "advance" | "complete"
    done: move.interviewComplete,
    nextNode: nextNode ? { id: nextNode.id, ask: nextNode.ask } : null,
  });
}
