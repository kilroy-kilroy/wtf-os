export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { runModel, retryWithBackoff, type AssessmentAnswers, type ScoreResult } from '@repo/utils';
import { BIZ_DEV_SYSTEM_PROMPT, buildBizDevUserPrompt } from '@repo/prompts';
import { requireAdminRequest } from '@/lib/contracts/require-admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Re-runs ONLY the AI synthesis step for an existing biz_dev_assessments row,
 * using the answers, scoring, and research_artifacts that are already
 * persisted. Use to recover rows whose synthesis failed (report_status='failed'
 * or stuck in 'pending') without forcing the user to retake the assessment.
 */
export async function POST(request: NextRequest, ctx: RouteContext) {
  if (!(await requireAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const svc = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (svc as any)
    .from('biz_dev_assessments')
    .select('*')
    .eq('id', id)
    .single() as { data: Record<string, any> | null; error: unknown };

  if (error || !row) {
    return NextResponse.json({ error: 'Row not found' }, { status: 404 });
  }

  const required = [
    'answers', 'dimensions', 'composite_score', 'verdict', 'stage', 'cta_tier',
    'hard_gate_failures', 'research_artifacts',
  ] as const;
  for (const col of required) {
    if (row[col] === null || row[col] === undefined) {
      return NextResponse.json(
        { error: `Row is missing column '${col}' — re-synth requires the original POST to have completed scoring + research first.` },
        { status: 422 },
      );
    }
  }

  const score: ScoreResult = {
    dimensions: row.dimensions,
    composite: row.composite_score,
    verdict: row.verdict,
    stage: row.stage,
    hard_gate_failures: row.hard_gate_failures ?? [],
    dominant_trap: row.dominant_trap ?? null,
    cta_tier: row.cta_tier,
  };

  const userPrompt = buildBizDevUserPrompt({
    name: row.name,
    email: row.email,
    company_name: row.company_name,
    website_url: row.website_url,
    linkedin_url: row.linkedin_url,
    service_description: row.service_description,
    customer_description: row.customer_description,
    revenue_band: row.revenue_band,
    affordability_answer: row.affordability_answer,
    score,
    answers: row.answers as AssessmentAnswers,
    research: {
      linkedin_profile: row.research_artifacts?.linkedin_profile ?? null,
      linkedin_posts: row.research_artifacts?.linkedin_posts ?? null,
      website_content: row.research_artifacts?.website_content ?? null,
      partials: row.research_artifacts?.partials ?? [],
    },
  });

  let reportMarkdown: string;
  try {
    const response = await retryWithBackoff(async () => {
      return await runModel('biz-dev-assessment-v1', BIZ_DEV_SYSTEM_PROMPT, userPrompt);
    });
    reportMarkdown = response.content;
  } catch (err) {
    console.error('[biz-dev:resynth] AI synthesis failed:', err);
    return NextResponse.json(
      { error: 'Synthesis failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (svc as any)
    .from('biz_dev_assessments')
    .update({
      report_markdown: reportMarkdown,
      report_status: 'completed',
    })
    .eq('id', id);

  if (updateError) {
    console.error('[biz-dev:resynth] update failed:', updateError);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id,
    markdownLength: reportMarkdown.length,
  });
}
