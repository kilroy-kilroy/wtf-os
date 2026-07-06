// apps/web/lib/robot-tim/crawl.ts
import { runApifyActor } from "@repo/utils/research";
import { findLexiconHits } from "@/lib/wah-wah/lexicon";
import { analyzeCopy } from "@/lib/wah-wah/analyze";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import type { Crawl, CrawlPage } from "@/lib/robot-tim/types";

type ApifyPage = { url?: string; title?: string; text?: string };

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
    { timeoutSecs: 120 }
  )) as ApifyPage[];

  const startHost = new URL(start).hostname;
  const pages: CrawlPage[] = [];
  let homepageText = "";

  for (const item of items) {
    const pageUrl = item.url ?? start;
    const body = (item.text ?? "").slice(0, 12000);
    if (!body) continue;

    try {
      if (!homepageText && new URL(pageUrl).hostname === startHost) homepageText = body;
      const hits = findLexiconHits([item.title ?? "", body].join("\n"));
      const analysis = await analyzeCopy(
        { title: item.title ?? "", metaDescription: "", h1: "", bodyText: body },
        hits
      );
      pages.push({ url: pageUrl, score: analysis.score, flags: analysis.flags });
    } catch {
      // skip a page that fails to analyze; the crawl still succeeds
    }
  }

  if (!homepageText && items[0]?.text) homepageText = items[0].text.slice(0, 12000);
  return { pages, homepageText };
}
