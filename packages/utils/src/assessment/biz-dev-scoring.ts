/**
 * WTF Biz Dev Assessment — Deterministic Scoring Engine
 *
 * Pure functions, no IO, no AI. Identical results client and server.
 *
 * Spec reference: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §8
 */

import {
  BIZ_DEV_QUESTIONS,
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
