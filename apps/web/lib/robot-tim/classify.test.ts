import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { classifyAnswer } from "@/lib/robot-tim/classify";
import { NODES } from "@repo/prompts";

describe("classifyAnswer", () => {
  beforeEach(() => mockCreate.mockReset());

  it("parses a fenced JSON response into a typed ClassifyResult", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n{"classification":"process","reaction":"Nobody falls in love with a process.","satisfied":false}\n```',
        },
      ],
    });
    const r = await classifyAnswer(NODES[3], "our proprietary framework", false);
    expect(r.classification).toBe("process");
    expect(r.satisfied).toBe(false);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("throws a friendly error on unparseable output", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });
    await expect(classifyAnswer(NODES[0], "hi", false)).rejects.toThrow(/could not read/i);
  });
});
