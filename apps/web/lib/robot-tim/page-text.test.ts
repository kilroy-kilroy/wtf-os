import { describe, it, expect } from "vitest";
import {
  stripConsentBlock,
  heroLineOf,
  hasEnoughContent,
  MIN_SCORABLE_CHARS,
} from "@/lib/robot-tim/page-text";

// Shaped from what Apify actually returned for timkilroy.com: the visible hero, then the
// cookie-preferences table (banner copy, then repeating Cookie/Duration/Description rows
// with bare identifiers), then the real marketing copy.
const CRAWLED = [
  "Agency Growth Consultant | Sales Systems & Coaching for Agency Owners",
  "We value your privacy",
  "We use cookies to enhance your browsing experience and analyse traffic.",
  'The cookies that are categorised as "Necessary" are stored on your browser.',
  "Cookie",
  "__cf_bm",
  "Duration",
  "1 hour",
  "Description",
  "This cookie, set by Cloudflare, is used to support Cloudflare Bot Management.",
  "Cookie",
  "_pxvid",
  "Duration",
  "1 year",
  "Description",
  "PerimeterX sets this cookie to detect fraud and bot activity.",
  "lidc",
  "ytidb::LAST_RESULT_ENTRY_KEY",
  "Never Expires",
  "No cookies to display.",
  "The WTF Agency Method™",
  "Find out WTF is actually going on in your agency.",
  "Agency owners chase BS shiny-object tactics and find themselves stuck.",
  "300+ agencies coached · Marketing & agency leader since 1997",
].join("\n");

describe("stripConsentBlock", () => {
  const cleaned = stripConsentBlock(CRAWLED);

  it("removes the consent banner and the whole cookie table", () => {
    expect(cleaned).not.toMatch(/cookie/i);
    expect(cleaned).not.toContain("__cf_bm");
    expect(cleaned).not.toContain("ytidb::LAST_RESULT_ENTRY_KEY");
    expect(cleaned).not.toContain("PerimeterX");
  });

  it("keeps the hero above the banner and the real copy below it", () => {
    expect(cleaned).toContain("Agency Growth Consultant");
    expect(cleaned).toContain("The WTF Agency Method™");
    expect(cleaned).toContain("300+ agencies coached");
  });

  it("cuts roughly the measured share of the page", () => {
    // ~62% of the real homepage was consent furniture. Guard the order of magnitude so a
    // future tweak that quietly stops stripping (or starts eating copy) fails here.
    const ratio = cleaned.length / CRAWLED.length;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.6);
  });

  it("leaves a page with no consent block untouched", () => {
    const clean = "DemandOS — Axis + Activation = Acceleration\nA branding agency hands you a logo.";
    expect(stripConsentBlock(clean)).toBe(clean);
  });

  it("does not let a short marketing line open or extend a block", () => {
    // The failure that ate whole pages: any short line was allowed to bridge the block.
    const marketing = ["Fire Yourself From Sales", "Unscale", "Built for owners who decide."].join("\n");
    expect(stripConsentBlock(marketing)).toBe(marketing);
  });
});

describe("heroLineOf", () => {
  it("returns the first visible line as the H1 proxy", () => {
    expect(heroLineOf(stripConsentBlock(CRAWLED))).toBe(
      "Agency Growth Consultant | Sales Systems & Coaching for Agency Owners"
    );
  });

  it("is empty for empty input", () => {
    expect(heroLineOf("")).toBe("");
  });
});

describe("hasEnoughContent", () => {
  it("rejects a page that is only a title once furniture is stripped", () => {
    // /sales-os reduced to 59 chars of real copy, yet scored 72 — the highest on the
    // site — because the model graded a title and a cookie table.
    expect(hasEnoughContent("Agency Sales Process That Scales — Fire Yourself From Sales")).toBe(false);
  });

  it("accepts a page with real copy", () => {
    expect(hasEnoughContent("x".repeat(MIN_SCORABLE_CHARS))).toBe(true);
  });
});
