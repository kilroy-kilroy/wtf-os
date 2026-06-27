import { describe, it, expect } from "vitest";
import { parseCaseStudy } from "@/lib/case-study-lab/compose";

describe("parseCaseStudy", () => {
  it("parses a composed case study and caps issues at 3", () => {
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "800% revenue growth for a retention agency",
        clientName: "Acme",
        clientDescriptor: "An e-comm retention agency",
        results: [{ label: "Revenue growth", value: "800%" }],
        issues: [1, 2, 3, 4].map((n) => ({ issue: `i${n}`, solution: `s${n}` })),
        quote: { text: "Game changer.", attribution: "CEO, Acme" },
        cta: "Want results like this? Book a call.",
        teamCredit: "Credit to the Acme team.",
      })
    );
    expect(cs.headline).toMatch(/800%/);
    expect(cs.issues).toHaveLength(3);
    expect(cs.cta).toMatch(/Book a call/);
  });
});
