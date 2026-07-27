// Cleanup for Apify's crawled page text before it reaches the Wah-Wah scorer.
//
// The crawler returns everything a browser renders, which on a consented site means the
// entire cookie-preferences table — vendor names, durations, per-cookie descriptions.
// Measured on timkilroy.com that was 62% of the homepage's captured text, and the scorer
// was grading it as if it were marketing copy. Worse, the Detector's rubric keys its
// hardest rule on the hero/H1, and the crawl was passing an empty title, meta and H1 for
// every page, so the model saw body text alone and returned near-identical scores.

/** Only an unambiguous banner line may OPEN a consent block. */
const CONSENT_START =
  /(we use cookies|we value your privacy|cookie polic|manage consent|privacy overview)/i;

/**
 * Weaker signals may only EXTEND a block that is already open. `^\S+$` catches the bare
 * cookie identifiers that make up most of the table (`_ga`, `lidc`,
 * `ytidb::LAST_RESULT_ENTRY_KEY`); it is deliberately restricted to single tokens because
 * real marketing lines almost always contain a space. An earlier version allowed any
 * short line to extend the block and swallowed whole pages.
 */
const CONSENT_WEAK = new RegExp(
  [
    "cookie|consent|gdpr|expires?",
    "^duration$|^description$",
    "^\\d+\\s*(second|minute|hour|day|week|month|year)",
    "^(necessary|functional|analytics|advertisement|performance|others|session)$",
    "cloudflare|perimeterx|google analytics",
    "^\\S+$",
  ].join("|"),
  "i"
);

/** How far past the last junk line we keep looking before declaring the block closed. */
const BRIDGE_LOOKAHEAD = 6;

/**
 * A page needs at least this much real copy to be worth scoring. Below it the crawler
 * captured a title and furniture — scoring that produces a confident number about
 * nothing, which is how a content-less page ended up as the site's "most generic".
 */
export const MIN_SCORABLE_CHARS = 300;

/**
 * Remove contiguous cookie/consent blocks. Excises the whole span rather than filtering
 * line by line: the table interleaves matching and non-matching lines, so per-line
 * filtering either leaks rows or, when loosened enough to catch them, eats real copy.
 */
export function stripConsentBlock(text: string): string {
  const lines = text.split("\n").map((l) => l.trim());
  const keep = new Array(lines.length).fill(true);

  let i = 0;
  while (i < lines.length) {
    if (lines[i] && CONSENT_START.test(lines[i])) {
      let end = i;
      for (;;) {
        let next = -1;
        for (let k = end + 1; k < Math.min(end + 1 + BRIDGE_LOOKAHEAD, lines.length); k++) {
          if (lines[k] && CONSENT_WEAK.test(lines[k])) {
            next = k;
            break;
          }
        }
        if (next === -1) break;
        end = next;
      }
      for (let k = i; k <= end; k++) keep[k] = false;
      i = end + 1;
    } else {
      i++;
    }
  }

  return lines.filter((l, idx) => keep[idx] && l).join("\n");
}

/**
 * The first line of cleaned text, used as the H1/hero proxy. The crawler does not return
 * markup (its `html` field comes back empty with the input we send), and what the rubric
 * actually asks about is "what a FIRST-TIME VISITOR experiences" — which is the top
 * visible line, whether or not it is tagged <h1>.
 */
export function heroLineOf(cleanedText: string): string {
  return cleanedText.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
}

export function hasEnoughContent(cleanedText: string): boolean {
  return cleanedText.trim().length >= MIN_SCORABLE_CHARS;
}
