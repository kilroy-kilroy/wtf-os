# Case Study Lab Marketing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verbatim dark-card output into a marketing-grade case study — a rewritten composer voice, a light one-pager web report + downloadable letter PDF + light tight social crops, a live booking CTA, and a "Powered by Case Study Lab" mark — with a new interview "before" beat.

**Architecture:** The interview gains one `beforeState` slot. A single `buildCaseStudyView` normalizer resolves accent + agency/client branding + CTA href and maps BOTH the new and legacy `result` shapes into one render model, consumed by three surfaces: the light web report (React), the light social crops (Satori `ImageResponse`), and a letter PDF (`@react-pdf/renderer`). The composer is rewritten LAST to emit the new marketing shape. One additive `cta_url` column carries the booking link.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + Storage), Anthropic SDK (Opus), `next/og` (Satori), **`@react-pdf/renderer`**, Vitest. Repo is **npm** workspaces.

## Global Constraints

- **Light design system** (shared): `--paper #ffffff`, `--ink #16181d`, `--muted #5b6472`, `--hair #e4e7ec`, `--accent = agency color` (`accent` col → `agency_brand.colors[0]` → `#E51B23`). Accent ONLY on: the top band, stat arrows, the CTA, and left rules. White/light everywhere else. Serif display headline, sans body, sans stat numbers (largest element).
- **Voice:** headline = `[Client] [verb] [result] [method]` (one sentence); dek = before→after setup from `beforeState`; approach = challenge→named-method pairs, zero agency self-praise; one bold bridge sentence; **tight stat `value`** ("2.9x") with context in `caption`; named quote. **No fabrication.**
- **Surfaces & depth:** web report + PDF carry the full narrative; social crops are a tight lockup (headline + 3 stats + logos + tiny powered-by).
- **CTA href:** `cta_url` → `agency_url` → none. Image crops render CTA as text only.
- **Powered by Case Study Lab** on all three surfaces → `https://app.timkilroy.com/case-study-lab`.
- **Client is the visual hero; agency + powered-by small.**
- **Back-compat:** `buildCaseStudyView` maps legacy rows so old reports render. Only schema change: one nullable `cta_url` column.
- **BUILD-GREEN ORDER (critical):** every commit must keep `tsc` clean (`next build` typechecks the whole project) because `main` is shared + auto-deploying. The order below is chosen so no commit is red: the `view` normalizer (reads `any`) lands first, every renderer migrates onto it while the composer still emits the OLD shape, `buildCardModel` is removed only in the LAST renderer to drop it (the card), and the composer type change lands only after no renderer references the old `CaseStudy` fields.
- **Repo convention:** agents write code + tests + typecheck + commit; migrations applied by Tim; live/browser/PDF-visual verification deferred to Tim. Test: `cd apps/web && npx vitest run <path>`. Typecheck: `cd /Users/timkilroy/Projects/wtf-os && npx tsc -p apps/web/tsconfig.json --noEmit`. Never `git add -A` (a concurrent session may share `main`).

---

### Task 1: Migration — `cta_url` column

**Files:** Create `supabase/migrations/20260710_case_study_cta_url.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Live CTA: the agency's booking/contact link. The web report + PDF link the
-- "Book a call" button to this; falls back to agency_url, then plain text.
alter table public.case_study_lab_reports
  add column if not exists cta_url text;
```

- [ ] **Step 2: Commit** (Tim applies the SQL in Supabase before deploy)

```bash
git add supabase/migrations/20260710_case_study_cta_url.sql
git commit -m "feat(case-study-lab): migration for cta_url (live booking link)"
```

---

### Task 2: Interview gains the `beforeState` slot

**Files:**
- Modify: `packages/prompts/case-study-lab/index.ts` (CaseStudySlots, EMPTY_SLOTS, interviewer prompt)
- Modify: `apps/web/lib/case-study-lab/interview.ts` (SlotsSchema)
- Test: `apps/web/lib/case-study-lab/interview.test.ts`

**Interfaces:** Produces `CaseStudySlots.beforeState: string | null`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/lib/case-study-lab/interview.test.ts`:
```ts
it("carries beforeState through the turn parser", () => {
  const t = parseInterviewTurn(
    JSON.stringify({
      reply: "Got it.",
      slots: {
        clientName: "Splendid", clientAnonymized: false, clientDescriptor: "A DTC brand",
        beforeState: "Before us, their paid channel was scaling cost, not profit.",
        results: [], issues: [], quote: null, cta: null, teamCredit: null,
      },
      readyToGenerate: false,
    })
  );
  expect(t.slots.beforeState).toMatch(/scaling cost/);
});

it("defaults a missing beforeState to null", () => {
  const t = parseInterviewTurn(
    JSON.stringify({
      reply: "ok",
      slots: {
        clientName: null, clientAnonymized: false, clientDescriptor: null,
        results: [], issues: [], quote: null, cta: null, teamCredit: null,
      },
      readyToGenerate: false,
    })
  );
  expect(t.slots.beforeState).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && npx vitest run lib/case-study-lab/interview.test.ts` → FAIL (`beforeState` undefined).

- [ ] **Step 3: Add `beforeState` to the slots type + EMPTY_SLOTS**

In `packages/prompts/case-study-lab/index.ts`, add to `CaseStudySlots` (after `clientDescriptor: string | null;`): `  beforeState: string | null;`
and to `EMPTY_SLOTS` (after `clientDescriptor: null,`): `  beforeState: null,`

- [ ] **Step 4: Add the interviewer "before" question**

In `CASE_STUDY_INTERVIEWER_PROMPT`, add an ingredient after the results item:
```
8. beforeState — one or two sentences on the client's SITUATION before you started: where they were stuck, what was at stake, what "before" looked like. This is the setup for the transformation, distinct from the specific issues. Ask once after results and descriptor are in; if they have nothing to add, accept null and move on (like the quote — encouraged, not a blocker).
```
Add a RULES bullet:
```
- Capture the "before": once results + descriptor are in, ask what the client's situation looked like before you started. Record it in beforeState. Don't block readiness on it.
```
In the OUTPUT JSON `slots` shape, add: `    "beforeState": <string or null>,`

- [ ] **Step 5: Add `beforeState` to the turn SlotsSchema**

In `apps/web/lib/case-study-lab/interview.ts`, add to `SlotsSchema` (after `clientDescriptor`):
```ts
  beforeState: z.string().nullish().transform((v) => v ?? null),
```

- [ ] **Step 6: Run tests + typecheck**

Run vitest (above) → PASS. Run tsc → no new errors (add `beforeState: null` to any other `CaseStudySlots` literal the compiler flags).

- [ ] **Step 7: Commit**

```bash
git add packages/prompts/case-study-lab/index.ts apps/web/lib/case-study-lab/interview.ts apps/web/lib/case-study-lab/interview.test.ts
git commit -m "feat(case-study-lab): interview captures the client's 'before' state"
```

---

### Task 3: `buildCaseStudyView` normalizer (accent + branding + CTA href + back-compat)

**Files:**
- Create: `apps/web/lib/case-study-lab/view.ts`
- Test: `apps/web/lib/case-study-lab/view.test.ts`

**Interfaces:** Produces `buildCaseStudyView(report): CaseStudyView` — the single render model, handling the future composer shape AND legacy rows. **Does NOT remove `buildCardModel` yet** (card still uses it until Task 5).
```ts
export interface CaseStudyView {
  accent: string;
  agencyLogoUrl: string | null; agencyName: string | null;
  clientLogoUrl: string | null; clientName: string; clientDescriptor: string;
  kicker: string | null; dek: string | null; headline: string;
  approach: { challenge: string; method: string }[];
  bridge: string | null;
  stats: { value: string; caption: string; direction: "up" | "down" | "flat" }[];
  quote: { text: string; attribution: string } | null;
  cta: string; ctaHref: string | null; poweredByHref: string;
}
```

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/case-study-lab/view.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";

const base = {
  agency_brand: { colors: ["#0050bd"], logoUrl: null, name: "El Toro" },
  agency_url: "https://eltoro.com", client_logo_url: null,
  agency_logo_url: null, agency_name: "El Toro", accent: "#0050bd", cta_url: null,
};
function NEW_RESULT() {
  return { headline: "H", clientName: "C", clientDescriptor: "d", kicker: null, dek: "x",
    approach: [], bridge: "b", results: [], quote: null, cta: "go" };
}

describe("buildCaseStudyView", () => {
  it("maps the new V2 result shape", () => {
    const v = buildCaseStudyView({
      ...base,
      result: {
        headline: "H", clientName: "Splendid", clientDescriptor: "DTC apparel",
        kicker: "DTC · Paid", dek: "Before us, paid bled margin.",
        approach: [{ challenge: "no structure", method: "Power 5" }],
        bridge: "Paid became the profit driver.",
        results: [{ value: "2.9x", caption: "ROAS up from 1.8x", direction: "up" }],
        quote: null, cta: "Book a call.",
      },
    });
    expect(v.accent).toBe("#0050bd");
    expect(v.stats[0].value).toBe("2.9x");
    expect(v.dek).toMatch(/bled margin/);
    expect(v.approach[0].method).toBe("Power 5");
    expect(v.ctaHref).toBe("https://eltoro.com/");  // cta_url null -> agency_url (URL-normalized)
  });

  it("prefers cta_url over agency_url for the CTA href", () => {
    const v = buildCaseStudyView({ ...base, cta_url: "https://cal.com/eltoro", result: NEW_RESULT() });
    expect(v.ctaHref).toBe("https://cal.com/eltoro");
  });

  it("back-compat: maps a legacy result (issues + {label,value})", () => {
    const v = buildCaseStudyView({
      ...base,
      result: {
        headline: "H", clientName: "Old", clientDescriptor: "d",
        results: [{ label: "Overall ROAS increase", value: "50% (1.8x to 2.9x over year 1)" }],
        issues: [{ issue: "bad structure", solution: "rebuild" }],
        quote: null, cta: "go",
      },
    });
    expect(v.dek).toBeNull();
    expect(v.bridge).toBeNull();
    expect(v.approach[0]).toEqual({ challenge: "bad structure", method: "rebuild" });
    expect(v.stats[0].value).toBe("50% (1.8x to 2.9x over year 1)");
    expect(v.stats[0].caption).toBe("Overall ROAS increase");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && npx vitest run lib/case-study-lab/view.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement the normalizer**

Create `apps/web/lib/case-study-lab/view.ts`:
```ts
import type { AgencyBrand } from "@repo/prompts";

const DEFAULT_ACCENT = "#E51B23";
const POWERED_BY_HREF = "https://app.timkilroy.com/case-study-lab";
const HEX = /^#[0-9a-f]{6}$/i;

export interface CaseStudyView {
  accent: string;
  agencyLogoUrl: string | null;
  agencyName: string | null;
  clientLogoUrl: string | null;
  clientName: string;
  clientDescriptor: string;
  kicker: string | null;
  dek: string | null;
  headline: string;
  approach: { challenge: string; method: string }[];
  bridge: string | null;
  stats: { value: string; caption: string; direction: "up" | "down" | "flat" }[];
  quote: { text: string; attribution: string } | null;
  cta: string;
  ctaHref: string | null;
  poweredByHref: string;
}

function safeUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u.trim()) return null;
  try {
    const parsed = new URL(u.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function buildCaseStudyView(report: {
  agency_brand?: AgencyBrand | null;
  agency_url?: string | null;
  client_logo_url?: string | null;
  agency_logo_url?: string | null;
  agency_name?: string | null;
  accent?: string | null;
  cta_url?: string | null;
  result: any; // stored JSON — new or legacy shape; typed loosely on purpose
}): CaseStudyView {
  const colors = report.agency_brand?.colors ?? [];
  const scraped = colors.find((c) => HEX.test(c)) ?? colors[0];
  const accent =
    (report.accent && HEX.test(report.accent) ? report.accent : undefined) ?? scraped ?? DEFAULT_ACCENT;

  const r = report.result ?? {};

  const approach: { challenge: string; method: string }[] = Array.isArray(r.approach)
    ? r.approach.slice(0, 3).map((a: any) => ({ challenge: String(a.challenge ?? ""), method: String(a.method ?? "") }))
    : Array.isArray(r.issues)
      ? r.issues.slice(0, 3).map((i: any) => ({ challenge: String(i.issue ?? ""), method: String(i.solution ?? "") }))
      : [];

  const stats = Array.isArray(r.results)
    ? r.results.slice(0, 3).map((st: any) =>
        "caption" in st
          ? { value: String(st.value ?? ""), caption: String(st.caption ?? ""), direction: (st.direction ?? "up") as "up" | "down" | "flat" }
          : { value: String(st.value ?? ""), caption: String(st.label ?? ""), direction: "up" as const }
      )
    : [];

  return {
    accent,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    clientLogoUrl: report.client_logo_url ?? null,
    clientName: String(r.clientName ?? ""),
    clientDescriptor: String(r.clientDescriptor ?? ""),
    kicker: r.kicker ?? null,
    dek: typeof r.dek === "string" ? r.dek : null,
    headline: String(r.headline ?? ""),
    approach,
    bridge: typeof r.bridge === "string" ? r.bridge : null,
    stats,
    quote: r.quote ?? null,
    cta: String(r.cta ?? "Want results like this? Book a call."),
    ctaHref: safeUrl(report.cta_url) ?? safeUrl(report.agency_url),
    poweredByHref: POWERED_BY_HREF,
  };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run vitest (above) → PASS. Run tsc → clean (additive; nothing else touched).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/case-study-lab/view.ts apps/web/lib/case-study-lab/view.test.ts
git commit -m "feat(case-study-lab): buildCaseStudyView normalizer with legacy back-compat"
```

---

### Task 4: Light one-pager web report (ReportBody + page + opengraph → view)

**Files:**
- Rewrite: `apps/web/components/case-study-lab/ReportBody.tsx`
- Modify: `apps/web/app/case-study-lab/r/[id]/page.tsx`
- Modify: `apps/web/app/case-study-lab/r/[id]/opengraph-image.tsx`

**Interfaces:** Consumes `CaseStudyView` (Task 3). `buildCardModel` stays (card still uses it until Task 5); these three files stop using it.

- [ ] **Step 1: Rewrite ReportBody as the light one-pager**

Replace `apps/web/components/case-study-lab/ReportBody.tsx` entirely:
```tsx
import type { CaseStudyView } from "@/lib/case-study-lab/view";

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

export default function ReportBody({ view }: { view: CaseStudyView }) {
  const v = view;
  return (
    <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg bg-white text-[#16181d] shadow-xl">
      <div className="flex items-center gap-4 px-10 py-5 text-white" style={{ background: v.accent }}>
        {v.agencyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.agencyLogoUrl} alt={v.agencyName ?? "Agency"} className="h-8 w-auto" />
        ) : v.agencyName ? (
          <span className="text-lg font-extrabold tracking-wide">{v.agencyName}</span>
        ) : null}
        {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl && <span className="opacity-60">×</span>}
        {v.clientLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.clientLogoUrl} alt={v.clientName} className="h-8 w-auto rounded bg-white/95 px-2 py-1" />
        ) : (
          <span className="text-base font-semibold opacity-95">{v.clientName}</span>
        )}
        <span className="flex-1" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">Case Study</span>
      </div>

      <div className="px-10 pb-8 pt-10">
        {v.kicker && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: v.accent }}>{v.kicker}</p>
        )}
        <h1 className="mb-3 max-w-[22ch] font-serif text-[34px] font-semibold leading-[1.18] tracking-tight text-balance">{v.headline}</h1>
        {v.dek && <p className="mb-8 max-w-[60ch] text-[15px] leading-relaxed text-[#5b6472]">{v.dek}</p>}

        <div className="grid grid-cols-1 gap-11 sm:grid-cols-[1fr_260px]">
          <div>
            {v.approach.length > 0 && (
              <>
                <div className="mb-4 inline-block border-b-2 border-[#16181d] pb-2 text-xs font-bold uppercase tracking-[0.14em]">
                  {v.agencyName ? `What ${v.agencyName} did` : "What we did"}
                </div>
                <div className="flex flex-col">
                  {v.approach.map((a, i) => (
                    <div key={i} className="border-b border-[#e4e7ec] pb-[18px] pt-[18px] first:pt-0 last:border-b-0">
                      <p className="mb-1 text-[14.5px] font-bold">{a.challenge}</p>
                      <p className="text-sm leading-relaxed text-[#5b6472]">{a.method}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {v.bridge && (
              <p className="mt-[26px] border-t border-[#e4e7ec] pt-5 text-base font-semibold leading-relaxed">{v.bridge}</p>
            )}
          </div>

          {v.stats.length > 0 && (
            <aside className="rounded-lg bg-[#f6f7f9] px-[22px] py-6">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-[#5b6472]">The Results</h3>
              <div className="flex flex-col">
                {v.stats.map((s, i) => (
                  <div key={i} className="border-b border-[#e4e7ec] pb-5 pt-5 first:pt-0 last:border-b-0 last:pb-0">
                    <div className="flex items-baseline gap-1.5 text-[44px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: v.accent }}>
                      <span className="text-xl">{ARROW[s.direction]}</span>{s.value}
                    </div>
                    <div className="mt-[7px] text-[13px] leading-snug text-[#5b6472]">{s.caption}</div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {v.quote && (
          <blockquote className="mt-9 rounded-r-lg bg-[#f6f7f9] px-8 py-7" style={{ borderLeft: `4px solid ${v.accent}` }}>
            <p className="mb-3 font-serif text-[19px] leading-snug">&ldquo;{v.quote.text}&rdquo;</p>
            <div className="text-[13px] text-[#5b6472]">{v.quote.attribution}</div>
          </blockquote>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5 border-t border-[#e4e7ec] px-10 py-6">
        {v.ctaHref ? (
          <a href={v.ctaHref} target="_blank" rel="noreferrer" className="inline-block rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: v.accent }}>{v.cta} →</a>
        ) : (
          <span className="text-sm font-bold" style={{ color: v.accent }}>{v.cta}</span>
        )}
        <span className="text-[11.5px] text-[#5b6472]">
          Powered by <a href={v.poweredByHref} className="font-semibold" style={{ color: v.accent }} target="_blank" rel="noreferrer">Case Study Lab</a>
        </span>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Update the report page to a light shell + view**

Replace `apps/web/app/case-study-lab/r/[id]/page.tsx` entirely:
```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";
import ReportBody from "@/components/case-study-lab/ReportBody";
import DownloadButtons from "@/components/case-study-lab/DownloadButtons";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report?.result) return {};
  const v = buildCaseStudyView(report);
  return { title: `${v.clientName}: ${v.headline}`, description: v.dek ?? v.clientDescriptor };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) notFound();
  const view = buildCaseStudyView(report);
  return (
    <div className="min-h-screen bg-[#eef0f3]">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14">
        <ReportBody view={view} />
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-[#5b6472]">Download &amp; share:</div>
          <DownloadButtons id={id} />
        </div>
        <a href="/case-study-lab" className="text-sm text-[#5b6472] underline">Build another case study</a>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: opengraph-image uses the view**

In `apps/web/app/case-study-lab/r/[id]/opengraph-image.tsx`, replace the `buildCardModel` import with `import { buildCaseStudyView } from "@/lib/case-study-lab/view";`, and replace its usage: `const view = report?.result ? buildCaseStudyView(report) : null;` then `const headline = view?.headline ?? "Case Study";` and `const accent = view?.accent ?? "#E51B23";`. Remove the now-unused `CaseStudy` import if present.

- [ ] **Step 4: Typecheck + commit**

Run tsc → no errors in these files (card still compiles against `buildCardModel`).
Manual (deferred to Tim): `/case-study-lab/r/<id>` renders the light one-pager; legacy row renders (degraded, no dek/bridge).
```bash
git add apps/web/components/case-study-lab/ReportBody.tsx apps/web/app/case-study-lab/r/[id]/page.tsx apps/web/app/case-study-lab/r/[id]/opengraph-image.tsx
git commit -m "feat(case-study-lab): light one-pager web report via view normalizer"
```

---

### Task 5: Light + tight social crops (card route) + retire `buildCardModel`

**Files:**
- Rewrite: `apps/web/app/api/case-study-lab/card/[id]/route.tsx`
- Modify: `apps/web/components/case-study-lab/cardModel.ts` (keep only `CARD_SIZES`/`CardSize`)
- Delete: `apps/web/components/case-study-lab/cardModel.test.ts`

**Interfaces:** Consumes `CaseStudyView` (Task 3) + `CARD_SIZES`.

- [ ] **Step 1: Slim `cardModel.ts` to sizes only**

Replace `apps/web/components/case-study-lab/cardModel.ts` with:
```ts
export const CARD_SIZES = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1200, height: 675 },
} as const;

export type CardSize = keyof typeof CARD_SIZES;
```
Delete `apps/web/components/case-study-lab/cardModel.test.ts` (its cases moved to `view.test.ts`).

- [ ] **Step 2: Rewrite the card route (light, tight lockup)**

Replace `apps/web/app/api/case-study-lab/card/[id]/route.tsx` entirely:
```tsx
import { ImageResponse } from "next/og";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";
import { CARD_SIZES, type CardSize } from "@/components/case-study-lab/cardModel";

const LOGO_HEIGHT = 56;
const LOGO_MAX_WIDTH = 300;
const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

async function logoWidth(url: string): Promise<number> {
  const fallback = LOGO_HEIGHT * 3;
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const dv = new DataView(await res.arrayBuffer());
    let w = 0, h = 0;
    if (dv.byteLength > 24 && dv.getUint8(0) === 0x89 && dv.getUint8(1) === 0x50) {
      w = dv.getUint32(16); h = dv.getUint32(20);
    } else if (dv.byteLength > 4 && dv.getUint8(0) === 0xff && dv.getUint8(1) === 0xd8) {
      let o = 2;
      while (o + 9 < dv.byteLength) {
        if (dv.getUint8(o) !== 0xff) { o++; continue; }
        const m = dv.getUint8(o + 1);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = dv.getUint16(o + 5); w = dv.getUint16(o + 7); break; }
        o += 2 + dv.getUint16(o + 2);
      }
    }
    if (!w || !h) return fallback;
    return Math.min(Math.round(LOGO_HEIGHT * (w / h)), LOGO_MAX_WIDTH);
  } catch { return fallback; }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const sizeParam = new URL(req.url).searchParams.get("size") as CardSize | null;
  const size = sizeParam && sizeParam in CARD_SIZES ? sizeParam : "portrait";
  const dims = CARD_SIZES[size];

  const report = await getReport(id);
  if (!report || !report.result) return new Response("Not found", { status: 404 });
  const v = buildCaseStudyView(report);
  const [agencyLogoW, clientLogoW] = await Promise.all([
    v.agencyLogoUrl ? logoWidth(v.agencyLogoUrl) : Promise.resolve(0),
    v.clientLogoUrl ? logoWidth(v.clientLogoUrl) : Promise.resolve(0),
  ]);
  const stats = v.stats.slice(0, 3);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: v.accent, color: "#fff", padding: "28px 56px" }}>
          {v.agencyLogoUrl ? (
            <img src={v.agencyLogoUrl} width={agencyLogoW} height={LOGO_HEIGHT} style={{ objectFit: "contain" }} />
          ) : v.agencyName ? (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{v.agencyName}</div>
          ) : null}
          {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl ? <div style={{ display: "flex", fontSize: 30, opacity: 0.6 }}>×</div> : null}
          {v.clientLogoUrl ? (
            <img src={v.clientLogoUrl} width={clientLogoW} height={LOGO_HEIGHT} style={{ objectFit: "contain", background: "rgba(255,255,255,.95)", borderRadius: 6, padding: 4 }} />
          ) : null}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 3, textTransform: "uppercase", opacity: 0.85 }}>Case Study</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "48px 56px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {v.kicker ? <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: v.accent, textTransform: "uppercase", letterSpacing: 2 }}>{v.kicker}</div> : null}
            <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: "#16181d", lineHeight: 1.08, letterSpacing: -1 }}>{v.headline}</div>
          </div>

          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", maxWidth: 320 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 76, fontWeight: 800, color: v.accent, letterSpacing: -2 }}>
                  <span style={{ fontSize: 34 }}>{ARROW[s.direction]}</span>{s.value}
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#5b6472", marginTop: 6 }}>{s.caption}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: v.accent }}>{v.cta}</div>
            <div style={{ display: "flex", fontSize: 18, color: "#9aa0a6" }}>Powered by Case Study Lab</div>
          </div>
        </div>
      </div>
    ),
    dims
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run tsc → **project clean** (last `buildCardModel` consumer gone).
Manual (deferred): `curl` each size → `200 image/png`, light + tight, logos visible.
```bash
git add apps/web/app/api/case-study-lab/card/[id]/route.tsx apps/web/components/case-study-lab/cardModel.ts
git rm apps/web/components/case-study-lab/cardModel.test.ts
git commit -m "feat(case-study-lab): light tight social crops via view; retire buildCardModel"
```

---

### Task 6: Persist `cta_url` + review-screen booking-link field

**Files:**
- Modify: `apps/web/lib/case-study-lab/db.ts`
- Modify: `apps/web/app/api/case-study-lab/generate/route.ts`
- Modify: `apps/web/components/case-study-lab/DraftEditor.tsx`

- [ ] **Step 1: `getReport` selects `cta_url`**

In `db.ts`, append `, cta_url` to the `getReport` `.select(...)` string.

- [ ] **Step 2: `finalizeReport` persists `cta_url`**

Add `ctaUrl?: string | null;` to the `finalizeReport` patch type. After the `accent` line in its `update` assembly, add:
```ts
  if (patch.ctaUrl !== undefined) update.cta_url = patch.ctaUrl;
```

- [ ] **Step 3: generate route accepts + persists `ctaUrl`**

In `generate/route.ts`: hoist `let ctaUrl: string | null;` with the other declarations; in the parse `try`, after the accent assignment: `    ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim().slice(0, 500) : null;`. Pass `ctaUrl,` into the `finalizeReport({ ... })` call.

- [ ] **Step 4: DraftEditor booking-link field**

In `DraftEditor.tsx`: add `const [ctaUrl, setCtaUrl] = useState("");`. Add `ctaUrl: ctaUrl || null,` to the `/generate` body JSON. Add after the existing CTA text `ConsoleInput`:
```tsx
      <ConsoleInput
        type="url"
        value={ctaUrl}
        onChange={(e) => setCtaUrl((e.target as HTMLInputElement).value)}
        placeholder="CTA link — your booking or contact page (optional)"
        aria-label="CTA link"
      />
```

- [ ] **Step 5: Typecheck + commit**

Run tsc → clean.
```bash
git add apps/web/lib/case-study-lab/db.ts apps/web/app/api/case-study-lab/generate/route.ts apps/web/components/case-study-lab/DraftEditor.tsx
git commit -m "feat(case-study-lab): persist cta_url + review-screen booking link field"
```

---

### Task 7: Rewrite the composer — marketing shape + voice prompt

**Files:**
- Modify: `packages/prompts/case-study-lab/index.ts` (CaseStudy types + CASE_STUDY_COMPOSER_PROMPT)
- Modify: `apps/web/lib/case-study-lab/compose.ts` (CaseStudySchema)
- Test: `apps/web/lib/case-study-lab/compose.test.ts`

**Safe now:** every renderer already reads the `view` (which types `result` as `any`), so changing the `CaseStudy` interface only affects `compose.ts` (updated here) and `finalizeReport`'s `result` param (stored as jsonb, no field access).

- [ ] **Step 1: Replace the composed `CaseStudy` types**

In `packages/prompts/case-study-lab/index.ts`, add:
```ts
export interface CaseStudyStat { value: string; caption: string; direction: "up" | "down" | "flat"; }
export interface CaseStudyApproach { challenge: string; method: string; }
```
Replace the composed `CaseStudy` interface (NOT `CaseStudySlots`) with:
```ts
export interface CaseStudy {
  headline: string;
  clientName: string;
  clientDescriptor: string;
  kicker: string | null;
  dek: string;
  approach: CaseStudyApproach[];
  bridge: string;
  results: CaseStudyStat[];
  quote: { text: string; attribution: string } | null;
  cta: string;
}
```
(Keep `CaseStudyResult { label; value }` and the slot issue types — the interview still gathers those.)

- [ ] **Step 2: Rewrite the composer prompt**

Replace `CASE_STUDY_COMPOSER_PROMPT` with:
```ts
export const CASE_STUDY_COMPOSER_PROMPT = `You are Tim Kilroy writing a polished, published-quality marketing case study from gathered interview ingredients. You are NOT transcribing — you turn raw facts into crisp marketing copy, in the voice of a great agency case study (a clean KlientBoost one-pager). The client and their results are the hero; the agency is the bridge, never the hero.

HARD RULE — NO FABRICATION: use ONLY the numbers, names, quotes, and facts in the supplied ingredients. Never invent or inflate a metric, never fabricate a quote or a name, never add a claim that wasn't provided. You sharpen and structure wording; you never manufacture facts.

WRITE IT LIKE THIS:
- headline: ONE sentence, ~12-18 words, shape "[Client] [verb] [result] [method]". Lead with the strongest real result. No throat-clearing.
- kicker: a short eyebrow like "DTC Apparel · Paid Media & Growth" from the descriptor + the work. Null if you can't infer it cleanly.
- dek: 2-3 sentences. Establish the client, then the BEFORE — where they were stuck / what was at stake (use beforeState if present; otherwise infer the tension from the issues) — ending on the gap that set up the work. Dramatized but tight.
- approach: for EACH gathered issue, a punchy one-line "challenge" and a "method" naming the specific process piece that solved it (e.g. "Meta Power 5 rebuild — consolidated ad sets, Advantage+ Shopping, ..."). Max 3. Zero self-praise; specificity IS the credibility.
- bridge: ONE sentence chaining the methods to the outcome.
- results: turn EACH gathered result into a TIGHT value + a context caption. value is short ("2.9x", "35%", "$1.4M") — never a sentence. caption carries the context, including the starting point when given ("Return on ad spend, up from 1.8x — a 50% lift"). direction is "up" for growth, "down" for a good reduction (e.g. CPA down), "flat" otherwise. 1-3 results.
- quote: verbatim; attribute name + title + company if given, else null.
- cta: one line (default "Want results like this? Book a call.").

If clientAnonymized is true, never name the client — use the descriptor as the subject.

OUTPUT — ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "headline": "<one line>",
  "clientName": "<client name or anonymized label>",
  "clientDescriptor": "<one sentence>",
  "kicker": <string or null>,
  "dek": "<2-3 sentences>",
  "approach": [ { "challenge": "<one line>", "method": "<named process piece>" } ],
  "bridge": "<one sentence>",
  "results": [ { "value": "<short>", "caption": "<context>", "direction": "up|down|flat" } ],
  "quote": <{ "text": "<verbatim>", "attribution": "<name, title, company>" } or null>,
  "cta": "<one line>"
}
approach and results each contain at most 3 entries.`;
```

- [ ] **Step 3: Write the failing test**

Create `apps/web/lib/case-study-lab/compose.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseCaseStudy } from "@/lib/case-study-lab/compose";

describe("parseCaseStudy (V2 shape)", () => {
  it("parses the new marketing shape", () => {
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "Splendid turned paid into its most profitable channel",
        clientName: "Splendid", clientDescriptor: "A DTC apparel brand",
        kicker: "DTC Apparel · Paid Media", dek: "Splendid was growing fast. Its paid engine wasn't.",
        approach: [{ challenge: "No account structure", method: "Meta Power 5 rebuild" }],
        bridge: "Rebuilding paid flipped it into a profit driver.",
        results: [{ value: "2.9x", caption: "ROAS, up from 1.8x", direction: "up" }],
        quote: { text: "Game changer.", attribution: "VP Marketing" }, cta: "Book a call.",
      })
    );
    expect(cs.results[0].value).toBe("2.9x");
    expect(cs.results[0].direction).toBe("up");
    expect(cs.approach[0].method).toMatch(/Power 5/);
    expect(cs.kicker).toMatch(/DTC/);
  });

  it("caps approach and results at 3 and defaults a bad direction", () => {
    const four = [1, 2, 3, 4];
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "x", clientName: "A", clientDescriptor: "b", kicker: null, dek: "d",
        approach: four.map((n) => ({ challenge: `c${n}`, method: `m${n}` })),
        bridge: "br",
        results: four.map((n) => ({ value: `${n}x`, caption: "c", direction: "sideways" })),
        quote: null, cta: "go",
      })
    );
    expect(cs.approach).toHaveLength(3);
    expect(cs.results).toHaveLength(3);
    expect(cs.results[0].direction).toBe("up"); // invalid enum -> catch("up")
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `cd apps/web && npx vitest run lib/case-study-lab/compose.test.ts` → FAIL (schema still old shape).

- [ ] **Step 5: Replace the compose schema**

In `apps/web/lib/case-study-lab/compose.ts`, replace `CaseStudySchema` with:
```ts
const CaseStudySchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  kicker: z.string().nullish().transform((v) => v ?? null),
  dek: z.string(),
  approach: z
    .array(z.object({ challenge: z.string(), method: z.string() }))
    .transform((a) => a.slice(0, 3)),
  bridge: z.string(),
  results: z
    .array(
      z.object({
        value: z.string(),
        caption: z.string(),
        direction: z.enum(["up", "down", "flat"]).catch("up"),
      })
    )
    .transform((a) => a.slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
});
```

- [ ] **Step 6: Run tests + typecheck**

Run vitest (above) → PASS. Run tsc → **clean project-wide**.

- [ ] **Step 7: Commit**

```bash
git add packages/prompts/case-study-lab/index.ts apps/web/lib/case-study-lab/compose.ts apps/web/lib/case-study-lab/compose.test.ts
git commit -m "feat(case-study-lab): marketing composer shape + rewritten voice prompt"
```

---

### Task 8: Letter PDF one-pager (`@react-pdf/renderer`) + Download PDF button

**Files:**
- Modify: `apps/web/package.json` (add `@react-pdf/renderer`)
- Create: `apps/web/app/api/case-study-lab/pdf/[id]/route.tsx`
- Modify: `apps/web/components/case-study-lab/DownloadButtons.tsx`

**Interfaces:** Consumes `CaseStudyView` (Task 3). Produces `GET /api/case-study-lab/pdf/[id]` → `application/pdf`.

- [ ] **Step 1: Add the dependency**

Add `"@react-pdf/renderer": "^4.1.6"` to `apps/web/package.json` dependencies, then `cd /Users/timkilroy/Projects/wtf-os && npm install`. If install fails, report BLOCKED with the exact error (do not switch package managers). The `package.json` + root `package-lock.json` are committed in Step 4.

- [ ] **Step 2: Create the PDF route**

Create `apps/web/app/api/case-study-lab/pdf/[id]/route.tsx` (letter one-pager mirroring the web report; built-in Helvetica + Times-Roman fonts — no font files):
```tsx
import { Document, Page, Text, View, StyleSheet, Link, Image, renderToBuffer } from "@react-pdf/renderer";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView, type CaseStudyView } from "@/lib/case-study-lab/view";

export const dynamic = "force-dynamic";
const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

function styles(accent: string) {
  return StyleSheet.create({
    page: { fontFamily: "Helvetica", color: "#16181d", fontSize: 10 },
    band: { flexDirection: "row", alignItems: "center", backgroundColor: accent, color: "#fff", paddingVertical: 16, paddingHorizontal: 40 },
    agency: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#fff" },
    body: { paddingHorizontal: 40, paddingVertical: 26 },
    kicker: { color: accent, fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8 },
    headline: { fontFamily: "Times-Roman", fontSize: 22, lineHeight: 1.2, marginBottom: 8 },
    dek: { color: "#5b6472", fontSize: 10.5, lineHeight: 1.5, marginBottom: 20 },
    cols: { flexDirection: "row", gap: 26 },
    left: { flex: 1 },
    label: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", borderBottomWidth: 1.5, borderBottomColor: "#16181d", paddingBottom: 5, marginBottom: 10, alignSelf: "flex-start" },
    pair: { borderBottomWidth: 1, borderBottomColor: "#e4e7ec", paddingVertical: 8 },
    challenge: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
    method: { color: "#5b6472", fontSize: 9.5, lineHeight: 1.45 },
    bridge: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.4, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e4e7ec" },
    rail: { width: 170, backgroundColor: "#f6f7f9", borderRadius: 6, padding: 16 },
    railH: { color: "#5b6472", fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
    stat: { borderBottomWidth: 1, borderBottomColor: "#e4e7ec", paddingVertical: 10 },
    num: { color: accent, fontFamily: "Helvetica-Bold", fontSize: 30 },
    cap: { color: "#5b6472", fontSize: 9, marginTop: 4, lineHeight: 1.35 },
    quote: { marginTop: 22, backgroundColor: "#f6f7f9", borderLeftWidth: 3, borderLeftColor: accent, padding: 18 },
    quoteText: { fontFamily: "Times-Roman", fontSize: 13, lineHeight: 1.45, marginBottom: 8 },
    attr: { color: "#5b6472", fontSize: 9 },
    foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e4e7ec", paddingHorizontal: 40, paddingVertical: 16, marginTop: "auto" },
    cta: { color: "#fff", backgroundColor: accent, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, fontFamily: "Helvetica-Bold", fontSize: 10, textDecoration: "none" },
    powered: { color: "#5b6472", fontSize: 8 },
  });
}

function Doc({ v }: { v: CaseStudyView }) {
  const s = styles(v.accent);
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.band}>
          {v.agencyLogoUrl ? <Image src={v.agencyLogoUrl} style={{ height: 26, marginRight: 12 }} /> : v.agencyName ? <Text style={s.agency}>{v.agencyName}</Text> : null}
          {(v.agencyLogoUrl || v.agencyName) && v.clientLogoUrl ? <Text style={{ color: "#fff", opacity: 0.6, marginHorizontal: 8 }}>×</Text> : null}
          {v.clientLogoUrl ? <Image src={v.clientLogoUrl} style={{ height: 26 }} /> : null}
        </View>

        <View style={s.body}>
          {v.kicker ? <Text style={s.kicker}>{v.kicker}</Text> : null}
          <Text style={s.headline}>{v.headline}</Text>
          {v.dek ? <Text style={s.dek}>{v.dek}</Text> : null}

          <View style={s.cols}>
            <View style={s.left}>
              {v.approach.length > 0 ? <Text style={s.label}>{v.agencyName ? `What ${v.agencyName} did` : "What we did"}</Text> : null}
              {v.approach.map((a, i) => (
                <View key={i} style={s.pair}>
                  <Text style={s.challenge}>{a.challenge}</Text>
                  <Text style={s.method}>{a.method}</Text>
                </View>
              ))}
              {v.bridge ? <Text style={s.bridge}>{v.bridge}</Text> : null}
            </View>

            {v.stats.length > 0 ? (
              <View style={s.rail}>
                <Text style={s.railH}>The Results</Text>
                {v.stats.map((st, i) => (
                  <View key={i} style={s.stat}>
                    <Text style={s.num}>{ARROW[st.direction]} {st.value}</Text>
                    <Text style={s.cap}>{st.caption}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {v.quote ? (
            <View style={s.quote}>
              <Text style={s.quoteText}>&ldquo;{v.quote.text}&rdquo;</Text>
              <Text style={s.attr}>{v.quote.attribution}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.foot}>
          {v.ctaHref ? <Link src={v.ctaHref} style={s.cta}>{v.cta}</Link> : <Text style={{ color: v.accent, fontFamily: "Helvetica-Bold", fontSize: 10 }}>{v.cta}</Text>}
          <Link src={v.poweredByHref} style={s.powered}>Powered by Case Study Lab</Link>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) return new Response("Not found", { status: 404 });
  const v = buildCaseStudyView(report);
  const buffer = await renderToBuffer(<Doc v={v} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="case-study.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
```
If `renderToBuffer` isn't exported in the installed version, import it per that version's docs (e.g. from `@react-pdf/renderer`), keeping the `Doc` JSX identical.

- [ ] **Step 3: Add the Download PDF button (light styling)**

Replace `apps/web/components/case-study-lab/DownloadButtons.tsx`:
```tsx
"use client";

import { CARD_SIZES, type CardSize } from "@/components/case-study-lab/cardModel";

const LABELS: Record<CardSize, string> = {
  square: "Square (Instagram)",
  portrait: "Portrait (LinkedIn / FB)",
  landscape: "Landscape (Twitter)",
};

export default function DownloadButtons({ id }: { id: string }) {
  const sizes = Object.keys(CARD_SIZES) as CardSize[];
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`/api/case-study-lab/pdf/${id}`}
        download="case-study.pdf"
        target="_blank"
        rel="noreferrer"
        className="rounded border border-[#16181d] bg-[#16181d] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        ⬇ One-pager PDF
      </a>
      {sizes.map((s) => (
        <a
          key={s}
          href={`/api/case-study-lab/card/${id}?size=${s}`}
          download={`case-study-${s}.png`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-[#d5d9e0] px-4 py-2 text-sm text-[#16181d] hover:bg-[#f6f7f9]"
        >
          ⬇ {LABELS[s]}
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

Run tsc → clean.
Manual (deferred to Tim): `curl -s -o /tmp/cs.pdf -w "%{http_code} %{content_type}\n" ".../api/case-study-lab/pdf/<id>"` → `200 application/pdf`; `head -c4 /tmp/cs.pdf` → `%PDF`; opens as a clean letter one-pager.
```bash
git add apps/web/package.json package-lock.json apps/web/app/api/case-study-lab/pdf/[id]/route.tsx apps/web/components/case-study-lab/DownloadButtons.tsx
git commit -m "feat(case-study-lab): letter PDF one-pager (@react-pdf/renderer) + Download PDF button"
```

---

## Final verification

- [ ] `cd apps/web && npx vitest run lib/case-study-lab components/case-study-lab` — all green.
- [ ] `npx tsc -p apps/web/tsconfig.json --noEmit` — clean project-wide.
- [ ] Deferred to Tim (needs `cta_url` migration applied + a live run): fresh interview (incl. the "before" question) → review screen (agency name/logo/color + **booking link**) → generate → **light** web report with narrative + clickable CTA + powered-by; **Download PDF** → clean letter one-pager; all three social crops `200 image/png`, light + tight. Regenerate the El Toro/Splendid row for the full treatment.
- [ ] Deferred: a legacy row (pre-redesign `result`) still renders on the web report + card without error (back-compat).
