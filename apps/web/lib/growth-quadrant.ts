// apps/web/lib/growth-quadrant.ts

import { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export type GrowthArchetype = 'The Sleeper' | 'The Hidden Gem' | 'The Megaphone' | 'The Machine';

export interface GrowthQuadrantResult {
  executionScore: number | null;    // 0-100 or null if no data
  positioningScore: number | null;  // 0-100 or null if no data
  archetype: GrowthArchetype | null; // null if insufficient data
  completeness: {
    callLab: boolean;
    discoveryLab: boolean;
    visibilityLab: boolean;
    wtfAssessment: boolean;
  };
  labsCompleted: number;
  labsTotal: 4;
}

export const ARCHETYPES: Record<GrowthArchetype, {
  emoji: string;
  oneLiner: string;
  improvementPath: string;
  improvementLabs: string[];
}> = {
  'The Sleeper': {
    emoji: '\u{1F634}',
    oneLiner: 'The talent is there. The world doesn\'t know yet.',
    improvementPath: 'Improve execution via Call Lab, or improve positioning via Visibility Lab',
    improvementLabs: ['Call Lab', 'Visibility Lab'],
  },
  'The Hidden Gem': {
    emoji: '\u{1F48E}',
    oneLiner: 'You convert when they find you. They just can\'t find you.',
    improvementPath: 'Improve positioning via Visibility Lab + WTF Assessment',
    improvementLabs: ['Visibility Lab', 'WTF Assessment'],
  },
  'The Megaphone': {
    emoji: '\u{1F4E2}',
    oneLiner: 'Everyone knows your name. Your pipeline says otherwise.',
    improvementPath: 'Improve execution via Call Lab + Discovery Lab',
    improvementLabs: ['Call Lab', 'Discovery Lab'],
  },
  'The Machine': {
    emoji: '\u{2699}\u{FE0F}',
    oneLiner: 'You\'re findable, credible, and you close. Now scale it.',
    improvementPath: 'Maintain and optimize all labs',
    improvementLabs: [],
  },
};

// --- Computation ---

/**
 * Compute execution score from Call Lab + Discovery Lab data.
 * Call Lab = 60% weight, Discovery Lab = 40% weight.
 */
function computeExecutionScore(
  callLabScore: number | null,
  discoveryLabScore: number | null
): number | null {
  if (callLabScore === null && discoveryLabScore === null) return null;

  // If only one axis has data, use it as the full score
  if (callLabScore !== null && discoveryLabScore === null) return callLabScore;
  if (discoveryLabScore !== null && callLabScore === null) return discoveryLabScore;

  return Math.round(callLabScore! * 0.6 + discoveryLabScore! * 0.4);
}

/**
 * Compute positioning score from Visibility Lab + WTF Assessment data.
 * Visibility Lab = 60% weight, WTF Assessment = 40% weight.
 */
function computePositioningScore(
  visibilityScore: number | null,
  assessmentScore: number | null
): number | null {
  if (visibilityScore === null && assessmentScore === null) return null;

  if (visibilityScore !== null && assessmentScore === null) return visibilityScore;
  if (assessmentScore !== null && visibilityScore === null) return assessmentScore;

  return Math.round(visibilityScore! * 0.6 + assessmentScore! * 0.4);
}

/**
 * Determine archetype from axis scores.
 */
function determineArchetype(
  executionScore: number | null,
  positioningScore: number | null
): GrowthArchetype | null {
  if (executionScore === null && positioningScore === null) return null;

  // If only one axis has data, we can still place them in a quadrant
  // by treating the missing axis as below threshold
  const exec = executionScore ?? 0;
  const pos = positioningScore ?? 0;

  // But if BOTH are null, return null (handled above)
  if (executionScore === null || positioningScore === null) return null;

  if (exec >= 50 && pos >= 50) return 'The Machine';
  if (exec >= 50 && pos < 50) return 'The Hidden Gem';
  if (exec < 50 && pos >= 50) return 'The Megaphone';
  return 'The Sleeper';
}

/**
 * Compute a normalized Discovery Lab score (0-100).
 * Based on: number of briefs, whether pro version used, brief completeness.
 */
function computeDiscoveryLabScore(briefs: Array<{
  version?: string;
  full_report?: Record<string, unknown>;
}>): number | null {
  if (!briefs || briefs.length === 0) return null;

  let score = 0;

  // Base: having at least 1 brief = 30 points
  score += 30;

  // Volume bonus: up to 20 points for multiple briefs (cap at 5)
  score += Math.min(briefs.length, 5) * 4;

  // Pro usage bonus: 25 points if any pro brief exists
  const hasPro = briefs.some(b => b.version === 'pro');
  if (hasPro) score += 25;

  // Completeness bonus: up to 25 points based on report data richness
  const latestBrief = briefs[0];
  if (latestBrief?.full_report) {
    const report = latestBrief.full_report;
    const fields = ['executive_summary', 'company_overview', 'discovery_questions', 'talking_points'];
    const filledFields = fields.filter(f => report[f]).length;
    score += Math.round((filledFields / fields.length) * 25);
  }

  return Math.min(score, 100);
}

/**
 * Main computation function.
 * Queries all lab tables and computes the Growth Quadrant placement.
 */
export async function computeGrowthQuadrant(
  supabase: SupabaseClient,
  userId: string
): Promise<GrowthQuadrantResult> {
  // Query all lab data in parallel
  const [callLabResult, discoveryResult, visibilityResult, assessmentResult] = await Promise.all([
    // Call Lab: latest report's full_report JSON (contains meta.overallScore on 0-100 scale)
    supabase
      .from('call_lab_reports')
      .select('full_report')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // Discovery Lab: all briefs for scoring
    supabase
      .from('discovery_briefs')
      .select('version, full_report')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),

    // Visibility Lab: latest report's visibility_score + clarity_score
    supabase
      .from('visibility_lab_reports')
      .select('visibility_score, vvv_clarity_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // WTF Assessment: latest assessment's overall_score (0-5 scale)
    supabase
      .from('assessments')
      .select('overall_score')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  // Extract Call Lab score from full_report JSON
  // Pro format stores meta.overallScore on 0-100 scale
  const fullReport = callLabResult.data?.full_report as Record<string, any> | null;
  const callLabScore: number | null =
    fullReport?.meta?.overallScore ??
    fullReport?.meta?.overall_score ??
    null;

  // Discovery Lab score (already 0-100 from computeDiscoveryLabScore)
  const discoveryBriefs = discoveryResult.data || [];
  const discoveryLabScore = computeDiscoveryLabScore(discoveryBriefs);

  // Visibility: weighted blend of visibilityScore (0-100) and clarityScore (0-10, scaled to 0-100)
  let visibilityScore: number | null = null;
  if (visibilityResult.data) {
    const vs = visibilityResult.data.visibility_score;
    const cs = visibilityResult.data.vvv_clarity_score;
    if (vs !== null && cs !== null) {
      visibilityScore = Math.round(vs * 0.7 + (cs * 10) * 0.3);
    } else if (vs !== null) {
      visibilityScore = vs;
    }
  }

  // WTF Assessment: overall_score is on 0-5 scale, normalize to 0-100
  const rawAssessmentScore = assessmentResult.data?.overall_score ?? null;
  const assessmentScore: number | null =
    rawAssessmentScore !== null
      ? Math.round(rawAssessmentScore * 20)
      : null;

  // Compute axes
  const executionScore = computeExecutionScore(callLabScore, discoveryLabScore);
  const positioningScore = computePositioningScore(visibilityScore, assessmentScore);

  // Determine archetype
  const archetype = determineArchetype(executionScore, positioningScore);

  const completeness = {
    callLab: callLabResult.data !== null,
    discoveryLab: discoveryBriefs.length > 0,
    visibilityLab: visibilityResult.data !== null,
    wtfAssessment: assessmentResult.data !== null,
  };

  const labsCompleted = Object.values(completeness).filter(Boolean).length;

  return {
    executionScore,
    positioningScore,
    archetype,
    completeness,
    labsCompleted,
    labsTotal: 4,
  };
}

/**
 * Lightweight version for API routes that already have a Supabase client.
 * Returns just the archetype info needed for Loops events.
 */
export async function getArchetypeForLoops(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  archetype: string;
  executionScore: number;
  positioningScore: number;
}> {
  const result = await computeGrowthQuadrant(supabase, userId);
  return {
    archetype: result.archetype || 'Incomplete',
    executionScore: result.executionScore ?? 0,
    positioningScore: result.positioningScore ?? 0,
  };
}
