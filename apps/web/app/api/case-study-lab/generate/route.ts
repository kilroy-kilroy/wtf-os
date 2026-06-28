import { getReport, finalizeReport } from "@/lib/case-study-lab/db";
import { composeCaseStudy } from "@/lib/case-study-lab/compose";
import type { CaseStudySlots } from "@repo/prompts";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  let id: string;
  let clientName: string;
  let clientAnonymized: boolean;
  let clientLogoUrl: string | null;
  let cta: string | null;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    if (!id) throw new Error("missing id");
    clientAnonymized = Boolean(body.clientAnonymized);
    clientName = String(body.clientName ?? "").trim().slice(0, 120);
    clientLogoUrl = body.clientLogoUrl ? String(body.clientLogoUrl).slice(0, 500) : null;
    cta = body.cta ? String(body.cta).trim().slice(0, 200) : null;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });

  const slots = (report.slots as CaseStudySlots) ?? null;
  if (!slots || slots.results.length === 0) {
    return Response.json({ error: "Not enough gathered yet to generate." }, { status: 409 });
  }

  try {
    // Honor a CTA override from the review screen before composing.
    // Strip the real client name from slots when anonymized so it never reaches the model prompt.
    const effectiveSlots: CaseStudySlots = { ...slots, cta: cta ?? slots.cta, clientName: clientAnonymized ? null : slots.clientName };
    // Real name for the not-anonymized path only (clientName field the user typed, else extracted).
    const resolvedName = clientName || slots.clientName || "";
    // When anonymized, pass a generic descriptor — never the real name — to the model.
    const modelName = clientAnonymized
      ? (slots.clientDescriptor ?? "the client")
      : (resolvedName || "the client");

    const caseStudy = await composeCaseStudy({
      slots: effectiveSlots,
      clientName: modelName,
      clientAnonymized,
    });

    await finalizeReport(id, {
      result: caseStudy,
      clientName: clientAnonymized ? "" : resolvedName,
      clientAnonymized,
      clientLogoUrl: clientAnonymized ? null : clientLogoUrl,
      slots: clientAnonymized ? effectiveSlots : undefined,
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
