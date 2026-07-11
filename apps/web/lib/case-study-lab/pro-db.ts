import { getSupabaseServerClient } from "@/lib/supabase-server";
import { transcodeToPng } from "@/lib/case-study-lab/image";
import { EMPTY_PRO_SLOTS, type AgencyBrand, type Archetype, type ProCaseStudySlots, type RouterOutput, type ScoreResult } from "@repo/prompts";
import type { ConversationTurn } from "@/lib/case-study-lab/db";

const TABLE = "case_study_lab_pro_reports";
const BUCKET = "case-study-lab-assets";

// The columns a rendered report needs — kept explicit so the shape is stable.
const SELECT =
  "id, user_id, agency_url, agency_brand, agency_name, agency_logo_url, accent, discipline, raw_win, audience, archetype, secondary_archetype, router, client_name, client_anonymized, client_logo_url, asset_urls, status, conversation, slots, result, quality, cta_url, white_label, published, wall_slug, created_at";

export type ProReport = {
  id: string;
  user_id: string;
  archetype: Archetype;
  raw_win: string | null;
  agency_brand: AgencyBrand | null;
  status: string;
  conversation: ConversationTurn[];
  slots: ProCaseStudySlots | null;
  result: unknown;
  quality: ScoreResult | null;
  // …plus the render columns (typed loosely at the view boundary).
  [key: string]: unknown;
};

// Created on /classify with the router's recommendation. Status 'routing' until
// the owner confirms an archetype and the interview begins.
export async function createRoutingDraft(input: {
  userId: string;
  agencyUrl: string | null;
  discipline: string | null;
  rawWin: string;
  audience: string | null;
  brand: AgencyBrand;
  router: RouterOutput;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      user_id: input.userId,
      agency_url: input.agencyUrl,
      agency_brand: input.brand,
      agency_name: input.brand.name,
      agency_logo_url: input.brand.logoUrl,
      discipline: input.discipline,
      raw_win: input.rawWin,
      audience: input.audience,
      archetype: input.router.archetype,
      secondary_archetype: input.router.secondary,
      router: input.router,
      slots: EMPTY_PRO_SLOTS,
      status: "routing",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getProReport(id: string): Promise<ProReport | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any).from(TABLE).select(SELECT).eq("id", id).single();
  if (error) return null;
  return data as ProReport;
}

// The owner confirmed an archetype (possibly overriding the router). Record it,
// seed the conversation with the first interviewer reply, and open the interview.
export async function beginInterview(
  id: string,
  archetype: Archetype,
  firstReply: string,
  slots: ProCaseStudySlots
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({
      archetype,
      conversation: [{ role: "assistant", content: firstReply }],
      slots,
      status: "interviewing",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function saveProTurn(
  id: string,
  conversation: ConversationTurn[],
  slots: ProCaseStudySlots
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any).from(TABLE).update({ conversation, slots }).eq("id", id);
  if (error) throw error;
}

export async function finalizeProReport(
  id: string,
  patch: {
    archetype: Archetype;
    result: unknown;
    quality: ScoreResult;
    clientName: string;
    clientAnonymized: boolean;
    clientLogoUrl: string | null;
    slots?: ProCaseStudySlots;
    agencyName?: string | null;
    agencyLogoUrl?: string | null;
    accent?: string | null;
    ctaUrl?: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const update: Record<string, unknown> = {
    archetype: patch.archetype,
    result: patch.result,
    quality: patch.quality,
    client_name: patch.clientName,
    client_anonymized: patch.clientAnonymized,
    client_logo_url: patch.clientLogoUrl,
    status: "complete",
  };
  if (patch.slots !== undefined) update.slots = patch.slots;
  if (patch.agencyName !== undefined) update.agency_name = patch.agencyName;
  if (patch.agencyLogoUrl !== undefined) update.agency_logo_url = patch.agencyLogoUrl;
  if (patch.accent !== undefined) update.accent = patch.accent;
  if (patch.ctaUrl !== undefined) update.cta_url = patch.ctaUrl;
  const { error } = await (supabase as any).from(TABLE).update(update).eq("id", id);
  if (error) throw error;
}

// Upload one Craft Showcase asset (transcoded to PNG) to the public bucket.
export async function uploadProAsset(id: string, index: number, bytes: ArrayBuffer): Promise<string> {
  const supabase = getSupabaseServerClient();
  const png = await transcodeToPng(bytes);
  const path = `pro/${id}/asset-${index}.png`;
  const { error } = await (supabase as any).storage
    .from(BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl as string;
}
