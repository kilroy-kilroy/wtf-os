import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  ARCHETYPE_SCORER_PROMPT,
  buildScorerPrompt,
  scoreBand,
  type Archetype,
  type ScoreResult,
} from "@repo/prompts";

const SuggestionSchema = z.object({
  ingredient: z.string(),
  coaching: z.string(),
  slot: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});

const ScoreSchema = z.object({
  // Tolerate the model emitting the score as a string ("8") or a float (7.6).
  score: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number()
  ),
  missing: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  suggestions: z
    .array(SuggestionSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export function parseScoreResult(text: string): ScoreResult {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  const raw = ScoreSchema.parse(JSON.parse(cleaned));
  const score = Math.min(10, Math.max(1, Math.round(raw.score)));
  return {
    score,
    band: scoreBand(score),
    missing: raw.missing,
    suggestions: raw.suggestions,
  };
}

export async function scoreDraft(input: {
  archetype: Archetype;
  draft: string;
}): Promise<ScoreResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.beta.messages.create({
    // On a safety decline, the API re-runs the request on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: ARCHETYPE_SCORER_PROMPT,
    messages: [
      {
        role: "user",
        content: buildScorerPrompt({ archetype: input.archetype, draft: input.draft }),
      },
    ],
  });
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return parseScoreResult(text);
  } catch (e) {
    console.error("[case-study-lab] scorer parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't score this draft — please try again");
  }
}
