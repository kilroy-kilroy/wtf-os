export const maxDuration = 300; // 5 minutes - Perplexity research + Claude analysis

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-auth-server';
import { runModel } from '@repo/utils';
import {
  buildOneShotResearchPrompt,
  buildOneShotAnalysisPrompt,
} from '@repo/prompts';

const ALLOWED_EMAILS = ['tim@timkilroy.com', 'tk@timkilroy.com'];

// ============================================================================
// Direct website scrape (gets CURRENT live content)
// ============================================================================

function cleanInlineTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeroSection(html: string): string | null {
  // Strip noise first
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // Strategy: find the START of a hero container, then grab a generous chunk
  // after it and strip tags. This avoids the nested-closing-tag regex problem.
  const heroOpeners = [
    /<(?:section|div)[^>]*(?:class|id)="[^"]*hero[^"]*"[^>]*>/i,
    /<(?:section|div)[^>]*(?:class|id)="[^"]*banner[^"]*"[^>]*>/i,
    /<(?:section|div)[^>]*(?:class|id)="[^"]*masthead[^"]*"[^>]*>/i,
    /<(?:section|div)[^>]*(?:class|id)="[^"]*above-fold[^"]*"[^>]*>/i,
    /<(?:section|div)[^>]*(?:class|id)="[^"]*jumbotron[^"]*"[^>]*>/i,
  ];

  for (const pattern of heroOpeners) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      // Grab ~3000 chars of HTML after the hero opener, then strip tags
      const chunk = cleaned.slice(match.index, match.index + 3000);
      const text = cleanInlineTags(chunk);
      if (text.length > 20) return text.slice(0, 1000);
    }
  }

  // Fallback: first <main> content, taking a chunk from the start
  const mainMatch = cleaned.match(/<main[^>]*>/i);
  if (mainMatch && mainMatch.index !== undefined) {
    const chunk = cleaned.slice(mainMatch.index, mainMatch.index + 3000);
    const text = cleanInlineTags(chunk);
    if (text.length > 20) return text.slice(0, 1000);
  }

  // Last resort: grab everything between </nav> (or </header>) and the next
  // <section> or <footer>, which is usually the hero on simple sites
  const afterNav = html.match(/<\/(?:nav|header)>\s*([\s\S]{100,3000}?)(?=<(?:section|footer|div[^>]*class="[^"]*(?:footer|sidebar)))/i);
  if (afterNav) {
    const text = cleanInlineTags(afterNav[1]);
    if (text.length > 30) return text.slice(0, 1000);
  }

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SalesOS/1.0; +https://timkilroy.com)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return '';

    const html = await response.text();

    // Extract hero section separately so Claude knows what's above-the-fold
    const hero = extractHeroSection(html);
    const fullText = stripHtml(html);

    const parts: string[] = [];
    if (hero) {
      parts.push(`[HERO SECTION - above the fold copy]:\n${hero}\n`);
    }
    parts.push(`[FULL PAGE CONTENT]:\n${fullText.slice(0, hero ? 3000 : 4000)}`);

    return parts.join('\n');
  } catch (error) {
    console.warn(`[OneShot] Basic scrape failed for ${url}:`, error);
    return '';
  }
}

// Apify fallback for JS-rendered sites
async function scrapeWithApify(url: string): Promise<string> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) return '';

  try {
    console.log('[OneShot] Falling back to Apify scraper...');

    // Start the Website Content Crawler actor
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 3,
          maxCrawlDepth: 1,
          crawlerType: 'playwright:firefox',
        }),
      }
    );

    if (!startResponse.ok) {
      console.warn('[OneShot] Apify start failed:', startResponse.status);
      return '';
    }

    const runData = await startResponse.json();
    const runId = runData.data?.id;
    if (!runId) return '';

    // Poll for completion (max 60s)
    const deadline = Date.now() + 60000;
    let status = 'RUNNING';
    while (status === 'RUNNING' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data?.status || 'FAILED';
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[OneShot] Apify run ended with status: ${status}`);
      return '';
    }

    // Fetch results
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) return '';

    const dataResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=3`
    );
    const items = await dataResponse.json();

    const content = (items as Array<{ title?: string; text?: string }>)
      .map((item) => `## ${item.title || 'Page'}\n${item.text || ''}`)
      .join('\n\n');

    console.log(`[OneShot] Apify returned ${content.length} chars from ${(items as unknown[]).length} pages`);
    return content.slice(0, 6000);
  } catch (error) {
    console.warn('[OneShot] Apify scrape failed:', error);
    return '';
  }
}

// ============================================================================
// Perplexity research step (context + social/competitive intel)
// ============================================================================

async function researchAgency(agencyUrl: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  // Scrape the live website in parallel with Perplexity research
  const [liveContent, perplexityResult] = await Promise.all([
    scrapeWebsite(agencyUrl),
    (async () => {
      const { system, user } = buildOneShotResearchPrompt(agencyUrl);
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    })(),
  ]);

  // If basic scrape returned thin results (JS-rendered site), try Apify
  let finalContent = liveContent;
  if (liveContent.length < 300) {
    console.log(`[OneShot] Basic scrape thin (${liveContent.length} chars), trying Apify...`);
    const apifyContent = await scrapeWithApify(agencyUrl);
    if (apifyContent.length > liveContent.length) {
      finalContent = apifyContent;
      console.log(`[OneShot] Apify provided better content (${apifyContent.length} chars)`);
    }
  }

  // Combine: live scrape is the source of truth for current copy
  const parts: string[] = [];

  if (finalContent) {
    parts.push(`=== LIVE WEBSITE CONTENT (scraped directly from ${agencyUrl} right now) ===\n${finalContent}\n`);
  }

  if (perplexityResult) {
    parts.push(`=== ADDITIONAL RESEARCH (from search) ===\n${perplexityResult}\n`);
  }

  if (parts.length === 0) {
    return `No content could be retrieved from ${agencyUrl}. The site may be down or blocking automated access.`;
  }

  return parts.join('\n');
}

// ============================================================================
// Main route handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth check - only allowed emails can use this endpoint
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ALLOWED_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.agency_url) {
      return NextResponse.json(
        { error: 'Missing required field: agency_url' },
        { status: 400 }
      );
    }

    const { agency_url, agency_name, ceo_name } = body;

    // Normalize URL
    const normalizedUrl = agency_url.startsWith('http')
      ? agency_url
      : `https://${agency_url}`;

    console.log(`[OneShot] Starting analysis for: ${normalizedUrl}`);

    // Step 1: Perplexity research
    console.log('[OneShot] Step 1: Perplexity research...');
    const researchData = await researchAgency(normalizedUrl);
    console.log(
      `[OneShot] Research complete (${researchData.length} chars)`
    );

    // Check if research is thin or likely irrelevant
    if (researchData.length < 200) {
      console.warn(`[OneShot] Research very thin (${researchData.length} chars) - proceeding with limited data`);
    }

    // Step 2: Claude analysis + one-shot rewrite
    console.log('[OneShot] Step 2: Claude analysis + rewrite...');
    const { system, user: userPrompt } = buildOneShotAnalysisPrompt({
      agencyUrl: normalizedUrl,
      researchData: researchData || `No research data available for ${normalizedUrl}. Analyze based on URL and any provided context.`,
      ceoName: ceo_name,
      agencyName: agency_name,
    });

    const result = await runModel('one-shot', system, userPrompt);
    console.log(
      `[OneShot] Analysis complete (${result.usage.input} in, ${result.usage.output} out)`
    );

    // Parse JSON response
    let report;
    try {
      // Strip markdown code fences if present
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '');
      }
      report = JSON.parse(content);
    } catch (parseError) {
      console.error('[OneShot] JSON parse error:', parseError);
      console.error('[OneShot] Raw response:', result.content.slice(0, 500));
      return NextResponse.json(
        {
          error: 'Failed to parse analysis response',
          raw: result.content,
        },
        { status: 500 }
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[OneShot] Complete in ${elapsed}s`);

    return NextResponse.json({
      success: true,
      report,
      research: researchData,
      timing: {
        totalSeconds: parseFloat(elapsed),
      },
      usage: result.usage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[OneShot] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
