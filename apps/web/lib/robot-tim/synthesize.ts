import Anthropic from "@anthropic-ai/sdk";
import {
  ROBOT_TIM_MODEL,
  SPINE_SYSTEM_PROMPT,
  buildSpinePrompt,
  MAKEOVER_SYSTEM_PROMPT,
  buildMakeoverPrompt,
  NODE7_SYSTEM_PROMPT,
  buildNode7Prompt,
} from "@repo/prompts";
import { SpineSchema, MakeoverSchema, Node7Schema } from "@/lib/robot-tim/schemas";
import type { Answer, Crawl, Makeover, Node7, Spine } from "@/lib/robot-tim/types";

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}
async function run(system: string, user: string): Promise<string> {
  const anthropic = getAnthropic();
  const res = await anthropic.messages.create({
    model: ROBOT_TIM_MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}

export async function generateSpine(answers: Answer[]): Promise<Spine> {
  const raw = await run(SPINE_SYSTEM_PROMPT, buildSpinePrompt(answers));
  try {
    return SpineSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Spine synthesis failed");
  }
}

export async function generateMakeover(spine: Spine, crawl: Crawl): Promise<Makeover> {
  const summary = crawl.pages.map((p) => ({ url: p.url, score: p.score }));
  const raw = await run(MAKEOVER_SYSTEM_PROMPT, buildMakeoverPrompt(spine, crawl.homepageText, summary));
  try {
    return MakeoverSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Makeover synthesis failed");
  }
}

export async function generateNode7(spine: Spine, makeover: Makeover): Promise<Node7> {
  const raw = await run(NODE7_SYSTEM_PROMPT, buildNode7Prompt(spine, makeover));
  try {
    return Node7Schema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Node 7 synthesis failed");
  }
}
