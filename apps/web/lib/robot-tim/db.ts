// apps/web/lib/robot-tim/db.ts
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Answer, Crawl, Makeover, Node7, RobotTimSession, Spine } from "@/lib/robot-tim/types";

const TABLE = "robot_tim_sessions";
function db() {
  return getSupabaseServerClient() as any;
}

export async function createSession(p: {
  email: string | null;
  firstName: string | null;
  siteUrl: string;
  stripeSessionId: string;
}): Promise<string> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      email: p.email,
      first_name: p.firstName,
      site_url: p.siteUrl,
      stripe_session_id: p.stripeSessionId,
      status: "interviewing",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getSession(id: string): Promise<RobotTimSession | null> {
  const { data, error } = await db().from(TABLE).select("*").eq("id", id).single();
  if (error) return null;
  return data as RobotTimSession;
}

export async function getSessionByStripe(stripeSessionId: string): Promise<RobotTimSession | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .single();
  if (error) return null;
  return data as RobotTimSession;
}

// Append one answer and move the interview pointer. `pushed` and `interviewComplete`
// are the post-move values computed by the state machine.
export async function appendAnswer(
  id: string,
  current: Answer[],
  answer: Answer,
  nextNode: number,
  pushed: boolean,
  interviewComplete: boolean
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({
      answers: [...current, answer],
      current_node: nextNode,
      pushed,
      interview_complete: interviewComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function saveCrawl(id: string, crawl: Crawl): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({ crawl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Atomically claim synthesis: flip status interviewing → synthesizing only when
// BOTH the interview is done AND the crawl has landed. Returns true if THIS caller
// won the race (idempotent — the loser gets false). Uses .eq() CAS, never .or()
// (see project memory on PostgREST .or()+update).
export async function tryClaimSynthesis(id: string): Promise<boolean> {
  const { data, error } = await db()
    .from(TABLE)
    .update({ status: "synthesizing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "interviewing")
    .eq("interview_complete", true)
    .not("crawl", "is", null)
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

// Mark a session failed so the UI does not spin forever when background
// synthesis work throws inside waitUntil (no route response is left to carry
// the error back to the client).
export async function markFailed(id: string): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function saveDeliverable(
  id: string,
  d: { spine: Spine; makeover: Makeover; node7: Node7 }
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({
      spine: d.spine,
      makeover: d.makeover,
      node7: d.node7,
      status: "complete",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
