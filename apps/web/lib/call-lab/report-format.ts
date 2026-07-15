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
