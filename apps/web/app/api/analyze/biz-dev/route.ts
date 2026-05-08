export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { createServerClient } from '@repo/db/client';
import {
  scoreBizDevAssessment,
  researchLinkedInProfile,
  researchLinkedInPosts,
  scrapeCompanyWebsite,
  runModel,
  retryWithBackoff,
  type AssessmentAnswers,
} from '@repo/utils';

// Inlined here because BRIGHTDATA_AUTH_FAILED_PREFIX is not exported from
// @repo/utils on this branch (it lives in unmerged WIP). Match the literal
// prefix used by research.ts so error detection still works.
const BRIGHTDATA_AUTH_FAILED_PREFIX = 'BRIGHTDATA_AUTH_FAILED';
import { alertBrightDataAuthExpired, alertBizDevReportGenerated } from '@/lib/slack';
import { BIZ_DEV_SYSTEM_PROMPT, buildBizDevUserPrompt } from '@repo/prompts';
import { resolveOrCreateUserByEmail, mintAccessToken } from '@/lib/biz-dev-auth';
import { onBizDevReportGenerated } from '@/lib/loops';
import { addBizDevAssessmentSubscriber } from '@/lib/beehiiv';
import { copperSyncBizDevLead } from '@/lib/copper';

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

type IntakeInput = z.infer<typeof intakeSchema>;
type AnswersInput = z.infer<typeof answersSchema>;
type ScoreOutput = ReturnType<typeof scoreBizDevAssessment>;

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

    const score = scoreBizDevAssessment(answers as AssessmentAnswers);

    const userId = await resolveOrCreateUserByEmail(intake.email);

    const supabase = createServerClient();
    const { data: row, error: insertErr } = await (supabase as any)
      .from('biz_dev_assessments')
      .insert({
        user_id: userId,
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
      })
      .select('id')
      .single();

    if (insertErr || !row) {
      console.error('[biz-dev] insert failed:', insertErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    waitUntil(processAssessment(row.id, intake, answers, score));

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

async function processAssessment(
  id: string,
  intake: IntakeInput,
  answers: AnswersInput,
  score: ScoreOutput
): Promise<void> {
  const supabase = createServerClient();

  // 1. Research
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

    if (results[2].status === 'fulfilled') {
      const websiteResult = results[2].value;
      websiteContent = typeof websiteResult === 'string' ? websiteResult : JSON.stringify(websiteResult);
    } else {
      partials.push('website');
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith(BRIGHTDATA_AUTH_FAILED_PREFIX)) {
      alertBrightDataAuthExpired(err.message);
    }
    console.error('[biz-dev] research failed:', err);
    researchStatus = 'failed';
  }

  if (partials.length > 0 && researchStatus !== 'failed') researchStatus = 'partial';

  // 2. Persist research artifacts
  await (supabase as any)
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
    reportMarkdown = response.content;
  } catch (err) {
    console.error('[biz-dev] AI synthesis failed:', err);
    reportStatus = 'failed';
  }

  // 4. Persist report
  await (supabase as any)
    .from('biz_dev_assessments')
    .update({
      report_markdown: reportMarkdown,
      report_status: reportStatus,
    })
    .eq('id', id);

  // 4. Side-effects: email, newsletter, CRM, Slack
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://timkilroy.com';

  // Mint our own 24h single-use access token (sidesteps Supabase's 1h OTP cap).
  // The report page consumes the token and exchanges it for a session.
  let reportLinkUrl: string;
  try {
    const accessToken = await mintAccessToken(id);
    reportLinkUrl = `${siteUrl}/wtf-biz-dev-assessment/report/${id}?access_token=${accessToken}`;
  } catch (err) {
    console.error('[biz-dev] access token mint failed:', err);
    // Fall back to a no-op so the rest of the pipeline still runs.
    reportLinkUrl = '';
  }

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
  const stageDisplay = stageDisplayLabels[score.stage] ?? score.stage;

  await Promise.allSettled([
    reportLinkUrl
      ? onBizDevReportGenerated({
          email: intake.email,
          name: intake.name,
          verdict: score.verdict,
          stage: stageDisplay,
          composite: score.composite,
          cta_tier: score.cta_tier,
          dominant_trap: score.dominant_trap,
          top_3_gaps,
          magic_link_url: reportLinkUrl,
        })
      : Promise.resolve(),

    intake.newsletter_opt_in
      ? addBizDevAssessmentSubscriber(intake.email, intake.name)
      : Promise.resolve(),

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

  alertBizDevReportGenerated(
    intake.name,
    intake.email,
    intake.company_name,
    score.verdict,
    stageDisplay,
    score.composite,
    score.cta_tier
  );
}
