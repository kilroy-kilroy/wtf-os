import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { buildWahWahUserPrompt } from "@repo/prompts";
import { analyzeCopy } from "@/lib/wah-wah/analyze";

const page = {
  title: "Acme Creative",
  metaDescription: "A full-service creative agency.",
  h1: "Brands that resonate",
  bodyText: "We are results-driven and strategic. Your partner in growth.",
};

const fake = {
  score: 81,
  verdict: "You sound like everyone.",
  flags: [
    {
      phrase: "results-driven",
      context: "We are results-driven and strategic",
      underneath: "You mean you actually care whether the work works.",
    },
  ],
  rewrite_teaser: "Say the thing only you can say.",
};

function textResponse(s: string) {
  return { content: [{ type: "text", text: s }] };
}

describe("buildWahWahUserPrompt", () => {
  it("includes page sections and lexicon hits", () => {
    const prompt = buildWahWahUserPrompt(page, [
      { phrase: "results-driven", context: "We are results-driven and strategic" },
    ]);
    expect(prompt).toContain("Acme Creative");
    expect(prompt).toContain("Brands that resonate");
    expect(prompt).toContain("results-driven");
  });
});

describe("analyzeCopy", () => {
  beforeEach(() => mockCreate.mockReset());

  it("parses raw JSON structured output", async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify(fake)));
    const result = await analyzeCopy(page, []);
    expect(result.score).toBe(81);
    expect(result.flags).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("strips markdown code fences before parsing", async () => {
    mockCreate.mockResolvedValue(textResponse("```json\n" + JSON.stringify(fake) + "\n```"));
    const result = await analyzeCopy(page, []);
    expect(result.verdict).toBe("You sound like everyone.");
  });

  it("throws a friendly error when the model returns non-JSON", async () => {
    mockCreate.mockResolvedValue(textResponse("sorry, I can't do that"));
    await expect(analyzeCopy(page, [])).rejects.toThrow(/analysis failed/i);
  });
});
