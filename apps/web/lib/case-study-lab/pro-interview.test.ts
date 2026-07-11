import { describe, it, expect } from "vitest";
import { parseProInterviewTurn } from "@/lib/case-study-lab/pro-interview";

const base = {
  clientName: "Northwind",
  clientAnonymized: false,
  clientDescriptor: "A B2B logistics SaaS",
  beforeState: "Stuck at $2M ARR with a product no one could position.",
  results: [],
  issues: [],
  quote: null,
  cta: null,
  teamCredit: null,
};

describe("parseProInterviewTurn", () => {
  it("parses a transformation turn with ordered phases", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "Good — what changed after the repositioning?",
        slots: {
          ...base,
          phases: [
            { label: "The reset", detail: "Repositioned around ops leaders", timeframe: "Q1" },
            { label: "Rebuild", detail: "New site + demand engine", timeframe: "Q2-Q3" },
          ],
          timeline: "18 months",
          endState: "Now at $11M ARR, category-defining.",
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.phases).toHaveLength(2);
    expect(t.slots.phases[0].label).toBe("The reset");
    expect(t.slots.timeline).toBe("18 months");
    expect(t.slots.endState).toMatch(/11M/);
  });

  it("accepts a phase named before its detail (detail: null)", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "What happened in that first phase?",
        slots: { ...base, phases: [{ label: "The reset", detail: null, timeframe: null }] },
        readyToGenerate: false,
      })
    );
    expect(t.slots.phases[0].detail).toBeNull();
  });

  it("caps phases at 5", () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => ({ label: `p${n}`, detail: `d${n}`, timeframe: null }));
    const t = parseProInterviewTurn(
      JSON.stringify({ reply: "ok", slots: { ...base, phases: six }, readyToGenerate: false })
    );
    expect(t.slots.phases).toHaveLength(5);
  });

  it("defaults omitted superset slots (no phases/endState/timeline/insight/manifestation)", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({ reply: "ok", slots: base, readyToGenerate: false })
    );
    expect(t.slots.phases).toEqual([]);
    expect(t.slots.endState).toBeNull();
    expect(t.slots.timeline).toBeNull();
    expect(t.slots.insight).toBeNull();
    expect(t.slots.manifestation).toBeNull();
  });

  it("carries the Big Idea insight and manifestation through", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "Love it — how did that idea show up?",
        slots: {
          ...base,
          insight: "Sell the feeling of arrival, not the logistics of moving.",
          manifestation: "A campaign built entirely around the first night in a new home.",
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.insight).toMatch(/feeling of arrival/);
    expect(t.slots.manifestation).toMatch(/first night/);
  });

  it("carries the Method framework and named steps, capping steps at 6", () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ name: `s${n}`, detail: `d${n}` }));
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "Great — what's the next stage?",
        slots: {
          ...base,
          framework: "Pain Point SEO",
          frameworkSteps: seven,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.framework).toBe("Pain Point SEO");
    expect(t.slots.frameworkSteps).toHaveLength(6);
    expect(t.slots.frameworkSteps[0].name).toBe("s1");
  });

  it("accepts a framework step named before its detail (detail: null)", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "What happens in that stage?",
        slots: { ...base, framework: "A.R.T.", frameworkSteps: [{ name: "Audit", detail: null }] },
        readyToGenerate: false,
      })
    );
    expect(t.slots.frameworkSteps[0].detail).toBeNull();
  });

  it("carries Craft assets (url null pre-upload) and craftDecision, capping assets at 8", () => {
    const nine = Array.from({ length: 9 }, (_, n) => ({ url: null, caption: `piece ${n}` }));
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "What was the key craft decision?",
        slots: {
          ...base,
          craftDecision: "A custom variable typeface that flexes with the brand.",
          assets: nine,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.assets).toHaveLength(8);
    expect(t.slots.assets[0].url).toBeNull();
    expect(t.slots.assets[0].caption).toBe("piece 0");
    expect(t.slots.craftDecision).toMatch(/typeface/);
  });

  it("preserves an already-uploaded asset url through a turn", () => {
    const t = parseProInterviewTurn(
      JSON.stringify({
        reply: "Great.",
        slots: { ...base, assets: [{ url: "https://cdn.example.com/hero.png", caption: "Hero" }] },
        readyToGenerate: false,
      })
    );
    expect(t.slots.assets[0].url).toBe("https://cdn.example.com/hero.png");
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({ reply: "ok", slots: base, readyToGenerate: true }) +
      "\n```";
    expect(() => parseProInterviewTurn(wrapped)).not.toThrow();
  });
});
