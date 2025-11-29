import Anthropic from "@anthropic-ai/sdk";

export function getClaude() {
  return new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY!,
  });
}
