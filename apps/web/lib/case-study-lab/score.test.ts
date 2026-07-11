import { describe, it, expect } from "vitest";
import { parseScoreResult } from "@/lib/case-study-lab/score";

describe("parseScoreResult", () => {
  it("parses a clean score with suggestions and derives the band", () => {
    const r = parseScoreResult(
      JSON.stringify({
        score: 8,
        missing: ["business metric"],
        suggestions: [
          {
            ingredient: "business metric",
            coaching:
              "You have a marketing metric but no business metric. Studies with both score 7.5 vs 6.4 — add the revenue number.",
            slot: "results",
          },
        ],
      })
    );
    expect(r.score).toBe(8);
    expect(r.band).toBe("strong");
    expect(r.missing).toEqual(["business metric"]);
    expect(r.suggestions[0].slot).toBe("results");
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({ score: 5, missing: [], suggestions: [] }) +
      "\n```";
    expect(() => parseScoreResult(wrapped)).not.toThrow();
  });

  it("derives bands across the range", () => {
    expect(parseScoreResult(JSON.stringify({ score: 3 })).band).toBe("needs_work");
    expect(parseScoreResult(JSON.stringify({ score: 6 })).band).toBe("fair");
    expect(parseScoreResult(JSON.stringify({ score: 7 })).band).toBe("strong");
    expect(parseScoreResult(JSON.stringify({ score: 10 })).band).toBe("exceptional");
  });

  it("rounds and clamps out-of-range scores", () => {
    expect(parseScoreResult(JSON.stringify({ score: 7.6 })).score).toBe(8);
    expect(parseScoreResult(JSON.stringify({ score: 12 })).score).toBe(10);
    expect(parseScoreResult(JSON.stringify({ score: 0 })).score).toBe(1);
  });

  it("accepts the score as a string", () => {
    const r = parseScoreResult(JSON.stringify({ score: "9" }));
    expect(r.score).toBe(9);
    expect(r.band).toBe("exceptional");
  });

  it("defaults missing arrays and normalizes a null slot", () => {
    const r = parseScoreResult(
      JSON.stringify({
        score: 6,
        suggestions: [{ ingredient: "quote", coaching: "Add a client quote.", slot: null }],
      })
    );
    expect(r.missing).toEqual([]);
    expect(r.suggestions[0].slot).toBeNull();
  });
});
