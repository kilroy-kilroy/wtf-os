# Case Study Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public lead-magnet tool that turns one client win into a shareable web report plus downloadable branded social cards, via a conversational interview held to Tim's "7-Minute Case Study" rules.

**Architecture:** Mirrors the Wild Wild Detector (`wah-wah`) tool exactly — a public Next.js App Router page collects email + agency URL up front, fires the lead pipeline, then runs a stateful chat. Each turn the model returns a conversational reply plus the structured "slots" it has gathered so far; when complete, a second model pass composes the final case study. State lives in one Supabase row (`case_study_reports`); the model is stateless per turn. The report renders server-side in the agency's brand colors; branded images render via `next/og` `ImageResponse` in three aspect ratios.

**Tech Stack:** Next.js 15 App Router (RSC), TypeScript, Anthropic SDK (`claude-opus-4-8`) + Zod, cheerio (HTML parse), Supabase (Postgres + Storage), Vitest, `@vercel/functions` `waitUntil`, Tailwind + existing `@/components/console` primitives.

## Global Constraints

- **Model:** `claude-opus-4-8` via the Anthropic SDK directly (NOT `runModel`), output validated with Zod — exactly the `wah-wah` pattern. Strip markdown code fences before `JSON.parse`.
- **Public tool:** must stay OUT of `PROTECTED_PREFIXES` in `apps/web/middleware.ts` (`/dashboard`, `/client`, `/admin`, `/settings`). No change needed — just never add it. API routes under `/api/` are already exempt from the middleware matcher.
- **Email up front:** captured on screen one; the lead pipeline fires immediately on `/start` so the lead is kept even if the interview is abandoned.
- **Rate limit:** per-IP, 5 reports/hour, counted via `countRecentByIp` over `case_study_reports`.
- **Voice/rules (the 7-Minute rails):** results must be numeric; max 3 issues; each solution names a part of the agency's process and maps to one issue; client is the hero, agency is the bridge; no epic narrative, no activity lists.
- **Prompt package is dependency-free:** `packages/prompts/case-study-builder/` holds only strings, plain interfaces, and pure builders. Zod schemas + SDK calls live in `apps/web/lib/case-study-builder/` (matches `wah-wah`).
- **Slug:** `case-study-builder` everywhere (route, lib dir, API, table, prompt folder).
- **SSRF:** all outbound fetches go through `normalizeUrl` (imported from `@/lib/wah-wah/extract`) on every hop.
- **Test runner:** `cd apps/web && npx vitest run <path>`. Test files sit next to source as `*.test.ts` (repo convention; only `lib/**` units are unit-tested — UI/route/DB glue is verified manually).
- **Storage bucket:** `case-study-assets`, PUBLIC (cards + client logos are meant to be shared — unlike the private `client-documents` bucket).

---

## File Structure

**New — prompts package**
- `packages/prompts/case-study-builder/index.ts` — model const, `CaseStudySlots`/`CaseStudy`/`AgencyBrand` interfaces, interviewer + composer system prompts, `buildInterviewTurnPrompt`, `buildComposePrompt`.
- `packages/prompts/index.ts` — add `export * from './case-study-builder'`.

**New — app lib (`apps/web/lib/case-study-builder/`)**
- `extract.ts` — `extractBrand(html, baseUrl)` + `fetchBrand(url)`; brand colors + logo. Reuses `normalizeUrl` from `@/lib/wah-wah/extract`.
- `interview.ts` — `parseInterviewTurn(text)` (Zod) + `runInterviewTurn(...)` (Anthropic call).
- `compose.ts` — `parseCaseStudy(text)` (Zod) + `composeCaseStudy(...)` (Anthropic call).
- `db.ts` — `createDraft`, `getReport`, `saveTurn`, `finalizeReport`, `countRecentByIp`, `attachLead`, `uploadClientLogo`.
- `lead.ts` — `captureCaseStudyLead(...)`.

**Modified — lead helpers**
- `apps/web/lib/beehiiv.ts` — add `addCaseStudySubscriber`.
- `apps/web/lib/loops.ts` — add `onCaseStudyReportGenerated`.
- `apps/web/lib/slack.ts` — add `'case-study'` to the `productLabels` map.
- (`copper.ts` unchanged — reuse `copperSyncLead` + `COPPER_STAGES`.)

**New — API routes (`apps/web/app/api/case-study-builder/`)**
- `start/route.ts` — POST email + agency url → grab brand, create row, capture lead, return `{ id, brand, reply }`.
- `turn/route.ts` — POST `{ id, message }` → next reply + updated slots + `readyToGenerate`.
- `generate/route.ts` — POST `{ id, clientName, clientAnonymized, clientLogoUrl, cta }` → compose final, save, return `{ ok: true }`.
- `logo/route.ts` — POST multipart client logo → upload to bucket → return `{ url }`.
- `card/[id]/route.ts` — GET `?size=square|portrait|landscape` → `ImageResponse` PNG.

**New — pages & components (`apps/web/app/case-study-builder/`, `apps/web/components/case-study-builder/`)**
- `page.tsx` — landing + `StartForm`.
- `Flow.tsx` (client) — orchestrates start → chat → draft-edit → redirect to report.
- `r/[id]/page.tsx` — server report (`force-dynamic`) + `generateMetadata`.
- `r/[id]/opengraph-image.tsx` — social preview image.
- components: `StartForm.tsx`, `InterviewChat.tsx`, `DraftEditor.tsx`, `ReportBody.tsx`, `CaseStudyCardSvg.tsx` (shared layout used by both the report render and the `card` route), `DownloadButtons.tsx`.

**New — migration**
- `supabase/migrations/20260627_create_case_study_reports.sql`.

---

## Task 1: Prompts package (strings, interfaces, builders)

**Files:**
- Create: `packages/prompts/case-study-builder/index.ts`
- Modify: `packages/prompts/index.ts`

**Interfaces:**
- Produces (consumed by Tasks 4, 5, 7, 8, 9, 10, 11):
  - `CASE_STUDY_MODEL: "claude-opus-4-8"`
  - `interface AgencyBrand { colors: string[]; logoUrl: string | null }`
  - `interface CaseStudyResult { label: string; value: string }` (e.g. `{label:"Revenue growth", value:"800%"}`)
  - `interface CaseStudyIssue { issue: string; solution: string }`
  - `interface CaseStudyQuote { text: string; attribution: string }`
  - `interface CaseStudySlots { clientName: string | null; clientAnonymized: boolean; clientDescriptor: string | null; results: CaseStudyResult[]; issues: CaseStudyIssue[]; quote: CaseStudyQuote | null; cta: string | null; teamCredit: string | null }`
  - `interface CaseStudy { headline: string; clientName: string; clientDescriptor: string; results: CaseStudyResult[]; issues: CaseStudyIssue[]; quote: CaseStudyQuote | null; cta: string; teamCredit: string | null }`
  - `const EMPTY_SLOTS: CaseStudySlots`
  - `CASE_STUDY_INTERVIEWER_PROMPT: string`, `CASE_STUDY_COMPOSER_PROMPT: string`
  - `buildInterviewTurnPrompt(input: { transcript: string; slots: CaseStudySlots; latestUserMessage: string; brand: AgencyBrand }): string`
  - `buildComposePrompt(input: { slots: CaseStudySlots; clientName: string; clientAnonymized: boolean }): string`

- [ ] **Step 1: Create the prompt module**

Create `packages/prompts/case-study-builder/index.ts`:

```ts
// Case Study Builder — public lead-magnet tool. Voice + rules tuned from Tim's
// "7-Minute Case Study" talk. Canonical prompt home (see CLAUDE.md convention).
// Zod schemas + the Anthropic calls live in apps/web/lib/case-study-builder/*
// so this package stays dependency-free.

export const CASE_STUDY_MODEL = "claude-opus-4-8";

export interface AgencyBrand {
  colors: string[];
  logoUrl: string | null;
}

export interface CaseStudyResult {
  label: string;
  value: string;
}

export interface CaseStudyIssue {
  issue: string;
  solution: string;
}

export interface CaseStudyQuote {
  text: string;
  attribution: string;
}

export interface CaseStudySlots {
  clientName: string | null;
  clientAnonymized: boolean;
  clientDescriptor: string | null;
  results: CaseStudyResult[];
  issues: CaseStudyIssue[];
  quote: CaseStudyQuote | null;
  cta: string | null;
  teamCredit: string | null;
}

export interface CaseStudy {
  headline: string;
  clientName: string;
  clientDescriptor: string;
  results: CaseStudyResult[];
  issues: CaseStudyIssue[];
  quote: CaseStudyQuote | null;
  cta: string;
  teamCredit: string | null;
}

export const EMPTY_SLOTS: CaseStudySlots = {
  clientName: null,
  clientAnonymized: false,
  clientDescriptor: null,
  results: [],
  issues: [],
  quote: null,
  cta: null,
  teamCredit: null,
};

export const CASE_STUDY_INTERVIEWER_PROMPT = `You are Tim Kilroy interviewing an agency owner to build a "7-Minute Case Study" — a short, punchy, results-first case study about one of their client wins. You are warm, fast, and a little impatient with vagueness. Your job is to extract exactly the ingredients of a great case study and nothing more.

THE ONLY INGREDIENTS YOU NEED (the rails — do not collect more):
1. clientDescriptor — one sentence on what the client does.
2. results — the outcomes, EXPRESSED IN NUMBERS. "Improved sales" is not good enough. Push until you get a number ("800% revenue growth", "$110k in new business in 12 weeks"). Get 1-3 results.
3. issues — the blockers that existed ON THE CLIENT'S SIDE when work started. MAXIMUM THREE. If they give you five, make them pick the three that mattered most. More than three is messy.
4. solutions — for EACH issue, the specific part of the agency's PROCESS that solved it. Each solution maps to exactly one issue and names a method (e.g. "Customer DNA modeling", "one-call close"). Not an activity list.
5. quote — one real, verbatim line from the client.
6. cta — what the viewer should do next (default: "Want results like this? Book a call.").
7. teamCredit — optional closing line crediting the client's team.

RULES OF THE INTERVIEW:
- Ask ONE question at a time. Keep it short and human.
- Lead with whatever ingredient is missing or weakest. Start with the result (the hook).
- Never let a qualitative result stand — always ask for the number.
- Enforce the 3-issue cap out loud.
- The client and their results are the hero. The agency is the bridge, never the hero.
- When you have all required ingredients (descriptor, >=1 numeric result, 1-3 issue/solution pairs, a quote, a cta), set readyToGenerate to true and tell them they're ready.
- If the owner clearly can't produce a number after you push twice, accept it but note the case study will be weaker.

OUTPUT — every turn, respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "reply": "<your next conversational message to the owner>",
  "slots": {
    "clientName": <string or null>,
    "clientAnonymized": <boolean>,
    "clientDescriptor": <string or null>,
    "results": [ { "label": "<what was measured>", "value": "<the number, e.g. 800%>" } ],
    "issues": [ { "issue": "<client-side blocker>", "solution": "<the process piece that solved it>" } ],
    "quote": <{ "text": "<verbatim>", "attribution": "<name/role>" } or null>,
    "cta": <string or null>,
    "teamCredit": <string or null>
  },
  "readyToGenerate": <boolean>
}
Always return the FULL slots object reflecting everything gathered so far (carry prior values forward; never drop a value the owner already gave). issues must never exceed 3 entries.`;

export const CASE_STUDY_COMPOSER_PROMPT = `You are Tim Kilroy writing the final "7-Minute Case Study" from gathered ingredients. Structure: transformation with the agency in the middle — before -> after, agency is the bridge. Results are the hook. No epic narrative, no activity lists, no agency-as-hero.

Write tight. The headline leads with the most impressive numeric result. Each issue is one line; each solution is one line naming the process piece. Keep the client's voice in the quote verbatim. If clientAnonymized is true, never name the client — use the descriptor as the subject (e.g. "A B2B SaaS company in fintech").

OUTPUT — respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "headline": "<results-forward hook, one line>",
  "clientName": "<client name, or an anonymized label if anonymized>",
  "clientDescriptor": "<one sentence on what they do>",
  "results": [ { "label": "<metric>", "value": "<number>" } ],
  "issues": [ { "issue": "<one line>", "solution": "<one line naming the process piece>" } ],
  "quote": <{ "text": "<verbatim>", "attribution": "<name/role>" } or null>,
  "cta": "<one line>",
  "teamCredit": <string or null>
}
issues must contain at most 3 entries.`;

export function buildInterviewTurnPrompt(input: {
  transcript: string;
  slots: CaseStudySlots;
  latestUserMessage: string;
  brand: AgencyBrand;
}): string {
  return `CONVERSATION SO FAR:
${input.transcript || "(none yet)"}

INGREDIENTS GATHERED SO FAR (JSON):
${JSON.stringify(input.slots)}

THE OWNER JUST SAID:
${input.latestUserMessage}

Respond with the JSON object described in your instructions.`;
}

export function buildComposePrompt(input: {
  slots: CaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): string {
  return `Compose the final case study from these ingredients.

CLIENT NAME: ${input.clientName}
ANONYMIZED: ${input.clientAnonymized}
INGREDIENTS (JSON):
${JSON.stringify(input.slots)}

Respond with the JSON object described in your instructions.`;
}
```

- [ ] **Step 2: Wire the export**

Edit `packages/prompts/index.ts`, add after the `wah-wah` line:

```ts
export * from './case-study-builder';
```

- [ ] **Step 3: Typecheck the package**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors referencing `case-study-builder`. (The new exports are pure types/strings; this confirms they resolve through `@repo/prompts`.)

- [ ] **Step 4: Commit**

```bash
git add packages/prompts/case-study-builder/index.ts packages/prompts/index.ts
git commit -m "feat(case-study-builder): prompts package — interviewer + composer prompts, slot types"
```

---

## Task 2: Brand extractor

**Files:**
- Create: `apps/web/lib/case-study-builder/extract.ts`
- Test: `apps/web/lib/case-study-builder/extract.test.ts`

**Interfaces:**
- Consumes: `normalizeUrl` from `@/lib/wah-wah/extract`; `AgencyBrand` from `@repo/prompts`.
- Produces (consumed by Task 7): `extractBrand(html: string, baseUrl: string): AgencyBrand`; `fetchBrand(url: string): Promise<AgencyBrand>`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/case-study-builder/extract.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractBrand } from "@/lib/case-study-builder/extract";

describe("extractBrand", () => {
  it("pulls theme-color and resolves a relative logo against the base url", () => {
    const html = `
      <html><head>
        <meta name="theme-color" content="#1a2b3c">
        <link rel="icon" href="/favicon.png">
        <meta property="og:image" content="https://cdn.example.com/logo.png">
      </head><body></body></html>`;
    const brand = extractBrand(html, "https://acme.com/");
    expect(brand.colors).toContain("#1a2b3c");
    // og:image is preferred as the logo when present (richer than favicon)
    expect(brand.logoUrl).toBe("https://cdn.example.com/logo.png");
  });

  it("falls back to favicon (absolutized) when no og:image", () => {
    const html = `<head><link rel="icon" href="/icon.png"></head>`;
    const brand = extractBrand(html, "https://acme.com/sub/");
    expect(brand.logoUrl).toBe("https://acme.com/icon.png");
  });

  it("returns empty brand when nothing is present", () => {
    const brand = extractBrand("<head></head>", "https://acme.com/");
    expect(brand.colors).toEqual([]);
    expect(brand.logoUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/case-study-builder/extract.test.ts`
Expected: FAIL — cannot find module `@/lib/case-study-builder/extract`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/case-study-builder/extract.ts`:

```ts
import * as cheerio from "cheerio";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import type { AgencyBrand } from "@repo/prompts";

function absolutize(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

const HEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;

export function extractBrand(html: string, baseUrl: string): AgencyBrand {
  const $ = cheerio.load(html);
  const colors: string[] = [];

  const themeColor = $('meta[name="theme-color"]').attr("content")?.trim();
  if (themeColor && HEX.test(themeColor)) colors.push(themeColor);

  // Sweep inline style attributes for the most common brand hex values.
  $("[style]").each((_, el) => {
    const m = ($(el).attr("style") || "").match(HEX);
    if (m && !colors.includes(m[0])) colors.push(m[0]);
  });

  // Logo preference: og:image (usually a real logo/brand image) then favicon.
  const og = $('meta[property="og:image"]').attr("content")?.trim();
  const icon =
    $('link[rel="icon"]').attr("href")?.trim() ||
    $('link[rel="shortcut icon"]').attr("href")?.trim() ||
    $('link[rel="apple-touch-icon"]').attr("href")?.trim();

  const logoRaw = og || icon || null;
  const logoUrl = logoRaw ? absolutize(logoRaw, baseUrl) : null;

  return { colors: colors.slice(0, 5), logoUrl };
}

export async function fetchBrand(url: string): Promise<AgencyBrand> {
  const safe = normalizeUrl(url);
  const res = await fetch(safe, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!res.ok) return { colors: [], logoUrl: null };
  const html = await res.text();
  return extractBrand(html, safe);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/case-study-builder/extract.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/case-study-builder/extract.ts apps/web/lib/case-study-builder/extract.test.ts
git commit -m "feat(case-study-builder): agency brand extractor (colors + logo)"
```

---

## Task 3: Migration, storage bucket, and DB layer

**Files:**
- Create: `supabase/migrations/20260627_create_case_study_reports.sql`
- Create: `apps/web/lib/case-study-builder/db.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient` from `@/lib/supabase-server`; `CaseStudySlots`, `CaseStudy`, `AgencyBrand` from `@repo/prompts`.
- Produces (consumed by Tasks 7, 8, 9, 10, 11): `createDraft`, `getReport`, `saveTurn`, `finalizeReport`, `countRecentByIp`, `attachLead`, `uploadClientLogo` (signatures in Step 2).

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260627_create_case_study_reports.sql`:

```sql
-- Case Study Builder (public lead-magnet tool). A row is created on /start with
-- the captured email; the interview transcript + gathered slots are updated each
-- turn; the composed case study lands in `result` on /generate. Leads flow through
-- the existing Loops/beehiiv/Copper pipeline; this table is the report store +
-- rate-limit source. Mirrors wah_wah_reports.

create table if not exists public.case_study_reports (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id),
  email              text,
  agency_url         text,
  agency_brand       jsonb,
  client_name        text,
  client_anonymized  boolean not null default false,
  client_logo_url    text,
  status             text not null default 'interviewing',
  conversation       jsonb not null default '[]'::jsonb,
  slots              jsonb,
  result             jsonb,
  ip                 text,
  created_at         timestamptz not null default now()
);

create index if not exists case_study_reports_ip_created_idx
  on public.case_study_reports (ip, created_at);

alter table public.case_study_reports enable row level security;

drop policy if exists "Service role full access case_study_reports" on public.case_study_reports;
create policy "Service role full access case_study_reports" on public.case_study_reports
  for all using ((select auth.role()) = 'service_role');

drop policy if exists "Users read own case_study reports" on public.case_study_reports;
create policy "Users read own case_study reports" on public.case_study_reports
  for select using (
    user_id = (select auth.uid())
    or email = (select auth.jwt() ->> 'email')
  );

-- Public bucket for shareable client logos + generated cards.
insert into storage.buckets (id, name, public)
values ('case-study-assets', 'case-study-assets', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Create the DB layer**

Create `apps/web/lib/case-study-builder/db.ts`:

```ts
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { CaseStudySlots, CaseStudy, AgencyBrand } from "@repo/prompts";

const TABLE = "case_study_reports";
const BUCKET = "case-study-assets";

export type ConversationTurn = { role: "assistant" | "user"; content: string };

export async function createDraft(input: {
  email: string;
  agencyUrl: string;
  brand: AgencyBrand;
  firstReply: string;
  slots: CaseStudySlots;
  ip: string | null;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      email: input.email,
      agency_url: input.agencyUrl,
      agency_brand: input.brand,
      conversation: [{ role: "assistant", content: input.firstReply }],
      slots: input.slots,
      status: "interviewing",
      ip: input.ip,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getReport(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select(
      "id, email, agency_url, agency_brand, client_name, client_anonymized, client_logo_url, status, conversation, slots, result, created_at"
    )
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// Append the user message + assistant reply and overwrite the gathered slots.
export async function saveTurn(
  id: string,
  conversation: ConversationTurn[],
  slots: CaseStudySlots
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ conversation, slots })
    .eq("id", id);
  if (error) throw error;
}

export async function finalizeReport(
  id: string,
  patch: {
    result: CaseStudy;
    clientName: string;
    clientAnonymized: boolean;
    clientLogoUrl: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({
      result: patch.result,
      client_name: patch.clientName,
      client_anonymized: patch.clientAnonymized,
      client_logo_url: patch.clientLogoUrl,
      status: "complete",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function countRecentByIp(ip: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await (supabase as any)
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneHourAgo);
  if (error) return 0;
  return count ?? 0;
}

export async function attachLead(id: string, email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await (supabase as any).from(TABLE).update({ email }).eq("id", id);
  if (error) throw error;
}

export async function uploadClientLogo(
  id: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const ext = contentType.split("/")[1]?.replace("+xml", "") || "png";
  const path = `${id}/logo.${ext}`;
  const { error } = await (supabase as any).storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 3: Apply the migration**

Run (the project's standard migration apply — use whichever the repo uses; Supabase CLI shown):
`supabase db push` (or apply `supabase/migrations/20260627_create_case_study_reports.sql` via the Supabase SQL editor).
Expected: `case_study_reports` table exists and the `case-study-assets` bucket is listed as public. Verify in the Supabase dashboard (Table editor + Storage).

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors in `lib/case-study-builder/db.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260627_create_case_study_reports.sql apps/web/lib/case-study-builder/db.ts
git commit -m "feat(case-study-builder): migration, public asset bucket, db layer"
```

---

## Task 4: Interview turn lib

**Files:**
- Create: `apps/web/lib/case-study-builder/interview.ts`
- Test: `apps/web/lib/case-study-builder/interview.test.ts`

**Interfaces:**
- Consumes: `CASE_STUDY_MODEL`, `CASE_STUDY_INTERVIEWER_PROMPT`, `buildInterviewTurnPrompt`, `CaseStudySlots`, `AgencyBrand` from `@repo/prompts`; `ConversationTurn` from `@/lib/case-study-builder/db`.
- Produces (consumed by Tasks 7, 8): `InterviewTurn = { reply: string; slots: CaseStudySlots; readyToGenerate: boolean }`; `parseInterviewTurn(text: string): InterviewTurn`; `runInterviewTurn(input): Promise<InterviewTurn>`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/case-study-builder/interview.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseInterviewTurn } from "@/lib/case-study-builder/interview";

describe("parseInterviewTurn", () => {
  it("parses a clean JSON turn", () => {
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "Nice — what number can you put on that?",
        slots: {
          clientName: "Acme",
          clientAnonymized: false,
          clientDescriptor: "An e-comm retention agency",
          results: [{ label: "Revenue growth", value: "800%" }],
          issues: [],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.reply).toMatch(/number/);
    expect(t.slots.results[0].value).toBe("800%");
    expect(t.readyToGenerate).toBe(false);
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({
        reply: "ok",
        slots: {
          clientName: null,
          clientAnonymized: false,
          clientDescriptor: null,
          results: [],
          issues: [],
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      }) +
      "\n```";
    expect(() => parseInterviewTurn(wrapped)).not.toThrow();
  });

  it("caps issues at 3", () => {
    const four = [1, 2, 3, 4].map((n) => ({ issue: `i${n}`, solution: `s${n}` }));
    const t = parseInterviewTurn(
      JSON.stringify({
        reply: "ok",
        slots: {
          clientName: null,
          clientAnonymized: false,
          clientDescriptor: null,
          results: [],
          issues: four,
          quote: null,
          cta: null,
          teamCredit: null,
        },
        readyToGenerate: false,
      })
    );
    expect(t.slots.issues).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/case-study-builder/interview.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/case-study-builder/interview.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  CASE_STUDY_INTERVIEWER_PROMPT,
  buildInterviewTurnPrompt,
  type CaseStudySlots,
  type AgencyBrand,
} from "@repo/prompts";
import type { ConversationTurn } from "@/lib/case-study-builder/db";

const ResultSchema = z.object({ label: z.string(), value: z.string() });
const IssueSchema = z.object({ issue: z.string(), solution: z.string() });
const QuoteSchema = z.object({ text: z.string(), attribution: z.string() });

const SlotsSchema = z.object({
  clientName: z.string().nullable(),
  clientAnonymized: z.boolean(),
  clientDescriptor: z.string().nullable(),
  results: z.array(ResultSchema),
  issues: z.array(IssueSchema).transform((a) => a.slice(0, 3)),
  quote: QuoteSchema.nullable(),
  cta: z.string().nullable(),
  teamCredit: z.string().nullable(),
});

const TurnSchema = z.object({
  reply: z.string(),
  slots: SlotsSchema,
  readyToGenerate: z.boolean(),
});

export type InterviewTurn = {
  reply: string;
  slots: CaseStudySlots;
  readyToGenerate: boolean;
};

export function parseInterviewTurn(text: string): InterviewTurn {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return TurnSchema.parse(JSON.parse(cleaned)) as InterviewTurn;
}

function transcriptOf(conversation: ConversationTurn[]): string {
  return conversation
    .map((t) => `${t.role === "assistant" ? "INTERVIEWER" : "OWNER"}: ${t.content}`)
    .join("\n");
}

export async function runInterviewTurn(input: {
  conversation: ConversationTurn[];
  slots: CaseStudySlots;
  latestUserMessage: string;
  brand: AgencyBrand;
}): Promise<InterviewTurn> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: CASE_STUDY_INTERVIEWER_PROMPT,
    messages: [
      {
        role: "user",
        content: buildInterviewTurnPrompt({
          transcript: transcriptOf(input.conversation),
          slots: input.slots,
          latestUserMessage: input.latestUserMessage,
          brand: input.brand,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseInterviewTurn(text);
  } catch {
    throw new Error("Interview hiccup — try sending that again");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/case-study-builder/interview.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/case-study-builder/interview.ts apps/web/lib/case-study-builder/interview.test.ts
git commit -m "feat(case-study-builder): interview turn lib + zod slot parsing"
```

---

## Task 5: Compose lib

**Files:**
- Create: `apps/web/lib/case-study-builder/compose.ts`
- Test: `apps/web/lib/case-study-builder/compose.test.ts`

**Interfaces:**
- Consumes: `CASE_STUDY_MODEL`, `CASE_STUDY_COMPOSER_PROMPT`, `buildComposePrompt`, `CaseStudySlots`, `CaseStudy` from `@repo/prompts`.
- Produces (consumed by Task 9): `parseCaseStudy(text: string): CaseStudy`; `composeCaseStudy(input): Promise<CaseStudy>`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/case-study-builder/compose.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseCaseStudy } from "@/lib/case-study-builder/compose";

describe("parseCaseStudy", () => {
  it("parses a composed case study and caps issues at 3", () => {
    const cs = parseCaseStudy(
      JSON.stringify({
        headline: "800% revenue growth for a retention agency",
        clientName: "Acme",
        clientDescriptor: "An e-comm retention agency",
        results: [{ label: "Revenue growth", value: "800%" }],
        issues: [1, 2, 3, 4].map((n) => ({ issue: `i${n}`, solution: `s${n}` })),
        quote: { text: "Game changer.", attribution: "CEO, Acme" },
        cta: "Want results like this? Book a call.",
        teamCredit: "Credit to the Acme team.",
      })
    );
    expect(cs.headline).toMatch(/800%/);
    expect(cs.issues).toHaveLength(3);
    expect(cs.cta).toMatch(/Book a call/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/case-study-builder/compose.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/case-study-builder/compose.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  CASE_STUDY_MODEL,
  CASE_STUDY_COMPOSER_PROMPT,
  buildComposePrompt,
  type CaseStudySlots,
  type CaseStudy,
} from "@repo/prompts";

const CaseStudySchema = z.object({
  headline: z.string(),
  clientName: z.string(),
  clientDescriptor: z.string(),
  results: z.array(z.object({ label: z.string(), value: z.string() })),
  issues: z
    .array(z.object({ issue: z.string(), solution: z.string() }))
    .transform((a) => a.slice(0, 3)),
  quote: z.object({ text: z.string(), attribution: z.string() }).nullable(),
  cta: z.string(),
  teamCredit: z.string().nullable(),
});

export function parseCaseStudy(text: string): CaseStudy {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return CaseStudySchema.parse(JSON.parse(cleaned)) as CaseStudy;
}

export async function composeCaseStudy(input: {
  slots: CaseStudySlots;
  clientName: string;
  clientAnonymized: boolean;
}): Promise<CaseStudy> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CASE_STUDY_MODEL,
    max_tokens: 4000,
    system: CASE_STUDY_COMPOSER_PROMPT,
    messages: [
      {
        role: "user",
        content: buildComposePrompt({
          slots: input.slots,
          clientName: input.clientName,
          clientAnonymized: input.clientAnonymized,
        }),
      },
    ],
  });
  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return parseCaseStudy(text);
  } catch {
    throw new Error("Couldn't compose the case study — please try again");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/case-study-builder/compose.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/case-study-builder/compose.ts apps/web/lib/case-study-builder/compose.test.ts
git commit -m "feat(case-study-builder): compose lib — slots to final case study"
```

---

## Task 6: Lead pipeline

**Files:**
- Modify: `apps/web/lib/beehiiv.ts` (add `addCaseStudySubscriber` after `addWahWahSubscriber`)
- Modify: `apps/web/lib/loops.ts` (add `onCaseStudyReportGenerated` after `onWahWahReportGenerated`)
- Modify: `apps/web/lib/slack.ts` (add `'case-study'` to the `productLabels` map in `alertReportGenerated`)
- Create: `apps/web/lib/case-study-builder/lead.ts`

**Interfaces:**
- Consumes: `attachLead` from `@/lib/case-study-builder/db`; `EMAIL_RE` from `@/lib/wah-wah/lead`; `copperSyncLead`, `COPPER_STAGES` from `@/lib/copper`; `alertReportGenerated` from `@/lib/slack`; the two new helpers.
- Produces (consumed by Tasks 7, 9): `captureCaseStudyLead(params: { id: string; email: string; agencyUrl: string }): Promise<void>`.

- [ ] **Step 1: Add the Beehiiv helper**

In `apps/web/lib/beehiiv.ts`, add after `addWahWahSubscriber`:

```ts
/**
 * Add subscriber from Case Study Builder. Tags the source for segmentation.
 */
export async function addCaseStudySubscriber(
  email: string,
  hostname?: string,
  firstName?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return addSubscriber({
    email,
    first_name: firstName || undefined,
    utm_source: "case-study-builder",
    utm_medium: "lead-magnet",
    custom_fields: hostname ? [{ name: "company", value: hostname }] : undefined,
  });
}
```

- [ ] **Step 2: Add the Loops helper**

In `apps/web/lib/loops.ts`, add after `onWahWahReportGenerated`:

```ts
export async function onCaseStudyReportGenerated(
  email: string,
  reportId: string,
  hostname: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
  const reportUrl = `${appUrl}/case-study-builder/r/${reportId}`;
  return sendEvent({
    email,
    eventName: "case_study_report_generated",
    eventProperties: { reportId, reportUrl, hostname },
  });
}
```

- [ ] **Step 3: Register the Slack label**

In `apps/web/lib/slack.ts`, inside `alertReportGenerated`'s `productLabels` map, add:

```ts
    'case-study': 'Case Study Builder',
```

- [ ] **Step 4: Create the lead capture orchestrator**

Create `apps/web/lib/case-study-builder/lead.ts`:

```ts
import { waitUntil } from "@vercel/functions";
import { attachLead } from "@/lib/case-study-builder/db";
import { EMAIL_RE } from "@/lib/wah-wah/lead";
import { addCaseStudySubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";
import { onCaseStudyReportGenerated } from "@/lib/loops";

export { EMAIL_RE };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Capture the lead and fan out for a Case Study Builder report. Fires up front on
 * /start so the lead is kept even if the interview is abandoned. All downstream
 * calls are best-effort and non-blocking (`waitUntil`).
 */
export async function captureCaseStudyLead(params: {
  id: string;
  email: string;
  agencyUrl: string;
}): Promise<void> {
  const { id, email, agencyUrl } = params;
  const hostname = hostnameOf(agencyUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  try {
    await attachLead(id, email);
  } catch (e) {
    console.error("[case-study] attachLead failed:", e);
  }

  waitUntil(
    addCaseStudySubscriber(email, hostname).catch((err) =>
      console.error("[case-study] beehiiv subscribe failed:", err)
    )
  );

  waitUntil(
    copperSyncLead({
      email,
      companyName: hostname,
      productName: "Case Study Builder",
      opportunityValue: 0,
      stageId: COPPER_STAGES.LEAD,
      note: `Started Case Study Builder on ${hostname}. View: ${appUrl}/case-study-builder/r/${id}`,
    }).catch((err) => console.error("[case-study] copper sync failed:", err))
  );

  alertReportGenerated(email, "case-study", hostname);

  waitUntil(
    onCaseStudyReportGenerated(email, id, hostname).catch((err) =>
      console.error("[case-study] loops event failed:", err)
    )
  );
}
```

> Verified: `copperSyncLead` (apps/web/lib/copper.ts:190) takes exactly `{ email, name?, companyName?, productName, opportunityValue, stageId, note }` — the call above matches.

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors. Resolves the new exports and the `lead.ts` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/beehiiv.ts apps/web/lib/loops.ts apps/web/lib/slack.ts apps/web/lib/case-study-builder/lead.ts
git commit -m "feat(case-study-builder): lead pipeline fan-out (beehiiv/copper/slack/loops)"
```

---

## Task 7: `/start` API route

**Files:**
- Create: `apps/web/app/api/case-study-builder/start/route.ts`

**Interfaces:**
- Consumes: `fetchBrand` (Task 2), `createDraft`/`countRecentByIp` (Task 3), `runInterviewTurn` (Task 4), `captureCaseStudyLead`/`EMAIL_RE` (Task 6), `normalizeUrl` from `@/lib/wah-wah/extract`, `EMPTY_SLOTS` from `@repo/prompts`.
- Produces (consumed by Task 12 `StartForm`): `POST { url, email } -> { id, brand, reply }` (200) or `{ error }` (400/429/502).

- [ ] **Step 1: Write the route**

Create `apps/web/app/api/case-study-builder/start/route.ts`:

```ts
import { normalizeUrl } from "@/lib/wah-wah/extract";
import { fetchBrand } from "@/lib/case-study-builder/extract";
import { createDraft, countRecentByIp } from "@/lib/case-study-builder/db";
import { runInterviewTurn } from "@/lib/case-study-builder/interview";
import { captureCaseStudyLead, EMAIL_RE } from "@/lib/case-study-builder/lead";
import { EMPTY_SLOTS, type AgencyBrand } from "@repo/prompts";

export const maxDuration = 60;

const HOURLY_LIMIT = 5;

export async function POST(req: Request): Promise<Response> {
  let url: string;
  let email: string;
  try {
    const body = await req.json();
    if (typeof body.url !== "string" || !body.url.trim()) throw new Error("missing url");
    url = normalizeUrl(body.url.trim());
    email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a real email address");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (ip && (await countRecentByIp(ip)) >= HOURLY_LIMIT) {
    return Response.json({ error: "Easy there. Try again in an hour." }, { status: 429 });
  }

  try {
    // Brand grab is best-effort — never block the interview on it.
    let brand: AgencyBrand = { colors: [], logoUrl: null };
    try {
      brand = await fetchBrand(url);
    } catch (e) {
      console.error("[case-study] brand grab failed:", e);
    }

    const turn = await runInterviewTurn({
      conversation: [],
      slots: EMPTY_SLOTS,
      latestUserMessage:
        "I'm ready to build a case study about a client win. Ask me your first question.",
      brand,
    });

    const id = await createDraft({
      email,
      agencyUrl: url,
      brand,
      firstReply: turn.reply,
      slots: turn.slots,
      ip,
    });

    // Email captured up front — fire the full lead pipeline immediately.
    await captureCaseStudyLead({ id, email, agencyUrl: url });

    return Response.json({ id, brand, reply: turn.reply });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Manual verification**

Run the dev server (`npm run dev` from repo root or the app's standard command), then:
```bash
curl -s -X POST http://localhost:3000/api/case-study-builder/start \
  -H 'content-type: application/json' \
  -d '{"url":"stripe.com","email":"you@example.com"}' | head -c 600
```
Expected: JSON with `id` (uuid), `brand` (`colors`/`logoUrl`), and a `reply` that asks an opening question. Confirm a row appears in `case_study_reports` with `status='interviewing'` and the email set.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/case-study-builder/start/route.ts
git commit -m "feat(case-study-builder): /start route — brand grab, draft, lead capture, first question"
```

---

## Task 8: `/turn` API route

**Files:**
- Create: `apps/web/app/api/case-study-builder/turn/route.ts`

**Interfaces:**
- Consumes: `getReport`/`saveTurn` (Task 3), `runInterviewTurn` (Task 4), `AgencyBrand`/`CaseStudySlots`/`EMPTY_SLOTS` from `@repo/prompts`.
- Produces (consumed by Task 13 `InterviewChat`): `POST { id, message } -> { reply, slots, readyToGenerate }` (200) or `{ error }`.

- [ ] **Step 1: Write the route**

Create `apps/web/app/api/case-study-builder/turn/route.ts`:

```ts
import { getReport, saveTurn, type ConversationTurn } from "@/lib/case-study-builder/db";
import { runInterviewTurn } from "@/lib/case-study-builder/interview";
import { EMPTY_SLOTS, type AgencyBrand, type CaseStudySlots } from "@repo/prompts";

export const maxDuration = 60;

const MAX_MESSAGE = 2000;
const MAX_TURNS = 40; // safety cap against runaway chats

export async function POST(req: Request): Promise<Response> {
  let id: string;
  let message: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE);
    if (!id || !message) throw new Error("missing id or message");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  if (report.status === "complete") {
    return Response.json({ error: "This case study is already finished." }, { status: 409 });
  }

  const conversation: ConversationTurn[] = Array.isArray(report.conversation)
    ? report.conversation
    : [];
  if (conversation.length >= MAX_TURNS) {
    return Response.json({ error: "That's a long chat — generate what you've got." }, { status: 409 });
  }

  try {
    const turn = await runInterviewTurn({
      conversation,
      slots: (report.slots as CaseStudySlots) ?? EMPTY_SLOTS,
      latestUserMessage: message,
      brand: (report.agency_brand as AgencyBrand) ?? { colors: [], logoUrl: null },
    });

    const nextConversation: ConversationTurn[] = [
      ...conversation,
      { role: "user", content: message },
      { role: "assistant", content: turn.reply },
    ];
    await saveTurn(id, nextConversation, turn.slots);

    return Response.json({
      reply: turn.reply,
      slots: turn.slots,
      readyToGenerate: turn.readyToGenerate,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Manual verification**

Using an `id` from Task 7:
```bash
curl -s -X POST http://localhost:3000/api/case-study-builder/turn \
  -H 'content-type: application/json' \
  -d '{"id":"<ID>","message":"The client is Hustler Marketing, an e-comm retention agency. We grew their revenue 800%."}' | head -c 800
```
Expected: a `reply` pushing for the next missing ingredient, `slots` reflecting the descriptor + an 800% result, `readyToGenerate:false`. Confirm the row's `conversation` and `slots` updated.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/case-study-builder/turn/route.ts
git commit -m "feat(case-study-builder): /turn route — stateful interview step"
```

---

## Task 9: `/generate` and `/logo` API routes

**Files:**
- Create: `apps/web/app/api/case-study-builder/generate/route.ts`
- Create: `apps/web/app/api/case-study-builder/logo/route.ts`

**Interfaces:**
- Consumes: `getReport`/`finalizeReport`/`uploadClientLogo` (Task 3), `composeCaseStudy` (Task 5), `CaseStudySlots` from `@repo/prompts`.
- Produces: `generate` → `POST { id, clientName, clientAnonymized, clientLogoUrl, cta } -> { ok: true }`; `logo` → `POST` multipart `{ id, file } -> { url }`.

- [ ] **Step 1: Write the generate route**

Create `apps/web/app/api/case-study-builder/generate/route.ts`:

```ts
import { getReport, finalizeReport } from "@/lib/case-study-builder/db";
import { composeCaseStudy } from "@/lib/case-study-builder/compose";
import type { CaseStudySlots } from "@repo/prompts";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  let id: string;
  let clientName: string;
  let clientAnonymized: boolean;
  let clientLogoUrl: string | null;
  let cta: string | null;
  try {
    const body = await req.json();
    id = String(body.id ?? "").trim();
    if (!id) throw new Error("missing id");
    clientAnonymized = Boolean(body.clientAnonymized);
    clientName = String(body.clientName ?? "").trim().slice(0, 120);
    clientLogoUrl = body.clientLogoUrl ? String(body.clientLogoUrl).slice(0, 500) : null;
    cta = body.cta ? String(body.cta).trim().slice(0, 200) : null;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }

  const report = await getReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });

  const slots = (report.slots as CaseStudySlots) ?? null;
  if (!slots || slots.results.length === 0) {
    return Response.json({ error: "Not enough gathered yet to generate." }, { status: 409 });
  }

  try {
    // Honor a CTA override from the review screen before composing.
    const effectiveSlots: CaseStudySlots = { ...slots, cta: cta ?? slots.cta };
    const resolvedName =
      clientAnonymized || !clientName ? slots.clientName ?? clientName : clientName;

    const caseStudy = await composeCaseStudy({
      slots: effectiveSlots,
      clientName: resolvedName || "the client",
      clientAnonymized,
    });

    await finalizeReport(id, {
      result: caseStudy,
      clientName: resolvedName || "",
      clientAnonymized,
      clientLogoUrl: clientAnonymized ? null : clientLogoUrl,
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something broke" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the logo upload route**

Create `apps/web/app/api/case-study-builder/logo/route.ts`:

```ts
import { uploadClientLogo, getReport } from "@/lib/case-study-builder/db";

export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const id = String(form.get("id") ?? "").trim();
    const file = form.get("file");
    if (!id || !(file instanceof File)) {
      return Response.json({ error: "Missing id or file" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return Response.json({ error: "Use a PNG, JPG, SVG, or WebP" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Logo must be under 2 MB" }, { status: 400 });
    }
    if (!(await getReport(id))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const url = await uploadClientLogo(id, await file.arrayBuffer(), file.type);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 });
  }
}
```

- [ ] **Step 3: Manual verification**

```bash
curl -s -X POST http://localhost:3000/api/case-study-builder/generate \
  -H 'content-type: application/json' \
  -d '{"id":"<ID>","clientName":"Hustler Marketing","clientAnonymized":false,"clientLogoUrl":null,"cta":"Want results like this? Book a call."}'
```
Expected: `{"ok":true}` and the row now has `status='complete'` with a populated `result` jsonb. (Requires the interview to have gathered at least one numeric result first.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/case-study-builder/generate/route.ts apps/web/app/api/case-study-builder/logo/route.ts
git commit -m "feat(case-study-builder): /generate compose route + /logo upload route"
```

---

## Task 10: Branded card image route

**Files:**
- Create: `apps/web/components/case-study-builder/cardModel.ts` (shared, pure: maps a report row → flat card view-model + size dims)
- Create: `apps/web/app/api/case-study-builder/card/[id]/route.ts`
- Test: `apps/web/components/case-study-builder/cardModel.test.ts`

**Interfaces:**
- Consumes: `getReport` (Task 3), `CaseStudy`, `AgencyBrand` from `@repo/prompts`.
- Produces (consumed by Tasks 11, 13): `CARD_SIZES: Record<"square"|"portrait"|"landscape", { width: number; height: number }>`; `buildCardModel(report): CardModel`; `CardModel` type.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/case-study-builder/cardModel.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CARD_SIZES, buildCardModel } from "@/components/case-study-builder/cardModel";

describe("CARD_SIZES", () => {
  it("defines the three aspect ratios", () => {
    expect(CARD_SIZES.square).toEqual({ width: 1080, height: 1080 });
    expect(CARD_SIZES.portrait).toEqual({ width: 1080, height: 1350 });
    expect(CARD_SIZES.landscape).toEqual({ width: 1200, height: 675 });
  });
});

describe("buildCardModel", () => {
  it("picks an accent color from brand, with a safe fallback", () => {
    const m = buildCardModel({
      agency_brand: { colors: ["#1a2b3c"], logoUrl: null },
      client_logo_url: null,
      result: {
        headline: "800% revenue growth",
        clientName: "Acme",
        clientDescriptor: "An agency",
        results: [{ label: "Revenue growth", value: "800%" }],
        issues: [],
        quote: null,
        cta: "Book a call",
        teamCredit: null,
      },
    });
    expect(m.accent).toBe("#1a2b3c");
    expect(m.headline).toMatch(/800%/);
    expect(m.topResults).toHaveLength(1);
  });

  it("falls back to a default accent when brand has no colors", () => {
    const m = buildCardModel({
      agency_brand: { colors: [], logoUrl: null },
      client_logo_url: null,
      result: {
        headline: "x",
        clientName: "Acme",
        clientDescriptor: "An agency",
        results: [],
        issues: [],
        quote: null,
        cta: "Book a call",
        teamCredit: null,
      },
    });
    expect(m.accent).toBe("#E51B23");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/case-study-builder/cardModel.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the model**

Create `apps/web/components/case-study-builder/cardModel.ts`:

```ts
import type { CaseStudy, AgencyBrand } from "@repo/prompts";

export const CARD_SIZES = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1200, height: 675 },
} as const;

export type CardSize = keyof typeof CARD_SIZES;

const DEFAULT_ACCENT = "#E51B23";

export type CardModel = {
  accent: string;
  clientLogoUrl: string | null;
  headline: string;
  clientName: string;
  clientDescriptor: string;
  topResults: { label: string; value: string }[];
  quote: { text: string; attribution: string } | null;
  cta: string;
};

export function buildCardModel(report: {
  agency_brand: AgencyBrand | null;
  client_logo_url: string | null;
  result: CaseStudy;
}): CardModel {
  const colors = report.agency_brand?.colors ?? [];
  const accent = colors.find((c) => /^#[0-9a-f]{6}$/i.test(c)) ?? colors[0] ?? DEFAULT_ACCENT;
  return {
    accent,
    clientLogoUrl: report.client_logo_url,
    headline: report.result.headline,
    clientName: report.result.clientName,
    clientDescriptor: report.result.clientDescriptor,
    topResults: report.result.results.slice(0, 3),
    quote: report.result.quote,
    cta: report.result.cta,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/case-study-builder/cardModel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the card route**

Create `apps/web/app/api/case-study-builder/card/[id]/route.ts`:

```ts
import { ImageResponse } from "next/og";
import { getReport } from "@/lib/case-study-builder/db";
import { CARD_SIZES, buildCardModel, type CardSize } from "@/components/case-study-builder/cardModel";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const sizeParam = new URL(req.url).searchParams.get("size") as CardSize | null;
  const size = sizeParam && sizeParam in CARD_SIZES ? sizeParam : "portrait";
  const dims = CARD_SIZES[size];

  const report = await getReport(id);
  if (!report || !report.result) {
    return new Response("Not found", { status: 404 });
  }
  const m = buildCardModel(report);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0b",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, color: "#9aa0a6", display: "flex" }}>{m.clientDescriptor}</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: "#ffffff", lineHeight: 1.05, display: "flex" }}>
            {m.headline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {m.topResults.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: m.accent, display: "flex" }}>{r.value}</div>
              <div style={{ fontSize: 24, color: "#c8c8c8", display: "flex" }}>{r.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {m.quote ? (
            <div style={{ fontSize: 28, color: "#e6e6e6", fontStyle: "italic", display: "flex" }}>
              {`“${m.quote.text}”`}
            </div>
          ) : null}
          <div style={{ fontSize: 26, color: m.accent, fontWeight: 700, display: "flex" }}>{m.cta}</div>
          <div style={{ fontSize: 20, color: "#808080", display: "flex" }}>
            Built with Case Study Builder · timkilroy.com
          </div>
        </div>
      </div>
    ),
    dims
  );
}
```

- [ ] **Step 6: Manual verification**

Visit in a browser (using a completed report id):
`http://localhost:3000/api/case-study-builder/card/<ID>?size=square`
`...?size=portrait` · `...?size=landscape`
Expected: three PNGs at 1080×1080, 1080×1350, 1200×675 respectively, in the agency accent color with the headline, stat values, quote, and CTA.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/case-study-builder/cardModel.ts apps/web/components/case-study-builder/cardModel.test.ts apps/web/app/api/case-study-builder/card/[id]/route.ts
git commit -m "feat(case-study-builder): branded card image route in 3 aspect ratios"
```

---

## Task 11: Report page, body, OG image, download buttons

**Files:**
- Create: `apps/web/components/case-study-builder/ReportBody.tsx`
- Create: `apps/web/components/case-study-builder/DownloadButtons.tsx`
- Create: `apps/web/app/case-study-builder/r/[id]/page.tsx`
- Create: `apps/web/app/case-study-builder/r/[id]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `getReport` (Task 3), `buildCardModel`/`CARD_SIZES` (Task 10), `CaseStudy`/`AgencyBrand` from `@repo/prompts`.
- Produces: the public shareable report at `/case-study-builder/r/[id]`.

- [ ] **Step 1: Write the report body component**

Create `apps/web/components/case-study-builder/ReportBody.tsx`:

```tsx
import type { CaseStudy } from "@repo/prompts";

export default function ReportBody({
  result,
  accent,
  clientLogoUrl,
}: {
  result: CaseStudy;
  accent: string;
  clientLogoUrl: string | null;
}) {
  return (
    <article className="w-full rounded-lg bg-[#0b0b0b] p-8 text-white">
      <header className="mb-8 flex items-center gap-4">
        {clientLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clientLogoUrl} alt={result.clientName} className="h-12 w-auto" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded font-bold"
            style={{ background: accent }}
          >
            {result.clientName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-bold">{result.clientName}</div>
          <div className="text-sm text-[#9aa0a6]">{result.clientDescriptor}</div>
        </div>
      </header>

      <h1 className="mb-8 text-3xl font-black leading-tight">{result.headline}</h1>

      <div className="mb-10 flex flex-wrap gap-8">
        {result.results.map((r, i) => (
          <div key={i}>
            <div className="text-4xl font-black" style={{ color: accent }}>
              {r.value}
            </div>
            <div className="text-sm text-[#c8c8c8]">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-10 space-y-4">
        {result.issues.map((it, i) => (
          <div key={i} className="border-l-2 pl-4" style={{ borderColor: accent }}>
            <div className="font-semibold text-[#e6e6e6]">{it.issue}</div>
            <div className="text-sm text-[#9aa0a6]">{it.solution}</div>
          </div>
        ))}
      </div>

      {result.quote ? (
        <blockquote className="mb-10 text-lg italic text-[#e6e6e6]">
          “{result.quote.text}”
          <footer className="mt-2 text-sm not-italic text-[#808080]">
            — {result.quote.attribution}
          </footer>
        </blockquote>
      ) : null}

      <div className="mb-2 text-xl font-bold" style={{ color: accent }}>
        {result.cta}
      </div>
      {result.teamCredit ? (
        <p className="text-sm text-[#808080]">{result.teamCredit}</p>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 2: Write the download buttons (client component)**

Create `apps/web/components/case-study-builder/DownloadButtons.tsx`:

```tsx
"use client";

import { CARD_SIZES, type CardSize } from "@/components/case-study-builder/cardModel";

const LABELS: Record<CardSize, string> = {
  square: "Square (Instagram)",
  portrait: "Portrait (LinkedIn / FB)",
  landscape: "Landscape (Twitter)",
};

export default function DownloadButtons({ id }: { id: string }) {
  const sizes = Object.keys(CARD_SIZES) as CardSize[];
  return (
    <div className="flex flex-wrap gap-3">
      {sizes.map((s) => (
        <a
          key={s}
          href={`/api/case-study-builder/card/${id}?size=${s}`}
          download={`case-study-${s}.png`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-[#333] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a]"
        >
          ⬇ {LABELS[s]}
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write the report page**

Create `apps/web/app/case-study-builder/r/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CaseStudy, AgencyBrand } from "@repo/prompts";
import { getReport } from "@/lib/case-study-builder/db";
import { buildCardModel } from "@/components/case-study-builder/cardModel";
import ReportBody from "@/components/case-study-builder/ReportBody";
import DownloadButtons from "@/components/case-study-builder/DownloadButtons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report?.result) return {};
  const cs = report.result as CaseStudy;
  return {
    title: `${cs.clientName}: ${cs.headline}`,
    description: cs.clientDescriptor,
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) notFound();

  const model = buildCardModel(report);

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <ReportBody
          result={report.result as CaseStudy}
          accent={model.accent}
          clientLogoUrl={report.client_logo_url}
        />
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-[#9aa0a6]">Download to post:</div>
          <DownloadButtons id={id} />
        </div>
        <a href="/case-study-builder" className="text-sm text-[#808080] underline">
          Build another case study
        </a>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write the OG image**

Create `apps/web/app/case-study-builder/r/[id]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import type { CaseStudy } from "@repo/prompts";
import { getReport } from "@/lib/case-study-builder/db";
import { buildCardModel } from "@/components/case-study-builder/cardModel";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  const headline = report?.result ? (report.result as CaseStudy).headline : "Case Study";
  const accent = report?.result ? buildCardModel(report).accent : "#E51B23";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0b0b0b",
          padding: 64,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#9aa0a6", textTransform: "uppercase" }}>
          Case Study
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: accent, lineHeight: 1.05 }}>{headline}</div>
        <div style={{ fontSize: 22, color: "#808080" }}>Built with Case Study Builder · timkilroy.com</div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 5: Manual verification**

Visit `http://localhost:3000/case-study-builder/r/<ID>` for a completed report.
Expected: a branded report — client header (logo or monogram), headline, stat row in the accent color, issue→solution pairs, quote, CTA, team credit — plus three working download buttons producing the cards from Task 10. Confirm `generateMetadata` shows the right `<title>` (view source).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/case-study-builder/ReportBody.tsx apps/web/components/case-study-builder/DownloadButtons.tsx apps/web/app/case-study-builder/r/
git commit -m "feat(case-study-builder): shareable report page, body, OG image, downloads"
```

---

## Task 12: Landing page + StartForm

**Files:**
- Create: `apps/web/components/case-study-builder/StartForm.tsx`
- Create: `apps/web/components/case-study-builder/Flow.tsx`
- Create: `apps/web/app/case-study-builder/page.tsx`

**Interfaces:**
- Consumes: `/api/case-study-builder/start`; `AgencyBrand` from `@repo/prompts`.
- Produces (consumed by Task 13): `Flow` owns the phase state (`start` → `interview` → `review`) and passes `id`/`brand`/first `reply` down. `StartForm` calls `onStarted({ id, brand, reply })`.

- [ ] **Step 1: Write StartForm**

Create `apps/web/components/case-study-builder/StartForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { AgencyBrand } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function StartForm({
  onStarted,
}: {
  onStarted: (data: { id: string; brand: AgencyBrand; reply: string }) => void;
}) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-builder/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      onStarted({ id: json.id, brand: json.brand, reply: json.reply });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3">
      <ConsoleInput
        type="email"
        required
        value={email}
        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
        placeholder="you@youragency.com"
        aria-label="Your email"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <ConsoleInput
            type="text"
            required
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="youragency.com"
            aria-label="Your agency website"
          />
        </div>
        <ConsoleButton type="submit" disabled={busy} className="whitespace-nowrap">
          {busy ? "⟳ WARMING UP…" : "▶ BUILD MY CASE STUDY"}
        </ConsoleButton>
      </div>
      {error && <p className="font-poppins text-sm text-[#E51B23]">{error}</p>}
      <p className="font-poppins text-xs text-[#808080]">
        We&apos;ll grab your brand colors and walk you through a 7-minute interview about one
        client win, then hand you a shareable case study and ready-to-post images. Your email
        also gets you the newsletter these come from — unsubscribe anytime.
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Write the Flow orchestrator (phase shell)**

Create `apps/web/components/case-study-builder/Flow.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { AgencyBrand } from "@repo/prompts";
import StartForm from "@/components/case-study-builder/StartForm";

type Phase = "start" | "interview";

export default function Flow() {
  const [phase, setPhase] = useState<Phase>("start");
  const [id, setId] = useState<string>("");
  const [brand, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null });
  const [firstReply, setFirstReply] = useState<string>("");

  if (phase === "start") {
    return (
      <StartForm
        onStarted={(d) => {
          setId(d.id);
          setBrand(d.brand);
          setFirstReply(d.reply);
          setPhase("interview");
        }}
      />
    );
  }

  // Interview UI is added in Task 13; placeholder keeps the build green until then.
  return (
    <div className="text-white">
      <p className="mb-2 text-sm text-[#9aa0a6]">Interview started (id: {id})</p>
      <p>{firstReply}</p>
      {/* brand available for theming downstream */}
      <span className="hidden">{brand.colors.join(",")}</span>
    </div>
  );
}
```

- [ ] **Step 3: Write the landing page**

Create `apps/web/app/case-study-builder/page.tsx`:

```tsx
import type { Metadata } from "next";
import Flow from "@/components/case-study-builder/Flow";

export const metadata: Metadata = {
  title: "Case Study Builder — turn a client win into a postable case study",
  description:
    "Answer a short interview about one client win. Get a shareable case study and ready-to-post branded images in minutes.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3">
          <h1 className="text-3xl font-black text-white">The 7-Minute Case Study</h1>
          <p className="text-[#9aa0a6]">
            One client win in, a shareable case study and ready-to-post images out. No designers,
            no writers, no client approval cycle.
          </p>
        </header>
        <Flow />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Visit `http://localhost:3000/case-study-builder`. Enter an email + agency URL, submit.
Expected: the form posts to `/start`, then the view switches to the interview placeholder showing the first interviewer question. A `case_study_reports` row is created and the lead pipeline fires (check Slack/logs).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/case-study-builder/StartForm.tsx apps/web/components/case-study-builder/Flow.tsx apps/web/app/case-study-builder/page.tsx
git commit -m "feat(case-study-builder): landing page, start form, flow shell"
```

---

## Task 13: Interview chat + draft review/edit

**Files:**
- Create: `apps/web/components/case-study-builder/InterviewChat.tsx`
- Create: `apps/web/components/case-study-builder/DraftEditor.tsx`
- Modify: `apps/web/components/case-study-builder/Flow.tsx` (replace the placeholder; wire phases `interview` → `review` → redirect)

**Interfaces:**
- Consumes: `/api/case-study-builder/turn`, `/api/case-study-builder/logo`, `/api/case-study-builder/generate`; `CaseStudySlots` from `@repo/prompts`.
- Produces: the full client experience ending in a redirect to `/case-study-builder/r/[id]`.

- [ ] **Step 1: Write InterviewChat**

Create `apps/web/components/case-study-builder/InterviewChat.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { CaseStudySlots } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

type Msg = { role: "assistant" | "user"; content: string };

export default function InterviewChat({
  id,
  firstReply,
  onReady,
}: {
  id: string;
  firstReply: string;
  onReady: (slots: CaseStudySlots) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: firstReply }]);
  const [input, setInput] = useState("");
  const [slots, setSlots] = useState<CaseStudySlots | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    try {
      const res = await fetch("/api/case-study-builder/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
      setSlots(json.slots);
      setReady(Boolean(json.readyToGenerate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "self-start rounded-lg bg-[#1a1a1a] px-4 py-2 text-white"
                : "self-end rounded-lg bg-[#2a2a2a] px-4 py-2 text-[#c8c8c8]"
            }
          >
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <div className="flex-1">
          <ConsoleInput
            type="text"
            value={input}
            onChange={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder={busy ? "Thinking…" : "Type your answer…"}
            aria-label="Your answer"
          />
        </div>
        <ConsoleButton type="submit" disabled={busy}>
          Send
        </ConsoleButton>
      </form>

      {error && <p className="text-sm text-[#E51B23]">{error}</p>}

      {(ready || (slots && slots.results.length > 0)) && (
        <ConsoleButton
          type="button"
          onClick={() => slots && onReady(slots)}
          className="self-start"
        >
          {ready ? "▶ Looks good — review my case study" : "▶ Generate with what I've got"}
        </ConsoleButton>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write DraftEditor**

Create `apps/web/components/case-study-builder/DraftEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { CaseStudySlots } from "@repo/prompts";
import { ConsoleInput, ConsoleButton } from "@/components/console";

export default function DraftEditor({
  id,
  slots,
  onDone,
}: {
  id: string;
  slots: CaseStudySlots;
  onDone: () => void;
}) {
  const [clientName, setClientName] = useState(slots.clientName ?? "");
  const [anonymized, setAnonymized] = useState(slots.clientAnonymized);
  const [cta, setCta] = useState(slots.cta ?? "Want results like this? Book a call.");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    const form = new FormData();
    form.append("id", id);
    form.append("file", file);
    const res = await fetch("/api/case-study-builder/logo", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed");
    setLogoUrl(json.url);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-builder/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          clientName,
          clientAnonymized: anonymized,
          clientLogoUrl: logoUrl,
          cta,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-white">
      <h2 className="text-xl font-bold">Quick review before we generate</h2>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={anonymized}
          onChange={(e) => setAnonymized(e.target.checked)}
        />
        Anonymize the client (no name or logo)
      </label>

      {!anonymized && (
        <>
          <ConsoleInput
            type="text"
            value={clientName}
            onChange={(e) => setClientName((e.target as HTMLInputElement).value)}
            placeholder="Client name"
            aria-label="Client name"
          />
          <label className="text-sm text-[#9aa0a6]">
            Client logo (optional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="mt-1 block text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f).catch((err) => setError(err.message));
              }}
            />
          </label>
          {logoUrl && <span className="text-xs text-[#22c55e]">Logo uploaded ✓</span>}
        </>
      )}

      <ConsoleInput
        type="text"
        value={cta}
        onChange={(e) => setCta((e.target as HTMLInputElement).value)}
        placeholder="Call to action"
        aria-label="Call to action"
      />

      {error && <p className="text-sm text-[#E51B23]">{error}</p>}

      <ConsoleButton type="button" onClick={generate} disabled={busy} className="self-start">
        {busy ? "⟳ GENERATING…" : "▶ GENERATE CASE STUDY"}
      </ConsoleButton>
    </div>
  );
}
```

- [ ] **Step 3: Wire the phases in Flow**

Replace the body of `apps/web/components/case-study-builder/Flow.tsx` with the full three-phase orchestrator:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgencyBrand, CaseStudySlots } from "@repo/prompts";
import StartForm from "@/components/case-study-builder/StartForm";
import InterviewChat from "@/components/case-study-builder/InterviewChat";
import DraftEditor from "@/components/case-study-builder/DraftEditor";

type Phase = "start" | "interview" | "review";

export default function Flow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("start");
  const [id, setId] = useState<string>("");
  const [firstReply, setFirstReply] = useState<string>("");
  const [slots, setSlots] = useState<CaseStudySlots | null>(null);
  // brand is captured for potential future theming of the live UI; not yet used.
  const [, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null });

  if (phase === "start") {
    return (
      <StartForm
        onStarted={(d) => {
          setId(d.id);
          setBrand(d.brand);
          setFirstReply(d.reply);
          setPhase("interview");
        }}
      />
    );
  }

  if (phase === "interview") {
    return (
      <InterviewChat
        id={id}
        firstReply={firstReply}
        onReady={(s) => {
          setSlots(s);
          setPhase("review");
        }}
      />
    );
  }

  return (
    <DraftEditor
      id={id}
      slots={slots!}
      onDone={() => router.push(`/case-study-builder/r/${id}`)}
    />
  );
}
```

- [ ] **Step 4: Full end-to-end manual verification**

Run the dev server, go to `/case-study-builder`, and complete the whole flow:
1. Submit email + agency URL → interview starts with a real first question.
2. Answer: a client, a numeric result, ≤3 issues + their solutions, a quote. Confirm the AI pushes for numbers and caps issues at 3.
3. When the "review my case study" button appears, click it → DraftEditor.
4. Optionally upload a client logo or toggle anonymize; confirm CTA; click Generate.
5. Land on `/case-study-builder/r/[id]` with the styled report + three working download buttons.
Expected: each card downloads in the agency accent color; an anonymized run shows no client name/logo.

- [ ] **Step 5: Typecheck and full test run**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run lib/case-study-builder components/case-study-builder`
Expected: typecheck clean; all case-study unit tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/case-study-builder/InterviewChat.tsx apps/web/components/case-study-builder/DraftEditor.tsx apps/web/components/case-study-builder/Flow.tsx
git commit -m "feat(case-study-builder): interview chat + draft review/edit, full flow wired"
```

---

## Self-Review

**Spec coverage check (each spec section → task):**
- Lean agency self-report interview → Tasks 1, 4, 8, 13. ✓
- Conversational interview on the 7-Minute rails (numeric results, ≤3 issues, solution↔issue, client-as-hero) → interviewer prompt (Task 1), `issues.slice(0,3)` enforcement (Tasks 4/5), chat (Task 13). ✓
- Email up front, interview starts immediately → StartForm + `/start` (Tasks 7, 12); lead fires up front (Task 6/7). ✓
- Agency brand auto-grabbed for styling; falls back gracefully → Task 2 + `/start` best-effort try/catch (Task 7); accent fallback (Task 10). ✓
- Client logo manual upload or anonymized monogram → `/logo` (Task 9), DraftEditor (Task 13), monogram in ReportBody (Task 11). ✓
- Deliverable = web report + branded image (3 ratios) → Tasks 10, 11. ✓
- Review/edit screen before reveal → DraftEditor (Task 13). ✓
- Data model (single row, jsonb slots/result, status) → Task 3. ✓
- Public, RLS, IP rate-limit, stays out of PROTECTED_PREFIXES → Task 3 migration + Global Constraints; `countRecentByIp` in `/start` (Task 7). ✓
- Lead fan-out beehiiv/copper/slack/loops → Task 6. ✓
- Model `claude-opus-4-8` + Zod, dependency-free prompt package → Tasks 1, 4, 5. ✓
- Guardrails (qualitative-result warning, abuse caps, maxDuration, turn cap) → interviewer prompt (Task 1), input caps + MAX_TURNS (Task 8), `maxDuration` on all AI routes. ✓

**Placeholder scan:** No "TBD"/"TODO"/"add error handling" — every step has concrete code or a concrete command. The one intentional interim stub (Flow placeholder in Task 12) is explicitly replaced in Task 13 Step 3. ✓

**Type consistency:** `CaseStudySlots`, `CaseStudy`, `AgencyBrand`, `CaseStudyResult/Issue/Quote` defined once in Task 1 and imported everywhere. `ConversationTurn` defined in Task 3, imported by Tasks 4/8. `buildCardModel`/`CARD_SIZES`/`CardSize` defined in Task 10, imported by Tasks 10/11/13. Route contracts (`{id, brand, reply}`, `{reply, slots, readyToGenerate}`, `{ok:true}`, `{url}`) consistent between producer routes and consumer components. ✓

**Cross-file signatures verified against source:** `copperSyncLead` (copper.ts:190), `addWahWahSubscriber`/`addSubscriber` (beehiiv.ts:236), `alertReportGenerated` (slack.ts:84), `onWahWahReportGenerated`/`sendEvent` (loops.ts:519), `getSupabaseServerClient` (supabase-server.ts), storage `upload`/`getPublicUrl` (admin/roadmaps route), and the `wah-wah` extract/db/route patterns — the new code mirrors all of them.
