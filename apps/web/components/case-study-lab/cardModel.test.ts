import { describe, it, expect } from "vitest";
import { CARD_SIZES, buildCardModel } from "@/components/case-study-lab/cardModel";

describe("CARD_SIZES", () => {
  it("defines the three aspect ratios", () => {
    expect(CARD_SIZES.square).toEqual({ width: 1080, height: 1080 });
    expect(CARD_SIZES.portrait).toEqual({ width: 1080, height: 1350 });
    expect(CARD_SIZES.landscape).toEqual({ width: 1200, height: 675 });
  });
});

describe("buildCardModel", () => {
  it("picks an accent color from brand, with a safe fallback", () => {
    const m = buildCardModel({
      agency_brand: { colors: ["#1a2b3c"], logoUrl: null, name: null },
      client_logo_url: null,
      result: {
        headline: "800% revenue growth",
        clientName: "Acme",
        clientDescriptor: "An agency",
        results: [{ label: "Revenue growth", value: "800%" }],
        issues: [],
        quote: null,
        cta: "Book a call",
        teamCredit: null,
      },
    });
    expect(m.accent).toBe("#1a2b3c");
    expect(m.headline).toMatch(/800%/);
    expect(m.topResults).toHaveLength(1);
  });

  it("falls back to a default accent when brand has no colors", () => {
    const m = buildCardModel({
      agency_brand: { colors: [], logoUrl: null, name: null },
      client_logo_url: null,
      result: {
        headline: "x",
        clientName: "Acme",
        clientDescriptor: "An agency",
        results: [],
        issues: [],
        quote: null,
        cta: "Book a call",
        teamCredit: null,
      },
    });
    expect(m.accent).toBe("#E51B23");
  });
});
