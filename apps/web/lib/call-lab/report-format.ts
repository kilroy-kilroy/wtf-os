/**
 * Call Lab produces two distinct markdown report formats (see the canonical
 * prompts in `packages/prompts/call-lab/markdown-prompts.ts`):
 *
 *   - Lite  → headers `WHAT WORKED`, `WHAT TO WATCH`, `ONE MOVE TO LEVEL UP`,
 *             `CALL SIGNALS DETECTED`, `BOTTOM LINE`
 *   - Pro   → headers `STRENGTHS DETECTED`, `FRICTION DETECTED`,
 *             `TRUST ACCELERATION MAP`, `PERFORMANCE SCORES`, `BOTTOM LINE INSIGHT`
 *
 * The Pro-specific renderer (`CallLabProReport`) parses only the Pro headers.
 * Feeding it Lite markdown drops every section except the shared executive
 * summary top matter. This helper lets the report page route Lite markdown to a
 * general markdown renderer instead.
 */
export function isLiteMarkdownReport(markdown: string | null | undefined): boolean {
  if (!markdown) return false;

  // Pro reports own the STRENGTHS/FRICTION DETECTED sections — never treat
  // those as Lite even if some other wording coincidentally overlaps.
  if (/STRENGTHS DETECTED|FRICTION DETECTED/i.test(markdown)) return false;

  // Lite reports are identified by their WHAT WORKED / WHAT TO WATCH headers.
  return /^#{1,3}\s*WHAT WORKED\b/im.test(markdown) || /^#{1,3}\s*WHAT TO WATCH\b/im.test(markdown);
}

export interface LiteReportHeader {
  call: string;
  duration: string;
  score: number | null;
  effectiveness: string;
  dynamicsProfile: string;
  /** The markdown with the four top-matter label lines stripped out. */
  body: string;
}

/**
 * Split the Lite markdown top matter (the `**Call:** / **Duration:** /
 * **Score:** / **Dynamics Profile:**` lines) out into structured fields so the
 * report page can render a styled header card, and return the remaining
 * markdown (intro paragraph + all sections) for the general renderer.
 */
export function parseLiteReportHeader(markdown: string): LiteReportHeader {
  const grab = (re: RegExp) => markdown.match(re)?.[1]?.trim() ?? "";

  const call = grab(/\*\*Call:\*\*\s*([^\n]+)/i);
  const duration = grab(/\*\*Duration:\*\*\s*([^\n]+)/i);
  const scoreLine = grab(/\*\*Score:\*\*\s*([^\n]+)/i);
  const dynamicsProfile = grab(/\*\*Dynamics Profile:\*\*\s*([^\n]+)/i);

  const scoreNum = scoreLine.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  const score = scoreNum ? parseFloat(scoreNum[1]) : null;
  const effectiveness = scoreLine.match(/Effectiveness:\s*([^\n|]+)/i)?.[1]?.trim() ?? "";

  // Strip only the four known label lines; keep the intro paragraph and the
  // rest of the report for the markdown renderer.
  const body = markdown
    .replace(/^[ \t]*\*\*Call:\*\*[^\n]*\n?/im, "")
    .replace(/^[ \t]*\*\*Duration:\*\*[^\n]*\n?/im, "")
    .replace(/^[ \t]*\*\*Score:\*\*[^\n]*\n?/im, "")
    .replace(/^[ \t]*\*\*Dynamics Profile:\*\*[^\n]*\n?/im, "")
    .replace(/^\s+/, "");

  return { call, duration, score, effectiveness, dynamicsProfile, body };
}
