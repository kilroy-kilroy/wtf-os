import { describe, it, expect } from "vitest";
import { extractBrand } from "@/lib/case-study-lab/extract";

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
