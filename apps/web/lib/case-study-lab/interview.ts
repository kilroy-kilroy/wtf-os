import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  CASE_STUDY_INTERVIEWER_PROMPT,
  buildInterviewTurnPrompt,
  type CaseStudySlots,
  type AgencyBrand,
} from "@repo/prompts";
import type { ConversationTurn } from "@/lib/case-study-lab/db";

const ResultSchema = z.object({ label: z.string(), value: z.string() });
// solution is gathered AFTER the issue during the interview, so it may be
// absent/null on the turn where the owner first lists blockers. Normalize to null.
const IssueSchema = z.object({
  issue: z.string(),
  solution: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
const QuoteSchema = z.object({ text: z.string(), attribution: z.string() });

const SlotsSchema = z.object({
  clientName: z.string().nullable(),
  clientAnonymized: z.boolean(),
  clientDescriptor: z.string().nullable(),
  beforeState: z.string().nullish().transform((v) => v ?? null),
  results: z.array(ResultSchema),
  issues: z.array(IssueSchema).transform((a) => a.slice(0, 3)),
  quote: QuoteSchema.nullable(),
  cta: z.string().nullable(),
  teamCredit: z.string().nullable(),
});

const TurnSchema = z.object({
  reply: z.string(),
  slots: SlotsSchema,
  readyToGenerate: z.boolean(),
});

export type InterviewTurn = {
  reply: string;
  slots: CaseStudySlots;
  readyToGenerate: boolean;
};

export function parseInterviewTurn(text: string): InterviewTurn {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return TurnSchema.parse(JSON.parse(cleaned)) as InterviewTurn;
}

function transcriptOf(conversation: ConversationTurn[]): string {
  return conversation
    .map((t) => `${t.role === "assistant" ? "INTERVIEWER" : "OWNER"}: ${t.content}`)
    .join("\n");
}

export async function runInterviewTurn(input: {
  conversation: ConversationTurn[];
  slots: CaseStudySlots;
  latestUserMessage: string;
  brand: AgencyBrand;
}): Promise<InterviewTurn> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: CASE_STUDY_INTERVIEWER_PROMPT,
    messages: [
      {
        role: "user",
        content: buildInterviewTurnPrompt({
          transcript: transcriptOf(input.conversation),
          slots: input.slots,
          latestUserMessage: input.latestUserMessage,
          brand: input.brand,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseInterviewTurn(text);
  } catch (e) {
    // Don't swallow the real reason — a blind 502 here is undebuggable.
    console.error("[case-study-lab] interview turn parse failed", {
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Interview hiccup — try sending that again");
  }
}
