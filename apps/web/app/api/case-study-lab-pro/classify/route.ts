import { createClient } from "@/lib/supabase-auth-server";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import { fetchBrand } from "@/lib/case-study-lab/extract";
import { classifyArchetype } from "@/lib/case-study-lab/router";
import { createRoutingDraft } from "@/lib/case-study-lab/pro-db";
import type { AgencyBrand } from "@repo/prompts";

export const maxDuration = 60;

// Pro step: the router runs BEFORE the interview. Grab the agency brand, classify
// the win into its best-fit archetype, and open a 'routing' draft for the account.
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use Case Study Lab Pro." }, { status: 401 });

  let url: string | null;
  let discipline: string;
  let rawWin: string;
  let audience: string | null;
  try {
    const body = await req.json();
    if (typeof body.rawWin !== "string" || !body.rawWin.trim()) throw new Error("Tell me about the win.");
    rawWin = body.rawWin.trim().slice(0, 4000);
    discipline = String(body.discipline ?? "").trim().slice(0, 200);
    audience = body.audience ? String(body.audience).trim().slice(0, 200) : null;
    url = body.url && String(body.url).trim() ? normalizeUrl(String(body.url).trim()) : null;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  try {
    // Brand grab is best-effort — never block classification on it.
    let brand: AgencyBrand = { colors: [], logoUrl: null, name: null };
    if (url) {
      try {
        brand = await fetchBrand(url);
      } catch (e) {
        console.error("[case-study-pro] brand grab failed:", e);
      }
    }

    const recommendation = await classifyArchetype({
      discipline: discipline || brand.name || "",
      rawWin,
      audience,
    });

    const id = await createRoutingDraft({
      userId: user.id,
      agencyUrl: url,
      discipline: discipline || null,
      rawWin,
      audience,
      brand,
      router: recommendation,
    });

    return Response.json({ id, brand, recommendation });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
