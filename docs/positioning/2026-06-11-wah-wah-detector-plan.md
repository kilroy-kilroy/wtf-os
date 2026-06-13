# Wah-Wah Detector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Wah-Wah Detector — paste a homepage URL, get a shareable Wah-Wah Score with flagged phrases, email-gated full report feeding AIC — as phase 1 of the Self-Serve Positioning Engine.

**Architecture:** Next.js App Router app at `~/Projects/positioning-engine` (will later host Robot-Tim). Server flow: URL → fetch + extract homepage text (cheerio) → deterministic lexicon match + one Claude structured-output call → store in Supabase → public score page with email-gated full report → leads pushed to beehiiv (AIC). Shareable OG image per result is the viral mechanic.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind, Supabase (Postgres, service-role access only), `@anthropic-ai/sdk` with `claude-opus-4-8` + zod structured outputs, cheerio, Vitest, Stripe NOT needed in this phase, Vercel deploy.

**Spec:** `~/Desktop/Self Serve Positioning/2026-06-10-positioning-engine-design.md`

**Cost note:** One Detector run ≈ 3–5K input + ~1K output tokens on Opus 4.8 ≈ $0.04–0.06. Acceptable for a lead-gen tool at expected volume. If volume explodes, swapping `claude-opus-4-8` → `claude-sonnet-4-6` in one constant cuts cost ~40% — Tim's call, not a default.

---

### Task 1: Scaffold the project

**Files:**
- Create: `~/Projects/positioning-engine/` (entire Next.js app)
- Create: `vitest.config.ts`
- Modify: `package.json` (test script)

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd ~/Projects
npx create-next-app@latest positioning-engine --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm
cd positioning-engine
```

Expected: project created, `src/app/page.tsx` exists.

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk zod cheerio @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to `package.json`**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 5: Verify the harness runs**

```bash
npm test
```

Expected: "No test files found" exit (that's fine — no tests yet). `npm run dev` should serve the default page at localhost:3000.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold positioning-engine app with vitest"
```

---

### Task 2: Wah-wah phrase lexicon

The deterministic layer. Claude adds context-aware flags later, but the canonical offenders are matched in code — free, instant, and consistent.

**Files:**
- Create: `src/lib/lexicon.ts`
- Test: `src/lib/lexicon.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/lexicon.test.ts
import { describe, it, expect } from "vitest";
import { findLexiconHits, WAHWAH_PHRASES } from "@/lib/lexicon";

describe("findLexiconHits", () => {
  it("finds known phrases case-insensitively", () => {
    const text = "We are a Full-Service agency. Results-driven and strategic.";
    const hits = findLexiconHits(text);
    const phrases = hits.map((h) => h.phrase);
    expect(phrases).toContain("full-service");
    expect(phrases).toContain("results-driven");
  });

  it("returns surrounding context for each hit", () => {
    const text = "Acme is your partner in growth for modern brands.";
    const hits = findLexiconHits(text);
    expect(hits).toHaveLength(1);
    expect(hits[0].context).toContain("your partner in growth");
  });

  it("dedupes repeated phrases, keeping first occurrence", () => {
    const text = "Data-driven. Truly data-driven. Did we mention data-driven?";
    const hits = findLexiconHits(text);
    expect(hits.filter((h) => h.phrase === "data-driven")).toHaveLength(1);
  });

  it("has a non-trivial lexicon", () => {
    expect(WAHWAH_PHRASES.length).toBeGreaterThan(25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/lexicon.test.ts`
Expected: FAIL — cannot resolve `@/lib/lexicon`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/lexicon.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/lexicon.test.ts`
Expected: PASS (4 tests). Note: "next level" is a substring of the longer phrase — both may hit on the same text; that's acceptable for v1.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lexicon.ts src/lib/lexicon.test.ts
git commit -m "feat: wah-wah phrase lexicon with context matcher"
```

---

### Task 3: Page fetch and text extraction

**Files:**
- Create: `src/lib/extract.ts`
- Test: `src/lib/extract.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/extract.test.ts
import { describe, it, expect } from "vitest";
import { extractPageText, normalizeUrl } from "@/lib/extract";

describe("normalizeUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeUrl("acme.com")).toBe("https://acme.com/");
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeUrl("ftp://acme.com")).toThrow();
  });

  it("rejects localhost and private hosts", () => {
    expect(() => normalizeUrl("http://localhost:3000")).toThrow();
    expect(() => normalizeUrl("http://192.168.1.1")).toThrow();
    expect(() => normalizeUrl("http://10.0.0.5")).toThrow();
    expect(() => normalizeUrl("http://127.0.0.1")).toThrow();
  });
});

describe("extractPageText", () => {
  const html = `
    <html><head>
      <title>Acme Creative</title>
      <meta name="description" content="A full-service creative agency.">
      <style>.x{color:red}</style>
      <script>console.log("ignore me")</script>
    </head><body>
      <nav>Home About</nav>
      <h1>Brands that resonate</h1>
      <p>We are results-driven and strategic.</p>
    </body></html>`;

  it("extracts title, meta description, h1, and body text", () => {
    const page = extractPageText(html);
    expect(page.title).toBe("Acme Creative");
    expect(page.metaDescription).toBe("A full-service creative agency.");
    expect(page.h1).toBe("Brands that resonate");
    expect(page.bodyText).toContain("results-driven");
  });

  it("strips script and style content", () => {
    const page = extractPageText(html);
    expect(page.bodyText).not.toContain("ignore me");
    expect(page.bodyText).not.toContain("color:red");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/extract.test.ts`
Expected: FAIL — cannot resolve `@/lib/extract`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/extract.ts
import * as cheerio from "cheerio";

const MAX_BODY_CHARS = 12_000; // ~3K tokens; plenty for a homepage

export type ExtractedPage = {
  title: string;
  metaDescription: string;
  h1: string;
  bodyText: string;
};

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1)/i;

export function normalizeUrl(input: string): string {
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;
  const url = new URL(withProto);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  if (PRIVATE_HOST.test(url.hostname) || !url.hostname.includes(".")) {
    throw new Error("That doesn't look like a public website");
  }
  return url.toString();
}

export function extractPageText(html: string): ExtractedPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  return {
    title: $("title").first().text().trim(),
    metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? "",
    h1: $("h1").first().text().trim(),
    bodyText: $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_BODY_CHARS),
  };
}

export async function fetchPage(url: string): Promise<ExtractedPage> {
  const res = await fetch(url, {
    headers: { "User-Agent": "WahWahDetector/1.0 (+https://timkilroy.com)" },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Couldn't load that page (HTTP ${res.status})`);
  }
  const html = await res.text();
  return extractPageText(html);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/extract.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/extract.ts src/lib/extract.test.ts
git commit -m "feat: page fetch with SSRF guards and cheerio text extraction"
```

---

### Task 4: Claude analysis with structured output

One API call: page text + lexicon hits in, scored analysis out. Uses `messages.parse()` with `zodOutputFormat` so the result is validated, typed JSON — no hand-parsing.

**Files:**
- Create: `src/lib/analyze.ts`
- Test: `src/lib/analyze.test.ts`

- [ ] **Step 1: Write the failing tests** (prompt construction + result shape; the Anthropic client is mocked)

```typescript
// src/lib/analyze.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockParse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildUserPrompt, analyzeCopy } from "@/lib/analyze";

const page = {
  title: "Acme Creative",
  metaDescription: "A full-service creative agency.",
  h1: "Brands that resonate",
  bodyText: "We are results-driven and strategic. Your partner in growth.",
};

describe("buildUserPrompt", () => {
  it("includes page sections and lexicon hits", () => {
    const prompt = buildUserPrompt(page, [
      { phrase: "results-driven", context: "We are results-driven and strategic" },
    ]);
    expect(prompt).toContain("Acme Creative");
    expect(prompt).toContain("Brands that resonate");
    expect(prompt).toContain("results-driven");
  });
});

describe("analyzeCopy", () => {
  beforeEach(() => mockParse.mockReset());

  it("returns the parsed structured output", async () => {
    const fake = {
      score: 81,
      verdict: "You sound like everyone.",
      flags: [
        {
          phrase: "results-driven",
          context: "We are results-driven and strategic",
          underneath: "You mean you actually care whether the work works.",
        },
      ],
      rewrite_teaser: "Say the thing only you can say.",
    };
    mockParse.mockResolvedValue({ parsed_output: fake });

    const result = await analyzeCopy(page, []);
    expect(result.score).toBe(81);
    expect(result.flags).toHaveLength(1);
    expect(mockParse).toHaveBeenCalledOnce();
  });

  it("throws a friendly error when parsing fails", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });
    await expect(analyzeCopy(page, [])).rejects.toThrow(/analysis failed/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/analyze.test.ts`
Expected: FAIL — cannot resolve `@/lib/analyze`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/analyze.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ExtractedPage } from "@/lib/extract";
import type { LexiconHit } from "@/lib/lexicon";

export const WahWahAnalysisSchema = z.object({
  score: z.number().describe("Wah-wah score 0-100. 100 = pure beige paint."),
  verdict: z
    .string()
    .describe("One punchy sentence summarizing the diagnosis, in Tim's voice."),
  flags: z.array(
    z.object({
      phrase: z.string().describe("The wah-wah phrase, exactly as it appears"),
      context: z.string().describe("The sentence or fragment it appears in"),
      underneath: z
        .string()
        .describe(
          "One gut-punch line: what they're probably actually trying to say"
        ),
    })
  ),
  rewrite_teaser: z
    .string()
    .describe(
      "One line hinting at what the hero COULD say instead. A taste, not the meal."
    ),
});

export type WahWahAnalysis = z.infer<typeof WahWahAnalysisSchema>;

// NOTE FOR TIM: this is the structural draft. Punch it up — the voice rules
// live in the question-tree guardrails. AI drafts structure, you add edge.
const SYSTEM_PROMPT = `You are the Wah-Wah Detector, built by agency coach Tim Kilroy. You analyze agency and B2B homepage copy and flag "wah-wah" phrases — the sounds the adults make in a Peanuts cartoon. Words that feel safe and say nothing: "results-driven," "full-service," "extension of your team."

Rules:
- The enemy is always the broken idea, never the people stuck in it. Every flag is "the trap smart people fall into," never "look at these idiots."
- Funny, warm, direct. A friendly bouncer, not a prosecutor. Plain spoken language. Nothing you write may sound AI-written — no corporate hedging, no "leverage," no "delve."
- For each flagged phrase, the "underneath" line names what the company is probably actually trying to say — the real thing hiding under the beige.
- Score honestly: a homepage stuffed with generic positioning phrases scores 70-95. Specific, voiced, opinionated copy scores under 30. Score reflects how interchangeable the copy is with every competitor's.
- The rewrite_teaser is one line of what the hero COULD say — a taste that makes them want the full makeover, not the full makeover itself.
- Flag at most 8 phrases. Pick the worst offenders, prioritizing the hero/headline area.`;

export function buildUserPrompt(page: ExtractedPage, hits: LexiconHit[]): string {
  const hitList =
    hits.length > 0
      ? hits.map((h) => `- "${h.phrase}" in: "${h.context}"`).join("\n")
      : "(none — look for context-dependent wah-wah the lexicon missed)";

  return `Analyze this homepage copy.

TITLE: ${page.title}
META DESCRIPTION: ${page.metaDescription}
H1: ${page.h1}

BODY TEXT:
${page.bodyText}

KNOWN LEXICON HITS (confirm, contextualize, and add what's missed):
${hitList}`;
}

const MODEL = "claude-opus-4-8";

export async function analyzeCopy(
  page: ExtractedPage,
  hits: LexiconHit[]
): Promise<WahWahAnalysis> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(page, hits) }],
    output_config: { format: zodOutputFormat(WahWahAnalysisSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Analysis failed — please try again");
  }
  return response.parsed_output;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/analyze.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Live smoke test (requires `ANTHROPIC_API_KEY`)**

```bash
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY npx tsx -e "
import { analyzeCopy } from './src/lib/analyze';
analyzeCopy(
  { title: 'Acme', metaDescription: 'A full-service creative agency', h1: 'Brands that resonate', bodyText: 'We are a results-driven, full-service agency. Your partner in growth. Strategic. Customer-centric.' },
  []
).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Expected: JSON with score in the 70-95 range, flags with "underneath" lines that sound human. If `tsx` is missing: `npm install -D tsx`. Eyeball the voice — if it reads AI-written, tune `SYSTEM_PROMPT` now.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analyze.ts src/lib/analyze.test.ts package.json package-lock.json
git commit -m "feat: Claude wah-wah analysis with zod structured output"
```

---

### Task 5: Supabase schema and data helpers

**Files:**
- Create: `supabase/migrations/001_init.sql`
- Create: `src/lib/db.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/001_init.sql
create table analyses (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  score int not null,
  result jsonb not null,
  ip text,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'wahwah-detector',
  analysis_id uuid references analyses(id),
  created_at timestamptz not null default now()
);

create index analyses_ip_created_idx on analyses (ip, created_at);
create unique index leads_email_source_idx on leads (email, source);

-- No public access: the app uses the service-role key server-side only.
alter table analyses enable row level security;
alter table leads enable row level security;
```

- [ ] **Step 2: Apply the migration**

Create a new Supabase project (dashboard: supabase.com → New project → name `positioning-engine`), then paste `001_init.sql` into the SQL Editor and run it.
Expected: "Success. No rows returned."

- [ ] **Step 3: Write the data helpers**

```typescript
// src/lib/db.ts
import { createClient } from "@supabase/supabase-js";
import type { WahWahAnalysis } from "@/lib/analyze";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function saveAnalysis(
  url: string,
  analysis: WahWahAnalysis,
  ip: string | null
): Promise<string> {
  const { data, error } = await db()
    .from("analyses")
    .insert({ url, score: analysis.score, result: analysis, ip })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getAnalysis(id: string) {
  const { data, error } = await db()
    .from("analyses")
    .select("id, url, score, result, created_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function countRecentByIp(ip: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db()
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneHourAgo);
  if (error) return 0;
  return count ?? 0;
}

export async function saveLead(
  email: string,
  source: string,
  analysisId: string | null
): Promise<void> {
  // upsert on (email, source) so repeat submits don't error
  const { error } = await db()
    .from("leads")
    .upsert(
      { email, source, analysis_id: analysisId },
      { onConflict: "email,source" }
    );
  if (error) throw error;
}
```

- [ ] **Step 4: Create `.env.local.example`**

```bash
# .env.local.example — copy to .env.local and fill in
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=
```

Copy to `.env.local` and fill in the Supabase values from the project's Settings → API page.

- [ ] **Step 5: Verify with a live round-trip**

```bash
npx tsx -e "
import 'dotenv/config';
import { saveAnalysis, getAnalysis } from './src/lib/db';
const fake = { score: 50, verdict: 'test', flags: [], rewrite_teaser: 'test' };
saveAnalysis('https://example.com', fake as any, '1.2.3.4')
  .then(id => getAnalysis(id))
  .then(row => console.log('round-trip OK:', row?.score === 50));
"
```

(`npm install -D dotenv` if needed.) Expected: `round-trip OK: true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/lib/db.ts .env.local.example package.json package-lock.json
git commit -m "feat: supabase schema and data helpers for analyses and leads"
```

---

### Task 6: `/api/analyze` route

POST `{url}` → rate-limit by IP (5/hour) → fetch → extract → lexicon → Claude → store → return `{id, score, verdict, flagCount}`. The full flags ship only via the report endpoint (Task 7) — that's what makes the email gate real.

**Files:**
- Create: `src/app/api/analyze/route.ts`
- Test: `src/app/api/analyze/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/analyze/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/extract", () => ({
  normalizeUrl: vi.fn((u: string) => `https://${u.replace(/^https?:\/\//, "")}/`),
  fetchPage: vi.fn(async () => ({
    title: "Acme",
    metaDescription: "",
    h1: "Brands that resonate",
    bodyText: "full-service results-driven",
  })),
}));
vi.mock("@/lib/analyze", () => ({
  analyzeCopy: vi.fn(async () => ({
    score: 81,
    verdict: "Beige paint.",
    flags: [{ phrase: "full-service", context: "x", underneath: "y" }],
    rewrite_teaser: "Say the real thing.",
  })),
}));
vi.mock("@/lib/db", () => ({
  saveAnalysis: vi.fn(async () => "fake-id-123"),
  countRecentByIp: vi.fn(async () => 0),
}));

import { POST } from "@/app/api/analyze/route";
import { countRecentByIp } from "@/lib/db";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns id, score, verdict, and flagCount — but not the flags", async () => {
    const res = await POST(makeRequest({ url: "acme.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      id: "fake-id-123",
      score: 81,
      verdict: "Beige paint.",
      flagCount: 1,
    });
    expect(json.flags).toBeUndefined();
  });

  it("400s on missing url", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("429s when the IP is over the hourly limit", async () => {
    vi.mocked(countRecentByIp).mockResolvedValueOnce(5);
    const res = await POST(makeRequest({ url: "acme.com" }));
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/analyze/route.test.ts`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Write the route**

```typescript
// src/app/api/analyze/route.ts
import { normalizeUrl, fetchPage } from "@/lib/extract";
import { findLexiconHits } from "@/lib/lexicon";
import { analyzeCopy } from "@/lib/analyze";
import { saveAnalysis, countRecentByIp } from "@/lib/db";

export const maxDuration = 60;

const HOURLY_LIMIT = 5;

export async function POST(req: Request): Promise<Response> {
  let url: string;
  try {
    const body = await req.json();
    if (typeof body.url !== "string" || !body.url.trim()) {
      throw new Error("missing url");
    }
    url = normalizeUrl(body.url.trim());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (ip && (await countRecentByIp(ip)) >= HOURLY_LIMIT) {
    return Response.json(
      { error: "Easy there. Try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const page = await fetchPage(url);
    const text = [page.title, page.metaDescription, page.h1, page.bodyText].join("\n");
    const hits = findLexiconHits(text);
    const analysis = await analyzeCopy(page, hits);
    const id = await saveAnalysis(url, analysis, ip);

    return Response.json({
      id,
      score: analysis.score,
      verdict: analysis.verdict,
      flagCount: analysis.flags.length,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Something broke" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/analyze/route.test.ts`
Expected: PASS (3 tests). Also run the full suite: `npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/analyze/
git commit -m "feat: analyze API route with IP rate limiting and gated response"
```

---

### Task 7: Email gate — `/api/report` + beehiiv

Email in → lead saved → subscribed to AIC on beehiiv → full report (flags + teaser) out.

**Files:**
- Create: `src/lib/beehiiv.ts`
- Create: `src/app/api/report/route.ts`
- Test: `src/lib/beehiiv.test.ts`
- Test: `src/app/api/report/route.test.ts`

- [ ] **Step 1: Write the failing beehiiv test**

```typescript
// src/lib/beehiiv.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { subscribeToAIC } from "@/lib/beehiiv";

describe("subscribeToAIC", () => {
  beforeEach(() => {
    process.env.BEEHIIV_API_KEY = "test-key";
    process.env.BEEHIIV_PUBLICATION_ID = "pub_123";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs the email to the beehiiv subscriptions endpoint", async () => {
    await subscribeToAIC("tim@example.com", "wahwah-detector");
    const call = vi.mocked(fetch).mock.calls[0];
    expect(String(call[0])).toContain("publications/pub_123/subscriptions");
    const body = JSON.parse(String(call[1]?.body));
    expect(body.email).toBe("tim@example.com");
    expect(body.utm_source).toBe("wahwah-detector");
  });

  it("does not throw on beehiiv failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(subscribeToAIC("tim@example.com", "x")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/beehiiv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the beehiiv client**

```typescript
// src/lib/beehiiv.ts

// Lead capture must never fail the user's request because beehiiv hiccuped —
// the lead is already saved in Supabase; beehiiv sync is best-effort.
export async function subscribeToAIC(
  email: string,
  utmSource: string
): Promise<void> {
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!pubId || !apiKey) return;

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          utm_source: utmSource,
          reactivate_existing: true,
          send_welcome_email: false,
        }),
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      console.error(`beehiiv subscribe failed: ${res.status}`);
    }
  } catch (e) {
    console.error("beehiiv subscribe error", e);
  }
}
```

- [ ] **Step 4: Run beehiiv tests — expect PASS**

Run: `npm test -- src/lib/beehiiv.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing report-route test**

```typescript
// src/app/api/report/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getAnalysis: vi.fn(async (id: string) =>
    id === "real-id"
      ? {
          id: "real-id",
          url: "https://acme.com/",
          score: 81,
          result: {
            score: 81,
            verdict: "Beige paint.",
            flags: [{ phrase: "full-service", context: "x", underneath: "y" }],
            rewrite_teaser: "Say the real thing.",
          },
          created_at: "2026-06-11T00:00:00Z",
        }
      : null
  ),
  saveLead: vi.fn(async () => undefined),
}));
vi.mock("@/lib/beehiiv", () => ({ subscribeToAIC: vi.fn(async () => undefined) }));

import { POST } from "@/app/api/report/route";
import { saveLead } from "@/lib/db";
import { subscribeToAIC } from "@/lib/beehiiv";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the lead, subscribes to AIC, and returns the full report", async () => {
    const res = await POST(makeRequest({ id: "real-id", email: "tim@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.flags).toHaveLength(1);
    expect(saveLead).toHaveBeenCalledWith("tim@example.com", "wahwah-detector", "real-id");
    expect(subscribeToAIC).toHaveBeenCalledWith("tim@example.com", "wahwah-detector");
  });

  it("400s on an invalid email", async () => {
    const res = await POST(makeRequest({ id: "real-id", email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("404s on an unknown analysis id", async () => {
    const res = await POST(makeRequest({ id: "nope", email: "tim@example.com" }));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run to verify it fails, then write the route**

Run: `npm test -- src/app/api/report/route.test.ts` → FAIL (module not found). Then:

```typescript
// src/app/api/report/route.ts
import { getAnalysis, saveLead } from "@/lib/db";
import { subscribeToAIC } from "@/lib/beehiiv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE = "wahwah-detector";

export async function POST(req: Request): Promise<Response> {
  let id: string, email: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    email = String(body.email ?? "").trim().toLowerCase();
    if (!id || !EMAIL_RE.test(email)) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Enter a real email address" }, { status: 400 });
  }

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return Response.json({ error: "Analysis not found" }, { status: 404 });
  }

  await saveLead(email, SOURCE, id);
  await subscribeToAIC(email, SOURCE);

  return Response.json({
    url: analysis.url,
    result: analysis.result,
    created_at: analysis.created_at,
  });
}
```

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: full suite PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/beehiiv.ts src/lib/beehiiv.test.ts src/app/api/report/
git commit -m "feat: email-gated report endpoint with beehiiv AIC sync"
```

---

### Task 8: UI — landing page, score page, email gate

Three pieces: the landing page (hero + URL form), the result page at `/r/[id]` (public score + gated report), and the client component handling the gate. UI is verified manually — no component tests in v1 (the logic lives in the tested API layer).

Copy below is **structural placeholder in Tim's general register** — Tim rewrites before launch (one-shot voice rule). No "you're"/"they're" sweep needed until his pass.

**Files:**
- Modify: `src/app/page.tsx` (replace scaffold)
- Modify: `src/app/layout.tsx` (metadata)
- Create: `src/app/r/[id]/page.tsx`
- Create: `src/components/ScoreCard.tsx`
- Create: `src/components/ReportGate.tsx`
- Create: `src/components/UrlForm.tsx`

- [ ] **Step 1: Update layout metadata**

In `src/app/layout.tsx`, replace the `metadata` export:

```typescript
export const metadata: Metadata = {
  title: "The Wah-Wah Detector — does your homepage say anything?",
  description:
    "Paste your agency homepage. Get your Wah-Wah Score: how much of your copy is the sound the adults make in a Peanuts cartoon.",
};
```

- [ ] **Step 2: Create the URL form (client component)**

```tsx
// src/components/UrlForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      router.push(`/r/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <input
        type="text"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="youragency.com"
        className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-lg focus:border-zinc-900 focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-6 py-3 text-lg font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {busy ? "Listening for wah-wah…" : "Score my homepage"}
      </button>
      {error && <p className="text-sm text-red-600 sm:w-full">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Create the landing page**

```tsx
// src/app/page.tsx
import UrlForm from "@/components/UrlForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
        The Wah-Wah Detector
      </p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        Your homepage might be making the sound the adults make in a Peanuts
        cartoon.
      </h1>
      <p className="max-w-xl text-lg text-zinc-600">
        &ldquo;Results-driven.&rdquo; &ldquo;Full-service.&rdquo;
        &ldquo;Extension of your team.&rdquo; Wah wah, wah wah wah. Paste your
        URL and find out how much of your copy says absolutely nothing.
      </p>
      <UrlForm />
      <p className="text-sm text-zinc-400">
        Free. 30 seconds. Built by{" "}
        <a href="https://timkilroy.com" className="underline">
          Tim Kilroy
        </a>
        , who has read ten thousand agency homepages and would like the hours back.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Create the ScoreCard component**

```tsx
// src/components/ScoreCard.tsx
export default function ScoreCard({
  score,
  verdict,
  url,
}: {
  score: number;
  verdict: string;
  url: string;
}) {
  const hostname = new URL(url).hostname;
  const tone =
    score >= 70 ? "text-red-600" : score >= 40 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
        Wah-Wah Score — {hostname}
      </p>
      <p className={`text-8xl font-black tabular-nums ${tone}`}>{score}%</p>
      <p className="max-w-md text-center text-xl font-medium text-zinc-800">
        {verdict}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create the ReportGate component** (email gate + full report rendering)

```tsx
// src/components/ReportGate.tsx
"use client";

import { useState } from "react";

type Flag = { phrase: string; context: string; underneath: string };
type Report = {
  result: { flags: Flag[]; rewrite_teaser: string };
};

export default function ReportGate({
  analysisId,
  flagCount,
}: {
  analysisId: string;
  flagCount: number;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: analysisId, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  if (report) {
    return (
      <div className="flex w-full flex-col gap-6">
        <h2 className="text-2xl font-bold">
          The {report.result.flags.length} worst offenders
        </h2>
        {report.result.flags.map((f, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="font-mono text-lg font-bold text-red-600">
              &ldquo;{f.phrase}&rdquo;
            </p>
            <p className="mt-1 text-sm text-zinc-500">…{f.context}…</p>
            <p className="mt-3 text-zinc-800">{f.underneath}</p>
          </div>
        ))}
        <div className="rounded-xl border-2 border-zinc-900 bg-zinc-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            What you could say instead
          </p>
          <p className="mt-2 text-xl font-medium">{report.result.rewrite_teaser}</p>
          <p className="mt-4 text-zinc-600">
            That one line came from a robot reading your homepage for 30
            seconds. Robot-Tim — the full positioning engine — interviews you,
            crawls your whole site, and hands back the rewrite. Coming soon.
          </p>
          <a
            href="https://timkilroy.com/demand-os"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 font-semibold text-white"
          >
            Meanwhile: how the human version works →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-8"
    >
      <p className="text-xl font-semibold">
        {flagCount} phrase{flagCount === 1 ? "" : "s"} flagged. Want the
        damage report?
      </p>
      <p className="text-center text-zinc-600">
        Every flagged phrase, what your visitors hear instead, and one line of
        what you could say. Free — enter your email.
      </p>
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@youragency.com"
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 focus:border-zinc-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {busy ? "Pulling the report…" : "Show me"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-zinc-400">
        Also subscribes you to Agency Inner Circle. Unsubscribe whenever.
      </p>
    </form>
  );
}
```

- [ ] **Step 6: Create the result page (server component)**

```tsx
// src/app/r/[id]/page.tsx
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/db";
import ScoreCard from "@/components/ScoreCard";
import ReportGate from "@/components/ReportGate";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) return {};
  const hostname = new URL(analysis.url).hostname;
  return {
    title: `${hostname} scored ${analysis.score}% wah-wah`,
    description: "How much of your homepage says absolutely nothing? Find out.",
  };
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const result = analysis.result as {
    verdict: string;
    flags: unknown[];
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-10 px-6 py-16">
      <ScoreCard score={analysis.score} verdict={result.verdict} url={analysis.url} />
      <ReportGate analysisId={analysis.id} flagCount={result.flags.length} />
      <a href="/" className="text-sm text-zinc-400 underline">
        Score another homepage
      </a>
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

Walk the flow at localhost:3000 with a real agency URL: score appears → email gate → full report renders → check Supabase `analyses` and `leads` tables have rows → check the beehiiv subscriber appeared (or its error logged if env vars unset). Also verify a junk URL ("asdf") shows the friendly error.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/r/ src/components/
git commit -m "feat: landing page, score page, and email-gated report UI"
```

---

### Task 9: Shareable OG image

The screenshot people post IS the distribution. A dynamic OG image per result makes the link itself carry the score.

**Files:**
- Create: `src/app/r/[id]/opengraph-image.tsx`

- [ ] **Step 1: Create the OG image route**

```tsx
// src/app/r/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getAnalysis } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  const score = analysis?.score ?? 0;
  const hostname = analysis ? new URL(analysis.url).hostname : "";
  const color = score >= 70 ? "#dc2626" : score >= 40 ? "#d97706" : "#059669";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#71717a", textTransform: "uppercase" }}>
          Wah-Wah Score — {hostname}
        </div>
        <div style={{ fontSize: 220, fontWeight: 900, color }}>{score}%</div>
        <div style={{ fontSize: 32, color: "#27272a" }}>
          How much of your homepage says absolutely nothing
        </div>
        <div style={{ fontSize: 24, color: "#a1a1aa" }}>wah-wah by timkilroy.com</div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 2: Verify locally**

With `npm run dev` running and a known result id from Task 8's walk-through:

```bash
curl -s -o /tmp/og.png -w "%{http_code}" "http://localhost:3000/r/<RESULT_ID>/opengraph-image"
open /tmp/og.png
```

Expected: `200`, image shows the score in the right color band.

- [ ] **Step 3: Commit**

```bash
git add src/app/r/
git commit -m "feat: dynamic OG share image with score"
```

---

### Task 10: Deploy to Vercel

**Files:**
- Create: GitHub repo + Vercel project (no code changes)

- [ ] **Step 1: Push to GitHub**

```bash
gh repo create positioning-engine --private --source . --push
```

- [ ] **Step 2: Create the Vercel project and set env vars**

```bash
npx vercel link
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add BEEHIIV_API_KEY production
npx vercel env add BEEHIIV_PUBLICATION_ID production
```

(Each command prompts for the value; paste from `.env.local`.)

- [ ] **Step 3: Deploy and smoke test**

```bash
npx vercel --prod
```

Then on the production URL: run one real analysis end-to-end (score → email gate → report), confirm the OG image renders by pasting a result URL into an OG preview tool (e.g. opengraph.xyz), and confirm the lead landed in beehiiv.

- [ ] **Step 4: Decide the public home**

Default per spec: link from timkilroy.com (e.g. a `/wah-wah` redirect to the Vercel URL, or a subdomain like `wahwah.timkilroy.com` via Vercel domains). Custom domain is an open item — don't block launch on it.

---

## Out of scope for this plan (next plans)

1. **Robot-Tim Positioning Engine** — interview state machine, full-site crawl, Narrative Spine deliverables, Stripe at $395. Gets its own plan after the Detector is live; it reuses this repo, `extract.ts`, `lexicon.ts`, and the Supabase project.
2. **Launch promotion** — AIC issue + LinkedIn posts announcing the Detector (Tim's voice, AI drafts structure only).
3. **Visibility Lab fold-in** — retire/redirect after Robot-Tim ships.

## Self-review notes

- Spec coverage: free URL-paste score ✓, flagged phrases + underneath lines ✓, email gate → AIC ✓, screenshot-friendly score + OG image ✓, single-page crawl + one Claude call ✓, Robot-Tim CTA placeholder (waitlist replaced with DemandOS link until Robot-Tim exists — flags CTA copy in ReportGate) ✓.
- Types consistent across tasks: `WahWahAnalysis` (analyze) → stored as `result` jsonb (db) → rendered in ReportGate; `flagCount` derived server-side in both API routes.
- Voice: all user-facing copy is marked as Tim-rewrites-before-launch.
