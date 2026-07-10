import { describe, it, expect } from "vitest";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";

const base = {
  agency_brand: { colors: ["#0050bd"], logoUrl: null, name: "El Toro" },
  agency_url: "https://eltoro.com", client_logo_url: null,
  agency_logo_url: null, agency_name: "El Toro", accent: "#0050bd", cta_url: null,
};
function NEW_RESULT() {
  return { headline: "H", clientName: "C", clientDescriptor: "d", kicker: null, dek: "x",
    approach: [], bridge: "b", results: [], quote: null, cta: "go" };
}

describe("buildCaseStudyView", () => {
  it("maps the new V2 result shape", () => {
    const v = buildCaseStudyView({
      ...base,
      result: {
        headline: "H", clientName: "Splendid", clientDescriptor: "DTC apparel",
        kicker: "DTC · Paid", dek: "Before us, paid bled margin.",
        approach: [{ challenge: "no structure", method: "Power 5" }],
        bridge: "Paid became the profit driver.",
        results: [{ value: "2.9x", caption: "ROAS up from 1.8x", direction: "up" }],
        quote: null, cta: "Book a call.",
      },
    });
    expect(v.accent).toBe("#0050bd");
    expect(v.stats[0].value).toBe("2.9x");
    expect(v.dek).toMatch(/bled margin/);
    expect(v.approach[0].method).toBe("Power 5");
    expect(v.ctaHref).toBe("https://eltoro.com/");  // cta_url null -> agency_url (URL-normalized)
  });

  it("prefers cta_url over agency_url for the CTA href", () => {
    const v = buildCaseStudyView({ ...base, cta_url: "https://cal.com/eltoro", result: NEW_RESULT() });
    expect(v.ctaHref).toBe("https://cal.com/eltoro");
  });

  it("back-compat: maps a legacy result (issues + {label,value})", () => {
    const v = buildCaseStudyView({
      ...base,
      result: {
        headline: "H", clientName: "Old", clientDescriptor: "d",
        results: [{ label: "Overall ROAS increase", value: "50% (1.8x to 2.9x over year 1)" }],
        issues: [{ issue: "bad structure", solution: "rebuild" }],
        quote: null, cta: "go",
      },
    });
    expect(v.dek).toBeNull();
    expect(v.bridge).toBeNull();
    expect(v.approach[0]).toEqual({ challenge: "bad structure", method: "rebuild" });
    expect(v.stats[0].value).toBe("50% (1.8x to 2.9x over year 1)");
    expect(v.stats[0].caption).toBe("Overall ROAS increase");
  });

  it("robustness: skips null/non-object items in results and issues without throwing", () => {
    const v = buildCaseStudyView({
      ...base,
      result: {
        headline: "H", clientName: "C", clientDescriptor: "d",
        results: [null, { value: "2x", caption: "c", direction: "up" }],
        issues: [null, { issue: "i", solution: "s" }],
        quote: null, cta: "go",
      },
    });
    expect(v.stats).toHaveLength(1);
    expect(v.stats[0].value).toBe("2x");
    expect(v.approach).toHaveLength(1);
    expect(v.approach[0]).toEqual({ challenge: "i", method: "s" });
  });

  it("robustness: coerces a non-object quote to null", () => {
    const v = buildCaseStudyView({ ...base, result: { ...NEW_RESULT(), quote: "just a string" } });
    expect(v.quote).toBeNull();
  });
});
