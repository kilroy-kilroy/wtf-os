import { describe, it, expect } from "vitest";
import {
  parseTransformationCaseStudy,
  parseBigIdeaCaseStudy,
} from "@/lib/case-study-lab/pro-compose";

const draft = {
  headline: "How Northwind went from an unpositioned $2M tool to an $11M category leader",
  clientName: "Northwind",
  clientDescriptor: "A B2B logistics SaaS",
  kicker: "B2B SaaS · Brand & Growth Transformation",
  dek: "Northwind had a capable product and no story. Buyers couldn't tell what it was for.",
  startingState: "Flat at $2M ARR, losing deals to clearer-positioned rivals.",
  phases: [
    { label: "The reset", detail: "Repositioned around operations leaders", timeframe: "Q1" },
    { label: "Rebuild", detail: "New site and demand engine", timeframe: "Q2-Q3" },
    { label: "Scale", detail: "Pipeline compounded", timeframe: "Year 2" },
  ],
  results: [{ value: "5.5x", caption: "ARR, from $2M to $11M", direction: "up" }],
  endState: "Now a category-defining brand at $11M ARR.",
  quote: { text: "They gave us a story the market finally understood.", attribution: "CEO, Northwind" },
  cta: "Want a transformation like this? Book a call.",
};

describe("parseTransformationCaseStudy", () => {
  it("parses a full transformation draft", () => {
    const cs = parseTransformationCaseStudy(JSON.stringify(draft));
    expect(cs.phases).toHaveLength(3);
    expect(cs.phases[0].label).toBe("The reset");
    expect(cs.startingState).toMatch(/\$2M/);
    expect(cs.endState).toMatch(/category-defining/);
    expect(cs.results[0].direction).toBe("up");
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n" + JSON.stringify(draft) + "\n```";
    expect(() => parseTransformationCaseStudy(wrapped)).not.toThrow();
  });

  it("caps phases at 5 and results at 3", () => {
    const cs = parseTransformationCaseStudy(
      JSON.stringify({
        ...draft,
        phases: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `p${n}`, detail: `d${n}`, timeframe: null })),
        results: [1, 2, 3, 4].map((n) => ({ value: `${n}x`, caption: `c${n}`, direction: "up" })),
      })
    );
    expect(cs.phases).toHaveLength(5);
    expect(cs.results).toHaveLength(3);
  });

  it("coerces an unknown stat direction to 'up' and tolerates missing results", () => {
    const cs = parseTransformationCaseStudy(
      JSON.stringify({ ...draft, results: [{ value: "3x", caption: "growth", direction: "sideways" }] })
    );
    expect(cs.results[0].direction).toBe("up");
    const noResults = parseTransformationCaseStudy(
      JSON.stringify({ ...draft, results: undefined })
    );
    expect(noResults.results).toEqual([]);
  });

  it("normalizes a null timeframe on a phase", () => {
    const cs = parseTransformationCaseStudy(
      JSON.stringify({ ...draft, phases: [{ label: "x", detail: "y", timeframe: null }] })
    );
    expect(cs.phases[0].timeframe).toBeNull();
  });
});

const bigIdea = {
  headline: "Wise sold the anger, not the exchange rate",
  clientName: "Wise",
  clientDescriptor: "A cross-border money-transfer service",
  kicker: "Brand & Creative · Fintech",
  dek: "Every competitor advertised low fees. The category was a race to the same claim.",
  insight: "Make the hidden bank markup the villain, not the price the hero.",
  manifestation: "A campaign that exposed the invisible fees banks bury in the exchange rate.",
  results: [{ value: "58%", caption: "share-price lift", direction: "up" }],
  quote: { text: "They found the story the whole category had missed.", attribution: "CMO, Wise" },
  cta: "Want an idea like this? Book a call.",
};

describe("parseBigIdeaCaseStudy", () => {
  it("parses a full big idea draft", () => {
    const cs = parseBigIdeaCaseStudy(JSON.stringify(bigIdea));
    expect(cs.insight).toMatch(/villain/);
    expect(cs.manifestation).toMatch(/invisible fees/);
    expect(cs.results[0].value).toBe("58%");
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n" + JSON.stringify(bigIdea) + "\n```";
    expect(() => parseBigIdeaCaseStudy(wrapped)).not.toThrow();
  });

  it("tolerates a metric-free idea (results omitted) and caps results at 3", () => {
    const noResults = parseBigIdeaCaseStudy(JSON.stringify({ ...bigIdea, results: undefined }));
    expect(noResults.results).toEqual([]);
    const many = parseBigIdeaCaseStudy(
      JSON.stringify({
        ...bigIdea,
        results: [1, 2, 3, 4].map((n) => ({ value: `${n}x`, caption: `c${n}`, direction: "up" })),
      })
    );
    expect(many.results).toHaveLength(3);
  });

  it("requires the insight (throws when absent)", () => {
    const { insight: _omit, ...noInsight } = bigIdea;
    expect(() => parseBigIdeaCaseStudy(JSON.stringify(noInsight))).toThrow();
  });
});
