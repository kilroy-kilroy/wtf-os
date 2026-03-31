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

    // Strip HTML tags, scripts, styles to get raw text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' [HEADER] ')
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

    // Truncate to ~4000 chars to keep it manageable
    return text.slice(0, 4000);
  } catch (error) {
    console.warn(`[OneShot] Website scrape failed for ${url}:`, error);
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

  // Combine: live scrape is the source of truth for current copy
  const parts: string[] = [];

  if (liveContent) {
    parts.push(`=== LIVE WEBSITE CONTENT (scraped directly from ${agencyUrl} right now) ===\n${liveContent}\n`);
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
