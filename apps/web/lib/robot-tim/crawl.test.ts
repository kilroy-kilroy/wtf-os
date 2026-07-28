import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRunApifyActor = vi.fn();
vi.mock("@repo/utils/research", () => ({
  runApifyActor: (...args: unknown[]) => mockRunApifyActor(...args),
}));

// analyzeCopy hits Anthropic; stub it so these tests stay about the crawl budget.
vi.mock("@/lib/wah-wah/analyze", () => ({
  analyzeCopy: vi.fn(async () => ({ score: 42, flags: [] })),
}));
vi.mock("@/lib/wah-wah/lexicon", () => ({ findLexiconHits: () => [] }));

import { crawlSite } from "@/lib/robot-tim/crawl";

// A real 10-page crawl of timkilroy.com measured ~139s. The original code waited only
// 120s because the poll budget was derived from `timeoutSecs`, so it abandoned runs that
// were about to succeed and stored an empty crawl. Guard the budget, not the plumbing.
const OBSERVED_REAL_CRAWL_SECS = 139;

describe("crawlSite Apify budget", () => {
  beforeEach(() => mockRunApifyActor.mockReset());

  it("waits well past how long a real crawl actually takes", async () => {
    mockRunApifyActor.mockResolvedValue([]);
    await crawlSite("https://example.com");

    const [, , options] = mockRunApifyActor.mock.calls[0];
    expect(options.pollTimeoutSecs).toBeGreaterThan(OBSERVED_REAL_CRAWL_SECS);
  });

  it("keeps a partial crawl rather than discarding one that ran long", async () => {
    mockRunApifyActor.mockResolvedValue([]);
    await crawlSite("https://example.com");

    const [, , options] = mockRunApifyActor.mock.calls[0];
    // Run times for the same crawl ranged 72s-210s+ in production, so no fixed budget is
    // safe. The actor keeps writing to its dataset after we stop waiting; taking what
    // landed beats shipping a paid run with no site data.
    expect(options.salvagePartialOnTimeout).toBe(true);
  });

  it("takes the full page text instead of the article extractor", async () => {
    mockRunApifyActor.mockResolvedValue([]);
    await crawlSite("https://example.com");
    const [, input] = mockRunApifyActor.mock.calls[0];
    // The default Readability-style transformer needs an article container. Marketing
    // pages often have no <main>/<article>, so it latched onto the cookie modal and
    // returned a title plus a cookie table instead of the copy.
    expect(input.htmlTransformer).toBe("none");
    expect(input.removeElementsCssSelector).toMatch(/cookie/i);
    expect(input.removeElementsCssSelector).toMatch(/consent/i);
    // Supplying the selector replaces the actor's own defaults, so the ordinary page
    // furniture has to still be listed.
    expect(input.removeElementsCssSelector).toMatch(/\bnav\b/);
    expect(input.removeElementsCssSelector).toMatch(/\bfooter\b/);
  });

  it("does not tie the wait budget to the actor timeout", async () => {
    mockRunApifyActor.mockResolvedValue([]);
    await crawlSite("https://example.com");

    const [, , options] = mockRunApifyActor.mock.calls[0];
    // These being equal is the original bug: we hung up exactly when the actor was
    // still working.
    expect(options.pollTimeoutSecs).not.toBe(options.timeoutSecs);
  });

  // Not covered here: that crawlSite rethrows an Apify failure rather than swallowing it
  // into an empty crawl. This vitest setup reports any throw from inside a mocked module
  // as an unhandled error and fails the test regardless of try/catch or .rejects, and the
  // guarantee is verifiable by inspection — crawlSite has no top-level catch, and the
  // route that calls it is what records the reason and alerts.

  // Pages must clear MIN_SCORABLE_CHARS to be scored at all, so fixtures carry real bulk.
  const body = (hero: string) => [hero, "We help owner-led agencies. ".repeat(20)].join("\n");

  it("scores pages and keeps homepage text on a successful crawl", async () => {
    mockRunApifyActor.mockResolvedValue([
      { url: "https://example.com/", metadata: { title: "Home" }, text: body("hero copy here") },
      { url: "https://example.com/about", metadata: { title: "About" }, text: body("about copy") },
    ]);

    const crawl = await crawlSite("https://example.com");
    expect(crawl.pages).toHaveLength(2);
    expect(crawl.homepageText.startsWith("hero copy here")).toBe(true);
    expect(crawl.error).toBeUndefined();
  });

  it("reads the title from metadata, where the crawler actually puts it", async () => {
    mockRunApifyActor.mockResolvedValue([
      { url: "https://example.com/", title: null, metadata: { title: "Real Title" }, text: body("hero") },
    ]);
    // Top-level `title` comes back null; reading only it scored every page with an empty
    // title, meta and h1, which is what flattened the scores across a whole site.
    expect((await crawlSite("https://example.com")).pages[0].title).toBe("Real Title");
  });

  it("carries a copy excerpt so synthesis can quote the page", async () => {
    mockRunApifyActor.mockResolvedValue([
      { url: "https://example.com/", metadata: { title: "Home" }, text: body("hero copy here") },
    ]);
    const page = (await crawlSite("https://example.com")).pages[0];
    expect(page.excerpt).toContain("hero copy here");
  });

  it("skips a page that is only furniture instead of scoring the noise", async () => {
    mockRunApifyActor.mockResolvedValue([
      { url: "https://example.com/", metadata: { title: "Home" }, text: body("hero") },
      // Real case: /sales-os reduced to a title plus a cookie table, yet scored highest.
      { url: "https://example.com/thin", metadata: { title: "Thin" }, text: "Just a title line" },
    ]);
    const crawl = await crawlSite("https://example.com");
    expect(crawl.pages.map((p) => p.url)).toEqual(["https://example.com/"]);
  });
});
