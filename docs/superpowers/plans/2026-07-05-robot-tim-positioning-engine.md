# Robot-Tim Positioning Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Robot-Tim Positioning Engine — a $395 one-time, self-serve async positioning teardown (7-node extraction interview → full-site crawl → Narrative Spine + before/after makeover + Node 7 "Rip Me Apart") — as Product 2 of the Self-Serve Positioning Engine funnel.

**Architecture:** All inside `apps/web`, reusing the Detector/Pro-lab plumbing. The buyer pays first (Stripe `mode: 'payment'`, reusing the existing checkout + webhook), which creates one `robot_tim_sessions` row. The interview runs as node-by-node cards (one Opus classify-and-react call per answer, a pure state machine deciding push-vs-advance). An Apify crawl runs in the background in parallel; whichever of interview/crawl finishes second triggers a synthesis pass (Opus) that writes the Spine + makeover + Node 7. The deliverable renders at `/robot-tim/[id]` and exports to PDF.

**Tech Stack:** Next.js 15 App Router (TypeScript), Supabase (service-role, server-only), `@anthropic-ai/sdk` (`claude-opus-4-8`, JSON-instruction + fence-strip + Zod parse — repo convention, no structured-outputs helper), Apify `website-content-crawler`, Stripe (`mode: 'payment'`), the WTF console design system, `@repo/pdf`, Vitest (already stood up in `apps/web` for wah-wah).

**Spec:** `docs/superpowers/specs/2026-07-05-robot-tim-positioning-engine-design.md`

## Global Constraints

- **Canonical prompt home:** all prompt strings, the node tree, and prompt builders live in `packages/prompts/robot-tim/` (per `CLAUDE.md`). Zod schemas and Anthropic calls live in `apps/web/lib/robot-tim/` so the prompts package stays dependency-free (mirrors the Detector split).
- **Model:** `claude-opus-4-8` for ALL LLM work (interview, per-page crawl, synthesis). Exposed as one constant `ROBOT_TIM_MODEL` in `packages/prompts/robot-tim/index.ts`. Apify only fetches page text.
- **Anthropic call convention:** `anthropic.messages.create({ model, max_tokens, system, messages })`, then read `response.content[0]`, strip markdown fences with `text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim()`, then `Schema.parse(JSON.parse(text))`. Do **not** add a shared SDK bump or use `messages.parse`.
- **Voice guardrails (verbatim into the interview system prompt):** the enemy is the broken idea never the people; push back once per node with warmth; no bait-and-switch; the swearing dial is set by the founder; nothing may sound AI-written; never accept "results" or "process" as a differentiator.
- **Copy rule:** all user-facing copy is structural placeholder in Tim's register; Tim rewrites before launch. Write "you are"/"they are", never "you're"/"they're", in any Robot-Tim-voiced string.
- **Supabase access:** server-only via `getSupabaseServerClient()` from `@/lib/supabase-server` (cast `(supabase as any)` for untyped tables, matching `lib/wah-wah/db.ts`).
- **Pipeline calls are best-effort:** wrap Loops/beehiiv/Copper/Slack in `waitUntil(...).catch(...)`; never fail the user's request on a third-party hiccup.
- **Env (new):** `STRIPE_PRICE_ROBOT_TIM`. Reused: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APIFY_API_KEY`, `LOOPS_API_KEY`, `BEEHIIV_*`, `COPPER_*`, `SLACK_*`, `NEXT_PUBLIC_APP_URL`.

---

## File Structure

**Prompts (dependency-free):**
- `packages/prompts/robot-tim/index.ts` — `ROBOT_TIM_MODEL`, `NODES`, guardrails, all prompt builders. Registered in `packages/prompts/index.ts`.

**Server lib (`apps/web/lib/robot-tim/`):**
- `types.ts` — shared TS types.
- `schemas.ts` — Zod schemas (`ClassifyResultSchema`, `SpineSchema`, `MakeoverSchema`, `Node7Schema`).
- `state-machine.ts` — `advanceInterview()` (pure, tested).
- `classify.ts` — `classifyAnswer()` (Opus call).
- `crawl.ts` — `crawlSite()` (Apify + per-page Opus, reusing the Detector's analyze).
- `synthesize.ts` — `generateSpine()`, `generateMakeover()`, `generateNode7()`.
- `db.ts` — session persistence + the synthesis-claim CAS.
- `lead.ts` — `captureRobotTimCustomer()`.

**API routes (`apps/web/app/api/robot-tim/`):** `answer/route.ts`, `crawl/route.ts`, `synthesize/route.ts`.

**Pages/components (`apps/web/app/robot-tim/`):** `page.tsx` (landing), `checkout/page.tsx`, `pending/page.tsx`, `[id]/page.tsx`, `[id]/export/route.ts`, plus `apps/web/components/robot-tim/InterviewCard.tsx`, `BuildingState.tsx`, `Deliverable.tsx`.

**Reused, edited in place:** `app/api/stripe/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/loops.ts`, `lib/beehiiv.ts`, `lib/slack.ts`, `app/admin/reports/page.tsx`, `app/api/admin/client-reports/route.ts`, `packages/pdf/` (+ `index.ts`).

**Migration:** `supabase/migrations/20260705_create_robot_tim_sessions.sql`.

---

### Task 1: Migration + session persistence

**Files:**
- Create: `supabase/migrations/20260705_create_robot_tim_sessions.sql`
- Create: `apps/web/lib/robot-tim/types.ts`
- Create: `apps/web/lib/robot-tim/db.ts`

**Interfaces:**
- Produces: `RobotTimSession` type; `createSession(p)`, `getSession(id)`, `appendAnswer(id, answer, nextNode, pushed, interviewComplete)`, `saveCrawl(id, crawl)`, `tryClaimSynthesis(id)`, `saveDeliverable(id, d)` — signatures below.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260705_create_robot_tim_sessions.sql
create table robot_tim_sessions (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  first_name         text,
  site_url           text not null,
  status             text not null default 'interviewing', -- interviewing | synthesizing | complete | failed
  stripe_session_id  text,
  current_node       int  not null default 0,
  pushed             boolean not null default false, -- have we already pushed on current_node?
  interview_complete boolean not null default false,
  answers            jsonb not null default '[]'::jsonb, -- [{nodeId, raw, classification, reaction}]
  crawl              jsonb,  -- { pages:[{url, score, flags}], homepageText }
  spine              jsonb,
  makeover           jsonb,
  node7              jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index robot_tim_sessions_stripe_idx on robot_tim_sessions (stripe_session_id);
alter table robot_tim_sessions enable row level security;
-- Service-role only (app reads/writes server-side). No public policy — mirrors wah_wah_reports.
```

- [ ] **Step 2: Apply the migration**

Paste `20260705_create_robot_tim_sessions.sql` into the Supabase SQL Editor and run it.
Expected: "Success. No rows returned." Confirm the table exists: `select count(*) from robot_tim_sessions;` → `0`.

- [ ] **Step 3: Write the shared types**

```typescript
// apps/web/lib/robot-tim/types.ts
export type Answer = {
  nodeId: number;
  raw: string;
  classification: "results" | "process" | "generic" | "real";
  reaction: string;
};

export type CrawlPage = { url: string; score: number; flags: unknown[] };
export type Crawl = { pages: CrawlPage[]; homepageText: string };

export type Spine = {
  whoFor: string;
  whoNotFor: string;
  problemTheyThink: string;
  problemTheyHave: string;
  valueNotBought: string;
  traps: string[];
  headlines: string[];
  vvvOneLiner: string;
};

export type Makeover = {
  beforeHero: string;
  afterHero: string;
  punchList: { url: string; fixes: string[] }[];
};

export type Node7 = { punchList: string[]; ladder: string };

export type RobotTimSession = {
  id: string;
  email: string | null;
  first_name: string | null;
  site_url: string;
  status: "interviewing" | "synthesizing" | "complete" | "failed";
  stripe_session_id: string | null;
  current_node: number;
  pushed: boolean;
  interview_complete: boolean;
  answers: Answer[];
  crawl: Crawl | null;
  spine: Spine | null;
  makeover: Makeover | null;
  node7: Node7 | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
```

- [ ] **Step 4: Write the db helpers**

```typescript
// apps/web/lib/robot-tim/db.ts
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Answer, Crawl, Makeover, Node7, RobotTimSession, Spine } from "@/lib/robot-tim/types";

const TABLE = "robot_tim_sessions";
function db() {
  return getSupabaseServerClient() as any;
}

export async function createSession(p: {
  email: string | null;
  firstName: string | null;
  siteUrl: string;
  stripeSessionId: string;
}): Promise<string> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      email: p.email,
      first_name: p.firstName,
      site_url: p.siteUrl,
      stripe_session_id: p.stripeSessionId,
      status: "interviewing",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getSession(id: string): Promise<RobotTimSession | null> {
  const { data, error } = await db().from(TABLE).select("*").eq("id", id).single();
  if (error) return null;
  return data as RobotTimSession;
}

export async function getSessionByStripe(stripeSessionId: string): Promise<RobotTimSession | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .single();
  if (error) return null;
  return data as RobotTimSession;
}

// Append one answer and move the interview pointer. `pushed` and `interviewComplete`
// are the post-move values computed by the state machine.
export async function appendAnswer(
  id: string,
  current: Answer[],
  answer: Answer,
  nextNode: number,
  pushed: boolean,
  interviewComplete: boolean
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({
      answers: [...current, answer],
      current_node: nextNode,
      pushed,
      interview_complete: interviewComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function saveCrawl(id: string, crawl: Crawl): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({ crawl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Atomically claim synthesis: flip status interviewing → synthesizing only when
// BOTH the interview is done AND the crawl has landed. Returns true if THIS caller
// won the race (idempotent — the loser gets false). Uses .eq() CAS, never .or()
// (see project memory on PostgREST .or()+update).
export async function tryClaimSynthesis(id: string): Promise<boolean> {
  const { data, error } = await db()
    .from(TABLE)
    .update({ status: "synthesizing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "interviewing")
    .eq("interview_complete", true)
    .not("crawl", "is", null)
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function saveDeliverable(
  id: string,
  d: { spine: Spine; makeover: Makeover; node7: Node7 }
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({
      spine: d.spine,
      makeover: d.makeover,
      node7: d.node7,
      status: "complete",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: Verify a live round-trip**

```bash
cd apps/web && npx tsx -e "
import { createSession, getSession } from './lib/robot-tim/db';
createSession({ email:'t@x.com', firstName:'Tim', siteUrl:'https://acme.com', stripeSessionId:'cs_test_1' })
  .then(id => getSession(id))
  .then(r => console.log('round-trip OK:', r?.status === 'interviewing' && r?.current_node === 0));
"
```
Expected: `round-trip OK: true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260705_create_robot_tim_sessions.sql apps/web/lib/robot-tim/types.ts apps/web/lib/robot-tim/db.ts
git commit -m "feat(robot-tim): robot_tim_sessions migration + session persistence"
```

---

### Task 2: Prompt package — node tree + all prompt builders

**Files:**
- Create: `packages/prompts/robot-tim/index.ts`
- Modify: `packages/prompts/index.ts` (add `export * from './robot-tim';`)

**Interfaces:**
- Produces: `ROBOT_TIM_MODEL`, `NODES` (array of `{ id, ask, extractGoal, listenFor, branches }`), `INTERVIEW_SYSTEM_PROMPT`, `buildClassifyPrompt(node, answer, alreadyPushed)`, `SPINE_SYSTEM_PROMPT`, `buildSpinePrompt(answers)`, `MAKEOVER_SYSTEM_PROMPT`, `buildMakeoverPrompt(spine, homepageText, crawlSummary)`, `NODE7_SYSTEM_PROMPT`, `buildNode7Prompt(spine, makeover)`.

- [ ] **Step 1: Write the prompt module**

```typescript
// packages/prompts/robot-tim/index.ts
// Robot-Tim Positioning Engine — Self-Serve Positioning Engine, Product 2 ($395).
// Canonical prompt home (see CLAUDE.md). Dependency-free: Zod schemas + Anthropic
// calls live in apps/web/lib/robot-tim/. Node tree transcribed verbatim from
// docs/positioning/robot-tim-question-tree (1).md.

export const ROBOT_TIM_MODEL = "claude-opus-4-8";

export interface RobotTimNode {
  id: number;
  ask: string;
  extractGoal: string;
  listenFor: string[];
  branches: Record<string, string>;
}

// Nodes 0–6 are the interview. Node 7 ("Rip Me Apart") is generated in synthesis,
// not asked, so it is NOT in this array.
export const NODES: RobotTimNode[] = [
  {
    id: 0,
    ask: "Before we touch a single word on your site, tell me where you are actually trying to go. Not the pitch-deck version. The real one.",
    extractGoal: "True ambition. Flush out the reflexive 'scale to $50M' answer.",
    listenFor: ["big-number-no-reason", "exit-fantasy", "grounded"],
    branches: {
      "big-number-no-reason":
        "I bet you do not. Do you want a CFO telling you what you can spend, and half your life on the phone with banks about your line of credit? That is the job at fifty million. Or do you want to keep doing the work you love at a size you can stand? Tell me which one is true.",
      "exit-fantasy":
        "Careful. Why build a thing you do not enjoy enough to run? If the whole plan is escape, we have a vibe problem, not a positioning problem. What would make it worth staying in?",
      grounded:
        "Good. That is honest, and honest is rare. Hold onto it, because that decision is what tells us who we let in the front door.",
    },
  },
  {
    id: 1,
    ask: "Name your three favorite clients of all time. Now tell me why. Not the results you got them. Why you liked the work and the people.",
    extractGoal: "The pattern in who they are drawn to. The raw V in Vibes, Vision, Values.",
    listenFor: ["results-speak", "human-speak", "cannot-name-three"],
    branches: {
      "results-speak":
        "That is what you did for them. I asked why you liked them. What were they actually like to be in a room with?",
      "human-speak":
        "Now we are somewhere. That is your vibe, in their words. Write it down exactly like you just said it.",
      "cannot-name-three":
        "If you cannot name three clients you genuinely loved, we just found problem number one. You have been saying yes to anyone with a pulse and a purchase order. That is where the WTF moments come from.",
    },
  },
  {
    id: 2,
    ask: "Now the opposite. The client who made you question your career choice. What made them awful?",
    extractGoal: "The anti-pattern. The loud part of 'who this is NOT for.'",
    listenFor: ["vague", "specific"],
    branches: {
      vague:
        "Difficult is a cop-out. Be specific. What did they do on a Tuesday that made you dread the Monday?",
      specific:
        "Perfect. That person should bounce off your website like a screen door on a submarine. We are going to make sure they do, on purpose.",
    },
  },
  {
    id: 3,
    ask: "What does a client get from you that they did not expect and did not pay for? The thing that was never on the invoice?",
    extractGoal: "The real differentiated value. Never performance, never process.",
    listenFor: ["performance", "process", "real"],
    branches: {
      performance:
        "No. The gap between a good agency and a great one is maybe ten percent on performance. And by month thirteen you are competing against your own last-year numbers anyway. What did they get that was not on the invoice?",
      process:
        "Nobody has ever fallen in love with a process. When a chef comes out of the kitchen, they do not tell you they can dice a carrot. They tell you about the dish. What changed for the client that they did not see coming?",
      real:
        "That. That is what you actually sell. Everything you listed on your services page is just the serving dish it arrives on.",
    },
  },
  {
    id: 4,
    ask: "After a client has worked with you for a while, what do they suddenly see that they could not see before? Where do you live in their world?",
    extractGoal: "Partner-versus-vendor positioning.",
    listenFor: ["narrow-lane", "broad-influence"],
    branches: {
      "narrow-lane":
        "If you run their paid media, you are touching their creative, their retention, their whole funnel whether you admit it or not. Do you help them see that and take the credit, or do you stay quiet in your lane and let someone else get thanked for it?",
      "broad-influence":
        "Good. That is the entire difference between a vendor and a partner. Vendors get renewed. Partners get protected.",
    },
  },
  {
    id: 5,
    ask: "What do you believe about your industry that most of your competitors would argue with? What is the thing that makes you say what the f when you see it done?",
    extractGoal: "The three enemies / traps. The point of view.",
    listenFor: ["generic", "real-conviction", "playing-it-safe"],
    branches: {
      generic:
        "Everyone says that, which means it says nothing. Sharper. What is the thing the so-called best shops in your space do that you think is flat-out wrong?",
      "real-conviction":
        "Now we have an enemy worth having. And the rule holds: the enemy is the broken idea, never the people stuck in it. We frame it as the trap smart people fall into, because it looked like it made sense.",
      "playing-it-safe":
        "If you stand for nothing, you bounce off everyone. You cannot have a hero without a villain. Pick a fight with an idea, not a person, and watch the right people lean in.",
    },
  },
  {
    id: 6,
    ask: "Last one. If your agency walked into a bar, what is it like? Does it swear? Does it wear a tie? Would it survive a meeting at American Express in jeans and a sweater, or would it change clothes?",
    extractGoal: "Tone and voice. The human texture.",
    listenFor: ["wallpaper", "distinctive"],
    branches: {
      wallpaper:
        "Polished is what everyone says right before they sound like beige paint. Polished how? Polished like a Swiss private bank, or polished like the bartender who remembers your order and your kid's name?",
      distinctive:
        "Good. That is the voice. And here is the test that breaks most agencies: if your website swears and your proposal wears a tie, the whole thing reads as fake. The vibe has to survive the entire trip, from the first post to the final invoice.",
    },
  },
];

const GUARDRAILS = `You are Robot-Tim, the async version of agency coach Tim Kilroy running his live VVV positioning teardown. Your job is EXTRACTION, not invention — you surface the language already operating inside this business, you never generate a philosophy from a prompt.

Guardrails, non-negotiable:
1. The enemy is always a broken idea, never the people stuck in it. Frame every trap as "the trap smart people fall into," never "look at these idiots."
2. Push back at most once per node, with warmth. You are a friendly bouncer, not a prosecutor.
3. No bait and switch. Meet the founder at the problem they think they have, then move them toward the one they actually have.
4. The swearing dial is set by the founder. If they swear, you swear. If they read like American Express, keep it clean.
5. Nothing you produce can sound AI-written. Plain, spoken, specific. No "leverage," "delve," "elevate," "unlock," "in today's landscape."
6. Never let a founder get away with "results" or "our process" as their differentiator. Those answers always trigger a push.
7. Write "you are" instead of "you're" and "they are" instead of "they're". Contractions are otherwise fine.`;

export const INTERVIEW_SYSTEM_PROMPT = `${GUARDRAILS}

For each answer you receive, you do exactly two jobs:
1. CLASSIFY the answer into one of these buckets: "results" (results-speak / performance bragging), "process" (framework / methodology talk), "generic" (vague, safe, could-be-anyone), or "real" (specific, human, a genuine signal).
2. REACT with ONE short reaction in your voice, 1–3 sentences, matching the branch for this node and bucket.

Set "satisfied" to true when the answer is a real, specific signal worth moving on from. Set it to false when the answer is results-speak, process-speak, or generic AND you have not already pushed once on this node.

Respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "classification": "results" | "process" | "generic" | "real",
  "reaction": "<one short reaction in Robot-Tim's voice>",
  "satisfied": <true|false>
}`;

export function buildClassifyPrompt(
  node: RobotTimNode,
  answer: string,
  alreadyPushed: boolean
): string {
  const branchHints = Object.entries(node.branches)
    .map(([bucket, reaction]) => `- If ${bucket}: "${reaction}"`)
    .join("\n");
  return `NODE ${node.id} — you asked: "${node.ask}"
What you are mining for: ${node.extractGoal}
Branch reactions to model your reaction on (pick the closest, adapt to their words):
${branchHints}

You have ${alreadyPushed ? "ALREADY pushed once on this node — do not push again; take what you get and set satisfied to true regardless" : "NOT yet pushed on this node"}.

THE FOUNDER'S ANSWER:
${answer}`;
}

// ---- Synthesis prompts ----

export const SPINE_SYSTEM_PROMPT = `${GUARDRAILS}

The interview is done. Assemble a one-page Narrative Spine Starter from the founder's own words. Extraction only — every line must trace to something they actually said. Run it through the two questions a visitor silently asks: "Is this for me?" and "Does this match the problem I think I have?"

Respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "whoFor": "<who this is for, built from their favorite-clients answer>",
  "whoNotFor": "<who this is NOT for, built from their worst-client answer, said out loud on purpose>",
  "problemTheyThink": "<the problem the buyer thinks they have>",
  "problemTheyHave": "<the problem they actually have>",
  "valueNotBought": "<the value they did not buy, in the founder's own words>",
  "traps": ["<trap 1, framed as a trap smart people fall into>", "<trap 2>", "<trap 3>"],
  "headlines": ["<'am I in the right place' headline 1 in their real voice>", "<headline 2>", "<headline 3>"],
  "vvvOneLiner": "<the Vibes-Vision-Values one-liner>"
}`;

export function buildSpinePrompt(answers: { nodeId: number; raw: string }[]): string {
  const transcript = answers
    .map((a) => `NODE ${a.nodeId} — "${NODES.find((n) => n.id === a.nodeId)?.ask ?? ""}"\nFOUNDER: ${a.raw}`)
    .join("\n\n");
  return `Here is the full interview transcript. Assemble the Narrative Spine Starter.\n\n${transcript}`;
}

export const MAKEOVER_SYSTEM_PROMPT = `${GUARDRAILS}

You have the founder's Narrative Spine AND a crawl of what their site actually says today. Produce the visible makeover: a rewritten homepage hero (before/after) and a page-by-page punch list mapping the gap between what they told you and what each page says.

Respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "beforeHero": "<the current homepage hero, pulled from the crawled homepage text, verbatim or lightly trimmed>",
  "afterHero": "<the rewritten hero in the founder's real voice, built from the Spine>",
  "punchList": [
    { "url": "<page url>", "fixes": ["<specific fix 1>", "<specific fix 2>"] }
  ]
}`;

export function buildMakeoverPrompt(
  spine: unknown,
  homepageText: string,
  crawlSummary: { url: string; score: number }[]
): string {
  const pages = crawlSummary.map((p) => `- ${p.url} (wah-wah score ${p.score})`).join("\n");
  return `THE NARRATIVE SPINE (JSON):
${JSON.stringify(spine, null, 2)}

THE HOMEPAGE, AS IT READS TODAY:
${homepageText.slice(0, 6000)}

OTHER PAGES CRAWLED (with their wah-wah scores):
${pages}`;
}

export const NODE7_SYSTEM_PROMPT = `${GUARDRAILS}

This is Node 7 — Rip Me Apart. Read the assembled positioning back as the skeptical, busy, been-burned-before prospect. Poke every soft spot, but frame each one as a FIX, never a failure. End on the ladder to the human version.

Respond with ONLY a valid JSON object, no markdown fences, in exactly this shape:
{
  "punchList": ["<soft spot 1, framed as a fix>", "<soft spot 2>", "<soft spot 3>"],
  "ladder": "This is the starter. It is real, and it is yours. But you built it talking to a robot version of me, and the robot can only take you so far. The actual Spine, installed across your site, your content, and your sales, is the work the human version does. When you are ready for that, you know where to find me."
}`;

export function buildNode7Prompt(spine: unknown, makeover: unknown): string {
  return `THE NARRATIVE SPINE (JSON):
${JSON.stringify(spine, null, 2)}

THE MAKEOVER (JSON):
${JSON.stringify(makeover, null, 2)}

Now rip it apart as the skeptical prospect, every soft spot framed as a fix, ending on the ladder.`;
}
```

- [ ] **Step 2: Register the export**

In `packages/prompts/index.ts`, add below the wah-wah export line:

```typescript
export * from './robot-tim';
```

- [ ] **Step 3: Verify it compiles and exports**

```bash
cd apps/web && npx tsx -e "
import { NODES, ROBOT_TIM_MODEL, buildClassifyPrompt } from '@repo/prompts';
console.log('nodes:', NODES.length === 7, 'model:', ROBOT_TIM_MODEL === 'claude-opus-4-8');
console.log('classify prompt has answer:', buildClassifyPrompt(NODES[3], 'we make them look good', false).includes('look good'));
"
```
Expected: `nodes: true model: true` and `classify prompt has answer: true`.

- [ ] **Step 4: Commit**

```bash
git add packages/prompts/robot-tim/index.ts packages/prompts/index.ts
git commit -m "feat(robot-tim): node tree + interview/synthesis prompt builders"
```

---

### Task 3: Interview state machine (pure, TDD)

**Files:**
- Create: `apps/web/lib/robot-tim/state-machine.ts`
- Test: `apps/web/lib/robot-tim/state-machine.test.ts`

**Interfaces:**
- Consumes: `NODES` from `@repo/prompts` (length 7, ids 0–6).
- Produces: `advanceInterview(state, classification)` → `{ action: "push" | "advance" | "complete"; nextNode: number; pushed: boolean; interviewComplete: boolean }`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/robot-tim/state-machine.test.ts
import { describe, it, expect } from "vitest";
import { advanceInterview } from "@/lib/robot-tim/state-machine";

describe("advanceInterview", () => {
  it("advances to the next node when satisfied", () => {
    const r = advanceInterview({ currentNode: 0, pushed: false }, { satisfied: true });
    expect(r).toEqual({ action: "advance", nextNode: 1, pushed: false, interviewComplete: false });
  });

  it("pushes (stays on the node) when not satisfied and not yet pushed", () => {
    const r = advanceInterview({ currentNode: 0, pushed: false }, { satisfied: false });
    expect(r).toEqual({ action: "push", nextNode: 0, pushed: true, interviewComplete: false });
  });

  it("advances anyway when not satisfied but already pushed (take what you get)", () => {
    const r = advanceInterview({ currentNode: 0, pushed: true }, { satisfied: false });
    expect(r).toEqual({ action: "advance", nextNode: 1, pushed: false, interviewComplete: false });
  });

  it("never pushes twice on the same node", () => {
    const r = advanceInterview({ currentNode: 3, pushed: true }, { satisfied: false });
    expect(r.action).toBe("advance");
  });

  it("completes when satisfied on the last node (id 6)", () => {
    const r = advanceInterview({ currentNode: 6, pushed: false }, { satisfied: true });
    expect(r).toEqual({ action: "complete", nextNode: 7, pushed: false, interviewComplete: true });
  });

  it("completes when pushed-out on the last node", () => {
    const r = advanceInterview({ currentNode: 6, pushed: true }, { satisfied: false });
    expect(r.action).toBe("complete");
    expect(r.interviewComplete).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && npm test -- lib/robot-tim/state-machine.test.ts`
Expected: FAIL — cannot resolve `@/lib/robot-tim/state-machine`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/robot-tim/state-machine.ts
import { NODES } from "@repo/prompts";

const LAST_NODE = NODES[NODES.length - 1].id; // 6

export type InterviewState = { currentNode: number; pushed: boolean };
export type Classification = { satisfied: boolean };
export type InterviewMove = {
  action: "push" | "advance" | "complete";
  nextNode: number;
  pushed: boolean;
  interviewComplete: boolean;
};

export function advanceInterview(state: InterviewState, c: Classification): InterviewMove {
  // Push exactly once per node: unsatisfied AND we have not pushed yet → stay, mark pushed.
  if (!c.satisfied && !state.pushed) {
    return { action: "push", nextNode: state.currentNode, pushed: true, interviewComplete: false };
  }
  // Otherwise move on (satisfied, or unsatisfied-but-already-pushed → take what you get).
  const nextNode = state.currentNode + 1;
  if (state.currentNode >= LAST_NODE) {
    return { action: "complete", nextNode, pushed: false, interviewComplete: true };
  }
  return { action: "advance", nextNode, pushed: false, interviewComplete: false };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && npm test -- lib/robot-tim/state-machine.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/robot-tim/state-machine.ts apps/web/lib/robot-tim/state-machine.test.ts
git commit -m "feat(robot-tim): interview push-vs-advance state machine"
```

---

### Task 4: Zod schemas + classify Anthropic call

**Files:**
- Create: `apps/web/lib/robot-tim/schemas.ts`
- Create: `apps/web/lib/robot-tim/classify.ts`
- Test: `apps/web/lib/robot-tim/classify.test.ts`

**Interfaces:**
- Consumes: `NODES`, `INTERVIEW_SYSTEM_PROMPT`, `buildClassifyPrompt`, `ROBOT_TIM_MODEL` from `@repo/prompts`.
- Produces: `ClassifyResultSchema`, `SpineSchema`, `MakeoverSchema`, `Node7Schema`; `classifyAnswer(node, answer, alreadyPushed)` → `Promise<ClassifyResult>`.

- [ ] **Step 1: Write the schemas**

```typescript
// apps/web/lib/robot-tim/schemas.ts
import { z } from "zod";

export const ClassifyResultSchema = z.object({
  classification: z.enum(["results", "process", "generic", "real"]),
  reaction: z.string(),
  satisfied: z.boolean(),
});
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

export const SpineSchema = z.object({
  whoFor: z.string(),
  whoNotFor: z.string(),
  problemTheyThink: z.string(),
  problemTheyHave: z.string(),
  valueNotBought: z.string(),
  traps: z.array(z.string()),
  headlines: z.array(z.string()),
  vvvOneLiner: z.string(),
});

export const MakeoverSchema = z.object({
  beforeHero: z.string(),
  afterHero: z.string(),
  punchList: z.array(z.object({ url: z.string(), fixes: z.array(z.string()) })),
});

export const Node7Schema = z.object({
  punchList: z.array(z.string()),
  ladder: z.string(),
});
```

- [ ] **Step 2: Write the failing test** (Anthropic client mocked)

```typescript
// apps/web/lib/robot-tim/classify.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { classifyAnswer } from "@/lib/robot-tim/classify";
import { NODES } from "@repo/prompts";

describe("classifyAnswer", () => {
  beforeEach(() => mockCreate.mockReset());

  it("parses a fenced JSON response into a typed ClassifyResult", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n{"classification":"process","reaction":"Nobody falls in love with a process.","satisfied":false}\n```',
        },
      ],
    });
    const r = await classifyAnswer(NODES[3], "our proprietary framework", false);
    expect(r.classification).toBe("process");
    expect(r.satisfied).toBe(false);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("throws a friendly error on unparseable output", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });
    await expect(classifyAnswer(NODES[0], "hi", false)).rejects.toThrow(/could not read/i);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/web && npm test -- lib/robot-tim/classify.test.ts`
Expected: FAIL — cannot resolve `@/lib/robot-tim/classify`.

- [ ] **Step 4: Write the implementation**

```typescript
// apps/web/lib/robot-tim/classify.ts
import Anthropic from "@anthropic-ai/sdk";
import { INTERVIEW_SYSTEM_PROMPT, ROBOT_TIM_MODEL, buildClassifyPrompt, type RobotTimNode } from "@repo/prompts";
import { ClassifyResultSchema, type ClassifyResult } from "@/lib/robot-tim/schemas";

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function classifyAnswer(
  node: RobotTimNode,
  answer: string,
  alreadyPushed: boolean
): Promise<ClassifyResult> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: ROBOT_TIM_MODEL,
    max_tokens: 1024,
    system: INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildClassifyPrompt(node, answer, alreadyPushed) }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    return ClassifyResultSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Robot-Tim could not read that answer — please try again");
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd apps/web && npm test -- lib/robot-tim/classify.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/robot-tim/schemas.ts apps/web/lib/robot-tim/classify.ts apps/web/lib/robot-tim/classify.test.ts
git commit -m "feat(robot-tim): zod schemas + classify-and-react Anthropic call"
```

---

### Task 5: Crawl — Apify fetch + per-page Opus analysis

Reuse the Detector's `analyzeCopy` for per-page scoring (same task, same voice) and the Apify actor already driven in `packages/utils/research.ts`. Export the internal `runApifyActor` so we do not re-implement the poll loop.

**Files:**
- Modify: `packages/utils/research.ts` (export `runApifyActor`)
- Create: `apps/web/lib/robot-tim/crawl.ts`

**Interfaces:**
- Consumes: `runApifyActor(actorId, input, options)` → `Promise<unknown[]>`; `analyzeCopy(page, hits)`, `findLexiconHits(text)`, `WahWahAnalysis` from the Detector lib.
- Produces: `crawlSite(url)` → `Promise<Crawl>` (`Crawl` from `types.ts`).

- [ ] **Step 1: Export the Apify runner**

In `packages/utils/research.ts`, change the crawler helper declaration from:

```typescript
async function runApifyActor(
```

to:

```typescript
export async function runApifyActor(
```

- [ ] **Step 2: Write the crawler**

```typescript
// apps/web/lib/robot-tim/crawl.ts
import { runApifyActor } from "@repo/utils/research";
import { findLexiconHits } from "@/lib/wah-wah/lexicon";
import { analyzeCopy } from "@/lib/wah-wah/analyze";
import { normalizeUrl } from "@/lib/wah-wah/extract";
import type { Crawl, CrawlPage } from "@/lib/robot-tim/types";

type ApifyPage = { url?: string; title?: string; text?: string };

// Apify fetches up to ~10 pages of clean text; each is scored with the Detector
// engine (lexicon seed + Opus verdict). The homepage's raw text is kept for the
// makeover's before-hero. Per-page failures are skipped, never fatal.
export async function crawlSite(url: string): Promise<Crawl> {
  const start = normalizeUrl(url);
  const items = (await runApifyActor(
    "apify~website-content-crawler",
    {
      startUrls: [{ url: start }],
      maxCrawlPages: 10,
      maxCrawlDepth: 2,
      excludeUrlGlobs: ["**/*.pdf", "**/*.zip", "**/blog/**", "**/careers/**", "**/jobs/**"],
    },
    { timeoutSecs: 120 }
  )) as ApifyPage[];

  const startHost = new URL(start).hostname;
  const pages: CrawlPage[] = [];
  let homepageText = "";

  for (const item of items) {
    const pageUrl = item.url ?? start;
    const body = (item.text ?? "").slice(0, 12000);
    if (!body) continue;
    if (!homepageText && new URL(pageUrl).hostname === startHost) homepageText = body;

    try {
      const hits = findLexiconHits([item.title ?? "", body].join("\n"));
      const analysis = await analyzeCopy(
        { title: item.title ?? "", metaDescription: "", h1: "", bodyText: body },
        hits
      );
      pages.push({ url: pageUrl, score: analysis.score, flags: analysis.flags });
    } catch {
      // skip a page that fails to analyze; the crawl still succeeds
    }
  }

  if (!homepageText && items[0]?.text) homepageText = items[0].text.slice(0, 12000);
  return { pages, homepageText };
}
```

- [ ] **Step 3: Verify the import graph compiles**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "robot-tim/crawl" || echo "crawl.ts typechecks clean"
```
Expected: `crawl.ts typechecks clean`. (If `@repo/utils/research` does not resolve, confirm the export path against `packages/utils/package.json` `exports` and adjust the import specifier to match how `apps/web` already imports from `@repo/utils`.)

- [ ] **Step 4: Commit**

```bash
git add packages/utils/research.ts apps/web/lib/robot-tim/crawl.ts
git commit -m "feat(robot-tim): full-site crawl with per-page Opus scoring"
```

---

### Task 6: Synthesis — Spine, Makeover, Node 7

**Files:**
- Create: `apps/web/lib/robot-tim/synthesize.ts`
- Test: `apps/web/lib/robot-tim/synthesize.test.ts`

**Interfaces:**
- Consumes: prompt builders + system prompts + `ROBOT_TIM_MODEL` from `@repo/prompts`; `SpineSchema`, `MakeoverSchema`, `Node7Schema`; `Answer`, `Crawl`, `Spine`, `Makeover`, `Node7` types.
- Produces: `generateSpine(answers)`, `generateMakeover(spine, crawl)`, `generateNode7(spine, makeover)`.

- [ ] **Step 1: Write the failing test** (client mocked; verifies each call parses + targets the right schema)

```typescript
// apps/web/lib/robot-tim/synthesize.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { generateSpine } from "@/lib/robot-tim/synthesize";

describe("generateSpine", () => {
  beforeEach(() => mockCreate.mockReset());

  it("parses a valid Spine JSON response", async () => {
    const spine = {
      whoFor: "curious operators",
      whoNotFor: "micromanagers",
      problemTheyThink: "need more leads",
      problemTheyHave: "no point of view",
      valueNotBought: "confidence in their own numbers",
      traps: ["a", "b", "c"],
      headlines: ["h1", "h2", "h3"],
      vvvOneLiner: "the one line",
    };
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(spine) }] });
    const r = await generateSpine([{ nodeId: 3, raw: "we made them look good", classification: "real", reaction: "" }]);
    expect(r.whoFor).toBe("curious operators");
    expect(r.traps).toHaveLength(3);
  });

  it("throws on unparseable output", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "nope" }] });
    await expect(generateSpine([])).rejects.toThrow(/synthesis failed/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && npm test -- lib/robot-tim/synthesize.test.ts`
Expected: FAIL — cannot resolve `@/lib/robot-tim/synthesize`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/lib/robot-tim/synthesize.ts
import Anthropic from "@anthropic-ai/sdk";
import {
  ROBOT_TIM_MODEL,
  SPINE_SYSTEM_PROMPT,
  buildSpinePrompt,
  MAKEOVER_SYSTEM_PROMPT,
  buildMakeoverPrompt,
  NODE7_SYSTEM_PROMPT,
  buildNode7Prompt,
} from "@repo/prompts";
import { SpineSchema, MakeoverSchema, Node7Schema } from "@/lib/robot-tim/schemas";
import type { Answer, Crawl, Makeover, Node7, Spine } from "@/lib/robot-tim/types";

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}
async function run(system: string, user: string): Promise<string> {
  const anthropic = getAnthropic();
  const res = await anthropic.messages.create({
    model: ROBOT_TIM_MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}

export async function generateSpine(answers: Answer[]): Promise<Spine> {
  const raw = await run(SPINE_SYSTEM_PROMPT, buildSpinePrompt(answers));
  try {
    return SpineSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Spine synthesis failed");
  }
}

export async function generateMakeover(spine: Spine, crawl: Crawl): Promise<Makeover> {
  const summary = crawl.pages.map((p) => ({ url: p.url, score: p.score }));
  const raw = await run(MAKEOVER_SYSTEM_PROMPT, buildMakeoverPrompt(spine, crawl.homepageText, summary));
  try {
    return MakeoverSchema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Makeover synthesis failed");
  }
}

export async function generateNode7(spine: Spine, makeover: Makeover): Promise<Node7> {
  const raw = await run(NODE7_SYSTEM_PROMPT, buildNode7Prompt(spine, makeover));
  try {
    return Node7Schema.parse(JSON.parse(stripFences(raw)));
  } catch {
    throw new Error("Node 7 synthesis failed");
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && npm test -- lib/robot-tim/synthesize.test.ts`
Expected: PASS (2 tests). Also run the full robot-tim unit suite: `npm test -- lib/robot-tim` — all green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/robot-tim/synthesize.ts apps/web/lib/robot-tim/synthesize.test.ts
git commit -m "feat(robot-tim): Spine + makeover + Node 7 synthesis"
```

---

### Task 7: Customer lead pipeline

Mirror `captureWahWahLead`, but as a WON customer at $395 (39500 cents). Add the three helper functions the Detector's pipeline already has siblings for.

**Files:**
- Modify: `apps/web/lib/loops.ts` (add `onRobotTimPurchased`)
- Modify: `apps/web/lib/beehiiv.ts` (add `addRobotTimSubscriber`)
- Modify: `apps/web/lib/slack.ts` (add `'robot-tim'` to the `alertReportGenerated` product labels)
- Create: `apps/web/lib/robot-tim/lead.ts`

**Interfaces:**
- Consumes: `copperSyncLead`, `COPPER_STAGES` (`.CLOSED_WON` = 5005084) from `@/lib/copper`; `alertReportGenerated` from `@/lib/slack`; `waitUntil` from `@vercel/functions`.
- Produces: `captureRobotTimCustomer({ id, email, firstName?, siteUrl })`; `onRobotTimPurchased(email, sessionId, hostname, firstName?)`; `addRobotTimSubscriber(email, hostname?, firstName?)`.

- [ ] **Step 1: Add the beehiiv helper**

In `apps/web/lib/beehiiv.ts`, directly after `addWahWahSubscriber`, add:

```typescript
export async function addRobotTimSubscriber(
  email: string,
  hostname?: string,
  firstName?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return addSubscriber({
    email,
    first_name: firstName || undefined,
    utm_source: "robot-tim",
    utm_medium: "positioning-engine",
    custom_fields: hostname ? [{ name: "company", value: hostname }] : undefined,
  });
}
```

(If `addWahWahSubscriber`'s `custom_fields` shape differs, copy it verbatim from that function — match the existing call exactly.)

- [ ] **Step 2: Add the Loops event**

In `apps/web/lib/loops.ts`, directly after `onWahWahReportGenerated`, add:

```typescript
export async function onRobotTimPurchased(
  email: string,
  sessionId: string,
  hostname: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
  const reportUrl = `${appUrl}/robot-tim/${sessionId}`;
  if (firstName) {
    await createOrUpdateContact({ email, firstName });
  }
  return sendEvent(email, "robot_tim_purchased", {
    reportUrl,
    hostname,
    firstName: firstName || "",
  });
}
```

(Match the exact helper names used inside `onWahWahReportGenerated` — this repo's Loops module exposes `createOrUpdateContact` and an event sender. Open `onWahWahReportGenerated` and copy its event-send call shape verbatim, changing only the event name to `robot_tim_purchased` and the URL to the `/robot-tim/<id>` path.)

- [ ] **Step 3: Add the Slack product label**

In `apps/web/lib/slack.ts`, inside the `productLabels` map in `alertReportGenerated`, add:

```typescript
    'robot-tim': 'Robot-Tim Positioning Engine',
```

- [ ] **Step 4: Write the capture function**

```typescript
// apps/web/lib/robot-tim/lead.ts
import { waitUntil } from "@vercel/functions";
import { onRobotTimPurchased } from "@/lib/loops";
import { addRobotTimSubscriber } from "@/lib/beehiiv";
import { copperSyncLead, COPPER_STAGES } from "@/lib/copper";
import { alertReportGenerated } from "@/lib/slack";

const ROBOT_TIM_ACV = 39500; // $395 one-time, in cents (Copper convention)

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Fires the full pipeline for a paid Robot-Tim purchase. Unlike the Detector's
// free lead, this is a WON customer at $395. Best-effort / non-blocking.
export async function captureRobotTimCustomer(params: {
  id: string;
  email: string;
  firstName?: string;
  siteUrl: string;
}): Promise<void> {
  const { id, email, firstName, siteUrl } = params;
  const hostname = hostnameOf(siteUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";

  waitUntil(
    addRobotTimSubscriber(email, hostname, firstName || undefined).catch((e) =>
      console.error("[robot-tim] beehiiv subscribe failed:", e)
    )
  );
  waitUntil(
    copperSyncLead({
      email,
      name: firstName || undefined,
      companyName: hostname,
      productName: "Robot-Tim Positioning Engine",
      opportunityValue: ROBOT_TIM_ACV,
      stageId: COPPER_STAGES.CLOSED_WON,
      note: `Bought Robot-Tim ($395) for ${hostname}. Session: ${appUrl}/robot-tim/${id}`,
    }).catch((e) => console.error("[robot-tim] copper sync failed:", e))
  );
  alertReportGenerated(firstName ? `${firstName} (${email})` : email, "robot-tim", hostname);
  waitUntil(
    onRobotTimPurchased(email, id, hostname, firstName || undefined).catch((e) =>
      console.error("[robot-tim] loops event failed:", e)
    )
  );
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "robot-tim/lead|loops.ts|beehiiv.ts|slack.ts" || echo "lead pipeline typechecks clean"
```
Expected: `lead pipeline typechecks clean`. (If `sendEvent`/`createOrUpdateContact` names differ, fix the Loops helper to match the real names in `onWahWahReportGenerated`.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/loops.ts apps/web/lib/beehiiv.ts apps/web/lib/slack.ts apps/web/lib/robot-tim/lead.ts
git commit -m "feat(robot-tim): customer pipeline (Loops/beehiiv/Copper WON \$395/Slack)"
```

---

### Task 8: Checkout — Stripe payment-mode branch + landing + pending resolver

**Files:**
- Modify: `apps/web/app/api/stripe/checkout/route.ts` (robot-tim `mode: 'payment'` branch)
- Create: `apps/web/app/robot-tim/page.tsx` (landing form)
- Create: `apps/web/app/robot-tim/pending/page.tsx` (post-checkout resolver)

**Interfaces:**
- Consumes: `getSessionByStripe` from `@/lib/robot-tim/db`.
- Produces: a checkout session whose `metadata` carries `{ product: 'robot-tim', site_url, first_name }` and `customer_email`, `mode: 'payment'`, `success_url = ${appUrl}/robot-tim/pending?session_id={CHECKOUT_SESSION_ID}`.

- [ ] **Step 1: Add the robot-tim checkout branch**

Robot-Tim needs `mode: 'payment'` (one-time) and extra metadata, so it does not fit the shared subscription `switch`. Two edits in `apps/web/app/api/stripe/checkout/route.ts`:

**(a)** Widen the top-of-`try` destructure to pull `siteUrl` and `firstName` out of the same JSON body. Change:

```typescript
    const { priceType, email, coupon, product = 'call-lab-pro' } = await request.json();
```

to:

```typescript
    const { priceType, email, coupon, product = 'call-lab-pro', siteUrl, firstName } = await request.json();
```

**(b)** Immediately after that line (before the existing `let priceId` / `switch`), add the robot-tim early-return branch:

```typescript
    if (product === "robot-tim") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
      const priceId = process.env.STRIPE_PRICE_ROBOT_TIM;
      if (!priceId) {
        return NextResponse.json({ error: "Robot-Tim price not configured" }, { status: 500 });
      }
      if (!siteUrl) {
        return NextResponse.json({ error: "Missing site URL" }, { status: 400 });
      }
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        success_url: `${appUrl}/robot-tim/pending?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/robot-tim?checkout=cancelled`,
        metadata: {
          product: "robot-tim",
          site_url: siteUrl,
          first_name: firstName || "",
        },
      });
      return NextResponse.json({ url: session.url });
    }
```

- [ ] **Step 2: Create the landing page**

```tsx
// apps/web/app/robot-tim/page.tsx
"use client";

import { useState } from "react";

export default function RobotTimLanding() {
  const [siteUrl, setSiteUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: "robot-tim", siteUrl, firstName, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Something broke");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 bg-black px-6 py-16 text-white">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">Robot-Tim Positioning Engine</p>
      <h1 className="font-[Anton] text-4xl leading-tight sm:text-5xl">
        You know your homepage is going wah wah. Now let a robot version of me fix what it is actually trying to say.
      </h1>
      <p className="text-lg text-zinc-300">
        A $395 async positioning teardown. You answer seven questions, Robot-Tim crawls your whole site, and you walk
        away with a Narrative Spine, a rewritten hero, and a page-by-page punch list.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input required value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="youragency.com"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youragency.com"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg" />
        <button type="submit" disabled={busy}
          className="rounded-lg bg-[#D75A3F] px-6 py-3 text-lg font-semibold text-white disabled:opacity-50">
          {busy ? "Taking you to checkout…" : "Start — $395"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Create the pending resolver**

```tsx
// apps/web/app/robot-tim/pending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RobotTimPending() {
  const params = useSearchParams();
  const router = useRouter();
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    const stripeId = params.get("session_id");
    if (!stripeId) return;
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/robot-tim/resolve?session_id=${encodeURIComponent(stripeId)}`);
      if (res.ok) {
        const { id } = await res.json();
        if (id && !cancelled) {
          router.replace(`/robot-tim/${id}`);
          return;
        }
      }
      if (!cancelled) {
        setWaited((w) => w + 1);
        setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
      <p className="font-[Anton] text-2xl">Payment received. Waking up Robot-Tim…</p>
      {waited > 8 && (
        <p className="text-sm text-zinc-400">Still setting up — this can take a few seconds. Check your email for a link.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Add the resolve endpoint** (maps Stripe session_id → robot_tim_sessions.id once the webhook has created it)

```typescript
// apps/web/app/api/robot-tim/resolve/route.ts
import { getSessionByStripe } from "@/lib/robot-tim/db";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const stripeId = url.searchParams.get("session_id");
  if (!stripeId) return Response.json({ error: "missing session_id" }, { status: 400 });
  const session = await getSessionByStripe(stripeId);
  if (!session) return Response.json({ id: null }, { status: 202 }); // webhook not done yet
  return Response.json({ id: session.id });
}
```

- [ ] **Step 5: Manual verification (deferred to Task 11's end-to-end run)**

The checkout flow is verified live in Task 11 once the webhook (Task 9) exists. For now, confirm the landing page renders: `cd apps/web && npm run dev`, open `http://localhost:3000/robot-tim`, confirm the form shows and (with a real `STRIPE_PRICE_ROBOT_TIM`) redirects to Stripe on submit.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/stripe/checkout/route.ts apps/web/app/robot-tim/page.tsx apps/web/app/robot-tim/pending/page.tsx apps/web/app/api/robot-tim/resolve/route.ts
git commit -m "feat(robot-tim): \$395 one-time checkout + landing + pending resolver"
```

---

### Task 9: Webhook branch — create session, kick crawl, fire pipeline

**Files:**
- Modify: `apps/web/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `createSession` from `@/lib/robot-tim/db`; `captureRobotTimCustomer` from `@/lib/robot-tim/lead`; `waitUntil` from `@vercel/functions`.

- [ ] **Step 1: Add imports** at the top of `apps/web/app/api/webhooks/stripe/route.ts`:

```typescript
import { waitUntil } from '@vercel/functions'
import { createSession } from '@/lib/robot-tim/db'
import { captureRobotTimCustomer } from '@/lib/robot-tim/lead'
```

- [ ] **Step 2: Add the robot-tim branch** at the very start of the `case 'checkout.session.completed': {` block, before the existing subscription logic (`if (session.subscription && session.customer)`):

```typescript
      // Robot-Tim: one-time payment, not a subscription. Create the session row,
      // start the crawl in the background, fire the customer pipeline, and stop.
      if (session.metadata?.product === 'robot-tim') {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'
        const siteUrl = session.metadata.site_url as string
        const firstName = (session.metadata.first_name as string) || null
        const email = session.customer_email || null

        try {
          const id = await createSession({
            email,
            firstName,
            siteUrl,
            stripeSessionId: session.id,
          })

          // Kick the crawl in the background (Apify can take up to 2 min).
          waitUntil(
            fetch(`${appUrl}/api/robot-tim/crawl`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id }),
            }).catch((e) => console.error('[robot-tim] crawl kick failed:', e))
          )

          if (email) {
            await captureRobotTimCustomer({ id, email, firstName: firstName || undefined, siteUrl })
          }
        } catch (e) {
          console.error('[robot-tim] session create failed:', e)
        }
        return NextResponse.json({ received: true })
      }
```

- [ ] **Step 3: Verify it compiles**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "webhooks/stripe" || echo "webhook branch typechecks clean"
```
Expected: `webhook branch typechecks clean`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/webhooks/stripe/route.ts
git commit -m "feat(robot-tim): webhook creates session, kicks crawl, fires customer pipeline"
```

---

### Task 10: API routes — answer, crawl, synthesize + the synthesis guard

**Files:**
- Create: `apps/web/app/api/robot-tim/answer/route.ts`
- Create: `apps/web/app/api/robot-tim/crawl/route.ts`
- Create: `apps/web/app/api/robot-tim/synthesize/route.ts`
- Create: `apps/web/lib/robot-tim/synthesis-guard.ts`

**Interfaces:**
- Consumes: `getSession`, `appendAnswer`, `saveCrawl`, `tryClaimSynthesis`, `saveDeliverable` (db); `classifyAnswer`; `advanceInterview`; `crawlSite`; `generateSpine`/`generateMakeover`/`generateNode7`; `NODES`.
- Produces: `maybeStartSynthesis(id)` (fires the synthesize route iff both interview + crawl are done).

- [ ] **Step 1: Write the synthesis guard**

```typescript
// apps/web/lib/robot-tim/synthesis-guard.ts
import { tryClaimSynthesis } from "@/lib/robot-tim/db";

// Called by BOTH the answer route (last node) and the crawl route. Whichever
// finishes second wins the CAS and fires synthesis exactly once.
export async function maybeStartSynthesis(id: string): Promise<void> {
  const claimed = await tryClaimSynthesis(id);
  if (!claimed) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.timkilroy.com";
  // Fire-and-forget; the synthesize route persists the deliverable.
  fetch(`${appUrl}/api/robot-tim/synthesize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch((e) => console.error("[robot-tim] synthesize kick failed:", e));
}
```

- [ ] **Step 2: Write the answer route**

```typescript
// apps/web/app/api/robot-tim/answer/route.ts
import { getSession, appendAnswer } from "@/lib/robot-tim/db";
import { classifyAnswer } from "@/lib/robot-tim/classify";
import { advanceInterview } from "@/lib/robot-tim/state-machine";
import { maybeStartSynthesis } from "@/lib/robot-tim/synthesis-guard";
import { NODES } from "@repo/prompts";

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  let id: string, answer: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    answer = String(body.answer ?? "").trim();
    if (!id || !answer) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Missing id or answer" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "interviewing" || session.interview_complete) {
    return Response.json({ error: "Interview already complete" }, { status: 409 });
  }

  const node = NODES[session.current_node];
  if (!node) return Response.json({ error: "No such node" }, { status: 409 });

  const classification = await classifyAnswer(node, answer, session.pushed);
  const move = advanceInterview(
    { currentNode: session.current_node, pushed: session.pushed },
    { satisfied: classification.satisfied }
  );

  await appendAnswer(
    id,
    session.answers,
    { nodeId: node.id, raw: answer, classification: classification.classification, reaction: classification.reaction },
    move.nextNode,
    move.pushed,
    move.interviewComplete
  );

  if (move.interviewComplete) {
    await maybeStartSynthesis(id);
  }

  const nextNode = move.interviewComplete ? null : NODES[move.nextNode] ?? null;
  return Response.json({
    reaction: classification.reaction,
    action: move.action, // "push" | "advance" | "complete"
    done: move.interviewComplete,
    nextNode: nextNode ? { id: nextNode.id, ask: nextNode.ask } : null,
  });
}
```

- [ ] **Step 3: Write the crawl route**

```typescript
// apps/web/app/api/robot-tim/crawl/route.ts
import { getSession, saveCrawl } from "@/lib/robot-tim/db";
import { crawlSite } from "@/lib/robot-tim/crawl";
import { maybeStartSynthesis } from "@/lib/robot-tim/synthesis-guard";

export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  let id: string;
  try {
    id = String((await req.json()).id ?? "");
    if (!id) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  try {
    const crawl = await crawlSite(session.site_url);
    await saveCrawl(id, crawl);
    await maybeStartSynthesis(id);
    return Response.json({ ok: true, pages: crawl.pages.length });
  } catch (e) {
    console.error("[robot-tim] crawl failed:", e);
    // Crawl failure should not permanently wedge the run; store an empty crawl so
    // synthesis can still proceed on the interview + homepage text alone.
    await saveCrawl(id, { pages: [], homepageText: "" });
    await maybeStartSynthesis(id);
    return Response.json({ ok: false }, { status: 502 });
  }
}
```

- [ ] **Step 4: Write the synthesize route**

```typescript
// apps/web/app/api/robot-tim/synthesize/route.ts
import { getSession, saveDeliverable } from "@/lib/robot-tim/db";
import { generateSpine, generateMakeover, generateNode7 } from "@/lib/robot-tim/synthesize";

export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  let id: string;
  try {
    id = String((await req.json()).id ?? "");
    if (!id) throw new Error("bad input");
  } catch {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  try {
    const spine = await generateSpine(session.answers);
    const makeover = await generateMakeover(spine, session.crawl ?? { pages: [], homepageText: "" });
    const node7 = await generateNode7(spine, makeover);
    await saveDeliverable(id, { spine, makeover, node7 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[robot-tim] synthesis failed:", e);
    return Response.json({ error: "Synthesis failed" }, { status: 502 });
  }
}
```

- [ ] **Step 5: Verify the routes compile**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "api/robot-tim" || echo "robot-tim routes typecheck clean"
```
Expected: `robot-tim routes typecheck clean`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/robot-tim/answer apps/web/app/api/robot-tim/crawl apps/web/app/api/robot-tim/synthesize apps/web/lib/robot-tim/synthesis-guard.ts
git commit -m "feat(robot-tim): answer/crawl/synthesize routes + idempotent synthesis guard"
```

---

### Task 11: The resumable page + components + end-to-end walk

**Files:**
- Create: `apps/web/components/robot-tim/InterviewCard.tsx`
- Create: `apps/web/components/robot-tim/BuildingState.tsx`
- Create: `apps/web/components/robot-tim/Deliverable.tsx`
- Create: `apps/web/app/robot-tim/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSession` (server); the `/api/robot-tim/answer` endpoint (client).

- [ ] **Step 1: Write the InterviewCard (client)**

```tsx
// apps/web/components/robot-tim/InterviewCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InterviewCard({
  sessionId,
  nodeId,
  ask,
  totalNodes,
}: {
  sessionId: string;
  nodeId: number;
  ask: string;
  totalNodes: number;
}) {
  const [answer, setAnswer] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/robot-tim/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: sessionId, answer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setReaction(json.reaction);
      setAnswer("");
      // A "push" keeps us on the same node; advance/complete reloads the server
      // component to render the next card or the building state.
      if (json.action !== "push") {
        setTimeout(() => router.refresh(), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">
        Question {nodeId + 1} of {totalNodes}
      </p>
      <p className="font-[Anton] text-2xl text-white">{ask}</p>
      {reaction && (
        <div className="rounded-xl border border-[#D75A3F] bg-zinc-900 p-4 text-zinc-100">
          <span className="font-semibold text-[#D75A3F]">Robot-Tim: </span>
          {reaction}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
          placeholder="Say it like you would out loud."
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg text-white" />
        <button type="submit" disabled={busy}
          className="self-start rounded-lg bg-[#D75A3F] px-6 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Robot-Tim is listening…" : reaction ? "Continue" : "Answer"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write the BuildingState (client, polls for completion)**

```tsx
// apps/web/components/robot-tim/BuildingState.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuildingState() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-white">
      <p className="font-[Anton] text-3xl">Building your Spine…</p>
      <p className="text-zinc-400">
        Robot-Tim is reading your whole site and assembling your positioning. This takes a minute or two — this page
        updates itself.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Write the Deliverable (server-safe, presentational)**

```tsx
// apps/web/components/robot-tim/Deliverable.tsx
import type { Makeover, Node7, Spine } from "@/lib/robot-tim/types";

export default function Deliverable({
  spine,
  makeover,
  node7,
}: {
  spine: Spine;
  makeover: Makeover;
  node7: Node7;
}) {
  return (
    <div className="flex w-full flex-col gap-10 text-white">
      <section className="flex flex-col gap-3">
        <h2 className="font-[Anton] text-3xl">Your Narrative Spine</h2>
        <Field label="Who this is for" value={spine.whoFor} />
        <Field label="Who this is NOT for" value={spine.whoNotFor} />
        <Field label="The problem they think they have" value={spine.problemTheyThink} />
        <Field label="The problem they actually have" value={spine.problemTheyHave} />
        <Field label="The value they did not buy" value={spine.valueNotBought} />
        <List label="Three traps" items={spine.traps} />
        <List label="Three 'am I in the right place' headlines" items={spine.headlines} />
        <Field label="Your VVV one-liner" value={spine.vvvOneLiner} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-[Anton] text-3xl">The Makeover</h2>
        <Field label="Your hero today" value={makeover.beforeHero} />
        <Field label="Your hero, rewritten" value={makeover.afterHero} />
        {makeover.punchList.map((p, i) => (
          <List key={i} label={p.url} items={p.fixes} />
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-[#D75A3F] bg-zinc-900 p-6">
        <h2 className="font-[Anton] text-2xl">Node 7 — Rip Me Apart</h2>
        <List label="Where this still does not hold" items={node7.punchList} />
        <p className="mt-2 text-zinc-200">{node7.ladder}</p>
        <a href="https://timkilroy.com/demand-os"
          className="mt-2 inline-block self-start rounded-lg bg-[#D75A3F] px-5 py-2.5 font-semibold text-white">
          When you are ready for the human version →
        </a>
      </section>

      <a href="./export" className="text-sm text-[#00D4FF] underline">Download as PDF</a>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">{label}</p>
      <p className="mt-1 text-lg text-zinc-100">{value}</p>
    </div>
  );
}
function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">{label}</p>
      <ul className="mt-1 list-disc pl-6 text-zinc-100">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Write the resumable page (server component, routes by status)**

```tsx
// apps/web/app/robot-tim/[id]/page.tsx
import { notFound } from "next/navigation";
import { NODES } from "@repo/prompts";
import { getSession } from "@/lib/robot-tim/db";
import InterviewCard from "@/components/robot-tim/InterviewCard";
import BuildingState from "@/components/robot-tim/BuildingState";
import Deliverable from "@/components/robot-tim/Deliverable";

type Props = { params: Promise<{ id: string }> };

export default async function RobotTimSessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 bg-black px-6 py-16">
      {session.status === "complete" && session.spine && session.makeover && session.node7 ? (
        <Deliverable spine={session.spine} makeover={session.makeover} node7={session.node7} />
      ) : session.status === "synthesizing" || (session.interview_complete && session.status !== "complete") ? (
        <BuildingState />
      ) : (
        <InterviewCard
          sessionId={session.id}
          nodeId={NODES[session.current_node].id}
          ask={NODES[session.current_node].ask}
          totalNodes={NODES.length}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 5: End-to-end manual walk** (requires all env vars + a Stripe test price in `STRIPE_PRICE_ROBOT_TIM` + Stripe CLI forwarding to `/api/webhooks/stripe`)

```bash
cd apps/web && npm run dev
# In another terminal: stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Walk it: `/robot-tim` → fill site + name + email → Stripe test card `4242 4242 4242 4242` → land on `/robot-tim/pending` → auto-redirect to `/robot-tim/<id>` → answer all 7 questions (verify a vague answer draws a push, a real answer advances) → "Building your Spine…" appears → within ~2 min the deliverable renders. Confirm in Supabase: `robot_tim_sessions` row went `interviewing → synthesizing → complete`, `crawl`/`spine`/`makeover`/`node7` all populated. Confirm the customer landed in Copper (WON, $395), Loops (`robot_tim_purchased`), and a Slack ping fired.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/robot-tim apps/web/app/robot-tim/[id]/page.tsx
git commit -m "feat(robot-tim): resumable interview/building/deliverable page + components"
```

---

### Task 12: PDF export + admin tab

**Files:**
- Create: `packages/pdf/robot-tim-html-report.ts`
- Modify: `packages/pdf/index.ts` (export `generateRobotTimHTML`)
- Create: `apps/web/app/robot-tim/[id]/export/route.ts`
- Modify: `apps/web/app/admin/reports/page.tsx` (add `robotTim` product)
- Modify: `apps/web/app/api/admin/client-reports/route.ts` (query `robot_tim_sessions`)

**Interfaces:**
- Consumes: `htmlToPdf(html, opts)` from `@repo/pdf`; `getSession`; `Spine`/`Makeover`/`Node7`.
- Produces: `generateRobotTimHTML(data)` → `string`.

- [ ] **Step 1: Write the HTML report generator**

```typescript
// packages/pdf/robot-tim-html-report.ts
export interface RobotTimReportData {
  hostname: string;
  spine: {
    whoFor: string; whoNotFor: string; problemTheyThink: string; problemTheyHave: string;
    valueNotBought: string; traps: string[]; headlines: string[]; vvvOneLiner: string;
  };
  makeover: { beforeHero: string; afterHero: string; punchList: { url: string; fixes: string[] }[] };
  node7: { punchList: string[]; ladder: string };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

export function generateRobotTimHTML(data: RobotTimReportData): string {
  const { spine, makeover, node7 } = data;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}
    h1{font-size:28px} h2{font-size:20px;margin-top:32px;border-bottom:2px solid #D75A3F;padding-bottom:4px}
    .label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;margin-top:16px}
    .val{font-size:15px;margin-top:2px}
  </style></head><body>
    <h1>Robot-Tim Positioning Spine — ${esc(data.hostname)}</h1>
    <h2>Your Narrative Spine</h2>
    <p class="label">Who this is for</p><p class="val">${esc(spine.whoFor)}</p>
    <p class="label">Who this is NOT for</p><p class="val">${esc(spine.whoNotFor)}</p>
    <p class="label">The problem they think they have</p><p class="val">${esc(spine.problemTheyThink)}</p>
    <p class="label">The problem they actually have</p><p class="val">${esc(spine.problemTheyHave)}</p>
    <p class="label">The value they did not buy</p><p class="val">${esc(spine.valueNotBought)}</p>
    <p class="label">Three traps</p>${ul(spine.traps)}
    <p class="label">Three headlines</p>${ul(spine.headlines)}
    <p class="label">Your VVV one-liner</p><p class="val">${esc(spine.vvvOneLiner)}</p>
    <h2>The Makeover</h2>
    <p class="label">Your hero today</p><p class="val">${esc(makeover.beforeHero)}</p>
    <p class="label">Your hero, rewritten</p><p class="val">${esc(makeover.afterHero)}</p>
    ${makeover.punchList.map((p) => `<p class="label">${esc(p.url)}</p>${ul(p.fixes)}`).join("")}
    <h2>Node 7 — Rip Me Apart</h2>
    ${ul(node7.punchList)}
    <p class="val">${esc(node7.ladder)}</p>
  </body></html>`;
}
```

- [ ] **Step 2: Export it** — in `packages/pdf/index.ts`, add:

```typescript
export { generateRobotTimHTML } from './robot-tim-html-report';
export type { RobotTimReportData } from './robot-tim-html-report';
```

- [ ] **Step 3: Write the export route**

```typescript
// apps/web/app/robot-tim/[id]/export/route.ts
import { getSession } from "@/lib/robot-tim/db";
import { generateRobotTimHTML, htmlToPdf } from "@repo/pdf";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.status !== "complete" || !session.spine || !session.makeover || !session.node7) {
    return new Response("Not ready", { status: 404 });
  }
  const hostname = (() => {
    try {
      return new URL(session.site_url).hostname;
    } catch {
      return session.site_url;
    }
  })();
  const html = generateRobotTimHTML({
    hostname,
    spine: session.spine,
    makeover: session.makeover,
    node7: session.node7,
  });
  const pdf = await htmlToPdf(html, {});
  return new Response(pdf as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="robot-tim-${hostname}.pdf"`,
    },
  });
}
```

(Confirm the `htmlToPdf` options arg — check its signature in `packages/pdf/html-to-pdf.ts`. If it requires no second arg, drop `{}`.)

- [ ] **Step 4: Add the admin product** — in `apps/web/app/admin/reports/page.tsx`:
  1. Add `robotTim` to the `ProductFilter` union (line ~148).
  2. Add `robotTim: 'Robot-Tim Positioning Engine'` to `PRODUCT_LABELS` (near line ~159).
  3. Add `robotTim: '#D75A3F'` to `PRODUCT_COLORS` (near line ~171).
  4. Add `{ key: 'robotTim', label: 'Robot-Tim' }` to the `productTabs` array (near line ~903).
  5. Follow the `wahWah` reference rows to add a `robotTim` count field, a `showRobotTim` flag, and a report list that maps `data.reports.robotTim` with a `View` link to `/robot-tim/${r.id}`. Mirror every place `wahWah`/`wah_wah` appears — the Robot-Tim row shows email / hostname(from `site_url`) / status / overall crawl score / date.

- [ ] **Step 5: Add the admin query** — in `apps/web/app/api/admin/client-reports/route.ts`, add a `robot_tim_sessions` select mirroring the `wah_wah_reports` query:

```typescript
    const { data: robotTim } = await supabase
      .from('robot_tim_sessions')
      .select('id, site_url, email, status, crawl, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
```

and include `robotTim` in the response payload's `reports` object. Derive the admin "overall crawl score" client-side from `crawl.pages` (mean of `page.score`, or `null` when `crawl` is null).

- [ ] **Step 6: Verify PDF + admin**

```bash
cd apps/web && npm run dev
# Using a COMPLETED session id from Task 11:
curl -s -o /tmp/rt.pdf -w "%{http_code}\n" "http://localhost:3000/robot-tim/<ID>/export" && open /tmp/rt.pdf
```
Expected: `200` and a branded PDF with the Spine + makeover + Node 7. Then open `/admin/reports`, select the **Robot-Tim** tab, confirm the completed session appears with a working **View** link.

- [ ] **Step 7: Commit**

```bash
git add packages/pdf/robot-tim-html-report.ts packages/pdf/index.ts apps/web/app/robot-tim/[id]/export/route.ts apps/web/app/admin/reports/page.tsx apps/web/app/api/admin/client-reports/route.ts
git commit -m "feat(robot-tim): PDF export + admin reports tab"
```

---

## Out of scope for this plan (fast-follows)

1. Voice input ("talk to Robot-Tim").
2. Re-run / refresh pricing for past buyers.
3. Interactive back-and-forth in Node 7 (v1 delivers a generated punch list).
4. A launch AIC issue + LinkedIn posts (Tim's voice; AI drafts structure only).

## Self-Review Notes

- **Spec coverage:** node-by-node interview with live reactions (Tasks 2–4, 10, 11) ✓; pay-$395-first via reused checkout+webhook (Tasks 8–9) ✓; full-site crawl reusing Apify (Task 5) ✓; Narrative Spine + before/after makeover + page punch list + Node 7 (Task 6, 11) ✓; no-forced-login resume by session id + emailed link via Loops (Tasks 8, 7) ✓; PDF export (Task 12) ✓; customer pipeline distinct from the free lead — Copper WON $395 (Task 7) ✓; crawl overlaps interview, both-done→synthesis idempotent guard (Tasks 9, 10) ✓; admin tab (Task 12) ✓; Apify-crawls-Opus-analyzes, one model (Global Constraints, Tasks 5–6) ✓.
- **Type consistency:** `RobotTimSession`, `Answer`, `Crawl`, `Spine`, `Makeover`, `Node7` defined once in `types.ts` (Task 1) and consumed unchanged in db/crawl/synthesize/routes/components; `ClassifyResult` from `schemas.ts` (Task 4) used by `classifyAnswer` and the answer route; `advanceInterview` return shape (Task 3) consumed verbatim by the answer route (Task 10); `generateSpine/Makeover/Node7` signatures (Task 6) match the synthesize route (Task 10).
- **Status lifecycle:** `interviewing → synthesizing → complete` (+ `failed`), with `interview_complete` bool + `crawl IS NOT NULL` as the two independent completion signals the CAS in `tryClaimSynthesis` gates on — refined from the spec's overloaded single-status model to allow interview and crawl to run concurrently. Documented in Task 1.
- **Voice:** all Robot-Tim strings obey "you are"/"they are"; user-facing copy marked Tim-rewrites-before-launch.
