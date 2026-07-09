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

  it("reads the agency name from og:site_name", () => {
    const html = `<html><head>
      <meta property="og:site_name" content="El Toro" />
      <title>El Toro — Ecommerce Growth</title>
    </head><body></body></html>`;
    expect(extractBrand(html, "https://eltoro.com").name).toBe("El Toro");
  });

  it("falls back to <title> when og:site_name is absent", () => {
    const html = `<html><head><title>Northbound Agency</title></head><body></body></html>`;
    expect(extractBrand(html, "https://x.com").name).toBe("Northbound Agency");
  });

  it("name is null when neither is present", () => {
    expect(extractBrand("<html><head></head><body></body></html>", "https://x.com").name).toBeNull();
  });
});

describe("fetchBrand redirect + resilience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("absolutizes a relative logo against the FINAL redirect URL (manual redirect model)", async () => {
    // Use a path-relative href (no leading slash) so the base URL's path matters.
    // new URL("logo.png", "https://acme.com/") → "https://acme.com/logo.png"  (wrong base)
    // new URL("logo.png", "https://www.acme.com/en/") → "https://www.acme.com/en/logo.png"  (correct)
    const html = `<head><link rel="icon" href="logo.png"></head>`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        ok: false,
        headers: { get: (k: string) => (k === "location" ? "https://www.acme.com/en/" : null) },
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: async () => html,
      } as any);
    vi.stubGlobal("fetch", fetchMock);
    const brand = await fetchBrand("https://acme.com/");
    expect(brand.logoUrl).toBe("https://www.acme.com/en/logo.png");
  });

  it("returns empty brand (not throws) when a redirect points to a private host (SSRF mid-hop)", async () => {
    // The per-hop normalizeUrl guard should throw inside the loop; the outer try/catch
    // swallows it as best-effort and returns the empty brand — it must NOT propagate.
    const fetchMock = vi.fn().mockResolvedValueOnce({
      status: 302,
      ok: false,
      headers: { get: (k: string) => (k === "location" ? "http://169.254.169.254/" : null) },
    } as any);
    vi.stubGlobal("fetch", fetchMock);
    const brand = await fetchBrand("https://acme.com/");
    expect(brand).toEqual({ colors: [], logoUrl: null, name: null });
  });

  it("returns empty brand on network throw and still throws for initial SSRF URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => { throw new Error("ECONNREFUSED"); })
    );
    const brand = await fetchBrand("https://acme.com/");
    expect(brand).toEqual({ colors: [], logoUrl: null, name: null });

    // normalizeUrl runs BEFORE try/catch, so SSRF URLs must still throw
    await expect(fetchBrand("http://localhost")).rejects.toThrow();
  });
});
