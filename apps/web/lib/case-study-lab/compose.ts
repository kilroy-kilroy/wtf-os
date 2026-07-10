import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  CASE_STUDY_COMPOSER_PROMPT,
  buildComposePrompt,
  type CaseStudySlots,
  type CaseStudy,
} from "@repo/prompts";

const CaseStudySchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z.string().nullish().transform((v) => v ?? null),
  dek: z.string(),
  approach: z
    .array(z.object({ challenge: z.string(), method: z.string() }))
    .transform((a) => a.slice(0, 3)),
  bridge: z.string(),
  results: z
    .array(
      z.object({
        value: z.string(),
        caption: z.string(),
        direction: z.enum(["up", "down", "flat"]).catch("up"),
      })
    )
    .transform((a) => a.slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});

export function parseCaseStudy(text: string): CaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return CaseStudySchema.parse(JSON.parse(cleaned)) as CaseStudy;
}

export async function composeCaseStudy(input: {
  slots: CaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<CaseStudy> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: CASE_STUDY_COMPOSER_PROMPT,
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
    return parseCaseStudy(text);
  } catch (e) {
    console.error("[case-study-lab] compose parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Couldn't compose the case study — please try again");
  }
}
