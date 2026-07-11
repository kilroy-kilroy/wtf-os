import { describe, it, expect } from "vitest";
import { buildTransformationView } from "@/lib/case-study-lab/view";

const result = {
  headline: "How Northwind went from unpositioned to category leader",
  clientName: "Northwind",
  clientDescriptor: "A B2B logistics SaaS",
  kicker: "B2B SaaS · Transformation",
  dek: "A capable product with no story.",
  startingState: "Flat at $2M ARR.",
  phases: [
    { label: "The reset", detail: "Repositioned around ops leaders", timeframe: "Q1" },
    { label: "Scale", detail: "Pipeline compounded", timeframe: null },
  ],
  results: [{ value: "5.5x", caption: "ARR growth", direction: "up" }],
  endState: "Category-defining at $11M ARR.",
  quote: { text: "A story the market understood.", attribution: "CEO" },
  cta: "Book a call.",
};

describe("buildTransformationView", () => {
  it("normalizes a stored transformation result into a view", () => {
    const v = buildTransformationView({ result, accent: "#123abc" });
    expect(v.accent).toBe("#123abc");
    expect(v.headline).toMatch(/Northwind/);
    expect(v.startingState).toMatch(/\$2M/);
    expect(v.phases).toHaveLength(2);
    expect(v.phases[1].timeframe).toBeNull();
    expect(v.stats[0].value).toBe("5.5x");
    expect(v.endState).toMatch(/11M/);
  });

  it("falls back to the default accent for an invalid color", () => {
    const v = buildTransformationView({ result, accent: "not-a-hex" });
    expect(v.accent).toBe("#E51B23");
  });

  it("shows Powered-by by default and hides it when white_label is set", () => {
    expect(buildTransformationView({ result }).poweredByHref).not.toBeNull();
    expect(buildTransformationView({ result, white_label: true }).poweredByHref).toBeNull();
  });

  it("tolerates a missing/empty result and legacy stat shape", () => {
    const empty = buildTransformationView({ result: {} });
    expect(empty.phases).toEqual([]);
    expect(empty.stats).toEqual([]);
    expect(empty.cta).toMatch(/transformation/i);

    const legacy = buildTransformationView({
      result: { ...result, results: [{ value: "3x", label: "revenue" }] },
    });
    expect(legacy.stats[0].caption).toBe("revenue");
    expect(legacy.stats[0].direction).toBe("up");
  });

  it("prefers cta_url, then agency_url, for the CTA link", () => {
    expect(buildTransformationView({ result, cta_url: "https://book.me" }).ctaHref).toBe("https://book.me/");
    expect(buildTransformationView({ result, agency_url: "https://agency.co" }).ctaHref).toBe("https://agency.co/");
    expect(buildTransformationView({ result, cta_url: "javascript:alert(1)" }).ctaHref).toBeNull();
  });
});
