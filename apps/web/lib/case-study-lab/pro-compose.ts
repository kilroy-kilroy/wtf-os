import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  composerPromptFor,
  buildComposePrompt,
  type Archetype,
  type ProCaseStudySlots,
  type TransformationCaseStudy,
  type BigIdeaCaseStudy,
  type MethodCaseStudy,
  type CraftCaseStudy,
} from "@repo/prompts";
import { composeCaseStudy } from "@/lib/case-study-lab/compose";

const StatSchema = z.object({
  value: z.string(),
  caption: z.string(),
  direction: z.enum(["up", "down", "flat"]).catch("up"),
});

const TransformationPhaseSchema = z.object({
  label: z.string(),
  detail: z.string(),
  timeframe: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});

const TransformationSchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  dek: z.string(),
  startingState: z.string(),
  phases: z.array(TransformationPhaseSchema).transform((a) => a.slice(0, 5)),
  results: z
    .array(StatSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 3)),
  endState: z.string(),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});

export function parseTransformationCaseStudy(text: string): TransformationCaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return TransformationSchema.parse(JSON.parse(cleaned)) as TransformationCaseStudy;
}

export async function composeTransformation(input: {
  slots: ProCaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<TransformationCaseStudy> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: composerPromptFor("transformation"),
    messages: [
      {
        role: "user",
        content: buildComposePrompt({
          slots: input.slots,
          clientName: input.clientName,
          clientAnonymized: input.clientAnonymized,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseTransformationCaseStudy(text);
  } catch (e) {
    console.error("[case-study-lab] transformation compose parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't compose the transformation story — please try again");
  }
}

const BigIdeaSchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  dek: z.string(),
  insight: z.string(),
  manifestation: z.string(),
  results: z
    .array(StatSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});

export function parseBigIdeaCaseStudy(text: string): BigIdeaCaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return BigIdeaSchema.parse(JSON.parse(cleaned)) as BigIdeaCaseStudy;
}

export async function composeBigIdea(input: {
  slots: ProCaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<BigIdeaCaseStudy> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: composerPromptFor("big_idea"),
    messages: [
      {
        role: "user",
        content: buildComposePrompt({
          slots: input.slots,
          clientName: input.clientName,
          clientAnonymized: input.clientAnonymized,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseBigIdeaCaseStudy(text);
  } catch (e) {
    console.error("[case-study-lab] big idea compose parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't compose the big idea story — please try again");
  }
}

const MethodStepSchema = z.object({ name: z.string(), detail: z.string() });

const MethodSchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  dek: z.string(),
  framework: z.string(),
  steps: z.array(MethodStepSchema).transform((a) => a.slice(0, 6)),
  results: z
    .array(StatSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});

export function parseMethodCaseStudy(text: string): MethodCaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return MethodSchema.parse(JSON.parse(cleaned)) as MethodCaseStudy;
}

export async function composeMethod(input: {
  slots: ProCaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<MethodCaseStudy> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: composerPromptFor("method"),
    messages: [
      {
        role: "user",
        content: buildComposePrompt({
          slots: input.slots,
          clientName: input.clientName,
          clientAnonymized: input.clientAnonymized,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseMethodCaseStudy(text);
  } catch (e) {
    console.error("[case-study-lab] method compose parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't compose the method story — please try again");
  }
}

const CraftAssetSchema = z.object({
  // The model echoes urls; may be missing/blank. Authoritative urls are
  // re-attached from the slots in composeCraft, so tolerate anything here.
  url: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  caption: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});

const CraftSchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  dek: z.string(),
  craftDecision: z.string(),
  assets: z
    .array(CraftAssetSchema)
    .nullish()
    .transform((a) => a ?? []),
  results: z
    .array(StatSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});

export function parseCraftCaseStudy(text: string): CraftCaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return CraftSchema.parse(JSON.parse(cleaned)) as CraftCaseStudy;
}

export async function composeCraft(input: {
  slots: ProCaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<CraftCaseStudy> {
  // Guardrail (spec): a Craft Showcase without shown work has no hero — block
  // generation before spending a model call. The work IS the proof.
  const uploaded = input.slots.assets.filter((a) => !!a.url);
  if (uploaded.length === 0) {
    throw new Error(
      "Craft Showcase needs at least one uploaded piece of work — the work is the proof."
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: composerPromptFor("craft"),
    messages: [
      {
        role: "user",
        content: buildComposePrompt({
          slots: input.slots,
          clientName: input.clientName,
          clientAnonymized: input.clientAnonymized,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  let parsed: CraftCaseStudy;
  try {
    parsed = parseCraftCaseStudy(text);
  } catch (e) {
    console.error("[case-study-lab] craft compose parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't compose the craft showcase — please try again");
  }

  // Re-attach authoritative urls from the uploaded slots (never trust the model
  // with a url), keeping the model's sharpened captions by position.
  const assets = uploaded.map((a, i) => ({
    url: a.url as string,
    caption: parsed.assets[i]?.caption ?? a.caption ?? null,
  }));
  return { ...parsed, assets };
}

// Compose the right case-study shape for the chosen archetype. Returns the
// archetype-specific object (stored as jsonb). proof reuses the free composer.
export function composeByArchetype(
  archetype: Archetype,
  input: { slots: ProCaseStudySlots; clientName: string; clientAnonymized: boolean }
): Promise<TransformationCaseStudy | BigIdeaCaseStudy | MethodCaseStudy | CraftCaseStudy | Awaited<ReturnType<typeof composeCaseStudy>>> {
  switch (archetype) {
    case "transformation":
      return composeTransformation(input);
    case "big_idea":
      return composeBigIdea(input);
    case "method":
      return composeMethod(input);
    case "craft":
      return composeCraft(input);
    case "proof":
      return composeCaseStudy(input);
    default:
      throw new Error(`Case Study Lab Pro: no composer for archetype "${archetype}"`);
  }
}
