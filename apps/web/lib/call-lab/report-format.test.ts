import { describe, it, expect } from "vitest";
import { isLiteMarkdownReport, parseLiteReportHeader } from "./report-format";

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

describe("parseLiteReportHeader", () => {
  it("extracts the top-matter fields", () => {
    const h = parseLiteReportHeader(LITE_MARKDOWN);
    expect(h.call).toBe("Glidecoat (Paul + James Payson)");
    expect(h.duration).toBe("~40 minutes");
    expect(h.score).toBe(6);
    expect(h.effectiveness).toBe("Medium");
    expect(h.dynamicsProfile).toBe("High-Prep, Soft-Exit");
  });

  it("strips the four label lines from the body but keeps the intro + sections", () => {
    const { body } = parseLiteReportHeader(LITE_MARKDOWN);
    expect(body).not.toMatch(/\*\*Call:\*\*/);
    expect(body).not.toMatch(/\*\*Duration:\*\*/);
    expect(body).not.toMatch(/\*\*Score:\*\*/);
    expect(body).not.toMatch(/\*\*Dynamics Profile:\*\*/);
    // Intro paragraph and section headers survive.
    expect(body).toMatch(/Don came in with real homework done/);
    expect(body).toMatch(/## WHAT WORKED/);
    expect(body).toMatch(/## BOTTOM LINE/);
  });

  it("handles a decimal score and missing effectiveness", () => {
    const h = parseLiteReportHeader("**Score:** 7.5/10\n\n## WHAT WORKED\n\nx");
    expect(h.score).toBe(7.5);
    expect(h.effectiveness).toBe("");
  });
});
