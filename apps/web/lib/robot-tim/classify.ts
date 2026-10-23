import Anthropic from "@anthropic-ai/sdk";
import { INTERVIEW_SYSTEM_PROMPT, ROBOT_TIM_MODEL, buildClassifyPrompt, type RobotTimNode } from "@repo/prompts";
import { ClassifyResultSchema, type ClassifyResult } from "@/lib/robot-tim/schemas";

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function classifyAnswer(
  node: RobotTimNode,
  answer: string,
  alreadyPushed: boolean
): Promise<ClassifyResult> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: ROBOT_TIM_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildClassifyPrompt(node, answer, alreadyPushed) }],
  });
  const raw = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return ClassifyResultSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Robot-Tim could not read that answer — please try again");
  }
}
