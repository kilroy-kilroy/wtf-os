import { createClient } from "@/lib/supabase-auth-server";
import { getProReport, finalizeProReport } from "@/lib/case-study-lab/pro-db";
import { composeByArchetype } from "@/lib/case-study-lab/pro-compose";
import { scoreDraft } from "@/lib/case-study-lab/score";
import type { Archetype, ProCaseStudySlots } from "@repo/prompts";

export const maxDuration = 60;

// Compose the archetype-specific case study, then run the scorer/coach over the
// draft, and finalize the report with both.
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use Case Study Lab Pro." }, { status: 401 });

  let id: string;
  let clientName: string;
  let clientAnonymized: boolean;
  let clientLogoUrl: string | null;
  let cta: string | null;
  let agencyName: string | null;
  let agencyLogoUrl: string | null;
  let accent: string | null;
  let ctaUrl: string | null;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    if (!id) throw new Error("missing id");
    clientAnonymized = Boolean(body.clientAnonymized);
    clientName = String(body.clientName ?? "").trim().slice(0, 120);
    clientLogoUrl = body.clientLogoUrl ? String(body.clientLogoUrl).slice(0, 500) : null;
    cta = body.cta ? String(body.cta).trim().slice(0, 200) : null;
    agencyName = body.agencyName ? String(body.agencyName).trim().slice(0, 120) : null;
    agencyLogoUrl = body.agencyLogoUrl ? String(body.agencyLogoUrl).slice(0, 500) : null;
    accent =
      typeof body.accent === "string" && /^#[0-9a-f]{6}$/i.test(body.accent.trim())
        ? body.accent.trim()
        : null;
    ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim().slice(0, 500) : null;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getProReport(id);
  if (!report || report.user_id !== user.id) return Response.json({ error: "Not found" }, { status: 404 });

  const archetype = report.archetype as Archetype;
  const slots = (report.slots as ProCaseStudySlots) ?? null;
  if (!slots) return Response.json({ error: "Not enough gathered yet to generate." }, { status: 409 });

  try {
    // Honor a CTA override; strip the real client name from slots when anonymized
    // so it never reaches the model prompt.
    const effectiveSlots: ProCaseStudySlots = {
      ...slots,
      cta: cta ?? slots.cta,
      clientName: clientAnonymized ? null : slots.clientName,
    };
    const resolvedName = clientName || slots.clientName || "";
    const modelName = clientAnonymized ? slots.clientDescriptor ?? "the client" : resolvedName || "the client";

    const caseStudy = await composeByArchetype(archetype, {
      slots: effectiveSlots,
      clientName: modelName,
      clientAnonymized,
    });

    // Score/coach the composed draft against its archetype recipe.
    const quality = await scoreDraft({ archetype, draft: JSON.stringify(caseStudy) });

    await finalizeProReport(id, {
      archetype,
      result: caseStudy,
      quality,
      clientName: clientAnonymized ? "" : resolvedName,
      clientAnonymized,
      clientLogoUrl: clientAnonymized ? null : clientLogoUrl,
      slots: clientAnonymized ? effectiveSlots : undefined,
      agencyName,
      agencyLogoUrl,
      accent,
      ctaUrl,
    });

    return Response.json({ ok: true, quality });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
