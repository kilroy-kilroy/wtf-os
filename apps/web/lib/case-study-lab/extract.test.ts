import { describe, it, expect, vi, afterEach } from "vitest";
import { extractBrand, fetchBrand } from "@/lib/case-study-lab/extract";

describe("extractBrand", () => {
  it("pulls theme-color and resolves a relative logo against the base url", () => {
    const html = `
      <html><head>
        <meta name="theme-color" content="#1a2b3c">
        <link rel="icon" href="/favicon.png">
        <meta property="og:image" content="https://cdn.example.com/logo.png">
      </head><body></body></html>`;
    const brand = extractBrand(html, "https://acme.com/");
    expect(brand.colors).toContain("#1a2b3c");
    // og:image is preferred as the logo when present (richer than favicon)
    expect(brand.logoUrl).toBe("https://cdn.example.com/logo.png");
  });

  it("falls back to favicon (absolutized) when no og:image", () => {
    const html = `<head><link rel="icon" href="/icon.png"></head>`;
    const brand = extractBrand(html, "https://acme.com/sub/");
    expect(brand.logoUrl).toBe("https://acme.com/icon.png");
  });

  it("returns empty brand when nothing is present", () => {
    const brand = extractBrand("<head></head>", "https://acme.com/");
    expect(brand.colors).toEqual([]);
    expect(brand.logoUrl).toBeNull();
  });
});

describe("fetchBrand redirect + resilience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("absolutizes a relative logo against the FINAL redirect URL (finding 1)", async () => {
    // Use a path-relative href (no leading slash) so the base URL's path matters.
    // new URL("logo.png", "https://acme.com/") → "https://acme.com/logo.png"  (wrong base)
    // new URL("logo.png", "https://www.acme.com/en/") → "https://www.acme.com/en/logo.png"  (correct)
    const html = `<head><link rel="icon" href="logo.png"></head>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        url: "https://www.acme.com/en/",
        text: async () => html,
      }) as any)
    );
    const brand = await fetchBrand("https://acme.com/");
    expect(brand.logoUrl).toBe("https://www.acme.com/en/logo.png");
  });

  it("returns empty brand on network throw (finding 2) and still throws for SSRF URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => { throw new Error("ECONNREFUSED"); })
    );
    const brand = await fetchBrand("https://acme.com/");
    expect(brand).toEqual({ colors: [], logoUrl: null });

    // normalizeUrl runs BEFORE try/catch, so SSRF URLs must still throw
    await expect(fetchBrand("http://localhost")).rejects.toThrow();
  });
});
