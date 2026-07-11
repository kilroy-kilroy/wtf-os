import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  interviewerPromptFor,
  buildInterviewTurnPrompt,
  type Archetype,
  type ProCaseStudySlots,
  type AgencyBrand,
} from "@repo/prompts";
import type { ConversationTurn } from "@/lib/case-study-lab/db";

// Superset of the free tool's SlotsSchema (which lives, unexported, in
// interview.ts). Re-declared here so the free path stays byte-for-byte
// untouched; archetype-specific slots are permissive-nullable so any archetype's
// turn validates and the PROMPT enforces which slots actually matter.
const ResultSchema = z.object({ label: z.string(), value: z.string() });
const IssueSchema = z.object({
  issue: z.string(),
  solution: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
const QuoteSchema = z.object({ text: z.string(), attribution: z.string() });
const PhaseSchema = z.object({
  label: z.string(),
  // detail is gathered after the label during the interview -> may be null.
  detail: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  timeframe: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});

const ProSlotsSchema = z.object({
  clientName: z.string().nullable(),
  clientAnonymized: z.boolean(),
  clientDescriptor: z.string().nullable(),
  beforeState: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  phases: z
    .array(PhaseSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 5)),
  endState: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  timeline: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  results: z
    .array(ResultSchema)
    .nullish()
    .transform((a) => a ?? []),
  issues: z
    .array(IssueSchema)
    .nullish()
    .transform((a) => (a ?? []).slice(0, 3)),
  quote: QuoteSchema.nullable(),
  cta: z.string().nullable(),
  teamCredit: z.string().nullable(),
});

const ProTurnSchema = z.object({
  reply: z.string(),
  slots: ProSlotsSchema,
  readyToGenerate: z.boolean(),
});

export type ProInterviewTurn = {
  reply: string;
  slots: ProCaseStudySlots;
  readyToGenerate: boolean;
};

export function parseProInterviewTurn(text: string): ProInterviewTurn {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return ProTurnSchema.parse(JSON.parse(cleaned)) as ProInterviewTurn;
}

function transcriptOf(conversation: ConversationTurn[]): string {
  return conversation
    .map((t) => `${t.role === "assistant" ? "INTERVIEWER" : "OWNER"}: ${t.content}`)
    .join("\n");
}

export async function runProInterviewTurn(input: {
  archetype: Archetype;
  conversation: ConversationTurn[];
  slots: ProCaseStudySlots;
  latestUserMessage: string;
  brand: AgencyBrand;
}): Promise<ProInterviewTurn> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: interviewerPromptFor(input.archetype),
    messages: [
      {
        role: "user",
        // buildInterviewTurnPrompt just JSON-stringifies the slots, so the
        // superset fields (phases/endState/timeline) reach the model verbatim.
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
    return parseProInterviewTurn(text);
  } catch (e) {
    console.error("[case-study-lab] pro interview turn parse failed", {
      archetype: input.archetype,
      stopReason: response.stop_reason,
      error: e instanceof Error ? e.message : String(e),
      rawHead: text.slice(0, 800),
    });
    throw new Error("Interview hiccup — try sending that again");
  }
}
