import { describe, it, expect } from "vitest";
import {
  parseTransformationCaseStudy,
  parseBigIdeaCaseStudy,
  parseMethodCaseStudy,
  parseCraftCaseStudy,
  composeCraft,
} from "@/lib/case-study-lab/pro-compose";
import { EMPTY_PRO_SLOTS } from "@repo/prompts";

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

const method = {
  headline: "How Pain Point SEO took Leadfeeder from story content to compounding pipeline",
  clientName: "Leadfeeder",
  clientDescriptor: "A B2B website-visitor identification tool",
  kicker: "SEO · A repeatable content system",
  dek: "Their story-led content didn't compound. Traffic came and went with each post.",
  framework: "Pain Point SEO — target buying-intent keywords over volume",
  steps: [
    { name: "Map pain points", detail: "Interview sales to surface buyer language" },
    { name: "Buying-intent keywords", detail: "Prioritize bottom-funnel over volume" },
    { name: "Ship & compound", detail: "Publish, interlink, and measure signups" },
  ],
  results: [{ value: "4x", caption: "signups from content", direction: "up" }],
  quote: { text: "The traffic finally converted.", attribution: "CMO, Leadfeeder" },
  cta: "Want us to run this for you? Book a call.",
};

describe("parseMethodCaseStudy", () => {
  it("parses a full method draft with named steps", () => {
    const cs = parseMethodCaseStudy(JSON.stringify(method));
    expect(cs.framework).toMatch(/Pain Point SEO/);
    expect(cs.steps).toHaveLength(3);
    expect(cs.steps[0].name).toBe("Map pain points");
    expect(cs.results[0].value).toBe("4x");
  });

  it("strips markdown code fences and caps steps at 6", () => {
    const wrapped = "```json\n" + JSON.stringify(method) + "\n```";
    expect(() => parseMethodCaseStudy(wrapped)).not.toThrow();
    const many = parseMethodCaseStudy(
      JSON.stringify({
        ...method,
        steps: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ name: `s${n}`, detail: `d${n}` })),
      })
    );
    expect(many.steps).toHaveLength(6);
  });

  it("requires the framework (throws when absent)", () => {
    const { framework: _omit, ...noFramework } = method;
    expect(() => parseMethodCaseStudy(JSON.stringify(noFramework))).toThrow();
  });

  it("tolerates a method with no results", () => {
    const cs = parseMethodCaseStudy(JSON.stringify({ ...method, results: undefined }));
    expect(cs.results).toEqual([]);
  });
});

const craft = {
  headline: "A living identity system for the Guggenheim, built on a custom typeface",
  clientName: "Guggenheim",
  clientDescriptor: "A global network of modern-art museums",
  kicker: "Brand Identity · Cultural",
  dek: "Four museums, four visual languages, one name — with nothing tying them together.",
  craftDecision: "A single custom typeface engineered to unify every venue and medium.",
  assets: [
    { url: "https://cdn.example.com/1.png", caption: "The wordmark" },
    { url: "https://cdn.example.com/2.png", caption: "Signage system" },
  ],
  results: [],
  quote: null,
  cta: "Want work like this? Book a call.",
};

describe("parseCraftCaseStudy", () => {
  it("parses a craft draft with a captioned asset gallery", () => {
    const cs = parseCraftCaseStudy(JSON.stringify(craft));
    expect(cs.craftDecision).toMatch(/typeface/);
    expect(cs.assets).toHaveLength(2);
    expect(cs.assets[0].caption).toBe("The wordmark");
    expect(cs.results).toEqual([]);
  });

  it("requires headline/dek/craftDecision (throws when craftDecision absent)", () => {
    const { craftDecision: _omit, ...bad } = craft;
    expect(() => parseCraftCaseStudy(JSON.stringify(bad))).toThrow();
  });

  it("tolerates assets with a missing url (reconciled later in composeCraft)", () => {
    const cs = parseCraftCaseStudy(JSON.stringify({ ...craft, assets: [{ caption: "no url yet" }] }));
    expect(cs.assets[0].url).toBe("");
    expect(cs.assets[0].caption).toBe("no url yet");
  });
});

describe("composeCraft guardrail", () => {
  it("rejects when no asset has been uploaded (no url), before any model call", async () => {
    const slots = { ...EMPTY_PRO_SLOTS, assets: [{ url: null, caption: "described but not uploaded" }] };
    await expect(
      composeCraft({ slots, clientName: "Guggenheim", clientAnonymized: false })
    ).rejects.toThrow(/at least one uploaded piece/i);
  });

  it("rejects when the assets list is empty", async () => {
    await expect(
      composeCraft({ slots: EMPTY_PRO_SLOTS, clientName: "X", clientAnonymized: false })
    ).rejects.toThrow(/the work is the proof/i);
  });
});
