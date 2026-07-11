import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  ARCHETYPE_ROUTER_PROMPT,
  buildRouterPrompt,
  type RouterOutput,
} from "@repo/prompts";

const ArchetypeSchema = z.enum([
  "proof",
  "transformation",
  "big_idea",
  "craft",
  "method",
]);

const RouterSchema = z.object({
  archetype: ArchetypeSchema,
  // Tolerate the model omitting a secondary — treat absent/null as "none".
  secondary: z
    .union([ArchetypeSchema, z.literal("none")])
    .nullish()
    .transform((v) => v ?? "none"),
  confidence: z.enum(["low", "medium", "high"]),
  why: z.string(),
  missingIngredients: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
});

export function parseRouterOutput(text: string): RouterOutput {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return RouterSchema.parse(JSON.parse(cleaned)) as RouterOutput;
}

export async function classifyArchetype(input: {
  discipline: string;
  rawWin: string;
  audience?: string | null;
}): Promise<RouterOutput> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 1000,
    system: ARCHETYPE_ROUTER_PROMPT,
    messages: [
      {
        role: "user",
        content: buildRouterPrompt({
          discipline: input.discipline,
          rawWin: input.rawWin,
          audience: input.audience ?? null,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseRouterOutput(text);
  } catch (e) {
    console.error("[case-study-lab] router classify parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't classify this win — please try again");
  }
}
