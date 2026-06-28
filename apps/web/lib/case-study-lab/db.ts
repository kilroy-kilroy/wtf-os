import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { CaseStudySlots, CaseStudy, AgencyBrand } from "@repo/prompts";

const TABLE = "case_study_lab_reports";
const BUCKET = "case-study-lab-assets";

export type ConversationTurn = { role: "assistant" | "user"; content: string };

export async function createDraft(input: {
  email: string;
  agencyUrl: string;
  brand: AgencyBrand;
  firstReply: string;
  slots: CaseStudySlots;
  ip: string | null;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      email: input.email,
      agency_url: input.agencyUrl,
      agency_brand: input.brand,
      conversation: [{ role: "assistant", content: input.firstReply }],
      slots: input.slots,
      status: "interviewing",
      ip: input.ip,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getReport(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select(
      "id, email, agency_url, agency_brand, client_name, client_anonymized, client_logo_url, status, conversation, slots, result, created_at"
    )
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// Append the user message + assistant reply and overwrite the gathered slots.
export async function saveTurn(
  id: string,
  conversation: ConversationTurn[],
  slots: CaseStudySlots
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ conversation, slots })
    .eq("id", id);
  if (error) throw error;
}

export async function finalizeReport(
  id: string,
  patch: {
    result: CaseStudy;
    clientName: string;
    clientAnonymized: boolean;
    clientLogoUrl: string | null;
    slots?: CaseStudySlots;
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const update: Record<string, unknown> = {
    result: patch.result,
    client_name: patch.clientName,
    client_anonymized: patch.clientAnonymized,
    client_logo_url: patch.clientLogoUrl,
    status: "complete",
  };
  if (patch.slots !== undefined) update.slots = patch.slots;
  const { error } = await (supabase as any)
    .from(TABLE)
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function countRecentByIp(ip: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await (supabase as any)
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneHourAgo);
  if (error) return 0;
  return count ?? 0;
}

export async function attachLead(id: string, email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any).from(TABLE).update({ email }).eq("id", id);
  if (error) throw error;
}

export async function uploadClientLogo(
  id: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const ext = contentType.split("/")[1]?.replace("+xml", "") || "png";
  const path = `${id}/logo.${ext}`;
  const { error } = await (supabase as any).storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
