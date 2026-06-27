import { describe, it, expect } from "vitest";
import { parseInterviewTurn } from "@/lib/case-study-lab/interview";

describe("parseInterviewTurn", () => {
  it("parses a clean JSON turn", () => {
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "Nice — what number can you put on that?",
        slots: {
          clientName: "Acme",
          clientAnonymized: false,
          clientDescriptor: "An e-comm retention agency",
          results: [{ label: "Revenue growth", value: "800%" }],
          issues: [],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.reply).toMatch(/number/);
    expect(t.slots.results[0].value).toBe("800%");
    expect(t.readyToGenerate).toBe(false);
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({
        reply: "ok",
        slots: {
          clientName: null,
          clientAnonymized: false,
          clientDescriptor: null,
          results: [],
          issues: [],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      }) +
      "\n```";
    expect(() => parseInterviewTurn(wrapped)).not.toThrow();
  });

  it("caps issues at 3", () => {
    const four = [1, 2, 3, 4].map((n) => ({ issue: `i${n}`, solution: `s${n}` }));
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "ok",
        slots: {
          clientName: null,
          clientAnonymized: false,
          clientDescriptor: null,
          results: [],
          issues: four,
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.issues).toHaveLength(3);
  });
});
