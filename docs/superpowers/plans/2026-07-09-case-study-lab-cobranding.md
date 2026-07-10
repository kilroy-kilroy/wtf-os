# Case Study Lab Co-Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the agency on its own case-study asset — a co-branded header (agency + client) on both the web report and the downloadable card, sourced from manual review-screen inputs, with all logos normalized to PNG so `next/og` stops crashing on webp.

**Architecture:** Three additive nullable DB columns carry the agency name, agency logo URL, and chosen accent. The review screen (`DraftEditor`) collects them (prefilled from the best-effort scrape) and `/generate` persists them. `buildCardModel` resolves the accent (`accent` col → scraped color → default) and exposes the agency fields; `ReportBody` (web) and the `card/[id]` route (image) render the co-branded header. A `sharp` transcode step in the logo upload path converts every uploaded logo to PNG.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + Storage), `@vercel/og` (Satori) via `next/og`, `sharp` for transcode, Vitest, cheerio.

## Global Constraints

- Logos are stored as **PNG** in the existing **public** bucket `case-study-lab-assets`; paths `{id}/client-logo.png` and `{id}/agency-logo.png`.
- Accent precedence is exactly: **`accent` column → `agency_brand.colors[0]` → `#E51B23`**.
- `next/og` (Satori) decodes **PNG/JPEG only** — never hand it webp/svg.
- The **agency is never anonymized**; anonymization only blanks the **client** side (name + client logo).
- Keep the locked rule: **no Tim / Case Study Lab mark** on the downloadable card.
- New DB columns are **nullable**; existing rows must render unchanged (agency side falls back to name, then to nothing).
- Test runner: `cd apps/web && npx vitest run <path>`. Typecheck: `npx tsc -p apps/web/tsconfig.json --noEmit`.

---

### Task 1: Database migration — agency columns

**Files:**
- Create: `supabase/migrations/20260709_case_study_cobranding.sql`

**Interfaces:**
- Produces: columns `agency_name text`, `agency_logo_url text`, `accent text` on `public.case_study_lab_reports`.

- [ ] **Step 1: Write the migration**

```sql
-- Agency co-branding: the case study asset now shows the agency (logo/name)
-- alongside the client. accent is the agency's chosen brand color (hex), the
-- source of truth for the report/card accent. All nullable — existing rows
-- fall back to scraped colors / no agency mark.

alter table public.case_study_lab_reports
  add column if not exists agency_name     text,
  add column if not exists agency_logo_url text,
  add column if not exists accent          text;
```

- [ ] **Step 2: Apply the migration**

Apply against the project database (Supabase SQL editor or `supabase db push`, matching how prior `case_study_lab_reports` migrations were applied).

- [ ] **Step 3: Verify the columns exist**

Run (service-role, e.g. via a one-off fetch to PostgREST or the SQL editor):
```sql
select column_name from information_schema.columns
where table_name = 'case_study_lab_reports'
  and column_name in ('agency_name','agency_logo_url','accent');
```
Expected: 3 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260709_case_study_cobranding.sql
git commit -m "feat(case-study-lab): migration for agency_name, agency_logo_url, accent"
```

---

### Task 2: Scrape the agency name

**Files:**
- Modify: `packages/prompts/case-study-lab/index.ts` (AgencyBrand interface)
- Modify: `apps/web/lib/case-study-lab/extract.ts:15-39` (`extractBrand`)
- Test: `apps/web/lib/case-study-lab/extract.test.ts`

**Interfaces:**
- Produces: `AgencyBrand.name: string | null`; `extractBrand(html, baseUrl)` populates `name` from `og:site_name`, else `<title>`, else `null`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/lib/case-study-lab/extract.test.ts`:
```ts
it("reads the agency name from og:site_name", () => {
  const html = `<html><head>
    <meta property="og:site_name" content="El Toro" />
    <title>El Toro — Ecommerce Growth</title>
  </head><body></body></html>`;
  expect(extractBrand(html, "https://eltoro.com").name).toBe("El Toro");
});

it("falls back to <title> when og:site_name is absent", () => {
  const html = `<html><head><title>Northbound Agency</title></head><body></body></html>`;
  expect(extractBrand(html, "https://x.com").name).toBe("Northbound Agency");
});

it("name is null when neither is present", () => {
  expect(extractBrand("<html><head></head><body></body></html>", "https://x.com").name).toBeNull();
});
```
(If `extract.test.ts` does not yet import `extractBrand`, add `import { extractBrand } from "@/lib/case-study-lab/extract";` at the top.)

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && npx vitest run lib/case-study-lab/extract.test.ts`
Expected: FAIL — `name` is `undefined` (property does not exist).

- [ ] **Step 3: Add `name` to the AgencyBrand interface**

In `packages/prompts/case-study-lab/index.ts`, change:
```ts
export interface AgencyBrand {
  colors: string[];
  logoUrl: string | null;
}
```
to:
```ts
export interface AgencyBrand {
  colors: string[];
  logoUrl: string | null;
  name: string | null;
}
```

- [ ] **Step 4: Populate `name` in `extractBrand`**

In `apps/web/lib/case-study-lab/extract.ts`, inside `extractBrand`, after the logo block and before `return`, add:
```ts
const siteName =
  $('meta[property="og:site_name"]').attr("content")?.trim() ||
  $("title").first().text().trim() ||
  null;
```
and change the return to:
```ts
return { colors: colors.slice(0, 5), logoUrl, name: siteName };
```
Also update the two `fetchBrand` early-return literals in the same file (the `!res.ok` branch and the `catch`/loop-exhausted branches) from `{ colors: [], logoUrl: null }` to `{ colors: [], logoUrl: null, name: null }`.

- [ ] **Step 5: Fix the other AgencyBrand literals**

Search and update every remaining `{ colors: [], logoUrl: null }` literal to include `name: null`:
```bash
grep -rn "colors: \[\], logoUrl: null" apps/web --include=*.ts --include=*.tsx
```
Update each hit (expected: `apps/web/app/api/case-study-lab/start/route.ts:32`, `apps/web/app/api/case-study-lab/turn/route.ts:40`, `apps/web/components/case-study-lab/Flow.tsx:19`).

- [ ] **Step 6: Run tests + typecheck**

Run: `cd apps/web && npx vitest run lib/case-study-lab/extract.test.ts`
Expected: PASS.
Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/prompts/case-study-lab/index.ts apps/web/lib/case-study-lab/extract.ts apps/web/lib/case-study-lab/extract.test.ts apps/web/app/api/case-study-lab/start/route.ts apps/web/app/api/case-study-lab/turn/route.ts apps/web/components/case-study-lab/Flow.tsx
git commit -m "feat(case-study-lab): scrape agency name into AgencyBrand"
```

---

### Task 3: PNG transcode utility

**Files:**
- Modify: `apps/web/package.json` (add `sharp` dependency)
- Create: `apps/web/lib/case-study-lab/image.ts`
- Test: `apps/web/lib/case-study-lab/image.test.ts`

**Interfaces:**
- Produces: `transcodeToPng(input: ArrayBuffer | Uint8Array): Promise<Buffer>` — returns PNG bytes regardless of input format (png/jpeg/webp).

- [ ] **Step 1: Add sharp as an explicit dependency**

In `apps/web/package.json`, add to `dependencies` (alphabetical position):
```json
"sharp": "^0.34.5",
```
Then install:
```bash
cd /Users/timkilroy/Projects/wtf-os && npm install
```
(Repo is npm-managed: npm workspaces + package-lock.json.)

- [ ] **Step 2: Write the failing test**

Create `apps/web/lib/case-study-lab/image.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { transcodeToPng } from "@/lib/case-study-lab/image";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("transcodeToPng", () => {
  it("converts a webp buffer to PNG", async () => {
    const webp = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).webp().toBuffer();
    const out = await transcodeToPng(webp);
    expect(out.subarray(0, 8)).toEqual(PNG_SIG);
  });

  it("passes PNG through as valid PNG", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 128, b: 255 } },
    }).png().toBuffer();
    const out = await transcodeToPng(png);
    expect(out.subarray(0, 8)).toEqual(PNG_SIG);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd apps/web && npx vitest run lib/case-study-lab/image.test.ts`
Expected: FAIL — cannot resolve `@/lib/case-study-lab/image`.

- [ ] **Step 4: Implement the utility**

Create `apps/web/lib/case-study-lab/image.ts`:
```ts
import sharp from "sharp";

// next/og (Satori) only decodes PNG/JPEG. Normalize every uploaded logo to PNG
// so both the browser <img> and the ImageResponse card can render it.
export async function transcodeToPng(input: ArrayBuffer | Uint8Array): Promise<Buffer> {
  return sharp(Buffer.from(input)).png().toBuffer();
}
```

- [ ] **Step 5: Run tests**

Run: `cd apps/web && npx vitest run lib/case-study-lab/image.test.ts`
Expected: PASS (both).

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/lib/case-study-lab/image.ts apps/web/lib/case-study-lab/image.test.ts
# include the lockfile updated by install:
git add package-lock.json
git commit -m "feat(case-study-lab): transcodeToPng logo normalizer (sharp)"
```

---

### Task 4: Logo upload → PNG, agency path, and report persistence (db layer)

**Files:**
- Modify: `apps/web/lib/case-study-lab/db.ts` (upload fn, `getReport` select, `finalizeReport`)

**Interfaces:**
- Consumes: `transcodeToPng` (Task 3).
- Produces:
  - `uploadLogo(id: string, bytes: ArrayBuffer, kind: "client" | "agency"): Promise<string>` — transcodes to PNG, stores `{id}/{kind}-logo.png`, returns public URL.
  - `getReport` result additionally includes `agency_name`, `agency_logo_url`, `accent`.
  - `finalizeReport(id, patch)` where `patch` additionally accepts `agencyName?: string | null`, `agencyLogoUrl?: string | null`, `accent?: string | null`.

- [ ] **Step 1: Replace `uploadClientLogo` with a kind-aware, PNG-normalizing `uploadLogo`**

In `apps/web/lib/case-study-lab/db.ts`, add the import at the top:
```ts
import { transcodeToPng } from "@/lib/case-study-lab/image";
```
Replace the existing `uploadClientLogo` function (lines ~106-120) with:
```ts
export async function uploadLogo(
  id: string,
  bytes: ArrayBuffer,
  kind: "client" | "agency"
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const png = await transcodeToPng(bytes);
  const path = `${id}/${kind}-logo.png`;
  const { error } = await (supabase as any).storage
    .from(BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl as string;
}
```

- [ ] **Step 2: Add the new columns to `getReport`'s select**

In `getReport`, change the `.select(...)` string to include the three new columns:
```ts
.select(
  "id, email, agency_url, agency_brand, client_name, client_anonymized, client_logo_url, agency_name, agency_logo_url, accent, status, conversation, slots, result, created_at"
)
```

- [ ] **Step 3: Persist agency fields in `finalizeReport`**

In `finalizeReport`, extend the `patch` parameter type and the `update` object. Change the signature's patch type to add:
```ts
    agencyName?: string | null;
    agencyLogoUrl?: string | null;
    accent?: string | null;
```
and after the existing `if (patch.slots !== undefined) update.slots = patch.slots;` line, add:
```ts
  if (patch.agencyName !== undefined) update.agency_name = patch.agencyName;
  if (patch.agencyLogoUrl !== undefined) update.agency_logo_url = patch.agencyLogoUrl;
  if (patch.accent !== undefined) update.accent = patch.accent;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: errors ONLY at the old `uploadClientLogo` call site (`logo/route.ts`) — fixed in Task 5. If any other file references `uploadClientLogo`, note it for Task 5.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/case-study-lab/db.ts
git commit -m "feat(case-study-lab): PNG-normalizing uploadLogo(kind) + persist agency fields"
```

---

### Task 5: Routes — logo upload kind + generate persistence

**Files:**
- Modify: `apps/web/app/api/case-study-lab/logo/route.ts`
- Modify: `apps/web/app/api/case-study-lab/generate/route.ts`

**Interfaces:**
- Consumes: `uploadLogo` and extended `finalizeReport` (Task 4).
- Produces: `/logo` accepts a `kind` form field (`"client"` default | `"agency"`); `/generate` accepts `agencyName`, `agencyLogoUrl`, `accent` in its JSON body.

- [ ] **Step 1: Update the logo route to pass `kind` and use `uploadLogo`**

In `apps/web/app/api/case-study-lab/logo/route.ts`, change the import `uploadClientLogo` → `uploadLogo`. After reading `id`, read the kind:
```ts
    const kindRaw = String(form.get("kind") ?? "client");
    const kind = kindRaw === "agency" ? "agency" : "client";
```
Replace the upload call:
```ts
    const url = await uploadLogo(id, await file.arrayBuffer(), kind);
```

- [ ] **Step 2: Update the generate route to accept + persist agency fields**

In `apps/web/app/api/case-study-lab/generate/route.ts`, hoist three declarations into the outer scope alongside the existing `let id; let clientName; ...` block (so they're in scope at the `finalizeReport` call):
```ts
  let agencyName: string | null;
  let agencyLogoUrl: string | null;
  let accent: string | null;
```
Then inside the body-parsing `try`, after `cta = ...`, assign them:
```ts
    agencyName = body.agencyName ? String(body.agencyName).trim().slice(0, 120) : null;
    agencyLogoUrl = body.agencyLogoUrl ? String(body.agencyLogoUrl).slice(0, 500) : null;
    accent =
      typeof body.accent === "string" && /^#[0-9a-f]{6}$/i.test(body.accent.trim())
        ? body.accent.trim()
        : null;
```

Then in the `finalizeReport(id, { ... })` call, add:
```ts
      agencyName,
      agencyLogoUrl,
      accent,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification — webp upload no longer breaks the card**

Start the app (`cd apps/web && npm run dev -w apps/web`), or against the deployed preview: upload a **webp** client logo through the review screen and generate. Then fetch the card:
```bash
curl -s -o /tmp/card.png -w "%{http_code} %{content_type}\n" \
  "http://localhost:3000/api/case-study-lab/card/<id>?size=portrait"
```
Expected: `200 image/png` (previously threw "Unsupported image type: image/webp"). Confirm `/tmp/card.png` opens as a valid PNG.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/case-study-lab/logo/route.ts apps/web/app/api/case-study-lab/generate/route.ts
git commit -m "feat(case-study-lab): logo kind param + generate persists agency name/logo/accent"
```

---

### Task 6: cardModel — accent precedence + agency fields

**Files:**
- Modify: `apps/web/components/case-study-lab/cardModel.ts`
- Test: `apps/web/components/case-study-lab/cardModel.test.ts`

**Interfaces:**
- Produces: `CardModel` gains `agencyLogoUrl: string | null` and `agencyName: string | null`; `buildCardModel` input gains optional `agency_logo_url`, `agency_name`, `accent`; accent resolves `accent` col → `agency_brand.colors[0]` → `#E51B23`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/components/case-study-lab/cardModel.test.ts`:
```ts
it("prefers the accent column over scraped colors", () => {
  const m = buildCardModel({
    agency_brand: { colors: ["#1a2b3c"], logoUrl: null, name: "El Toro" },
    client_logo_url: null,
    agency_logo_url: "https://x/agency-logo.png",
    agency_name: "El Toro",
    accent: "#ff8800",
    result: {
      headline: "x", clientName: "Acme", clientDescriptor: "An agency",
      results: [], issues: [], quote: null, cta: "Book a call", teamCredit: null,
    },
  });
  expect(m.accent).toBe("#ff8800");
  expect(m.agencyLogoUrl).toBe("https://x/agency-logo.png");
  expect(m.agencyName).toBe("El Toro");
});

it("ignores a malformed accent column and falls back to scraped color", () => {
  const m = buildCardModel({
    agency_brand: { colors: ["#1a2b3c"], logoUrl: null, name: null },
    client_logo_url: null,
    accent: "not-a-hex",
    result: {
      headline: "x", clientName: "Acme", clientDescriptor: "An agency",
      results: [], issues: [], quote: null, cta: "Book a call", teamCredit: null,
    },
  });
  expect(m.accent).toBe("#1a2b3c");
  expect(m.agencyLogoUrl).toBeNull();
  expect(m.agencyName).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && npx vitest run components/case-study-lab/cardModel.test.ts`
Expected: FAIL — `m.agencyLogoUrl`/`m.agencyName` undefined and accent-column precedence not applied.

- [ ] **Step 3: Implement**

In `apps/web/components/case-study-lab/cardModel.ts`, add to the `CardModel` type:
```ts
  agencyLogoUrl: string | null;
  agencyName: string | null;
```
Change the `buildCardModel` signature's parameter type to:
```ts
export function buildCardModel(report: {
  agency_brand: AgencyBrand | null;
  client_logo_url: string | null;
  agency_logo_url?: string | null;
  agency_name?: string | null;
  accent?: string | null;
  result: CaseStudy;
}): CardModel {
```
Replace the accent computation and return with:
```ts
  const colors = report.agency_brand?.colors ?? [];
  const scraped = colors.find((c) => /^#[0-9a-f]{6}$/i.test(c)) ?? colors[0];
  const accent =
    (report.accent && /^#[0-9a-f]{6}$/i.test(report.accent) ? report.accent : undefined) ??
    scraped ??
    DEFAULT_ACCENT;
  return {
    accent,
    clientLogoUrl: report.client_logo_url,
    agencyLogoUrl: report.agency_logo_url ?? null,
    agencyName: report.agency_name ?? null,
    headline: report.result.headline,
    clientName: report.result.clientName,
    clientDescriptor: report.result.clientDescriptor,
    topResults: report.result.results.slice(0, 3),
    quote: report.result.quote,
    cta: report.result.cta,
  };
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run components/case-study-lab/cardModel.test.ts`
Expected: PASS (including the two pre-existing tests — the `name: null` additions keep them valid; if the existing tests' `agency_brand` literals now fail typecheck for missing `name`, add `name: null` to them).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/case-study-lab/cardModel.ts apps/web/components/case-study-lab/cardModel.test.ts
git commit -m "feat(case-study-lab): cardModel accent precedence + agency fields"
```

---

### Task 7: Co-branded header on the web report

**Files:**
- Modify: `apps/web/components/case-study-lab/ReportBody.tsx`
- Modify: `apps/web/app/case-study-lab/r/[id]/page.tsx:34-38` (pass agency props)

**Interfaces:**
- Consumes: `CardModel.agencyLogoUrl`, `CardModel.agencyName` (Task 6).
- Produces: `ReportBody` renders agency (left) × client (right) header.

- [ ] **Step 1: Add agency props to ReportBody and render the co-branded header**

In `apps/web/components/case-study-lab/ReportBody.tsx`, extend the props:
```ts
export default function ReportBody({
  result,
  accent,
  clientLogoUrl,
  agencyLogoUrl,
  agencyName,
}: {
  result: CaseStudy;
  accent: string;
  clientLogoUrl: string | null;
  agencyLogoUrl: string | null;
  agencyName: string | null;
}) {
```
Replace the existing `<header>...</header>` block with:
```tsx
      <header className="mb-8 flex flex-col gap-4">
        {(agencyLogoUrl || agencyName || clientLogoUrl) && (
          <div className="flex items-center gap-3">
            {agencyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agencyLogoUrl} alt={agencyName ?? "Agency"} className="h-9 w-auto" />
            ) : agencyName ? (
              <span className="text-base font-bold">{agencyName}</span>
            ) : null}

            {(agencyLogoUrl || agencyName) && (
              <span className="text-lg text-[#4a4a4a]">×</span>
            )}

            {clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clientLogoUrl} alt={result.clientName} className="h-9 w-auto" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded font-bold"
                style={{ background: accent }}
              >
                {result.clientName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-lg font-bold">{result.clientName}</div>
          <div className="text-sm text-[#9aa0a6]">{result.clientDescriptor}</div>
        </div>
      </header>
```

- [ ] **Step 2: Pass the agency props from the report page**

In `apps/web/app/case-study-lab/r/[id]/page.tsx`, update the `<ReportBody .../>` usage to pass the model's agency fields:
```tsx
        <ReportBody
          result={report.result as CaseStudy}
          accent={model.accent}
          clientLogoUrl={report.client_logo_url}
          agencyLogoUrl={model.agencyLogoUrl}
          agencyName={model.agencyName}
        />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Load `http://localhost:3000/case-study-lab/r/<id>` for a report that has an agency logo/name. Expected: header shows agency mark, an `×`, then the client mark; client name + descriptor below. For an old row with no agency fields, the header shows just the client (unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/case-study-lab/ReportBody.tsx apps/web/app/case-study-lab/r/[id]/page.tsx
git commit -m "feat(case-study-lab): co-branded header on web report"
```

---

### Task 8: Co-branded header on the downloadable card

**Files:**
- Modify: `apps/web/app/api/case-study-lab/card/[id]/route.tsx:34-60` (header block)

**Interfaces:**
- Consumes: `m.agencyLogoUrl`, `m.agencyName` (Task 6).
- Produces: the `ImageResponse` header renders agency (left) × client (right).

- [ ] **Step 1: Replace the card header block**

In `apps/web/app/api/case-study-lab/card/[id]/route.tsx`, replace the `{/* Client brand header ... */}` `<div style={{ display: "flex" }}>...</div>` block with:
```tsx
        {/* Co-branded header — agency (left) × client (right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {m.agencyLogoUrl ? (
            <img
              src={m.agencyLogoUrl}
              alt={m.agencyName ?? "Agency"}
              style={{ height: 72, width: "auto", objectFit: "contain" }}
            />
          ) : m.agencyName ? (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: "#ffffff" }}>
              {m.agencyName}
            </div>
          ) : null}

          {(m.agencyLogoUrl || m.agencyName) ? (
            <div style={{ display: "flex", fontSize: 44, color: "#4a4a4a" }}>×</div>
          ) : null}

          {m.clientLogoUrl ? (
            <img
              src={m.clientLogoUrl}
              alt={m.clientName}
              style={{ height: 72, width: "auto", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                background: m.accent,
                borderRadius: 12,
                fontSize: 40,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {m.clientName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
```
(Keep the rest of the card unchanged, including the locked "no Tim mark" comment near the CTA.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (all three sizes, PNG logos)**

For a report whose logos are transcoded PNGs (Task 5):
```bash
for s in square portrait landscape; do
  curl -s -o "/tmp/card-$s.png" -w "$s %{http_code} %{content_type}\n" \
    "http://localhost:3000/api/case-study-lab/card/<id>?size=$s"
done
```
Expected: each `200 image/png`; open the files and confirm the agency + client marks appear in the header with the `×`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/case-study-lab/card/[id]/route.tsx
git commit -m "feat(case-study-lab): co-branded header on downloadable card"
```

---

### Task 9: Review screen — agency name, logo, and color inputs

**Files:**
- Modify: `apps/web/components/case-study-lab/Flow.tsx` (thread `brand` into DraftEditor)
- Modify: `apps/web/components/case-study-lab/DraftEditor.tsx` (new inputs + send fields)

**Interfaces:**
- Consumes: `AgencyBrand` (for prefills), `/logo` `kind` field, `/generate` `agencyName`/`agencyLogoUrl`/`accent` (Task 5).
- Produces: review screen collects and submits the agency name, logo, and accent.

- [ ] **Step 1: Thread `brand` from Flow into DraftEditor**

In `apps/web/components/case-study-lab/Flow.tsx` (note: Task 2 already added `name: null` to this literal — you're only changing the destructuring to capture `brand`):
- Change `const [, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null, name: null });` to `const [brand, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null, name: null });`
- In the `review` return, pass the brand:
```tsx
    <DraftEditor
      id={id}
      slots={slots!}
      brand={brand}
      onDone={() => {
        window.location.href = `/case-study-lab/r/${id}`;
      }}
    />
```

- [ ] **Step 2: Add agency inputs + submit fields to DraftEditor**

In `apps/web/components/case-study-lab/DraftEditor.tsx`:

Add `AgencyBrand` to the type import and extend props:
```ts
import type { CaseStudySlots, AgencyBrand } from "@repo/prompts";
```
```ts
export default function DraftEditor({
  id,
  slots,
  brand,
  onDone,
}: {
  id: string;
  slots: CaseStudySlots;
  brand: AgencyBrand;
  onDone: () => void;
}) {
```
Add state (near the existing `useState` calls):
```ts
  const [agencyName, setAgencyName] = useState(brand.name ?? "");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [agencyLogoUploading, setAgencyLogoUploading] = useState(false);
  const firstBrandHex = brand.colors.find((c) => /^#[0-9a-f]{6}$/i.test(c));
  const [accent, setAccent] = useState(firstBrandHex ?? "#E51B23");
```
Generalize `uploadLogo` to take a kind (replace the existing `uploadLogo` client-only function):
```ts
  async function uploadLogoFile(file: File, kind: "client" | "agency") {
    const setUploading = kind === "agency" ? setAgencyLogoUploading : setLogoUploading;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("id", id);
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/case-study-lab/logo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (kind === "agency") setAgencyLogoUrl(json.url);
      else setLogoUrl(json.url);
    } finally {
      setUploading(false);
    }
  }
```
Update the existing client logo `<input type="file" ... onChange>` to call `uploadLogoFile(f, "client")`.

In the `generate()` body's JSON, add the three fields:
```ts
        body: JSON.stringify({
          id,
          clientName,
          clientAnonymized: anonymized,
          clientLogoUrl: logoUrl,
          cta,
          agencyName: agencyName || null,
          agencyLogoUrl,
          accent,
        }),
```
Add the UI controls (place directly under the `<h2>`; agency inputs are always shown — the agency is never anonymized):
```tsx
      <div className="flex flex-col gap-2 border-b border-[#222] pb-4">
        <ConsoleInput
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName((e.target as HTMLInputElement).value)}
          placeholder="Your agency name"
          aria-label="Agency name"
        />
        <label className="text-sm text-[#9aa0a6]">
          Agency logo (optional — falls back to your name)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadLogoFile(f, "agency").catch((err) => setError(err.message));
            }}
          />
        </label>
        {agencyLogoUploading && <span className="text-xs text-[#9aa0a6]">Uploading logo…</span>}
        {!agencyLogoUploading && agencyLogoUrl && (
          <span className="text-xs text-[#22c55e]">Agency logo uploaded ✓</span>
        )}
        <label className="flex items-center gap-2 text-sm text-[#9aa0a6]">
          Brand color
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent((e.target as HTMLInputElement).value)}
            aria-label="Brand color"
          />
        </label>
      </div>
```
Finally, disable Generate while the agency logo is uploading — change the button's `disabled` to:
```tsx
      <ConsoleButton type="button" onClick={generate} disabled={busy || logoUploading || agencyLogoUploading} className="self-start">
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (full flow)**

Run the app, complete an interview to the review screen. Expected: agency name prefilled from the scrape (or blank), an agency logo upload, and a brand-color swatch prefilled from the scraped color (or red). Upload an agency logo (try a webp), pick a color, generate → land on the report with the co-branded header in the chosen accent. Download a card and confirm the agency mark is present.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/case-study-lab/Flow.tsx apps/web/components/case-study-lab/DraftEditor.tsx
git commit -m "feat(case-study-lab): review screen collects agency name, logo, and brand color"
```

---

## Final verification

- [ ] Run the full case-study test suite: `cd apps/web && npx vitest run lib/case-study-lab components/case-study-lab` — all green.
- [ ] Typecheck: `npx tsc -p apps/web/tsconfig.json --noEmit` — clean.
- [ ] End-to-end: new interview → review (set agency name + webp logo + color) → generate → report shows co-branded header; all three card sizes return `200 image/png` with both marks.
- [ ] Regression: the pre-existing El Toro/Splendid report (`ea5d29aa-…`) still renders (client-only header, no crash).
