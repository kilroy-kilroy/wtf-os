import { NextRequest, NextResponse } from 'next/server';
import { runModel } from '@repo/utils';
import {
  CALLLAB_LITE_MARKDOWN_SYSTEM,
  CALLLAB_LITE_MARKDOWN_USER,
  CALLLAB_PRO_MARKDOWN_SYSTEM,
  CALLLAB_PRO_MARKDOWN_USER,
  type MarkdownPromptParams,
} from '@repo/prompts';

/**
 * Test endpoint for Call Lab analysis without database dependency
 * POST /api/test-analysis
 *
 * Body:
 * - transcript: string (required)
 * - version: 'lite' | 'pro' (default: 'lite')
 * - rep_name: string (optional)
 * - prospect_company: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.transcript) {
      return NextResponse.json(
        { error: 'Missing required field: transcript' },
        { status: 400 }
      );
    }

    const {
      transcript,
      version = 'lite',
      rep_name,
      prospect_company,
      prospect_role,
      call_stage,
    } = body;

    const promptParams: MarkdownPromptParams = {
      transcript,
      rep_name,
      prospect_company,
      prospect_role,
      call_stage,
    };

    // Select prompts based on version
    const systemPrompt = version === 'pro'
      ? CALLLAB_PRO_MARKDOWN_SYSTEM
      : CALLLAB_LITE_MARKDOWN_SYSTEM;

    const userPrompt = version === 'pro'
      ? CALLLAB_PRO_MARKDOWN_USER(promptParams)
      : CALLLAB_LITE_MARKDOWN_USER(promptParams);

    // Run the model
    const toolName = version === 'pro' ? 'call-lab-full' : 'call-lab-lite';
    const result = await runModel(toolName, systemPrompt, userPrompt);

    return NextResponse.json({
      success: true,
      version,
      markdown: result.content,
      metadata: {
        rep_name,
        prospect_company,
        generated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Test analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
