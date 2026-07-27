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
    },
    // A real 10-page crawl measured ~140s on timkilroy.com, so the old 120s budget
    // hung up on a run that was about to succeed — on every site of any size. The
    // route allows 300s total; 210s here leaves room for the per-page Opus scoring
    // that runs after the crawl returns.
    { timeoutSecs: 120, pollTimeoutSecs: 210 }
  )) as ApifyPage[];

  const startHost = new URL(start).hostname;
  const pages: CrawlPage[] = [];
  let homepageText = "";

  for (const item of items) {
    const pageUrl = item.url ?? start;
    const body = stripConsentBlock(item.text ?? "").slice(0, 12000);
    if (!body) continue;

    // Scoring a page that is really just a title and cookie furniture produces a
    // confident number about nothing — that is how a page with 59 characters of copy
    // came back as the most generic on the site. Leave it out rather than invent a score.
    if (!hasEnoughContent(body)) continue;

    const title = item.metadata?.title ?? item.title ?? "";
    const metaDescription = item.metadata?.description ?? "";
    const h1 = heroLineOf(body);

    try {
      if (!homepageText && new URL(pageUrl).hostname === startHost) homepageText = body;
      const hits = findLexiconHits([title, metaDescription, body].join("\n"));
      const analysis = await analyzeCopy({ title, metaDescription, h1, bodyText: body }, hits);
      pages.push({
        url: pageUrl,
        score: analysis.score,
        flags: analysis.flags,
        title,
        excerpt: body.slice(0, EXCERPT_CHARS),
      });
    } catch {
      // skip a page that fails to analyze; the crawl still succeeds
    }
  }

  if (!homepageText && items[0]?.text) homepageText = stripConsentBlock(items[0].text).slice(0, 12000);
  return { pages, homepageText };
}
