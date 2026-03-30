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
// Perplexity research step
// ============================================================================

async function researchAgency(agencyUrl: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

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

    // Step 2: Claude analysis + one-shot rewrite
    console.log('[OneShot] Step 2: Claude analysis + rewrite...');
    const { system, user: userPrompt } = buildOneShotAnalysisPrompt({
      agencyUrl: normalizedUrl,
      researchData,
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
