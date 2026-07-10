import { describe, it, expect } from "vitest";
import { parseCaseStudy } from "@/lib/case-study-lab/compose";

describe("parseCaseStudy (V2 shape)", () => {
  it("parses the new marketing shape", () => {
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "Splendid turned paid into its most profitable channel",
        clientName: "Splendid", clientDescriptor: "A DTC apparel brand",
        kicker: "DTC Apparel · Paid Media", dek: "Splendid was growing fast. Its paid engine wasn't.",
        approach: [{ challenge: "No account structure", method: "Meta Power 5 rebuild" }],
        bridge: "Rebuilding paid flipped it into a profit driver.",
        results: [{ value: "2.9x", caption: "ROAS, up from 1.8x", direction: "up" }],
        quote: { text: "Game changer.", attribution: "VP Marketing" }, cta: "Book a call.",
      })
    );
    expect(cs.results[0].value).toBe("2.9x");
    expect(cs.results[0].direction).toBe("up");
    expect(cs.approach[0].method).toMatch(/Power 5/);
    expect(cs.kicker).toMatch(/DTC/);
  });

  it("caps approach and results at 3 and defaults a bad direction", () => {
    const four = [1, 2, 3, 4];
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "x", clientName: "A", clientDescriptor: "b", kicker: null, dek: "d",
        approach: four.map((n) => ({ challenge: `c${n}`, method: `m${n}` })),
        bridge: "br",
        results: four.map((n) => ({ value: `${n}x`, caption: "c", direction: "sideways" })),
        quote: null, cta: "go",
      })
    );
    expect(cs.approach).toHaveLength(3);
    expect(cs.results).toHaveLength(3);
    expect(cs.results[0].direction).toBe("up"); // invalid enum -> catch("up")
  });
});
