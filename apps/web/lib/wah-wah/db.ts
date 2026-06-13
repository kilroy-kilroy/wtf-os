import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { WahWahAnalysis } from "@/lib/wah-wah/analyze";

const TABLE = "wah_wah_reports";

export async function saveAnalysis(
  url: string,
  analysis: WahWahAnalysis,
  ip: string | null
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({ url, score: analysis.score, result: analysis, ip })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getAnalysis(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("id, url, score, result, email, created_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
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

// Write the captured email onto the report row at gate time (mirrors how
// visibility_lab_reports stores the lead email). The pipeline (Loops / Copper /
// beehiiv) owns the rest of the lead lifecycle.
export async function attachLead(id: string, email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ email })
    .eq("id", id);
  if (error) throw error;
}
