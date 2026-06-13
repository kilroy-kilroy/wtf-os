import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  WAH_WAH_SYSTEM_PROMPT,
  WAH_WAH_MODEL,
  buildWahWahUserPrompt,
} from "@repo/prompts";
import type { ExtractedPage } from "@/lib/wah-wah/extract";
import type { LexiconHit } from "@/lib/wah-wah/lexicon";

export const WahWahAnalysisSchema = z.object({
  score: z.number(),
  verdict: z.string(),
  flags: z.array(
    z.object({
      phrase: z.string(),
      context: z.string(),
      underneath: z.string(),
    })
  ),
  rewrite_teaser: z.string(),
});

export type WahWahAnalysis = z.infer<typeof WahWahAnalysisSchema>;

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function analyzeCopy(
  page: ExtractedPage,
  hits: LexiconHit[]
): Promise<WahWahAnalysis> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: WAH_WAH_MODEL,
    max_tokens: 16000,
    system: WAH_WAH_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildWahWahUserPrompt(page, hits) },
    ],
  });

  let text = response.content[0]?.type === "text" ? response.content[0].text : "";
  // Strip markdown code fences if the model wraps the JSON (repo convention).
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  let parsed: WahWahAnalysis;
  try {
    parsed = WahWahAnalysisSchema.parse(JSON.parse(text));
  } catch {
    throw new Error("Analysis failed — please try again");
  }
  return parsed;
}
