// The canonical wah-wah phrases — the sounds the adults make in a Peanuts
// cartoon. Seed list; extend from the live transcript and Tim's greatest hits.
export const WAHWAH_PHRASES: string[] = [
  "full-service",
  "full service",
  "results-driven",
  "results driven",
  "data-driven",
  "data driven",
  "extension of your team",
  "customer-centric",
  "client-centric",
  "your partner in growth",
  "growth partner",
  "partner in your success",
  "cutting-edge",
  "best-in-class",
  "world-class",
  "industry-leading",
  "innovative solutions",
  "tailored solutions",
  "custom solutions",
  "holistic approach",
  "360-degree",
  "one-stop shop",
  "one stop shop",
  "passionate about",
  "proven track record",
  "exceed expectations",
  "move the needle",
  "take your business to the next level",
  "next level",
  "unlock growth",
  "unlock your potential",
  "scale your business",
  "roi-focused",
  "performance-driven",
  "brands that resonate",
  "strategic partner",
  "trusted partner",
  "we get it",
  "synergy",
];

export type LexiconHit = {
  phrase: string;
  context: string; // ~80 chars around the hit
};

export function findLexiconHits(text: string): LexiconHit[] {
  const lower = text.toLowerCase();
  const hits: LexiconHit[] = [];
  const seen = new Set<string>();

  for (const phrase of WAHWAH_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx === -1 || seen.has(phrase)) continue;
    seen.add(phrase);
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + phrase.length + 40);
    hits.push({ phrase, context: text.slice(start, end).trim() });
  }
  return hits;
}
