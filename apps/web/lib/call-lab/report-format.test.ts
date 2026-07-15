import { describe, it, expect } from "vitest";
import { isLiteMarkdownReport } from "./report-format";

// A trimmed sample of the real Lite markdown emitted for call_scores rows
// (version "lite"). Headers: WHAT WORKED / WHAT TO WATCH / ONE MOVE TO LEVEL UP
// / CALL SIGNALS DETECTED / BOTTOM LINE.
const LITE_MARKDOWN = `**Call:** Glidecoat (Paul + James Payson)
**Duration:** ~40 minutes
**Score:** 6/10 | Effectiveness: Medium
**Dynamics Profile:** High-Prep, Soft-Exit

Don came in with real homework done.

---

## WHAT WORKED

**The Framework Drop** (Control)
The Targeted Growth System gave Don a named structure.

## WHAT TO WATCH

**The Generous Professor** (Diagnosis)
Don taught for 35 minutes straight.

## ONE MOVE TO LEVEL UP

Lock the second call before the first one ends.

## BOTTOM LINE

Strong call. Make the next one undeniable.`;

// A trimmed sample of the Pro markdown format. Headers: STRENGTHS DETECTED /
// FRICTION DETECTED / BOTTOM LINE INSIGHT. This must keep using CallLabProReport.
const PRO_MARKDOWN = `**Call:** Acme (Jane + John)
**Duration:** ~30 minutes
**Score:** 7/10
**Dynamics Profile:** High-Control

## 1. EXECUTIVE SUMMARY

Solid call.

**STRENGTHS DETECTED**
- **The Framework Drop** (Control)

**FRICTION DETECTED**
- **The Soft Close Fade** (Activation)

## 10. BOTTOM LINE INSIGHT

Anchor urgency earlier.`;

describe("isLiteMarkdownReport", () => {
  it("detects Lite-format markdown by its WHAT WORKED / WHAT TO WATCH headers", () => {
    expect(isLiteMarkdownReport(LITE_MARKDOWN)).toBe(true);
  });

  it("does NOT treat Pro-format markdown as Lite", () => {
    expect(isLiteMarkdownReport(PRO_MARKDOWN)).toBe(false);
  });

  it("returns false for empty / nullish content", () => {
    expect(isLiteMarkdownReport("")).toBe(false);
    expect(isLiteMarkdownReport(null as unknown as string)).toBe(false);
    expect(isLiteMarkdownReport(undefined as unknown as string)).toBe(false);
  });

  it("returns false for markdown that matches neither format (leaves existing behavior untouched)", () => {
    expect(isLiteMarkdownReport("# Some other doc\n\nJust prose.")).toBe(false);
  });
});
