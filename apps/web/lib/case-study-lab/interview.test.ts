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

  it("accepts issues gathered before their solutions (solution: null)", () => {
    // Mid-interview, the owner lists blockers before any solution is captured.
    // The model correctly emits issues with solution: null — this must not throw.
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "Good — now, for each of those, what did you actually do to fix it?",
        slots: {
          clientName: "Splendid",
          clientAnonymized: false,
          clientDescriptor: "A DTC apparel brand",
          results: [{ label: "ROAS increase", value: "50%" }],
          issues: [
            { issue: "Poor Meta ad account structure", solution: null },
            { issue: "Under-developed Google Shopping campaigns", solution: null },
            { issue: "Very poor affiliate program", solution: null },
          ],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.issues).toHaveLength(3);
    expect(t.slots.issues[0].solution).toBeNull();
    expect(t.slots.issues[0].issue).toMatch(/Meta/);
  });

  it("normalizes a missing solution field to null", () => {
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "ok",
        slots: {
          clientName: null,
          clientAnonymized: false,
          clientDescriptor: null,
          results: [],
          issues: [{ issue: "no paid acquisition" }],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.issues[0].solution).toBeNull();
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
