import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Admin API: Generate Content from Assessment Data
 *
 * Takes aggregate assessment intelligence and generates content pieces.
 *
 * POST /api/admin/assessments/content
 * Body: {
 *   type: 'linkedin_post' | 'blog_outline' | 'benchmark_report' | 'newsletter' | 'twitter_thread',
 *   topic?: string,           // optional focus area
 *   tone?: string,            // optional tone override
 *   segment?: string,         // optional segment filter
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, topic, tone, segment } = await request.json();

    if (!type) {
      return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 });
    }

    // Fetch aggregate data
    const supabase = createServerClient();
    let query = supabase
      .from('assessments')
      .select('intake_data, scores')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: assessments, error } = await query;

    if (error || !assessments || assessments.length === 0) {
      return NextResponse.json({ error: 'No assessment data available' }, { status: 404 });
    }

    // Filter by segment if provided
    let filtered = assessments;
    if (segment) {
      filtered = assessments.filter((a: any) =>
        a.scores?.segmentLabel?.toLowerCase().includes(segment.toLowerCase())
      );
    }

    // Build data summary for the LLM
    const dataSummary = buildDataSummary(filtered);

    // Generate content
    const content = await generateContent(type, dataSummary, topic, tone);

    return NextResponse.json({
      success: true,
      type,
      content,
      dataPoints: filtered.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Content generation error:', error);
    return NextResponse.json({ error: error.message || 'Content generation failed' }, { status: 500 });
  }
}

function buildDataSummary(assessments: any[]): string {
  const n = assessments.length;
  if (n === 0) return 'No data available.';

  const zones: Record<string, number[]> = {};
  const revenues: number[] = [];
  const founderHours: number[] = [];
  const referralPcts: number[] = [];
  const delegationScores: number[] = [];
  const founderTaxes: number[] = [];
  const realityChecks: Record<string, number> = {};
  const bottlenecks: Record<string, number> = {};
  const churnReasons: Record<string, number> = {};
  const segments: Record<string, number> = {};

  for (const a of assessments) {
    const scores = a.scores as any;
    const intake = a.intake_data as any;
    if (!scores?.wtfZones) continue;

    // Zones
    for (const [zone, data] of Object.entries(scores.wtfZones) as [string, any][]) {
      if (!zones[zone]) zones[zone] = [];
      if (data?.score) zones[zone].push(data.score);
    }

    // Segments
    const seg = scores.segmentLabel || 'unknown';
    segments[seg] = (segments[seg] || 0) + 1;

    // Numbers
    const rev = intake.lastYearRevenue || intake.annualRevenue;
    if (rev) revenues.push(Number(rev));
    if (intake.founderWeeklyHours) founderHours.push(Number(intake.founderWeeklyHours));
    if (intake.referralPercent) referralPcts.push(Number(intake.referralPercent));
    if (scores.founderOS?.delegationScore) delegationScores.push(scores.founderOS.delegationScore);
    if (scores.revelations?.founderTax?.totalFounderTax) founderTaxes.push(scores.revelations.founderTax.totalFounderTax);

    // Reality checks
    for (const check of (scores.realityChecks || [])) {
      if (check.type !== 'celebration') {
        realityChecks[check.title] = (realityChecks[check.title] || 0) + 1;
      }
    }

    // Bottlenecks
    for (const area of (scores.founderOS?.bottleneckAreas || [])) {
      bottlenecks[area] = (bottlenecks[area] || 0) + 1;
    }

    // Churn reasons from follow-up
    if (scores.followUpAnswers?.primaryChurnReason) {
      const r = scores.followUpAnswers.primaryChurnReason;
      churnReasons[r] = (churnReasons[r] || 0) + 1;
    }
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const pct = (arr: number[], threshold: number) => arr.length ? Math.round(arr.filter(v => v >= threshold).length / arr.length * 100) : 0;

  const lines: string[] = [
    `DATA SUMMARY (${n} agency assessments)`,
    '',
    'SEGMENTS:',
    ...Object.entries(segments).map(([s, c]) => `  ${s}: ${c} (${Math.round(c / n * 100)}%)`),
    '',
    'ZONE SCORES (avg, 1-5 scale):',
    ...Object.entries(zones).map(([z, scores]) => `  ${z}: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}`),
    '',
    'KEY METRICS:',
    `  Average revenue: $${Math.round(avg(revenues) / 1000)}K`,
    `  Median team size: ${avg(founderHours.map(() => 0))} (calculated elsewhere)`,
    `  Average founder hours/week: ${avg(founderHours)}`,
    `  Average delegation score: ${delegationScores.length ? (delegationScores.reduce((a, b) => a + b, 0) / delegationScores.length).toFixed(1) : 'N/A'}`,
    `  Average referral dependency: ${avg(referralPcts)}%`,
    `  Founders working 50+ hrs: ${pct(founderHours, 50)}%`,
    `  Agencies 60%+ referral dependent: ${pct(referralPcts, 60)}%`,
    `  Average Founder Tax: $${founderTaxes.length ? Math.round(avg(founderTaxes) / 1000) : '?'}K/yr`,
    '',
    'MOST COMMON REALITY CHECKS (problems):',
    ...Object.entries(realityChecks).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, count]) =>
      `  ${title}: ${count} agencies (${Math.round(count / n * 100)}%)`),
    '',
    'MOST COMMON BOTTLENECK AREAS:',
    ...Object.entries(bottlenecks).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area, count]) =>
      `  ${area}: ${count} agencies (${Math.round(count / n * 100)}%)`),
  ];

  if (Object.keys(churnReasons).length > 0) {
    lines.push('', 'CHURN REASONS (from follow-up):');
    for (const [reason, count] of Object.entries(churnReasons).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${reason}: ${count}`);
    }
  }

  return lines.join('\n');
}

const CONTENT_TYPE_PROMPTS: Record<string, string> = {
  linkedin_post: `Write a LinkedIn post (1200-1500 characters) for an agency growth consultant.
The post should:
- Lead with a surprising data point or counterintuitive insight
- Use short paragraphs (1-2 sentences each)
- Include specific numbers from the data
- End with a question or call-to-action
- NOT use hashtags, emojis, or "I" as the first word
- Sound like a human who has actually seen these patterns, not a marketer`,

  blog_outline: `Create a detailed blog post outline for an agency growth blog.
Include:
- A compelling headline that references specific data
- 5-7 sections with subheadings
- Key data points to include in each section
- A suggested opening hook
- A conclusion that ties to a specific action item
- Suggested word count: 1500-2000 words`,

  benchmark_report: `Create an "Agency Benchmark Report" that agency owners would find valuable enough to share.
Include:
- Executive summary (2-3 sentences)
- Key findings (5-7 data-driven insights)
- Zone-by-zone benchmark data
- "How you compare" framing (percentiles)
- The biggest surprise in the data
- 3 action items based on the most common gaps
Format as clean markdown.`,

  newsletter: `Write a newsletter issue (600-800 words) for agency owners.
The newsletter should:
- Open with a provocative insight from the data
- Include 2-3 specific findings with context
- Give one actionable takeaway
- Close with a teaser for the next issue
- Tone: direct, no-BS, like a smart friend who happens to have data`,

  twitter_thread: `Write a Twitter/X thread (8-12 tweets) based on the assessment data.
Each tweet should:
- Be under 280 characters
- Start the thread with a hook that stops scrolling
- Include specific numbers where possible
- End with a clear takeaway
- NOT use hashtags
Format: number each tweet (1/, 2/, etc.)`,
};

async function generateContent(
  type: string,
  dataSummary: string,
  topic?: string,
  tone?: string,
): Promise<string> {
  const anthropic = new Anthropic();

  const typePrompt = CONTENT_TYPE_PROMPTS[type];
  if (!typePrompt) {
    throw new Error(`Unknown content type: ${type}. Valid types: ${Object.keys(CONTENT_TYPE_PROMPTS).join(', ')}`);
  }

  const systemPrompt = `You are a content writer for Tim Kilroy, an agency growth consultant who runs WTF (What's The Future) — a platform that helps agency owners diagnose and fix their businesses.

Tim's voice:
- Direct and blunt, never corporate
- Uses data to make points, not opinions
- Calls out uncomfortable truths agencies avoid
- Genuinely wants to help, but doesn't sugarcoat
- References specific patterns he sees across hundreds of agencies
${tone ? `\nAdditional tone note: ${tone}` : ''}

You have access to real aggregate data from agency assessments. Use it to create content that feels data-driven and authoritative. Never fabricate numbers — only use what's in the data summary provided.`;

  const userPrompt = `${typePrompt}

${topic ? `FOCUS TOPIC: ${topic}\n` : ''}
Here is the real data from our agency assessments:

${dataSummary}

Generate the content now. Use specific numbers from the data. If certain data points are missing or show "N/A", skip them rather than guessing.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  return textBlock ? (textBlock as any).text : '';
}
