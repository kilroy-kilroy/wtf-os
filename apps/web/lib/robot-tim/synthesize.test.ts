import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { generateSpine } from "@/lib/robot-tim/synthesize";

describe("generateSpine", () => {
  beforeEach(() => mockCreate.mockReset());

  it("parses a valid Spine JSON response", async () => {
    const spine = {
      whoFor: "curious operators",
      whoNotFor: "micromanagers",
      problemTheyThink: "need more leads",
      problemTheyHave: "no point of view",
      valueNotBought: "confidence in their own numbers",
      traps: ["a", "b", "c"],
      headlines: ["h1", "h2", "h3"],
      vvvOneLiner: "the one line",
    };
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(spine) }] });
    const r = await generateSpine([{ nodeId: 3, raw: "we made them look good", classification: "real", reaction: "" }]);
    expect(r.whoFor).toBe("curious operators");
    expect(r.traps).toHaveLength(3);
  });

  it("throws on unparseable output", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "nope" }] });
    await expect(generateSpine([])).rejects.toThrow(/synthesis failed/i);
  });
});
