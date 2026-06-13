import { describe, it, expect } from "vitest";
import { findLexiconHits, WAHWAH_PHRASES } from "@/lib/wah-wah/lexicon";

describe("findLexiconHits", () => {
  it("finds known phrases case-insensitively", () => {
    const text = "We are a Full-Service agency. Results-driven and strategic.";
    const hits = findLexiconHits(text);
    const phrases = hits.map((h) => h.phrase);
    expect(phrases).toContain("full-service");
    expect(phrases).toContain("results-driven");
  });

  it("returns surrounding context for each hit", () => {
    const text = "Acme is your partner in growth for modern brands.";
    const hits = findLexiconHits(text);
    expect(hits).toHaveLength(1);
    expect(hits[0].context).toContain("your partner in growth");
  });

  it("dedupes repeated phrases, keeping first occurrence", () => {
    const text = "Data-driven. Truly data-driven. Did we mention data-driven?";
    const hits = findLexiconHits(text);
    expect(hits.filter((h) => h.phrase === "data-driven")).toHaveLength(1);
  });

  it("has a non-trivial lexicon", () => {
    expect(WAHWAH_PHRASES.length).toBeGreaterThan(25);
  });
});
