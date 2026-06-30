import { describe, it, expect } from "vitest";
import { resolveDiscoveryTarget } from "@/lib/discovery-target";

describe("resolveDiscoveryTarget", () => {
  it("uses the linked Copper company when present", () => {
    const out = resolveDiscoveryTarget({
      company: { name: "Distill Health", websites: [{ url: "https://distillhealth.com" }], email_domain: null },
      contact: { company_name: "ignored.com", emails: [{ email: "x@ignored.com" }] },
      opportunity: { name: "Wah-Wah Detector — x@ignored.com" },
    });
    expect(out.companyName).toBe("Distill Health");
    expect(out.companyWebsite).toBe("https://distillhealth.com");
  });

  it("derives company from the contact, NOT the lead-magnet opportunity name (the Wah-Wah bug)", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: {
        company_name: "distillhealth.com",
        emails: [{ email: "james.hamilton@distillhealth.com" }],
      },
      opportunity: { name: "Wah-Wah Detector — james.hamilton@distillhealth.com" },
    });
    // The regression: companyName must never be the lead magnet name.
    expect(out.companyName.toLowerCase()).not.toContain("wah-wah");
    expect(out.companyName).toBe("distillhealth.com");
    expect(out.companyWebsite).toBe("https://distillhealth.com");
  });

  it("uses a real company_name string from the Biz Dev flow over the opportunity name", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: { company_name: "Acme Corp", emails: [{ email: "jane@acme.com" }] },
      opportunity: { name: "Biz Dev Assessment — SalesOS Studio" },
    });
    expect(out.companyName).toBe("Acme Corp");
    // Website backfilled from the corporate email domain.
    expect(out.companyWebsite).toBe("https://acme.com");
  });

  it("falls back to the corporate email domain when no company_name is set", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: { company_name: null, emails: [{ email: "bob@foo.io" }] },
      opportunity: { name: "Wah-Wah Detector — bob@foo.io" },
    });
    expect(out.companyName).toBe("foo.io");
    expect(out.companyWebsite).toBe("https://foo.io");
  });

  it("does not treat a free-mail domain as the company", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: { company_name: null, emails: [{ email: "someone@gmail.com" }] },
      opportunity: { name: "Manually Created Opp" },
    });
    expect(out.companyName).toBe("Manually Created Opp");
    expect(out.companyWebsite).toBeNull();
  });

  it("prefers an explicit company_name even when the email is free-mail", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: { company_name: "Distill Health", emails: [{ email: "founder@gmail.com" }] },
      opportunity: { name: "Wah-Wah Detector — founder@gmail.com" },
    });
    expect(out.companyName).toBe("Distill Health");
    expect(out.companyWebsite).toBeNull();
  });

  it("normalizes a messy hostname company_name (protocol/www/path stripped)", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: { company_name: "https://www.DistillHealth.com/about", emails: [] },
      opportunity: { name: "Wah-Wah Detector — x@distillhealth.com" },
    });
    expect(out.companyName).toBe("distillhealth.com");
    expect(out.companyWebsite).toBe("https://distillhealth.com");
  });

  it("last resort: strips the email decoration from a manual opportunity name", () => {
    const out = resolveDiscoveryTarget({
      company: null,
      contact: null,
      opportunity: { name: "Northwind Traders" },
    });
    expect(out.companyName).toBe("Northwind Traders");
    expect(out.companyWebsite).toBeNull();
  });
});
