// apps/web/lib/robot-tim/crawl.ts
import { runApifyActor } from "@repo/utils/research";
import { findLexiconHits } from "@/lib/wah-wah/lexicon";
import { analyzeCopy } from "@/lib/wah-wah/analyze";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import { stripConsentBlock, heroLineOf, hasEnoughContent } from "@/lib/robot-tim/page-text";
import type { Crawl, CrawlPage } from "@/lib/robot-tim/types";

// The crawler returns its page title and description under `metadata`; the top-level
// `title` field comes back null. Reading only the latter meant every page was scored with
// an empty title, meta AND h1 — see page-text.ts.
type ApifyPage = {
  url?: string;
  title?: string;
  text?: string;
  metadata?: { title?: string; description?: string };
};

/** How much cleaned copy travels to synthesis per page so it can quote real lines. */
const EXCERPT_CHARS = 1200;

/**
 * Supplying this REPLACES the actor's own default strip-list, so the usual furniture has
 * to be repeated here alongside the consent widgets.
 *
 * Consent tooling is injected client-side — it is absent from the served HTML and only
 * appears once the crawler renders the page — so it cannot be excluded by anything we do
 * after the fact without also risking real copy.
 */
const REMOVE_SELECTOR = [
  "nav, footer, script, style, noscript, svg",
  '[role="navigation"], [role="dialog"], [aria-modal="true"]',
  "#cookiescript_injected, .cky-consent-container, .cky-modal",
  '[class*="cookie" i], [id*="cookie" i]',
  '[class*="consent" i], [id*="consent" i]',
].join(", ");

// Apify fetches up to ~10 pages of clean text; each is scored with the Detector
// engine (lexicon seed + Opus verdict). The homepage's raw text is kept for the
// makeover's before-hero. Per-page failures are skipped, never fatal.
export async function crawlSite(url: string): Promise<Crawl> {
  const start = normalizeUrl(url);
  const items = (await runApifyActor(
    "apify~website-content-crawler",
    {
      startUrls: [{ url: start }],
      maxCrawlPages: 10,
      maxCrawlDepth: 2,
      excludeUrlGlobs: ["**/*.pdf", "**/*.zip", "**/blog/**", "**/careers/**", "**/jobs/**"],
      // The actor defaults to a Readability-style extractor built for articles. Marketing
      // pages routinely have no <main> or <article> (timkilroy.com has neither), so it
      // falls back to whichever block looks densest — which on a consented page is the
      // cookie-preferences table. /sales-os came back as a title plus 53 mentions of
      // "cookie" and none of its actual copy. Taking the full text and removing the
      // furniture ourselves recovered 13,550 clean characters from that same page.
      htmlTransformer: "none",
      removeElementsCssSelector: REMOVE_SELECTOR,
    },
    // Observed run times for this same 10-page crawl vary widely (72s, 93s, 115s, 139s,
    // 175s, and one over 210s), so no fixed budget is safe on its own. Wait 240s, and if
    // the actor is still going, take whatever pages have already landed rather than
    // discarding a crawl the customer paid for. The route allows 300s; scoring below runs
    // concurrently so it needs seconds, not the minute the old sequential loop took.
    { timeoutSecs: 120, pollTimeoutSecs: 240, salvagePartialOnTimeout: true }
  )) as ApifyPage[];

  const startHost = new URL(start).hostname;
  let homepageText = "";

  const candidates = items
    .map((item) => {
      const pageUrl = item.url ?? start;
      const body = stripConsentBlock(item.text ?? "").slice(0, 12000);
      // Scoring a page that is really just a title and cookie furniture produces a
      // confident number about nothing — that is how a page with 59 characters of copy
      // came back as the most generic on the site. Leave it out rather than invent a score.
      if (!body || !hasEnoughContent(body)) return null;
      return {
        pageUrl,
        body,
        title: item.metadata?.title ?? item.title ?? "",
        metaDescription: item.metadata?.description ?? "",
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  for (const c of candidates) {
    try {
      if (!homepageText && new URL(c.pageUrl).hostname === startHost) homepageText = c.body;
    } catch {
      // a malformed page URL must not abort the crawl
    }
  }

  // Scored concurrently: these are independent per-page model calls, and running them in
  // series spent close to a minute of the route's budget for no reason.
  const scored = await Promise.all(
    candidates.map(async (c): Promise<CrawlPage | null> => {
      try {
        const hits = findLexiconHits([c.title, c.metaDescription, c.body].join("\n"));
        const analysis = await analyzeCopy(
          { title: c.title, metaDescription: c.metaDescription, h1: heroLineOf(c.body), bodyText: c.body },
          hits
        );
        return {
          url: c.pageUrl,
          score: analysis.score,
          flags: analysis.flags,
          title: c.title,
          excerpt: c.body.slice(0, EXCERPT_CHARS),
        };
      } catch {
        return null; // skip a page that fails to analyze; the crawl still succeeds
      }
    })
  );
  const pages = scored.filter((p): p is CrawlPage => p !== null);

  if (!homepageText && items[0]?.text) homepageText = stripConsentBlock(items[0].text).slice(0, 12000);
  return { pages, homepageText };
}
