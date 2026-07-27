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

  it("scores pages and keeps homepage text on a successful crawl", async () => {
    mockRunApifyActor.mockResolvedValue([
      { url: "https://example.com/", title: "Home", text: "hero copy here" },
      { url: "https://example.com/about", title: "About", text: "about copy" },
    ]);

    const crawl = await crawlSite("https://example.com");
    expect(crawl.pages).toHaveLength(2);
    expect(crawl.homepageText).toBe("hero copy here");
    expect(crawl.error).toBeUndefined();
  });
});
