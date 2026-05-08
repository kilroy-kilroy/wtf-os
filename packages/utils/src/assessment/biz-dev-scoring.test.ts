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

    test('all-worst produces minimum scores on every dimension', () => {
      const r = scoreBizDevAssessment(ALL_WORST);
      expect(r.dimensions.lead_flow).toBe(0);
      // Q4 has no 0-score answer; minimum is 'a' = score 1 → 12.5 normalized
      expect(r.dimensions.sales_process).toBe(12.5);
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

    test('tie between Indispensability and Personality → prefers Indispensability', () => {
      // Q7 'd' → indispensability (1)
      // Q9 'c' → indispensability (1) [total 2]
      // Q3 'b' → personality (1)
      // Q4 'a' → personality (1) [total 2]
      // Tie 2-2 → indispensability wins per TRAP_TIE_ORDER
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
