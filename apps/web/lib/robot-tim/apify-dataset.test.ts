import { describe, it, expect } from "vitest";
import { unwrapApifyDataset } from "@repo/utils/research";

// Apify's GET /v2/datasets/{id}/items returns a bare JSON array. The helper used to type
// that response as `{ items: unknown[] }` and return `data.items || []`, so every actor
// run resolved to zero results however much it actually scraped — Robot-Tim crawls, the
// Biz Dev Assessment's website scrape, and the LinkedIn scrapers all silently got nothing.
//
// Lives here rather than beside research.ts because vitest.config.ts only collects tests
// under apps/web, and this is the path Robot-Tim depends on.
describe("unwrapApifyDataset", () => {
  it("reads the bare array Apify actually returns", () => {
    const items = [
      { url: "https://example.com/", text: "hero copy" },
      { url: "https://example.com/about", text: "about copy" },
    ];
    expect(unwrapApifyDataset(items)).toHaveLength(2);
  });

  it("does not lose a populated array — the original regression", () => {
    // The old implementation returned [] here, which is exactly how a successful
    // 14-page crawl reached the database as `{ pages: [], homepageText: "" }`.
    expect(unwrapApifyDataset([{ url: "https://example.com/", text: "copy" }])).not.toEqual([]);
  });

  it("still tolerates an { items } envelope", () => {
    expect(unwrapApifyDataset({ items: [{ url: "https://example.com/" }] })).toHaveLength(1);
  });

  it("returns an empty array for an genuinely empty result", () => {
    expect(unwrapApifyDataset([])).toEqual([]);
    expect(unwrapApifyDataset({})).toEqual([]);
  });
});
