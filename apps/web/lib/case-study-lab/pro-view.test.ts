import { describe, it, expect } from "vitest";
import {
  buildTransformationView,
  buildBigIdeaView,
  buildMethodView,
} from "@/lib/case-study-lab/view";

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

const bigIdeaResult = {
  headline: "Wise sold the anger, not the exchange rate",
  clientName: "Wise",
  clientDescriptor: "Cross-border money transfer",
  kicker: "Brand · Fintech",
  dek: "Every competitor advertised low fees.",
  insight: "Make the hidden bank markup the villain.",
  manifestation: "A campaign exposing invisible fees.",
  results: [{ value: "58%", caption: "share-price lift", direction: "up" }],
  quote: { text: "The story the category missed.", attribution: "CMO" },
  cta: "Book a call.",
};

describe("buildBigIdeaView", () => {
  it("normalizes a stored big idea result into a view", () => {
    const v = buildBigIdeaView({ result: bigIdeaResult, accent: "#0a7" });
    expect(v.insight).toMatch(/villain/);
    expect(v.manifestation).toMatch(/invisible fees/);
    expect(v.stats[0].value).toBe("58%");
    expect(v.headline).toMatch(/Wise/);
  });

  it("hides Powered-by under white_label and defaults the idea CTA", () => {
    expect(buildBigIdeaView({ result: bigIdeaResult, white_label: true }).poweredByHref).toBeNull();
    expect(buildBigIdeaView({ result: {} }).cta).toMatch(/idea/i);
  });

  it("tolerates a metric-free idea and missing fields", () => {
    const v = buildBigIdeaView({ result: { insight: "One sharp reframe." } });
    expect(v.insight).toMatch(/reframe/);
    expect(v.stats).toEqual([]);
    expect(v.manifestation).toBeNull();
  });
});

const methodResult = {
  headline: "How Pain Point SEO compounded Leadfeeder's pipeline",
  clientName: "Leadfeeder",
  clientDescriptor: "B2B visitor identification",
  kicker: "SEO · System",
  dek: "Story content didn't compound.",
  framework: "Pain Point SEO",
  steps: [
    { name: "Map pain points", detail: "Interview sales" },
    { name: "Ship & compound", detail: "Publish and interlink" },
  ],
  results: [{ value: "4x", caption: "signups", direction: "up" }],
  quote: { text: "Traffic finally converted.", attribution: "CMO" },
  cta: "Book a call.",
};

describe("buildMethodView", () => {
  it("normalizes a stored method result into a view", () => {
    const v = buildMethodView({ result: methodResult, accent: "#333333" });
    expect(v.framework).toBe("Pain Point SEO");
    expect(v.steps).toHaveLength(2);
    expect(v.steps[0].name).toBe("Map pain points");
    expect(v.stats[0].value).toBe("4x");
  });

  it("hides Powered-by under white_label and defaults the method CTA", () => {
    expect(buildMethodView({ result: methodResult, white_label: true }).poweredByHref).toBeNull();
    expect(buildMethodView({ result: {} }).cta).toMatch(/run this/i);
  });

  it("tolerates missing steps/results", () => {
    const v = buildMethodView({ result: { framework: "A.R.T." } });
    expect(v.framework).toBe("A.R.T.");
    expect(v.steps).toEqual([]);
    expect(v.stats).toEqual([]);
  });
});
