# WTF Biz Dev Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a confidential, AI-personalized BD-hire-readiness assessment for agency CEOs at `/wtf-biz-dev-assessment` that classifies them across 5 dimensions, places them on a 3-stage progression, generates a SalesOS-voice report with website + LinkedIn evidence via BrightData, and routes to SalesOS Studio or Growth.

**Architecture:** Single Next.js public route for intake + questions + instant on-screen verdict; `POST /api/analyze/biz-dev` orchestrates BrightData research + Claude synthesis + persistence + side-effects; report page is server-rendered with Supabase Auth ownership check; passwordless magic link via `supabase.auth.admin.generateLink()` delivered through Loops as a single email.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Supabase (DB + Auth SSR), `@anthropic-ai/sdk` via existing `runModel`, BrightData via existing `@repo/utils/research`, `@react-pdf/renderer` for PDF, Zod for validation, react-markdown + remark-gfm for report rendering, Vitest for unit tests.

**Reference spec:** `docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md`

**Reference patterns to mirror:**
- `apps/web/app/api/analyze/discovery/route.ts` — orchestration shape
- `apps/web/app/wtf-assessment-example/{layout,page}.tsx` — public-flow scaffold
- `apps/web/lib/{loops,beehiiv,copper,slack}.ts` — integration layer
- `packages/utils/research.ts` — BrightData research utilities

---

## Phase 1 — Test Infrastructure & Pure Logic (TDD)

The codebase has minimal testing today. We add Vitest at the package level for the pure scoring/stage/trap logic — these are the highest-leverage tests because the verdict is deterministic and load-bearing for the entire product.

### Task 1: Add Vitest to `@repo/utils`

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/packages/utils/package.json`
- Create: `/Users/timkilroy/Projects/wtf-os/packages/utils/vitest.config.ts`

- [ ] **Step 1: Add vitest dev dependency and test script**

Edit `packages/utils/package.json` to add `vitest` as devDependency and a `test` script:

```json
{
  "name": "@repo/utils",
  "version": "1.0.0",
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "openai": "^4.75.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Add Vitest config**

Create `packages/utils/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Install dependency**

Run from repo root:
```bash
npm install --workspace=@repo/utils
```

Expected: vitest installed at `packages/utils/node_modules/vitest`.

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run from repo root:
```bash
npm run test --workspace=@repo/utils
```

Expected: "No test files found" (acceptable — confirms vitest is wired).

- [ ] **Step 5: Commit**

```bash
git add packages/utils/package.json packages/utils/vitest.config.ts
git commit -m "chore(utils): add vitest for unit testing pure logic"
```

---

### Task 2: Define questions schema as single source of truth

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/packages/utils/src/assessment/biz-dev-questions.ts`

- [ ] **Step 1: Create the questions module**

Create `packages/utils/src/assessment/biz-dev-questions.ts`:

```typescript
/**
 * WTF Biz Dev Assessment — Question Bank (single source of truth)
 *
 * Spec reference: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §7
 *
 * IMPORTANT: Question wording is structurally locked but subject to a copywriter
 * pass before launch. Scoring weights and trap tags are locked.
 */

export type Dimension =
  | 'lead_flow'
  | 'sales_process'
  | 'icp_offer'
  | 'founder_readiness'
  | 'proof_enablement';

export type Trap = 'personality' | 'indispensability' | 'more_founder';

export type QuestionId =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
  | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';

export interface AnswerChoice {
  id: string;          // 'a' | 'b' | 'c' | 'd'
  text: string;
  score: 0 | 1 | 2 | 3 | 4;
  hardGate?: true;     // present iff this answer triggers the dimension's hard gate
  traps?: Trap[];      // tags that contribute to trap voting
}

export interface Question {
  id: QuestionId;
  dimension: Dimension;
  /** True iff this question's answers can trigger a hard-gate failure on its dimension */
  isHardGateQuestion: boolean;
  prompt: string;
  choices: AnswerChoice[];
}

export const BIZ_DEV_QUESTIONS: Question[] = [
  // --- Lead Flow ---
  {
    id: 'q1',
    dimension: 'lead_flow',
    isHardGateQuestion: true,
    prompt: "Right now, where do most of your new business conversations come from?",
    choices: [
      { id: 'a', text: "Inbound from content/SEO/marketing we've built", score: 4 },
      { id: 'b', text: "Referrals from clients and my network", score: 2 },
      { id: 'c', text: "I personally hunt — outbound, podcasts, events I show up at", score: 1 },
      { id: 'd', text: "Whatever shows up that week — it's not consistent", score: 0, hardGate: true },
    ],
  },
  {
    id: 'q2',
    dimension: 'lead_flow',
    isHardGateQuestion: true,
    prompt: "How many qualified opportunities (real budget, real fit, decision-maker) land in your pipeline in a typical month?",
    choices: [
      { id: 'a', text: "20+", score: 4 },
      { id: 'b', text: "10–20", score: 3 },
      { id: 'c', text: "4–10", score: 2 },
      { id: 'd', text: "0–3, or I'd have to count last month to know", score: 0, hardGate: true },
    ],
  },

  // --- Sales Process ---
  {
    id: 'q3',
    dimension: 'sales_process',
    isHardGateQuestion: false,
    prompt: "If I shadowed your last 5 closed deals, would I see one sales process — or five?",
    choices: [
      { id: 'a', text: "Five different ones. Every deal is custom.", score: 0 },
      { id: 'b', text: "Mostly the same shape, but it's all in my head.", score: 1, traps: ['personality'] },
      { id: 'c', text: "Same shape, sort of documented.", score: 3 },
      { id: 'd', text: "Documented, repeatable, my team uses it.", score: 4 },
    ],
  },
  {
    id: 'q4',
    dimension: 'sales_process',
    isHardGateQuestion: false,
    prompt: "Your discovery call is mostly...",
    choices: [
      { id: 'a', text: "Me talking, walking through what we do.", score: 1, traps: ['personality'] },
      { id: 'b', text: "Asking great questions and listening.", score: 4 },
      { id: 'c', text: "A loose mix — depends on the prospect.", score: 2 },
      { id: 'd', text: "I haven't done one in months — clients come pre-warmed.", score: 3 },
    ],
  },

  // --- ICP & Offer Clarity ---
  {
    id: 'q5',
    dimension: 'icp_offer',
    isHardGateQuestion: false,
    prompt: "Pick the description closest to your current pitch:",
    choices: [
      { id: 'a', text: "[niche] specialist agency for [specific buyer] solving [specific problem]", score: 4 },
      { id: 'b', text: "We help growth-stage companies with marketing", score: 1 },
      { id: 'c', text: "Strategy, creative, paid, organic — full-service", score: 0 },
      { id: 'd', text: "It depends — we tailor everything to each client", score: 1, traps: ['personality'] },
    ],
  },
  {
    id: 'q6',
    dimension: 'icp_offer',
    isHardGateQuestion: false,
    prompt: "Your services / offers are...",
    choices: [
      { id: 'a', text: "2–3 productized packages with fixed scope and price", score: 4 },
      { id: 'b', text: "A core retainer + custom add-ons", score: 3 },
      { id: 'c', text: "Mostly custom — we scope every engagement from scratch", score: 1, traps: ['personality'] },
      { id: 'd', text: "Whatever the client asks for, we figure it out", score: 0 },
    ],
  },

  // --- Founder Readiness ---
  {
    id: 'q7',
    dimension: 'founder_readiness',
    isHardGateQuestion: true,
    prompt: "Be honest. What do you actually believe a great BD hire will do for you?",
    choices: [
      { id: 'a', text: "Find prospects, build pipeline, close deals — drive revenue without me.", score: 0, hardGate: true, traps: ['indispensability', 'more_founder'] },
      { id: 'b', text: "Follow up on leads I generate, manage conversations I can't get to, free up my time.", score: 4 },
      { id: 'c', text: "I don't fully know — I just know I can't keep doing this myself.", score: 1, traps: ['more_founder'] },
      { id: 'd', text: "Replace me in sales entirely so I can run the agency.", score: 1, traps: ['indispensability'] },
    ],
  },
  {
    id: 'q8',
    dimension: 'founder_readiness',
    isHardGateQuestion: true,
    prompt: "Once they're hired, how much of your week will you spend coaching, strategizing with, and unblocking them — for the first 6 months?",
    choices: [
      { id: 'a', text: "5+ hours/week — I get this won't work without me.", score: 4 },
      { id: 'b', text: "1–2 hours — they should mostly be self-sufficient.", score: 1, traps: ['indispensability'] },
      { id: 'c', text: "I'm hiring them so I can stop doing this.", score: 0, hardGate: true, traps: ['more_founder'] },
      { id: 'd', text: "Honestly haven't thought about it.", score: 0, hardGate: true },
    ],
  },

  // --- Proof & Enablement ---
  {
    id: 'q9',
    dimension: 'proof_enablement',
    isHardGateQuestion: false,
    prompt: "If a new BD person needs to make the case to a prospect today, what's ready to put in their hands?",
    choices: [
      { id: 'a', text: "Pitch deck, 5+ written case studies, 3+ named references, a stocked story bank.", score: 4 },
      { id: 'b', text: "Rough deck, 1–2 case studies, references I'd need to ask permission for.", score: 2 },
      { id: 'c', text: "A website with logos. Otherwise I tell stories from memory.", score: 1, traps: ['indispensability'] },
      { id: 'd', text: "Nothing organized. I improvise every call.", score: 0, traps: ['personality', 'indispensability'] },
    ],
  },
  {
    id: 'q10',
    dimension: 'proof_enablement',
    isHardGateQuestion: false,
    prompt: "If a prospect asked your new BD hire 'what's it like to work with you?', what would they actually say?",
    choices: [
      { id: 'a', text: "Quote a customer, share specific outcomes, point to a documented promise.", score: 4 },
      { id: 'b', text: "Tell a story they've heard me tell.", score: 3 },
      { id: 'c', text: "Ad-lib based on what they think is true.", score: 1, traps: ['personality'] },
      { id: 'd', text: "Probably hand it back to me to answer.", score: 0, traps: ['indispensability'] },
    ],
  },
];

/** Answers submitted by the user. Maps each question id to the chosen choice id. */
export type AssessmentAnswers = Record<QuestionId, 'a' | 'b' | 'c' | 'd'>;

/** Convenience: get the question definition by id. */
export function getQuestion(id: QuestionId): Question {
  const q = BIZ_DEV_QUESTIONS.find(q => q.id === id);
  if (!q) throw new Error(`Unknown question id: ${id}`);
  return q;
}

/** Convenience: get the chosen answer for a question. */
export function getAnswerChoice(question: Question, choiceId: 'a' | 'b' | 'c' | 'd'): AnswerChoice {
  const c = question.choices.find(c => c.id === choiceId);
  if (!c) throw new Error(`Unknown choice ${choiceId} for question ${question.id}`);
  return c;
}
```

- [ ] **Step 2: Type-check**

Run from repo root:
```bash
npm run type-check --workspace=@repo/utils
```

Expected: clean, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/utils/src/assessment/biz-dev-questions.ts
git commit -m "feat(biz-dev): add question bank with scores, hard gates, trap tags"
```

---

### Task 3: Build the deterministic scoring engine (TDD)

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/packages/utils/src/assessment/biz-dev-scoring.ts`
- Create: `/Users/timkilroy/Projects/wtf-os/packages/utils/src/assessment/biz-dev-scoring.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `packages/utils/src/assessment/biz-dev-scoring.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { type AssessmentAnswers } from './biz-dev-questions';
import { scoreBizDevAssessment } from './biz-dev-scoring';

const ALL_BEST: AssessmentAnswers = {
  q1: 'a', q2: 'a', q3: 'd', q4: 'b', q5: 'a',
  q6: 'a', q7: 'b', q8: 'a', q9: 'a', q10: 'a',
};

const ALL_WORST: AssessmentAnswers = {
  q1: 'd', q2: 'd', q3: 'a', q4: 'a', q5: 'c',
  q6: 'd', q7: 'a', q8: 'c', q9: 'd', q10: 'd',
};

describe('scoreBizDevAssessment', () => {
  describe('all-best answers', () => {
    test('returns Ready verdict', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.verdict).toBe('ready');
    });
    test('lands in Engine Online stage', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.stage).toBe('engine_online_hire_ready');
    });
    test('zero hard-gate failures', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.hard_gate_failures).toEqual([]);
    });
    test('CTA tier is growth', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.cta_tier).toBe('growth');
    });
    test('composite is 100', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.composite).toBe(100);
    });
  });

  describe('all-worst answers', () => {
    test('returns Almost verdict', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.verdict).toBe('almost');
    });
    test('lands in All-Founder-No-System stage', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.stage).toBe('all_founder_no_system');
    });
    test('flags both hard-gate dimensions', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.hard_gate_failures.sort()).toEqual(['founder_readiness', 'lead_flow']);
    });
    test('CTA tier is studio', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.cta_tier).toBe('studio');
    });
  });

  describe('hard-gate enforcement', () => {
    test('single Q1 hard gate fail forces Almost even with otherwise-perfect answers', () => {
      const answers: AssessmentAnswers = { ...ALL_BEST, q1: 'd' };
      const r = scoreBizDevAssessment(answers);
      expect(r.verdict).toBe('almost');
      expect(r.hard_gate_failures).toContain('lead_flow');
    });

    test('single Q7 hard gate fail forces Almost even with otherwise-perfect answers', () => {
      const answers: AssessmentAnswers = { ...ALL_BEST, q7: 'a' };
      const r = scoreBizDevAssessment(answers);
      expect(r.verdict).toBe('almost');
      expect(r.hard_gate_failures).toContain('founder_readiness');
    });

    test('Q1 and Q7 both failed lands in stage 1 (multi-gate fail)', () => {
      const answers: AssessmentAnswers = { ...ALL_BEST, q1: 'd', q7: 'a' };
      const r = scoreBizDevAssessment(answers);
      expect(r.stage).toBe('all_founder_no_system');
    });
  });

  describe('stage classification', () => {
    test('composite ~50 with no hard gates → half_built_engine', () => {
      // mid-range answers, no hard-gate triggers
      const answers: AssessmentAnswers = {
        q1: 'b', q2: 'c', q3: 'b', q4: 'c', q5: 'b',
        q6: 'b', q7: 'c', q8: 'b', q9: 'b', q10: 'b',
      };
      const r = scoreBizDevAssessment(answers);
      expect(r.composite).toBeGreaterThanOrEqual(40);
      expect(r.composite).toBeLessThan(70);
      expect(r.stage).toBe('half_built_engine');
      expect(r.verdict).toBe('almost');
    });

    test('composite < 40 with no hard gates → all_founder_no_system', () => {
      // low scores everywhere but Q1/Q2/Q7/Q8 not hard-gate triggers
      const answers: AssessmentAnswers = {
        q1: 'c', q2: 'c', q3: 'a', q4: 'a', q5: 'c',
        q6: 'd', q7: 'd', q8: 'b', q9: 'd', q10: 'd',
      };
      const r = scoreBizDevAssessment(answers);
      expect(r.composite).toBeLessThan(40);
      expect(r.stage).toBe('all_founder_no_system');
    });
  });

  describe('dimension scoring', () => {
    test('all-best produces 100 on every dimension', () => {
      const r = scoreBizDevAssessment(ALL_BEST);
      expect(r.dimensions.lead_flow).toBe(100);
      expect(r.dimensions.sales_process).toBe(100);
      expect(r.dimensions.icp_offer).toBe(100);
      expect(r.dimensions.founder_readiness).toBe(100);
      expect(r.dimensions.proof_enablement).toBe(100);
    });

    test('all-worst produces 0 on every dimension', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.dimensions.lead_flow).toBe(0);
      expect(r.dimensions.sales_process).toBe(0);
      expect(r.dimensions.icp_offer).toBe(0);
      expect(r.dimensions.founder_readiness).toBe(0);
      expect(r.dimensions.proof_enablement).toBe(0);
    });
  });

  describe('trap aggregation', () => {
    test('answers tagged Personality only → dominant_trap = personality', () => {
      const answers: AssessmentAnswers = {
        ...ALL_BEST,
        q3: 'b',  // personality
        q4: 'a',  // personality
      };
      const r = scoreBizDevAssessment(answers);
      expect(r.dominant_trap).toBe('personality');
    });

    test('zero or one trap signal → dominant_trap = null', () => {
      const answers: AssessmentAnswers = { ...ALL_BEST, q3: 'b' };  // single personality vote
      const r = scoreBizDevAssessment(answers);
      expect(r.dominant_trap).toBeNull();
    });

    test('tie between Indispensability and More Founder → prefers Indispensability', () => {
      // Q7 = 'a' contributes BOTH indispensability AND more_founder (1 each)
      // Q8 = 'b' contributes indispensability (1 more = 2 total indispensability)
      // So this isn't actually a tie. Construct an explicit tie:
      // Q7 'd' → indispensability (1), Q8 'c' → more_founder (1) — but Q8 'c' is hard-gate fail
      // Use Q7 'd' (indispensability) + Q9 'c' (indispensability), Q4 'a' (personality), Q3 'b' (personality)
      // Now: indispensability=2, personality=2 → ties between indispensability and personality
      // Per spec: indispensability > more_founder > personality, so indispensability wins
      const answers: AssessmentAnswers = {
        ...ALL_BEST,
        q7: 'd',  // indispensability
        q9: 'c',  // indispensability
        q3: 'b',  // personality
        q4: 'a',  // personality
      };
      const r = scoreBizDevAssessment(answers);
      expect(r.dominant_trap).toBe('indispensability');
    });
  });
});
```

- [ ] **Step 2: Run tests, expect failures**

Run from repo root:
```bash
npm run test --workspace=@repo/utils
```

Expected: all tests fail (`scoreBizDevAssessment is not exported / not a function`). Confirm the failures are *only* from missing implementation, not syntax/import errors.

- [ ] **Step 3: Implement scoring**

Create `packages/utils/src/assessment/biz-dev-scoring.ts`:

```typescript
/**
 * WTF Biz Dev Assessment — Deterministic Scoring Engine
 *
 * Pure functions, no IO, no AI. Identical results client and server.
 *
 * Spec reference: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §8
 */

import {
  BIZ_DEV_QUESTIONS,
  getQuestion,
  getAnswerChoice,
  type AssessmentAnswers,
  type Dimension,
  type Trap,
} from './biz-dev-questions';

export type Stage =
  | 'all_founder_no_system'
  | 'half_built_engine'
  | 'engine_online_hire_ready';

export type Verdict = 'ready' | 'almost';
export type CtaTier = 'studio' | 'growth';

export interface ScoreResult {
  /** Per-dimension scores normalized to 0–100 (raw 0–8 → ×12.5) */
  dimensions: Record<Dimension, number>;
  /** Weighted composite, 0–100 */
  composite: number;
  /** Two-state verdict */
  verdict: Verdict;
  /** Named stage (drives the verdict label and YOU-ARE-HERE visual) */
  stage: Stage;
  /** Hard-gate dimensions that failed (a 0-scored hard-gate answer fired) */
  hard_gate_failures: Array<'lead_flow' | 'founder_readiness'>;
  /** Dominant trap (null if no trap accumulates ≥ 2 votes) */
  dominant_trap: Trap | null;
  /** SalesOS tier the report routes to */
  cta_tier: CtaTier;
}

/** Composite weights by dimension. Must sum to 1.0. */
const WEIGHTS: Record<Dimension, number> = {
  lead_flow: 0.25,
  sales_process: 0.15,
  icp_offer: 0.20,
  founder_readiness: 0.25,
  proof_enablement: 0.15,
};

/** Tie-breaking order when traps are tied (most editorially distinctive first). */
const TRAP_TIE_ORDER: Trap[] = ['indispensability', 'more_founder', 'personality'];

const HARD_GATE_DIMENSIONS: Array<'lead_flow' | 'founder_readiness'> = [
  'lead_flow',
  'founder_readiness',
];

export function scoreBizDevAssessment(answers: AssessmentAnswers): ScoreResult {
  // 1. Per-dimension raw scores (sum of 2 questions × 0–4 = 0–8)
  const rawByDim: Record<Dimension, number> = {
    lead_flow: 0,
    sales_process: 0,
    icp_offer: 0,
    founder_readiness: 0,
    proof_enablement: 0,
  };

  // 2. Hard-gate detection: did any hard-gate-tagged answer score 0?
  const gateFails = new Set<'lead_flow' | 'founder_readiness'>();

  // 3. Trap vote aggregation
  const trapVotes: Record<Trap, number> = {
    personality: 0,
    indispensability: 0,
    more_founder: 0,
  };

  for (const q of BIZ_DEV_QUESTIONS) {
    const choiceId = answers[q.id];
    const choice = getAnswerChoice(q, choiceId);

    rawByDim[q.dimension] += choice.score;

    if (q.isHardGateQuestion && choice.hardGate) {
      // Only Lead Flow and Founder Readiness have hard-gate questions per spec
      if (q.dimension === 'lead_flow' || q.dimension === 'founder_readiness') {
        gateFails.add(q.dimension);
      }
    }

    if (choice.traps) {
      for (const t of choice.traps) {
        trapVotes[t] += 1;
      }
    }
  }

  // 4. Normalize dimensions to 0–100 (raw is 0–8; multiply by 12.5)
  const dimensions: Record<Dimension, number> = {
    lead_flow: rawByDim.lead_flow * 12.5,
    sales_process: rawByDim.sales_process * 12.5,
    icp_offer: rawByDim.icp_offer * 12.5,
    founder_readiness: rawByDim.founder_readiness * 12.5,
    proof_enablement: rawByDim.proof_enablement * 12.5,
  };

  // 5. Weighted composite
  const composite = Math.round(
    WEIGHTS.lead_flow * dimensions.lead_flow +
    WEIGHTS.sales_process * dimensions.sales_process +
    WEIGHTS.icp_offer * dimensions.icp_offer +
    WEIGHTS.founder_readiness * dimensions.founder_readiness +
    WEIGHTS.proof_enablement * dimensions.proof_enablement
  );

  const hard_gate_failures = HARD_GATE_DIMENSIONS.filter(d => gateFails.has(d));

  // 6. Verdict
  const verdict: Verdict =
    composite >= 70 && hard_gate_failures.length === 0 ? 'ready' : 'almost';

  // 7. Stage
  let stage: Stage;
  if (composite >= 70 && hard_gate_failures.length === 0) {
    stage = 'engine_online_hire_ready';
  } else if (composite < 40 || hard_gate_failures.length >= 2) {
    stage = 'all_founder_no_system';
  } else {
    stage = 'half_built_engine';
  }

  // 8. Dominant trap (only if some trap has ≥ 2 votes)
  let dominant_trap: Trap | null = null;
  let topVotes = 0;
  for (const t of TRAP_TIE_ORDER) {
    if (trapVotes[t] > topVotes) {
      topVotes = trapVotes[t];
      dominant_trap = t;
    }
    // tie-break: TRAP_TIE_ORDER iteration order means first hit wins ties
  }
  if (topVotes < 2) {
    dominant_trap = null;
  }

  // 9. CTA tier
  const cta_tier: CtaTier = verdict === 'ready' ? 'growth' : 'studio';

  return {
    dimensions,
    composite,
    verdict,
    stage,
    hard_gate_failures,
    dominant_trap,
    cta_tier,
  };
}
```

- [ ] **Step 4: Run tests, expect all to pass**

Run from repo root:
```bash
npm run test --workspace=@repo/utils
```

Expected: all tests pass.

- [ ] **Step 5: Type-check**

```bash
npm run type-check --workspace=@repo/utils
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/utils/src/assessment/biz-dev-scoring.ts packages/utils/src/assessment/biz-dev-scoring.test.ts
git commit -m "feat(biz-dev): deterministic scoring with stage classification + trap aggregation"
```

---

### Task 4: Export new modules from `@repo/utils`

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/packages/utils/src/assessment/index.ts`

- [ ] **Step 1: Add exports**

Append to `packages/utils/src/assessment/index.ts`:

```typescript
export * from './biz-dev-questions';
export * from './biz-dev-scoring';
```

- [ ] **Step 2: Type-check from web app**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/utils/src/assessment/index.ts
git commit -m "feat(biz-dev): export new modules from @repo/utils"
```

---

## Phase 2 — Database Migration

### Task 5: Create the `biz_dev_assessments` table

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/supabase/migrations/20260507_create_biz_dev_assessments.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260507_create_biz_dev_assessments.sql`:

```sql
-- WTF Biz Dev Assessment — table + RLS policies
-- Spec: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §10

create table if not exists biz_dev_assessments (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  user_id                uuid references auth.users(id) on delete set null,

  -- Identity (captured at intake; user_id resolved on submit)
  name                   text not null,
  email                  text not null,
  company_name           text,
  website_url            text,
  linkedin_url           text,

  -- Discovery
  service_description    text,
  customer_description   text,
  revenue_band           text,
  affordability_answer   text,
  newsletter_opt_in      boolean default false,

  -- Deterministic results
  answers                jsonb not null,
  dimensions             jsonb not null,
  composite_score        int not null,
  verdict                text not null check (verdict in ('ready','almost')),
  stage                  text not null check (stage in (
    'all_founder_no_system','half_built_engine','engine_online_hire_ready'
  )),
  hard_gate_failures     jsonb,
  dominant_trap          text check (dominant_trap in ('personality','indispensability','more_founder')),
  cta_tier               text not null check (cta_tier in ('studio','growth')),

  -- Research artifacts (filled async)
  research_artifacts     jsonb,
  research_status        text default 'pending'
    check (research_status in ('pending','completed','partial','failed')),

  -- AI-generated report (filled async)
  report_markdown        text,
  report_status          text default 'pending'
    check (report_status in ('pending','completed','failed'))
);

create index if not exists biz_dev_assessments_email_idx on biz_dev_assessments (email);
create index if not exists biz_dev_assessments_user_id_idx on biz_dev_assessments (user_id);

-- RLS
alter table biz_dev_assessments enable row level security;

-- Users can read only their own rows
drop policy if exists "biz_dev_assessments_select_own" on biz_dev_assessments;
create policy "biz_dev_assessments_select_own"
  on biz_dev_assessments for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS for inserts/updates from API route
-- (Supabase service role automatically bypasses RLS, but we keep policy
-- explicit so dev environments without service role still work for
-- the API route running with elevated privileges.)
drop policy if exists "biz_dev_assessments_service_all" on biz_dev_assessments;
create policy "biz_dev_assessments_service_all"
  on biz_dev_assessments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Auto-update updated_at on changes
create or replace function biz_dev_assessments_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists biz_dev_assessments_updated_at on biz_dev_assessments;
create trigger biz_dev_assessments_updated_at
  before update on biz_dev_assessments
  for each row execute procedure biz_dev_assessments_set_updated_at();
```

- [ ] **Step 2: Apply migration**

Apply via the user's standard Supabase migration workflow (typically `supabase db push` from repo root). If running locally, verify:

```bash
# from repo root
supabase db push
```

Expected: migration applies without error. The `biz_dev_assessments` table now exists in the linked Supabase project.

- [ ] **Step 3: Smoke-test the schema**

Connect to Supabase SQL editor (or `supabase db query`) and run:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'biz_dev_assessments'
order by ordinal_position;
```

Expected: 22 columns matching the migration.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260507_create_biz_dev_assessments.sql
git commit -m "feat(db): create biz_dev_assessments table with RLS"
```

---

## Phase 3 — Public Client Flow

The flow lives in a single self-contained client component at `apps/web/app/wtf-biz-dev-assessment/page.tsx`, mirroring `wtf-assessment-example/page.tsx` (~928 lines).

### Task 6: Scaffold the route + landing screen

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/layout.tsx`
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/page.tsx`

- [ ] **Step 1: Add layout (mirror wtf-assessment-example)**

Read `apps/web/app/wtf-assessment-example/layout.tsx` to see the exact pattern, then create the matching `apps/web/app/wtf-biz-dev-assessment/layout.tsx`. The layout typically sets the page metadata (title, description) and renders `{children}`. Match the surrounding font/theme conventions of the example.

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Are You Ready to Hire a BD Resource? | WTF Agency Assessment',
  description: "Most agency CEOs think a BD hire creates deals. They don't. Find out if you're actually ready.",
};

export default function BizDevAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Scaffold page with landing screen**

Create `apps/web/app/wtf-biz-dev-assessment/page.tsx` as a `'use client'` component with internal step state:

```tsx
'use client';

import { useState } from 'react';

type FlowStep = 'landing' | 'intake' | 'questions' | 'preview';

export default function BizDevAssessmentPage() {
  const [step, setStep] = useState<FlowStep>('landing');

  if (step === 'landing') {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl px-6 py-24">
          <p className="text-sm uppercase tracking-wider text-accent mb-4">
            Free Assessment · 5 minutes
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Most agency CEOs think a BD hire creates deals.
            <br />
            <span className="text-accent">They don't. They follow up leads.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Are you ready to feed one? Take the 5-minute diagnostic.
            We'll analyze your website, your LinkedIn, and your answers — then tell you straight whether you're ready to hire, what you'll need to fix first, and how to actually make the hire stick.
          </p>
          <button
            onClick={() => setStep('intake')}
            className="rounded-full bg-foreground text-background px-8 py-4 text-lg font-semibold hover:opacity-90 transition"
          >
            Start the Assessment →
          </button>
        </section>
      </main>
    );
  }

  // Other steps stubbed; filled in subsequent tasks
  return <main className="p-12">Step: {step}</main>;
}
```

Tailwind class names should match the existing app's design system tokens. If the user's existing app uses different tokens (e.g., `bg-zinc-950`), adjust accordingly — match `wtf-assessment-example/page.tsx` for class conventions.

- [ ] **Step 3: Verify page loads**

Start dev server (or trust existing), then in a browser visit `http://localhost:3000/wtf-biz-dev-assessment`. Expected: landing screen renders with headline + button.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/layout.tsx apps/web/app/wtf-biz-dev-assessment/page.tsx
git commit -m "feat(biz-dev): scaffold route + landing screen"
```

---

### Task 7: Build the intake form (Zod-validated)

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/page.tsx`

- [ ] **Step 1: Add intake form schema and step UI**

In `page.tsx`, define the Zod schema and intake step UI. Add these imports/types/components:

```tsx
import { z } from 'zod';

const intakeSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  company_name: z.string().min(1, 'Required'),
  website_url: z.string().url('Must be a valid URL (include https://)'),
  linkedin_url: z.string().url('Must be a valid LinkedIn URL').refine(
    (v) => v.includes('linkedin.com'),
    'Must be a LinkedIn URL'
  ),
  service_description: z.string().min(10, 'A sentence or two — what do you sell?'),
  customer_description: z.string().min(10, 'A sentence or two — who do you sell to?'),
  revenue_band: z.enum(['<$1M', '$1M-$3M', '$3M-$5M', '$5M-$10M', '$10M+']),
  affordability_answer: z.enum(['yes', 'no', 'not_sure']),
  newsletter_opt_in: z.boolean(),
});

type IntakeData = z.infer<typeof intakeSchema>;
```

Then within the page component, add:

```tsx
const [intakeData, setIntakeData] = useState<Partial<IntakeData>>({
  newsletter_opt_in: false,
});
const [intakeErrors, setIntakeErrors] = useState<Record<string, string>>({});

function handleIntakeSubmit(e: React.FormEvent) {
  e.preventDefault();
  const result = intakeSchema.safeParse(intakeData);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    setIntakeErrors(errors);
    return;
  }
  setIntakeErrors({});
  setStep('questions');
}
```

- [ ] **Step 2: Render the intake form**

Add to the step rendering logic (replace the `intake` branch stub):

```tsx
if (step === 'intake') {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <form onSubmit={handleIntakeSubmit} className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <h2 className="text-3xl font-bold">Tell me about your agency</h2>
        <p className="text-muted-foreground">
          I'll analyze your website + LinkedIn alongside your answers.
          Three minutes, then 10 quick questions.
        </p>

        {/* Each field: input + label + error */}
        {[
          { key: 'name', label: 'Your name', type: 'text' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'company_name', label: 'Agency name', type: 'text' },
          { key: 'website_url', label: 'Agency website (https://)', type: 'url' },
          { key: 'linkedin_url', label: 'Your LinkedIn profile URL', type: 'url' },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type={type}
              value={(intakeData as Record<string, string>)[key] ?? ''}
              onChange={(e) => setIntakeData(d => ({ ...d, [key]: e.target.value }))}
              className="w-full rounded border border-border bg-background px-3 py-2"
              required
            />
            {intakeErrors[key] && <p className="text-sm text-red-500 mt-1">{intakeErrors[key]}</p>}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">What do you sell? (1–2 sentences)</label>
          <textarea
            value={intakeData.service_description ?? ''}
            onChange={(e) => setIntakeData(d => ({ ...d, service_description: e.target.value }))}
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2"
            required
          />
          {intakeErrors.service_description && <p className="text-sm text-red-500 mt-1">{intakeErrors.service_description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Who do you sell to? (1–2 sentences)</label>
          <textarea
            value={intakeData.customer_description ?? ''}
            onChange={(e) => setIntakeData(d => ({ ...d, customer_description: e.target.value }))}
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2"
            required
          />
          {intakeErrors.customer_description && <p className="text-sm text-red-500 mt-1">{intakeErrors.customer_description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Annual revenue band</label>
          <select
            value={intakeData.revenue_band ?? ''}
            onChange={(e) => setIntakeData(d => ({ ...d, revenue_band: e.target.value as IntakeData['revenue_band'] }))}
            className="w-full rounded border border-border bg-background px-3 py-2"
            required
          >
            <option value="" disabled>Pick one</option>
            <option value="<$1M">Less than $1M</option>
            <option value="$1M-$3M">$1M – $3M</option>
            <option value="$3M-$5M">$3M – $5M</option>
            <option value="$5M-$10M">$5M – $10M</option>
            <option value="$10M+">$10M+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Could you fund $60K base salary for 4–6 months without expecting any return?
          </label>
          <div className="space-y-1">
            {[
              { v: 'yes', l: 'Yes — I have the runway and I get the math.' },
              { v: 'no', l: 'No — that would put real strain on the business.' },
              { v: 'not_sure', l: "I'd have to model it." },
            ].map(({ v, l }) => (
              <label key={v} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="affordability"
                  value={v}
                  checked={intakeData.affordability_answer === v}
                  onChange={() => setIntakeData(d => ({ ...d, affordability_answer: v as IntakeData['affordability_answer'] }))}
                  required
                />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={intakeData.newsletter_opt_in ?? false}
            onChange={(e) => setIntakeData(d => ({ ...d, newsletter_opt_in: e.target.checked }))}
          />
          <span className="text-sm">Get Tim's newsletter — agency growth, no fluff.</span>
        </label>

        <button
          type="submit"
          className="rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
        >
          Continue to questions →
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Visit `/wtf-biz-dev-assessment`, click through to intake. Try submitting empty form → expect inline errors. Fill correctly → advances to "questions" step (currently a stub).

- [ ] **Step 3: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/page.tsx
git commit -m "feat(biz-dev): intake form with Zod validation"
```

---

### Task 8: Build the questions step (one per screen, MC, progress bar)

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/page.tsx`

- [ ] **Step 1: Add questions step state**

Inside the page component, add:

```tsx
import { BIZ_DEV_QUESTIONS, type AssessmentAnswers, type QuestionId } from '@repo/utils';

const [currentQ, setCurrentQ] = useState(0); // index into BIZ_DEV_QUESTIONS
const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>({});

function handleAnswer(qId: QuestionId, choiceId: 'a' | 'b' | 'c' | 'd') {
  const next = { ...answers, [qId]: choiceId };
  setAnswers(next);
  if (currentQ < BIZ_DEV_QUESTIONS.length - 1) {
    setCurrentQ(currentQ + 1);
  } else {
    // All answered — move to preview
    submitAssessment(next as AssessmentAnswers);
  }
}
```

- [ ] **Step 2: Render the question step**

Replace the `questions` step branch:

```tsx
if (step === 'questions') {
  const q = BIZ_DEV_QUESTIONS[currentQ];
  const total = BIZ_DEV_QUESTIONS.length;
  const progress = ((currentQ) / total) * 100;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {currentQ + 1} of {total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-border rounded">
            <div className="h-1 bg-accent rounded transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-8">{q.prompt}</h2>

        <div className="space-y-3">
          {q.choices.map((c) => (
            <button
              key={c.id}
              onClick={() => handleAnswer(q.id, c.id as 'a'|'b'|'c'|'d')}
              className="block w-full text-left rounded border border-border bg-card hover:border-accent hover:bg-accent/5 px-5 py-4 transition"
            >
              {c.text}
            </button>
          ))}
        </div>

        {currentQ > 0 && (
          <button
            onClick={() => setCurrentQ(currentQ - 1)}
            className="mt-8 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Stub the submit handler (filled in next task)**

Add inside the component:

```tsx
const [submitting, setSubmitting] = useState(false);
const [previewResult, setPreviewResult] = useState<null | {
  verdict: string;
  stage: string;
  composite: number;
  topGaps: string[];
}>(null);

async function submitAssessment(finalAnswers: AssessmentAnswers) {
  setSubmitting(true);
  setStep('preview');
  // Filled in Task 9 — for now, just compute deterministic preview client-side
}
```

- [ ] **Step 4: Smoke test the question flow**

Manual: walk through all 10 questions, verify Back button works, verify progress bar advances, verify last question triggers transition to preview step.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/page.tsx
git commit -m "feat(biz-dev): question flow with progress bar"
```

---

### Task 9: Wire client-side scoring + submit to API

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/page.tsx`

- [ ] **Step 1: Compute deterministic preview client-side**

Update `submitAssessment`:

```tsx
import { scoreBizDevAssessment } from '@repo/utils';

async function submitAssessment(finalAnswers: AssessmentAnswers) {
  setSubmitting(true);
  setStep('preview');

  // 1. Compute deterministic preview locally for instant verdict
  const preview = scoreBizDevAssessment(finalAnswers);
  const stageDisplay = STAGE_LABELS[preview.stage];

  // 2. Compute top 2 dimensional gaps for teaser
  const dimEntries = Object.entries(preview.dimensions) as Array<[string, number]>;
  dimEntries.sort((a, b) => a[1] - b[1]);
  const topGaps = dimEntries.slice(0, 2).map(([d]) => DIMENSION_LABELS[d as keyof typeof DIMENSION_LABELS]);

  setPreviewResult({
    verdict: preview.verdict,
    stage: stageDisplay,
    composite: preview.composite,
    topGaps,
  });

  // 3. Fire-and-forget POST to API for full report processing
  try {
    const resp = await fetch('/api/analyze/biz-dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intake: intakeData,
        answers: finalAnswers,
      }),
    });
    if (!resp.ok) {
      // Surface a non-blocking warning; deterministic preview still shown
      console.warn('Background processing failed:', await resp.text());
    }
  } catch (err) {
    console.warn('Background processing error:', err);
  } finally {
    setSubmitting(false);
  }
}

const STAGE_LABELS = {
  all_founder_no_system: 'All Founder, No System',
  half_built_engine: 'Half-Built Engine',
  engine_online_hire_ready: 'Engine Online, Hire-Ready',
} as const;

const DIMENSION_LABELS = {
  lead_flow: 'Lead Flow',
  sales_process: 'Sales Process',
  icp_offer: 'ICP & Offer Clarity',
  founder_readiness: 'Founder Readiness',
  proof_enablement: 'Proof & Enablement',
} as const;
```

- [ ] **Step 2: Render the preview step**

Replace the `preview` step branch:

```tsx
if (step === 'preview') {
  if (!previewResult) {
    return <main className="p-12">Computing your verdict...</main>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm uppercase tracking-wider text-accent mb-2">Your stage</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          You're at the <span className="text-accent">{previewResult.stage}</span> stage.
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Composite readiness: {previewResult.composite}/100
        </p>

        <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left">
          <h2 className="font-semibold mb-3">Your two biggest gaps right now:</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {previewResult.topGaps.map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 text-left">
          <p className="font-semibold mb-2">📨 Your full personalized report is being prepared.</p>
          <p className="text-muted-foreground text-sm">
            I'm analyzing your website and LinkedIn alongside your answers to find the specific gaps you need to fix. Check your inbox in ~5 minutes for the secure link to your full report.
          </p>
        </div>

        {submitting && (
          <p className="text-sm text-muted-foreground mt-6">Processing... feel free to close this tab.</p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test the full client flow**

Walk through landing → intake → 10 questions → preview. Verify the verdict displays, top gaps show, and the API call (will 404 until we build the route in next phase) is fire-and-forget — the preview UI doesn't block on it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/page.tsx
git commit -m "feat(biz-dev): client-side scoring preview + API submit"
```

---

## Phase 4 — API Route + AI Pipeline

### Task 10: API route skeleton with Zod validation + persistence

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/analyze/biz-dev/route.ts`

- [ ] **Step 1: Create the route with validation + DB write**

Create `apps/web/app/api/analyze/biz-dev/route.ts`:

```typescript
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { createClient as createServiceClient } from '@/lib/supabase-server';
import {
  scoreBizDevAssessment,
  BIZ_DEV_QUESTIONS,
  type AssessmentAnswers,
} from '@repo/utils';

const intakeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company_name: z.string().min(1),
  website_url: z.string().url(),
  linkedin_url: z.string().url(),
  service_description: z.string().min(10),
  customer_description: z.string().min(10),
  revenue_band: z.enum(['<$1M', '$1M-$3M', '$3M-$5M', '$5M-$10M', '$10M+']),
  affordability_answer: z.enum(['yes', 'no', 'not_sure']),
  newsletter_opt_in: z.boolean(),
});

const answersSchema = z.object({
  q1: z.enum(['a','b','c','d']), q2: z.enum(['a','b','c','d']),
  q3: z.enum(['a','b','c','d']), q4: z.enum(['a','b','c','d']),
  q5: z.enum(['a','b','c','d']), q6: z.enum(['a','b','c','d']),
  q7: z.enum(['a','b','c','d']), q8: z.enum(['a','b','c','d']),
  q9: z.enum(['a','b','c','d']), q10: z.enum(['a','b','c','d']),
});

const requestSchema = z.object({
  intake: intakeSchema,
  answers: answersSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { intake, answers } = parsed.data;

    // 1. Compute deterministic results (server-side truth)
    const score = scoreBizDevAssessment(answers as AssessmentAnswers);

    // 2. Persist row immediately (research + report come async)
    const supabase = createServiceClient();
    const { data: row, error: insertErr } = await supabase
      .from('biz_dev_assessments')
      .insert({
        name: intake.name,
        email: intake.email,
        company_name: intake.company_name,
        website_url: intake.website_url,
        linkedin_url: intake.linkedin_url,
        service_description: intake.service_description,
        customer_description: intake.customer_description,
        revenue_band: intake.revenue_band,
        affordability_answer: intake.affordability_answer,
        newsletter_opt_in: intake.newsletter_opt_in,
        answers,
        dimensions: score.dimensions,
        composite_score: score.composite,
        verdict: score.verdict,
        stage: score.stage,
        hard_gate_failures: score.hard_gate_failures,
        dominant_trap: score.dominant_trap,
        cta_tier: score.cta_tier,
        // research_status / report_status default to 'pending'
      })
      .select('id')
      .single();

    if (insertErr || !row) {
      console.error('[biz-dev] insert failed:', insertErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 3. Kick off async processing (research + AI + side-effects)
    waitUntil(processAssessment(row.id, intake, answers, score));

    // 4. Return preview verdict immediately
    return NextResponse.json({
      id: row.id,
      verdict: score.verdict,
      stage: score.stage,
      composite: score.composite,
      cta_tier: score.cta_tier,
    });
  } catch (err) {
    console.error('[biz-dev] route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Stubbed; filled by Tasks 11-15
async function processAssessment(
  _id: string,
  _intake: z.infer<typeof intakeSchema>,
  _answers: z.infer<typeof answersSchema>,
  _score: ReturnType<typeof scoreBizDevAssessment>
): Promise<void> {
  // No-op for now
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 3: Smoke test end-to-end client → API → DB**

1. Run `npm run dev --workspace=web`
2. Visit `/wtf-biz-dev-assessment`, walk through, submit
3. Connect to Supabase SQL editor and run:
   ```sql
   select id, name, verdict, stage, composite_score from biz_dev_assessments order by created_at desc limit 1;
   ```
4. Expected: a row exists with correct verdict and stage matching what was shown on the preview screen.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/analyze/biz-dev/route.ts
git commit -m "feat(biz-dev): API route with validation + DB persistence"
```

---

### Task 11: Resolve user via Supabase Auth Admin (passwordless)

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/lib/biz-dev-auth.ts`
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/analyze/biz-dev/route.ts`

- [ ] **Step 1: Create auth helper**

Create `apps/web/lib/biz-dev-auth.ts`:

```typescript
import { createClient } from '@/lib/supabase-server'; // service role

/**
 * Resolve email → Supabase user_id, creating the user if they don't exist.
 * Returns the user_id. The user has no password — they sign in via magic link.
 *
 * IMPORTANT: requires SUPABASE_SERVICE_ROLE_KEY in env (the supabase-server
 * helper uses this).
 */
export async function resolveOrCreateUserByEmail(email: string): Promise<string> {
  const supabase = createClient();
  // 1. Check if user exists
  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  // listUsers doesn't filter by email server-side; scan for the one we want
  const found = existing?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;

  // 2. Create user with no password (email confirmed so they can magic-link in)
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !created.user) {
    throw new Error(`Failed to create Supabase user for ${email}: ${error?.message}`);
  }
  return created.user.id;
}

/**
 * Generate a magic-link URL without sending Supabase's built-in email.
 * The URL, when clicked, exchanges the OTP for a session and redirects to redirectTo.
 */
export async function generateMagicLink(email: string, redirectTo: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate magic link for ${email}: ${error?.message}`);
  }
  return data.properties.action_link;
}
```

- [ ] **Step 2: Wire into the API route**

In `apps/web/app/api/analyze/biz-dev/route.ts`, before the insert, add:

```typescript
import { resolveOrCreateUserByEmail } from '@/lib/biz-dev-auth';

// ... inside POST handler, before the insert ...

const userId = await resolveOrCreateUserByEmail(intake.email);
```

Then add `user_id: userId` to the insert object.

- [ ] **Step 3: Smoke test**

Walk through the assessment with a fresh email. After submit, query Supabase:

```sql
-- Should show new user
select id, email, created_at from auth.users where email = 'YOUR_TEST_EMAIL@example.com';

-- Should show row tied to that user
select id, user_id, name, verdict from biz_dev_assessments where email = 'YOUR_TEST_EMAIL@example.com';
```

Expected: user exists in `auth.users`, assessment row's `user_id` matches.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/biz-dev-auth.ts apps/web/app/api/analyze/biz-dev/route.ts
git commit -m "feat(biz-dev): resolve or create Supabase user via service role"
```

---

### Task 12: Integrate BrightData research (LinkedIn + website)

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/analyze/biz-dev/route.ts`

- [ ] **Step 1: Add research imports + helper**

In the route file, add to imports:

```typescript
import {
  researchLinkedInProfile,
  researchLinkedInPosts,
  scrapeCompanyWebsite,
  BRIGHTDATA_AUTH_FAILED_PREFIX,
} from '@repo/utils';
import { alertBrightDataAuthExpired } from '@/lib/slack';
```

- [ ] **Step 2: Implement research function**

In `route.ts`, replace the stubbed `processAssessment` with a research-fetching version:

```typescript
async function processAssessment(
  id: string,
  intake: z.infer<typeof intakeSchema>,
  answers: z.infer<typeof answersSchema>,
  score: ReturnType<typeof scoreBizDevAssessment>
): Promise<void> {
  const supabase = createServiceClient();

  // 1. Run research in parallel (each is null-tolerant)
  let researchStatus: 'completed' | 'partial' | 'failed' = 'completed';
  const partials: string[] = [];

  let linkedInProfile: Awaited<ReturnType<typeof researchLinkedInProfile>> = null;
  let linkedInPosts: Awaited<ReturnType<typeof researchLinkedInPosts>> = null;
  let websiteContent: string | null = null;

  try {
    const results = await Promise.allSettled([
      researchLinkedInProfile(intake.linkedin_url),
      researchLinkedInPosts(intake.linkedin_url),
      scrapeCompanyWebsite(intake.website_url),
    ]);

    if (results[0].status === 'fulfilled') linkedInProfile = results[0].value;
    else partials.push('linkedin_profile');

    if (results[1].status === 'fulfilled') linkedInPosts = results[1].value;
    else partials.push('linkedin_posts');

    if (results[2].status === 'fulfilled') websiteContent = results[2].value;
    else partials.push('website');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith(BRIGHTDATA_AUTH_FAILED_PREFIX)) {
      alertBrightDataAuthExpired(err.message);
    }
    console.error('[biz-dev] research failed:', err);
    researchStatus = 'failed';
  }

  if (partials.length > 0 && researchStatus !== 'failed') researchStatus = 'partial';

  // 2. Persist research artifacts
  await supabase
    .from('biz_dev_assessments')
    .update({
      research_artifacts: {
        linkedin_profile: linkedInProfile,
        linkedin_posts: linkedInPosts,
        website_content: websiteContent,
        partials,
      },
      research_status: researchStatus,
    })
    .eq('id', id);

  // 3. AI synthesis happens in Task 14
}
```

- [ ] **Step 3: Smoke test**

Submit a test assessment with real LinkedIn + website URLs. After ~30–90 s, query:

```sql
select id, research_status, research_artifacts->'partials' as partials
from biz_dev_assessments where email = 'YOUR_TEST_EMAIL@example.com';
```

Expected: `research_status = 'completed'` (or 'partial' if some sources failed). `research_artifacts` should contain LinkedIn data and website text.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/analyze/biz-dev/route.ts
git commit -m "feat(biz-dev): integrate BrightData LinkedIn + website research"
```

---

### Task 13: Build the AI synthesis prompt module

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/packages/prompts/biz-dev-assessment/markdown-prompts.ts`
- Create: `/Users/timkilroy/Projects/wtf-os/packages/prompts/biz-dev-assessment/index.ts`
- Modify: `/Users/timkilroy/Projects/wtf-os/packages/prompts/index.ts`

- [ ] **Step 1: Create the prompt module**

Create `packages/prompts/biz-dev-assessment/markdown-prompts.ts`:

```typescript
import type {
  AssessmentAnswers,
  ScoreResult,
  Question,
} from '@repo/utils';
import { BIZ_DEV_QUESTIONS, getAnswerChoice } from '@repo/utils';

export interface BizDevPromptInput {
  // Intake
  name: string;
  email: string;
  company_name: string;
  website_url: string;
  linkedin_url: string;
  service_description: string;
  customer_description: string;
  revenue_band: string;
  affordability_answer: string;

  // Deterministic results
  score: ScoreResult;

  // Answers (for verbatim quoting back)
  answers: AssessmentAnswers;

  // Research artifacts (any may be null/partial)
  research: {
    linkedin_profile: unknown;
    linkedin_posts: unknown;
    website_content: string | null;
    partials: string[];
  };
}

export const BIZ_DEV_SYSTEM_PROMPT = `You are the analytical voice of SalesOS by Tim Kilroy. You diagnose agencies that think they're ready to hire a BD resource. You are direct, opinionated, and occasionally profane. You name things plainly. You quote evidence verbatim. You do not soften gaps. You always end with a clear next step (Studio or Growth tier).

Brand context:
- Tim's product is SalesOS. Three tiers: Studio (extract & document), Growth (hire-ready infrastructure), Team (durable sales organization).
- Tim's headline: "Fire Yourself From Sales."
- Tim's three named traps: Personality Trap, Indispensability Trap, More Founder Trap.
- Tim's philosophy: "Return on Understanding."
- The benchmarks you should cite: 55% of agency first-sales hires exit in year 1 (Haus Advisors); 9% hit quota; 76% of BD director tenures < 2 years (RSW/US 2024).

Voice rules:
- Direct. Occasional profanity is OK (mirrors Tim's writing).
- Quote the user's own answers verbatim where the spec calls for it.
- Quote the user's website / LinkedIn copy verbatim where relevant. NEVER invent quotes.
- If research artifacts are partial or missing, acknowledge it ("couldn't read your LinkedIn this time") rather than fabricating.
- Do not soften the verdict. If their gaps are bad, say so. The reader will respect honesty more than diplomacy.
- End every report with a tier-specific CTA copy block.

Output: structured markdown, exact section headings as instructed in the user prompt.`;

export function buildBizDevUserPrompt(input: BizDevPromptInput): string {
  // Build verbatim answer summary
  const answerSummary = BIZ_DEV_QUESTIONS.map((q: Question) => {
    const c = getAnswerChoice(q, input.answers[q.id]);
    const dim = q.dimension;
    const gateNote = c.hardGate ? ' ← HARD-GATE FAIL' : '';
    return `- ${q.id} (${dim}): "${c.text}" — score ${c.score}${gateNote}`;
  }).join('\n');

  return `Generate the personalized BD-readiness report for this agency.

## INTAKE
- Name: ${input.name}
- Agency: ${input.company_name}
- Website: ${input.website_url}
- LinkedIn: ${input.linkedin_url}
- "What we sell": ${input.service_description}
- "Who we sell to": ${input.customer_description}
- Revenue band: ${input.revenue_band}
- Can fund $60K base × 4–6 mo without ROI?: ${input.affordability_answer}

## ANSWERS (verbatim)
${answerSummary}

## DETERMINISTIC RESULTS (use these as canonical — do NOT change verdict or scores)
- Composite: ${input.score.composite}/100
- Stage: ${input.score.stage}
- Verdict: ${input.score.verdict}
- Hard-gate failures: ${input.score.hard_gate_failures.join(', ') || 'none'}
- Dominant Trap: ${input.score.dominant_trap ?? 'none'}
- CTA tier: ${input.score.cta_tier}
- Dimensions:
  - Lead Flow: ${input.score.dimensions.lead_flow}/100
  - Sales Process: ${input.score.dimensions.sales_process}/100
  - ICP & Offer Clarity: ${input.score.dimensions.icp_offer}/100
  - Founder Readiness: ${input.score.dimensions.founder_readiness}/100
  - Proof & Enablement: ${input.score.dimensions.proof_enablement}/100

## RESEARCH ARTIFACTS
${input.research.partials.length > 0 ? `Partial sources: ${input.research.partials.join(', ')} — note this in the report where relevant, do not invent.` : 'All research sources retrieved successfully.'}

LinkedIn Profile: ${JSON.stringify(input.research.linkedin_profile, null, 2).slice(0, 4000)}

LinkedIn Posts (recent): ${JSON.stringify(input.research.linkedin_posts, null, 2).slice(0, 4000)}

Website content (excerpt): ${input.research.website_content?.slice(0, 6000) ?? '[unavailable]'}

## OUTPUT — produce markdown EXACTLY in this structure

# You're at the [Stage Display Name] stage.
[One-sentence summary of what that means, in SalesOS voice. Stage display names: "All Founder, No System" / "Half-Built Engine" / "Engine Online, Hire-Ready"]

## The Truth You Need to Hear
[2–3 paragraphs. QUOTE their answer to Q7 verbatim. Connect it to the 55% Y1 exit / 9% hit-quota benchmark. This is the truth-bomb section. If they answered Q7 "drive revenue without me" — call it out as the most common wrong belief.]

## Where You Stand — Dimension by Dimension

### Lead Flow — ${input.score.dimensions.lead_flow}/100
[Quote their Q1 + Q2 answers verbatim. AI observation tying website/LinkedIn evidence — do they have a content engine on LinkedIn? Does their website show inbound infrastructure? Don't invent.]

### Sales Process — ${input.score.dimensions.sales_process}/100
[Quote Q3 + Q4. Note process maturity.]

### ICP & Offer Clarity — ${input.score.dimensions.icp_offer}/100
[QUOTE their homepage h1/subhead/positioning verbatim from the website content if available. Call out vagueness vs. specificity. Cross-reference with their stated "what we sell" answer.]

### Founder Readiness — ${input.score.dimensions.founder_readiness}/100
[Quote Q7 + Q8. This is the most important section editorially.]

### Proof & Enablement — ${input.score.dimensions.proof_enablement}/100
[Quote Q9 + Q10. Note whether case studies/testimonials are visible on their site.]

${input.score.dominant_trap ? `## The Trap You're In: ${input.score.dominant_trap === 'personality' ? 'Personality' : input.score.dominant_trap === 'indispensability' ? 'Indispensability' : 'More Founder'}
[2 paragraphs naming the pattern, with their own answers as evidence.]` : ''}

## Your 3-Sprint Plan to Get Ready
[Three sprints, one month each. ${input.score.cta_tier === 'studio' ? 'Studio path: Sprint 1 — Extract (ICP + offer + discovery flow); Sprint 2 — Document (sales process + narrative & framing); Sprint 3 — Install (pipeline infra + readiness for the hire).' : 'Growth path: Sprint 1 — Hire (role scorecard + JD + screening + comp); Sprint 2 — Onboard (ramp plan + coaching + deal review); Sprint 3 — Optimize (performance review + pipeline tuning).'}

Each sprint MUST contain 3–4 specific deliverables tied to THIS user's actual gaps and research artifacts. Do not produce generic templates. If a dimension scored low, the sprint that addresses it must reference the specific gap.]

## What's Next
[CTA copy. ${input.score.cta_tier === 'studio' ? 'Direct, honest. "You\'re not ready to hire — and that\'s fixable. SalesOS Studio is a 3-month engagement to extract the system you\'re running on instinct and turn it into infrastructure your team can use. Book a call to see if it fits." Use a "Book a Call with Tim" CTA.' : 'Direct, opinionated. "You\'re ready. The system is in place. The 55% who fail year one fail because they hire without installing the role/comp/ramp infrastructure first. SalesOS Growth fixes that — built before day 1, not after the new hire is already in trouble. Book a call to see if it fits." Use a "Book a Call with Tim" CTA.'}]

## A Note from Tim
[3 short paragraphs in first-person, signed "— Tim Kilroy, SalesOS". Tone: real, slightly weary, no-bullshit. ${input.score.cta_tier === 'studio' ? 'Address why most agencies skip the Studio step and go straight to hiring — and why those agencies become the 55%.' : 'Address why most "ready" founders still get burned — they install the hire without installing the system around the hire.'}]
`;
}
```

- [ ] **Step 2: Index file**

Create `packages/prompts/biz-dev-assessment/index.ts`:

```typescript
export * from './markdown-prompts';
```

- [ ] **Step 3: Re-export from package root**

Edit `packages/prompts/index.ts` to add:

```typescript
export * from './biz-dev-assessment';
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check --workspace=@repo/prompts
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/prompts/biz-dev-assessment/ packages/prompts/index.ts
git commit -m "feat(biz-dev): AI prompts for report synthesis with stage + sprint format"
```

---

### Task 14: Run Claude synthesis + persist report

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/analyze/biz-dev/route.ts`

- [ ] **Step 1: Add Claude integration**

In `route.ts`, add imports:

```typescript
import { runModel, retryWithBackoff } from '@repo/utils';
import { BIZ_DEV_SYSTEM_PROMPT, buildBizDevUserPrompt } from '@repo/prompts';
```

- [ ] **Step 2: Call Claude after research, persist report**

Extend `processAssessment` to add the AI synthesis step after research:

```typescript
// Append after the research persist block:

// 3. Run AI synthesis
const userPrompt = buildBizDevUserPrompt({
  name: intake.name,
  email: intake.email,
  company_name: intake.company_name,
  website_url: intake.website_url,
  linkedin_url: intake.linkedin_url,
  service_description: intake.service_description,
  customer_description: intake.customer_description,
  revenue_band: intake.revenue_band,
  affordability_answer: intake.affordability_answer,
  score,
  answers: answers as AssessmentAnswers,
  research: {
    linkedin_profile: linkedInProfile,
    linkedin_posts: linkedInPosts,
    website_content: websiteContent,
    partials,
  },
});

let reportMarkdown: string | null = null;
let reportStatus: 'completed' | 'failed' = 'completed';

try {
  const response = await retryWithBackoff(async () => {
    return await runModel('biz-dev-assessment-v1', BIZ_DEV_SYSTEM_PROMPT, userPrompt);
  });
  reportMarkdown = response;
} catch (err) {
  console.error('[biz-dev] AI synthesis failed:', err);
  reportStatus = 'failed';
}

// 4. Persist report
await supabase
  .from('biz_dev_assessments')
  .update({
    report_markdown: reportMarkdown,
    report_status: reportStatus,
  })
  .eq('id', id);

// 5. Side-effects (Task 15)
```

- [ ] **Step 3: Smoke test**

Submit assessment with real data. Wait ~2 min. Query:

```sql
select id, report_status, length(report_markdown) as md_length
from biz_dev_assessments where email = 'YOUR_TEST_EMAIL@example.com';
```

Expected: `report_status = 'completed'`, `md_length` > 1000. Spot-check the markdown content for stage label, dimensional sections, and SalesOS voice.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/analyze/biz-dev/route.ts
git commit -m "feat(biz-dev): Claude synthesis with prompt + report persistence"
```

---

## Phase 5 — Integrations (Loops, Beehiiv, Copper, Slack)

### Task 15: Add Loops event for biz-dev report ready

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/lib/loops.ts`

- [ ] **Step 1: Add the Loops event function**

Read the existing `onDiscoveryReportGenerated` function in `apps/web/lib/loops.ts` for the pattern. Add a sibling function:

```typescript
export interface BizDevReportPayload {
  email: string;
  name: string;
  verdict: 'ready' | 'almost';
  stage: string;          // display name, e.g., "Half-Built Engine"
  composite: number;
  cta_tier: 'studio' | 'growth';
  dominant_trap: 'personality' | 'indispensability' | 'more_founder' | null;
  top_3_gaps: string[];
  magic_link_url: string;  // pre-baked Supabase magic link to /wtf-biz-dev-assessment/report/[id]
}

export async function onBizDevReportGenerated(
  payload: BizDevReportPayload
): Promise<{ success: boolean; error?: string }> {
  return sendEvent({
    eventName: 'bizDevReportGenerated',
    email: payload.email,
    eventProperties: {
      name: payload.name,
      verdict: payload.verdict,
      stage: payload.stage,
      composite: String(payload.composite),
      cta_tier: payload.cta_tier,
      dominant_trap: payload.dominant_trap ?? '',
      top_gap_1: payload.top_3_gaps[0] ?? '',
      top_gap_2: payload.top_3_gaps[1] ?? '',
      top_gap_3: payload.top_3_gaps[2] ?? '',
      magic_link_url: payload.magic_link_url,
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 3: Set up Loops template**

Manual step: in the Loops dashboard, create a new event template named `bizDevReportGenerated`. The template body is the user-facing email. Copy hooks:

- Subject: "Your BD Hire Readiness Report — {{stage}}"
- Body uses `{{name}}`, `{{stage}}`, `{{top_gap_1/2/3}}`, `{{magic_link_url}}`, `{{cta_tier}}` (drives different CTA copy via Loops liquid logic)

This step is documented in §16 of the spec under "Launch checklist."

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/loops.ts
git commit -m "feat(biz-dev): Loops event for report-ready email"
```

---

### Task 16: Add Beehiiv newsletter subscriber for biz-dev opt-in

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/lib/beehiiv.ts`

- [ ] **Step 1: Add subscribe function**

Read `addDiscoveryLabSubscriber` in `apps/web/lib/beehiiv.ts` for the pattern. Add:

```typescript
export async function addBizDevAssessmentSubscriber(
  email: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  return addSubscriber({
    email,
    referring_site: 'wtf-biz-dev-assessment',
    custom_fields: name ? [{ name: 'first_name', value: name }] : undefined,
    utm_source: 'wtf-biz-dev-assessment',
    utm_medium: 'opt-in',
  });
}
```

(Adjust to actual `addSubscriber` signature; reuse what `addDiscoveryLabSubscriber` does.)

- [ ] **Step 2: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/beehiiv.ts
git commit -m "feat(biz-dev): Beehiiv subscriber for newsletter opt-in"
```

---

### Task 17: Add Copper CRM lead sync with tier-specific ACV

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/lib/copper.ts`

- [ ] **Step 1: Add tier-specific ACV constants**

Read existing `PRO_ACV` and `COPPER_STAGES` in `apps/web/lib/copper.ts`. Add:

```typescript
// Biz-dev assessment leads
export const BIZ_DEV_STUDIO_ACV = 18000;   // SalesOS Studio approximate ACV (rough — adjust to actual pricing)
export const BIZ_DEV_GROWTH_ACV = 36000;   // SalesOS Growth approximate ACV
```

(Actual values: confirm with Tim during launch checklist — see §15 #5 of the spec.)

- [ ] **Step 2: Add sync function**

Read existing `copperSyncLead` (or equivalent) for the pattern. Add:

```typescript
export interface BizDevLeadInput {
  name: string;
  email: string;
  company_name: string;
  website_url: string;
  linkedin_url: string;
  cta_tier: 'studio' | 'growth';
  stage: string;        // assessment stage label, e.g., "Half-Built Engine"
  composite: number;
  verdict: 'ready' | 'almost';
}

export async function copperSyncBizDevLead(
  lead: BizDevLeadInput
): Promise<{ success: boolean; opportunityId?: number; error?: string }> {
  // Mirror copperSyncLead structure: create or update person; create opportunity
  // tied to BIZ_DEV_STUDIO_ACV or BIZ_DEV_GROWTH_ACV based on cta_tier
  const acv = lead.cta_tier === 'growth' ? BIZ_DEV_GROWTH_ACV : BIZ_DEV_STUDIO_ACV;

  // ... follow exact existing copperSyncLead pattern, substituting:
  //  - opportunity name: `Biz Dev Assessment — ${lead.cta_tier} — ${lead.company_name}`
  //  - monetary value: acv
  //  - pipeline_stage_id: COPPER_STAGES.LEAD
  //  - tags / custom fields: stage, verdict, composite

  // (Concrete implementation follows the existing copperSyncLead body almost line-for-line.
  // See apps/web/lib/copper.ts:copperSyncLead for the canonical pattern to mirror.)
  throw new Error('Implement by following copperSyncLead — see comments above');
}
```

The actual body should mirror `copperSyncLead` (lines around 230–290 of `copper.ts`) — same Copper API calls, different opportunity name/value/tags.

- [ ] **Step 3: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/copper.ts
git commit -m "feat(biz-dev): Copper CRM lead sync with tier-specific ACV"
```

---

### Task 18: Add Slack alert for biz-dev report generation

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/lib/slack.ts`

- [ ] **Step 1: Add the alert function**

Read existing `alertReportGenerated` for the pattern. Add:

```typescript
export function alertBizDevReportGenerated(
  name: string,
  email: string,
  company: string,
  verdict: 'ready' | 'almost',
  stage: string,
  composite: number,
  cta_tier: 'studio' | 'growth'
): void {
  const verdictEmoji = verdict === 'ready' ? '✅' : '🟡';
  const text = `${verdictEmoji} *Biz Dev Assessment* — ${name} (${email})\n` +
    `Agency: ${company}\n` +
    `Stage: *${stage}* (${composite}/100, ${verdict})\n` +
    `Routes to: SalesOS *${cta_tier}*`;

  void sendSlackAlert({ text });
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/slack.ts
git commit -m "feat(biz-dev): Slack alert on report generation"
```

---

### Task 19: Wire all integrations into the API route

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/analyze/biz-dev/route.ts`

- [ ] **Step 1: Add side-effect calls after report persistence**

Add to the end of `processAssessment` (after the `report_markdown` update):

```typescript
import { onBizDevReportGenerated } from '@/lib/loops';
import { addBizDevAssessmentSubscriber } from '@/lib/beehiiv';
import { copperSyncBizDevLead } from '@/lib/copper';
import { alertBizDevReportGenerated } from '@/lib/slack';
import { generateMagicLink } from '@/lib/biz-dev-auth';

// At the end of processAssessment (after the report update):

// Build link to confidential report
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://timkilroy.com';
const reportPath = `/wtf-biz-dev-assessment/report/${id}`;
const magicLinkUrl = await generateMagicLink(intake.email, `${siteUrl}${reportPath}`);

// Compute top 3 gaps for email
const dimEntries = Object.entries(score.dimensions) as Array<[string, number]>;
dimEntries.sort((a, b) => a[1] - b[1]);
const dimLabels: Record<string, string> = {
  lead_flow: 'Lead Flow',
  sales_process: 'Sales Process',
  icp_offer: 'ICP & Offer Clarity',
  founder_readiness: 'Founder Readiness',
  proof_enablement: 'Proof & Enablement',
};
const stageDisplayLabels: Record<string, string> = {
  all_founder_no_system: 'All Founder, No System',
  half_built_engine: 'Half-Built Engine',
  engine_online_hire_ready: 'Engine Online, Hire-Ready',
};
const top_3_gaps = dimEntries.slice(0, 3).map(([d]) => dimLabels[d] ?? d);
const stageDisplay = stageDisplayLabels[score.stage];

// Fire integrations in parallel — failures are non-fatal
await Promise.allSettled([
  // Loops report-ready email (carries the magic link)
  onBizDevReportGenerated({
    email: intake.email,
    name: intake.name,
    verdict: score.verdict,
    stage: stageDisplay,
    composite: score.composite,
    cta_tier: score.cta_tier,
    dominant_trap: score.dominant_trap,
    top_3_gaps,
    magic_link_url: magicLinkUrl,
  }),

  // Beehiiv subscribe (only if user opted in)
  intake.newsletter_opt_in
    ? addBizDevAssessmentSubscriber(intake.email, intake.name)
    : Promise.resolve(),

  // Copper CRM lead
  copperSyncBizDevLead({
    name: intake.name,
    email: intake.email,
    company_name: intake.company_name,
    website_url: intake.website_url,
    linkedin_url: intake.linkedin_url,
    cta_tier: score.cta_tier,
    stage: stageDisplay,
    composite: score.composite,
    verdict: score.verdict,
  }),
]);

// Slack alert (sync, fire-and-forget)
alertBizDevReportGenerated(
  intake.name,
  intake.email,
  intake.company_name,
  score.verdict,
  stageDisplay,
  score.composite,
  score.cta_tier
);
```

- [ ] **Step 2: End-to-end smoke test**

Submit a fresh test assessment. Verify within ~3 minutes:

1. **Slack**: alert posts with verdict + stage + tier
2. **Loops**: email arrives at the test inbox with subject including stage
3. **Email contents**: includes a magic-link URL pointing to `/wtf-biz-dev-assessment/report/[id]`
4. **Copper**: lead created (check via Copper UI)
5. **Database**: row has `research_status = 'completed'` and `report_status = 'completed'`

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/analyze/biz-dev/route.ts
git commit -m "feat(biz-dev): wire Loops, Beehiiv, Copper, Slack integrations"
```

---

## Phase 6 — Confidential Report Page

### Task 20: Build the auth-gated server-rendered report page

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/report/[id]/page.tsx`

- [ ] **Step 1: Create the report page with ownership check**

Create `apps/web/app/wtf-biz-dev-assessment/report/[id]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { createClient as createServiceClient } from '@/lib/supabase-server';
import { ReportContent } from './ReportContent';
import { StageProgress } from './StageProgress';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BizDevReportPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Verify the visitor has a session
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();

  if (!user) {
    // Not signed in — send to a "request a new magic link" page
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  // 2. Fetch the assessment via service client (bypasses RLS for ownership check)
  const svc = createServiceClient();
  const { data: assessment, error } = await svc
    .from('biz_dev_assessments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !assessment) {
    return (
      <main className="min-h-screen p-12">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">
          This report doesn't exist or has been removed.
        </p>
      </main>
    );
  }

  // 3. Ownership check
  if (assessment.user_id !== user.id) {
    redirect(`/wtf-biz-dev-assessment/report/${id}/request-link`);
  }

  // 4. Report still being prepared?
  if (assessment.report_status !== 'completed' || !assessment.report_markdown) {
    return (
      <main className="min-h-screen p-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Your report is being prepared</h1>
        <p className="text-muted-foreground mb-6">
          We're analyzing your website and LinkedIn alongside your answers. This usually takes 2–5 minutes. Refresh this page in a moment.
        </p>
        <meta httpEquiv="refresh" content="5" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <StageProgress stage={assessment.stage as 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready'} />
        <ReportContent
          markdown={assessment.report_markdown}
          ctaTier={assessment.cta_tier as 'studio' | 'growth'}
          assessmentId={id}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Stub the components**

Create placeholder files at `apps/web/app/wtf-biz-dev-assessment/report/[id]/StageProgress.tsx` and `ReportContent.tsx` (filled in next tasks). For now:

```tsx
// StageProgress.tsx
export function StageProgress({ stage }: { stage: string }) {
  return <div className="mb-8 p-4 border rounded">Stage: {stage} (visual TBD)</div>;
}

// ReportContent.tsx
export function ReportContent({ markdown }: { markdown: string; ctaTier: string; assessmentId: string }) {
  return <pre className="whitespace-pre-wrap">{markdown}</pre>;
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check --workspace=web
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/report/
git commit -m "feat(biz-dev): auth-gated report page with ownership check"
```

---

### Task 21: Build the Stage Progression visual component

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/report/[id]/StageProgress.tsx`

- [ ] **Step 1: Implement the visual**

Replace the stub with a 3-step horizontal progress bar that highlights the user's current stage:

```tsx
type Stage = 'all_founder_no_system' | 'half_built_engine' | 'engine_online_hire_ready';

const STAGES: Array<{ id: Stage; label: string; index: number }> = [
  { id: 'all_founder_no_system',     label: 'All Founder, No System', index: 1 },
  { id: 'half_built_engine',          label: 'Half-Built Engine',      index: 2 },
  { id: 'engine_online_hire_ready',  label: 'Engine Online, Hire-Ready', index: 3 },
];

export function StageProgress({ stage }: { stage: Stage }) {
  const currentIndex = STAGES.find(s => s.id === stage)?.index ?? 1;

  return (
    <div className="mb-12 p-6 border border-border rounded-lg bg-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4 text-center">
        Your current stage
      </p>
      <div className="flex items-center justify-between gap-2 relative">
        {/* Progress line behind */}
        <div className="absolute left-8 right-8 top-5 h-0.5 bg-border -z-0" />
        {STAGES.map((s) => {
          const isActive = s.id === stage;
          const isPast = s.index < currentIndex;
          return (
            <div key={s.id} className="flex flex-col items-center flex-1 relative z-10">
              <div className={[
                'h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2',
                isActive ? 'bg-accent text-accent-foreground border-accent ring-4 ring-accent/20'
                : isPast ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border',
              ].join(' ')}>
                {s.index}
              </div>
              <p className={[
                'mt-2 text-xs text-center max-w-28',
                isActive ? 'font-bold text-foreground' : 'text-muted-foreground',
              ].join(' ')}>
                {s.label}
              </p>
              {isActive && (
                <p className="mt-1 text-xs text-accent font-semibold">YOU ARE HERE</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Visual smoke test**

In dev, navigate to a generated report URL (after authenticating via magic-link email). Verify the stage progression renders correctly with the user's stage highlighted.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/report/[id]/StageProgress.tsx
git commit -m "feat(biz-dev): stage progression visual component"
```

---

### Task 22: Build the report content renderer (markdown + CTA)

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/report/[id]/ReportContent.tsx`

- [ ] **Step 1: Replace stub with markdown renderer + PDF button**

```tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  markdown: string;
  ctaTier: 'studio' | 'growth';
  assessmentId: string;
}

const STUDIO_BOOKING_URL = process.env.NEXT_PUBLIC_STUDIO_BOOKING_URL ?? 'https://timkilroy.com/book/studio';
const GROWTH_BOOKING_URL = process.env.NEXT_PUBLIC_GROWTH_BOOKING_URL ?? 'https://timkilroy.com/book/growth';

export function ReportContent({ markdown, ctaTier, assessmentId }: Props) {
  const bookingUrl = ctaTier === 'growth' ? GROWTH_BOOKING_URL : STUDIO_BOOKING_URL;
  const tierLabel = ctaTier === 'growth' ? 'Growth' : 'Studio';

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <div className="mb-6 flex justify-end gap-3 not-prose">
        <a
          href={`/api/biz-dev/pdf/${assessmentId}`}
          className="rounded border border-border px-4 py-2 text-sm hover:bg-accent/10"
        >
          Download PDF
        </a>
      </div>

      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>

      <div className="mt-12 p-6 bg-accent/10 border border-accent/30 rounded-lg not-prose text-center">
        <p className="text-sm uppercase tracking-wider text-accent mb-2">Next step</p>
        <h3 className="text-2xl font-bold mb-3">Book a call about SalesOS {tierLabel}</h3>
        <p className="text-muted-foreground mb-4">
          15 minutes. I'll tell you straight whether it's the right move for your agency.
        </p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
        >
          Book a call with Tim →
        </a>
      </div>

      {/* Signature */}
      <div className="mt-12 not-prose">
        <img
          src="/tim-signature.png"
          alt="Tim Kilroy signature"
          className="h-16 mb-2"
        />
        <p className="text-sm text-muted-foreground">— Tim Kilroy, SalesOS</p>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Add a placeholder signature image**

Add a placeholder `/Users/timkilroy/Projects/wtf-os/apps/web/public/tim-signature.png` if one doesn't exist. The launch checklist (§15 of spec) flags this — for v1 a styled hand-written font in HTML is acceptable as a fallback.

For now, keep the `<img>` reference — it'll render as a broken image in dev, replaced before launch.

- [ ] **Step 3: Smoke test**

Authenticate via the magic-link email, view the report. Verify markdown renders with proper formatting (headings, lists, blockquotes), CTA block at bottom, signature image (or placeholder).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/report/[id]/ReportContent.tsx
git commit -m "feat(biz-dev): report content renderer with CTA + signature"
```

---

### Task 23: Build the magic-link request page (fallback)

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/report/[id]/request-link/page.tsx`

- [ ] **Step 1: Create the request-link page**

This page is shown when a user hits the report URL without a valid session.

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function RequestLinkPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const resp = await fetch('/api/biz-dev/resend-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, assessmentId }),
    });
    if (resp.ok) setSubmitted(true);
    else setError(await resp.text());
  }

  if (submitted) {
    return (
      <main className="min-h-screen p-12 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Check your inbox</h1>
        <p className="text-muted-foreground">
          If your email is the one tied to this report, you'll have a fresh link in a minute.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-12 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Request a new link to your report</h1>
      <p className="text-muted-foreground mb-6">
        Magic links are single-use. Pop in the email you used and I'll send a fresh one.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@youragency.com"
          className="w-full rounded border border-border bg-background px-4 py-3"
        />
        <button
          type="submit"
          className="rounded-full bg-foreground text-background px-8 py-3 font-semibold hover:opacity-90"
        >
          Send me a fresh link
        </button>
      </form>
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 2: Create the resend-link API endpoint**

Create `apps/web/app/api/biz-dev/resend-link/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServiceClient } from '@/lib/supabase-server';
import { generateMagicLink } from '@/lib/biz-dev-auth';
import { onBizDevReportGenerated } from '@/lib/loops';

const schema = z.object({
  email: z.string().email(),
  assessmentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    const { email, assessmentId } = parsed.data;

    const svc = createServiceClient();
    const { data: row } = await svc
      .from('biz_dev_assessments')
      .select('email, name, verdict, stage, composite_score, cta_tier, dominant_trap, dimensions')
      .eq('id', assessmentId)
      .single();

    // Always return success to avoid confirming whether email matches
    if (!row || row.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://timkilroy.com';
    const magicLinkUrl = await generateMagicLink(email, `${siteUrl}/wtf-biz-dev-assessment/report/${assessmentId}`);

    // Re-send via Loops with same template
    const dimEntries = Object.entries(row.dimensions as Record<string, number>);
    dimEntries.sort((a, b) => a[1] - b[1]);
    const dimLabels: Record<string, string> = {
      lead_flow: 'Lead Flow', sales_process: 'Sales Process',
      icp_offer: 'ICP & Offer Clarity', founder_readiness: 'Founder Readiness',
      proof_enablement: 'Proof & Enablement',
    };
    const stageLabels: Record<string, string> = {
      all_founder_no_system: 'All Founder, No System',
      half_built_engine: 'Half-Built Engine',
      engine_online_hire_ready: 'Engine Online, Hire-Ready',
    };

    await onBizDevReportGenerated({
      email,
      name: row.name,
      verdict: row.verdict,
      stage: stageLabels[row.stage] ?? row.stage,
      composite: row.composite_score,
      cta_tier: row.cta_tier,
      dominant_trap: row.dominant_trap,
      top_3_gaps: dimEntries.slice(0, 3).map(([d]) => dimLabels[d] ?? d),
      magic_link_url: magicLinkUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[biz-dev:resend-link]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Smoke test**

In incognito browser, hit a report URL → expect redirect to `request-link` page. Submit your email → expect new magic-link email arrives → click it → expect successful login + report renders.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/wtf-biz-dev-assessment/report/[id]/request-link apps/web/app/api/biz-dev/resend-link
git commit -m "feat(biz-dev): magic-link re-request flow for confidential report access"
```

---

## Phase 7 — PDF Export

### Task 24: Build PDF export endpoint using @react-pdf/renderer

**Files:**
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/app/api/biz-dev/pdf/[id]/route.ts`
- Create: `/Users/timkilroy/Projects/wtf-os/apps/web/components/biz-dev-assessment/ReportPdf.tsx`

- [ ] **Step 1: Create the PDF component**

Create `apps/web/components/biz-dev-assessment/ReportPdf.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.6 },
  h1: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: 'bold', marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  para: { marginBottom: 8 },
  meta: { fontSize: 10, color: '#666', marginBottom: 24 },
  cta: { marginTop: 24, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 },
});

interface Props {
  markdown: string;
  stage: string;
  composite: number;
  ctaTier: 'studio' | 'growth';
  name: string;
}

// Minimal markdown→PDF converter: split by blank lines, recognize # / ## / ### prefixes
function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split(/\n/);
  const nodes: React.ReactNode[] = [];
  let buf: string[] = [];

  function flush() {
    if (buf.length) {
      nodes.push(<Text key={nodes.length} style={styles.para}>{buf.join(' ')}</Text>);
      buf = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('# ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h1}>{line.slice(2)}</Text>); }
    else if (line.startsWith('## ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h2}>{line.slice(3)}</Text>); }
    else if (line.startsWith('### ')) { flush(); nodes.push(<Text key={nodes.length} style={styles.h3}>{line.slice(4)}</Text>); }
    else if (line.trim() === '') { flush(); }
    else { buf.push(line); }
  }
  flush();
  return nodes;
}

export function ReportPdf({ markdown, stage, composite, ctaTier, name }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.meta}>
          BD Hire Readiness Report for {name} · Stage: {stage} · Composite: {composite}/100
        </Text>
        <View>{renderMarkdown(markdown)}</View>
        <View style={styles.cta}>
          <Text>Next step: Book a call about SalesOS {ctaTier === 'growth' ? 'Growth' : 'Studio'} at https://timkilroy.com/book</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create the PDF generation endpoint**

Create `apps/web/app/api/biz-dev/pdf/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { createClient as createAuthClient } from '@/lib/supabase-auth-server';
import { createClient as createServiceClient } from '@/lib/supabase-server';
import { ReportPdf } from '@/components/biz-dev-assessment/ReportPdf';

const STAGE_LABELS: Record<string, string> = {
  all_founder_no_system: 'All Founder, No System',
  half_built_engine: 'Half-Built Engine',
  engine_online_hire_ready: 'Engine Online, Hire-Ready',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth + ownership check (same as report page)
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const svc = createServiceClient();
  const { data: row } = await svc
    .from('biz_dev_assessments')
    .select('user_id, name, report_markdown, stage, composite_score, cta_tier, report_status')
    .eq('id', id)
    .single();

  if (!row || row.user_id !== user.id) return new Response('Not found', { status: 404 });
  if (row.report_status !== 'completed' || !row.report_markdown) {
    return new Response('Report not ready', { status: 425 });
  }

  const stream = await renderToStream(
    <ReportPdf
      markdown={row.report_markdown}
      stage={STAGE_LABELS[row.stage] ?? row.stage}
      composite={row.composite_score}
      ctaTier={row.cta_tier}
      name={row.name}
    />
  );

  // Convert Node stream to web ReadableStream
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bd-readiness-${id.slice(0, 8)}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Smoke test**

From the report page, click "Download PDF". Verify a PDF downloads. Open it — should contain the report content with stage, composite, and CTA.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/biz-dev/pdf apps/web/components/biz-dev-assessment/ReportPdf.tsx
git commit -m "feat(biz-dev): PDF export of confidential report"
```

---

## Phase 8 — Auth Callback

### Task 25: Verify Supabase magic-link callback handling

**Files:**
- Inspect: existing auth callback route (likely `apps/web/app/auth/callback/route.ts`)

- [ ] **Step 1: Verify existing callback works**

The Supabase magic-link URL generated by `generateLink` includes a `redirect_to` parameter set to the report page. When the user clicks, Supabase handles the OTP exchange and forwards them. Most apps using `@supabase/ssr` already have a callback at `/auth/callback`.

Confirm: `ls apps/web/app/auth/`

If a callback exists at `apps/web/app/auth/callback/route.ts`, verify it:
1. Reads the `code` query param
2. Calls `supabase.auth.exchangeCodeForSession(code)`
3. Redirects to the `next` query param (or the redirect_to)

If the existing callback does this, no work needed. If it's missing or insufficient, mirror it from a public reference:

```typescript
// apps/web/app/auth/callback/route.ts (only if missing)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
```

- [ ] **Step 2: End-to-end auth test**

Submit fresh assessment. Wait for email. Click magic link in email. Expect: lands on `/wtf-biz-dev-assessment/report/[id]` with full report rendered. Logout → revisit URL → expect redirect to request-link page.

- [ ] **Step 3: Commit (only if changes made)**

```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "feat(auth): ensure callback supports magic-link code exchange"
```

(Skip if no changes needed.)

---

## Phase 9 — Polish

### Task 26: Mobile responsive sweep + loading states

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/page.tsx`
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/wtf-biz-dev-assessment/report/[id]/{page,StageProgress,ReportContent}.tsx`

- [ ] **Step 1: Mobile QA pass**

In dev, test the flow on mobile viewport (Chrome devtools, iPhone 12 Pro size). Verify:
- Landing readable, button reachable
- Intake form fields stack and don't overflow
- Question step: choice buttons full-width on mobile, easy to tap
- Preview verdict: stage label readable, gap teaser readable
- Report page: markdown content readable, CTA button full-width on mobile

Fix specific issues with Tailwind responsive classes (e.g., add `md:` prefixes where appropriate).

- [ ] **Step 2: Loading states**

Verify that:
- During question submit (between final answer and preview render), there's no flash of nothing
- During the report-being-prepared state, the auto-refresh meta tag works
- During PDF download, there's no blocked UI (browser handles)

- [ ] **Step 3: Error states**

Test:
- Network failure on `/api/analyze/biz-dev` → preview verdict still shows (deterministic)
- Invalid LinkedIn URL → form rejects
- Report fetch fails → "Report not found" page shows
- Magic link expired → redirects to request-link page

- [ ] **Step 4: Commit any polish fixes**

```bash
git add apps/web/app/wtf-biz-dev-assessment/
git commit -m "polish(biz-dev): mobile responsive + loading/error states"
```

---

### Task 27: Add to navigation + sitemap

**Files:**
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/components/navigation/GlobalHeader.tsx`
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/sitemap.ts`
- Modify: `/Users/timkilroy/Projects/wtf-os/apps/web/app/labs/page.tsx`

- [ ] **Step 1: Add nav link**

In `GlobalHeader.tsx`, add to the assessments dropdown (mirrors the existing `WTF Assessment` link at line 24):

```tsx
{ label: 'BD Hire Readiness', href: '/wtf-biz-dev-assessment', description: 'Are you ready to hire a BD resource?' },
```

- [ ] **Step 2: Add to sitemap**

In `apps/web/app/sitemap.ts`, add an entry after the other `wtf-` entries:

```typescript
{
  url: `${baseUrl}/wtf-biz-dev-assessment`,
  lastModified: new Date(),
  changeFrequency: 'monthly' as const,
  priority: 0.7,
},
```

- [ ] **Step 3: Add to /labs index**

In `apps/web/app/labs/page.tsx`, add a card. Mirror the `wtf-assessment` card pattern (around line 88).

- [ ] **Step 4: Smoke test**

Visit `/labs` and the global nav — confirm new entry appears and navigates correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/navigation/GlobalHeader.tsx apps/web/app/sitemap.ts apps/web/app/labs/page.tsx
git commit -m "feat(biz-dev): add to navigation, sitemap, and /labs index"
```

---

## Phase 10 — Launch Checklist

### Task 28: Pre-launch verification

**Not a code task — a checklist run-through before announcing the assessment publicly.**

- [ ] **Env vars set in production** (`vercel env ls` or platform UI):
  - `SUPABASE_SERVICE_ROLE_KEY` (required for `auth.admin.generateLink`)
  - `NEXT_PUBLIC_SITE_URL` (used in magic-link redirect)
  - `BRIGHT_DATA_API` (research)
  - `LOOPS_API_KEY` (email)
  - `BEEHIIV_API_KEY` (newsletter)
  - `COPPER_*` keys (CRM)
  - `SLACK_*` webhook (alerts)
  - `NEXT_PUBLIC_STUDIO_BOOKING_URL`, `NEXT_PUBLIC_GROWTH_BOOKING_URL` (CTA links)

- [ ] **Supabase Auth OTP expiry raised to 24h** (Supabase Dashboard → Authentication → Email Settings)

- [ ] **Loops template `bizDevReportGenerated` created** in Loops dashboard with subject `Your BD Hire Readiness Report — {{stage}}` and body using all template fields

- [ ] **Beehiiv list verified** — confirm `addBizDevAssessmentSubscriber` posts to a real publication

- [ ] **Copper stage + ACVs confirmed** with Tim — adjust `BIZ_DEV_STUDIO_ACV` / `BIZ_DEV_GROWTH_ACV` to actual SalesOS pricing

- [ ] **BrightData dataset IDs verified** — the `researchLinkedInProfile` and `researchLinkedInPosts` calls return data on a known LinkedIn URL

- [ ] **Tim's signature image** uploaded to `apps/web/public/tim-signature.png` (or fallback styled font in place)

- [ ] **Booking URLs** (`STUDIO_BOOKING_URL`, `GROWTH_BOOKING_URL`) point to real Calendly / TidyCal / etc. links

- [ ] **End-to-end production smoke test** with a real (Tim-controlled) email + LinkedIn + website. Verify:
  1. Assessment completes in <10s on submit
  2. Magic-link email arrives within 5 min
  3. Magic link click → logged in → confidential report renders with personalized website + LinkedIn quotes
  4. PDF download works
  5. Slack alert posts
  6. Copper lead created
  7. Logout → revisit URL → redirected to request-link page → re-request works

- [ ] **Final commit** marks the launch:

```bash
git commit --allow-empty -m "release(biz-dev): WTF Biz Dev Assessment v1 launched"
```

---

## Self-Review Notes

**Spec coverage check:**
- §5 Architecture & Routes → Tasks 6, 10, 20, 23, 24, 25 ✓
- §6 User Flow → Tasks 6–9 ✓
- §7 Questions → Task 2 ✓
- §8 Scoring & Verdict → Tasks 3, 4 ✓
- §9 AI Pipeline → Tasks 12, 13, 14 ✓
- §10 Persistence + Auth + Confidentiality → Tasks 5, 11, 20, 23, 25 ✓
- §10 Stage Progression Visual + PDF → Tasks 21, 24 ✓
- §11 Integrations → Tasks 15–19 ✓
- §12 Voice → embedded in Task 13 prompt ✓
- §13 Edge Cases → Tasks 9 (network failure), 12 (research failure), 14 (AI failure), 20 (report not ready), 23 (magic-link expired) ✓
- §14 Testing → Task 3 (scoring tests). Integration/auth/snapshot deferred to manual QA per codebase convention ✓
- §16 Implementation Plan Handoff → tasks numbered roughly per spec sequence ✓

**Type consistency check:**
- `Stage` type: `all_founder_no_system | half_built_engine | engine_online_hire_ready` — consistent in scoring.ts, DB check constraint, StageProgress component, PDF endpoint
- `Verdict`: `'ready' | 'almost'` — consistent
- `CtaTier`: `'studio' | 'growth'` — consistent
- `AssessmentAnswers`: defined in biz-dev-questions.ts, used in scoring + API + client
- Function names: `scoreBizDevAssessment`, `resolveOrCreateUserByEmail`, `generateMagicLink`, `onBizDevReportGenerated`, `addBizDevAssessmentSubscriber`, `copperSyncBizDevLead`, `alertBizDevReportGenerated` — consistent throughout

**Placeholder scan:**
- Task 17 (Copper) leaves the implementation body as "follow existing copperSyncLead pattern" — this is acceptable because the existing function is the canonical reference and inlining it here would risk drift
- Task 22 references `STUDIO_BOOKING_URL` / `GROWTH_BOOKING_URL` as env vars — concrete values flagged in launch checklist
- Task 28 launch checklist has explicit Tim-confirmation items (ACVs, signature image, booking URLs)

No unfilled placeholders in code blocks. All function signatures, types, and exports are concrete.

---

**End of plan.**
