import { describe, it, expect } from "vitest";
import { parseRouterOutput } from "@/lib/case-study-lab/router";

describe("parseRouterOutput", () => {
  it("parses a clean router recommendation", () => {
    const r = parseRouterOutput(
      JSON.stringify({
        archetype: "proof",
        secondary: "method",
        confidence: "high",
        why: "You led with hard, attributable revenue numbers — lead with the result.",
        missingIngredients: ["a verbatim client quote"],
      })
    );
    expect(r.archetype).toBe("proof");
    expect(r.secondary).toBe("method");
    expect(r.confidence).toBe("high");
    expect(r.missingIngredients).toHaveLength(1);
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({
        archetype: "big_idea",
        secondary: "proof",
        confidence: "medium",
        why: "The reframe is the reason it worked; bolt on the numbers for the buyer.",
        missingIngredients: [],
      }) +
      "\n```";
    expect(() => parseRouterOutput(wrapped)).not.toThrow();
  });

  it("normalizes an omitted secondary to 'none'", () => {
    const r = parseRouterOutput(
      JSON.stringify({
        archetype: "craft",
        confidence: "low",
        why: "The work speaks for itself, but there's no business outcome yet.",
        missingIngredients: ["a business metric — the work alone won't move a B2B buyer"],
      })
    );
    expect(r.secondary).toBe("none");
  });

  it("normalizes a null secondary to 'none'", () => {
    const r = parseRouterOutput(
      JSON.stringify({
        archetype: "transformation",
        secondary: null,
        confidence: "high",
        why: "A multi-phase, multi-year arc — tell it as a journey.",
        missingIngredients: [],
      })
    );
    expect(r.secondary).toBe("none");
  });

  it("defaults missing missingIngredients to an empty array", () => {
    const r = parseRouterOutput(
      JSON.stringify({
        archetype: "method",
        secondary: "proof",
        confidence: "high",
        why: "You have a named, repeatable framework — make the system the hero.",
      })
    );
    expect(r.missingIngredients).toEqual([]);
  });

  it("rejects an unknown archetype value", () => {
    expect(() =>
      parseRouterOutput(
        JSON.stringify({
          archetype: "storytelling",
          secondary: "none",
          confidence: "high",
          why: "nope",
          missingIngredients: [],
        })
      )
    ).toThrow();
  });
});
