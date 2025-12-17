import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import { runModel, retryWithBackoff } from '@repo/utils';
import {
  DISCOVERY_LAB_LITE_SYSTEM,
  DISCOVERY_LAB_LITE_USER,
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  parseDiscoveryMetadata,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';
import { onDiscoveryReportGenerated } from '@/lib/loops';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requestor_name || !body.requestor_email || !body.service_offered || !body.target_company) {
      return NextResponse.json(
        {
          error: 'Missing required fields: requestor_name, requestor_email, service_offered, and target_company are required',
        },
        { status: 400 }
      );
    }

    const {
      requestor_name,
      requestor_email,
      requestor_company,
      service_offered,
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      competitors,
      version = 'lite', // 'lite' or 'pro'
    } = body;

    // Prepare prompt parameters
    const promptParams: DiscoveryLabPromptParams = {
      requestor_name,
      requestor_email,
      requestor_company,
      service_offered,
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      competitors,
    };

    let usage: { input: number; output: number };
    let modelUsed: string;
    let markdownResponse: string;

    // Choose prompts based on version
    const systemPrompt = version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
    const userPrompt =
      version === 'pro'
        ? DISCOVERY_LAB_PRO_USER(promptParams)
        : DISCOVERY_LAB_LITE_USER(promptParams);

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel('discovery-lab-' + version, systemPrompt, userPrompt);
      });

      usage = response.usage;
      modelUsed = 'claude-sonnet-4-5-20250929';
      markdownResponse = response.content;
    } catch (error) {
      console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

      // Try GPT-4o as fallback
      try {
        const response = await retryWithBackoff(async () => {
          return await runModel('discovery-lab-' + version, systemPrompt, userPrompt, {
            provider: 'openai',
            model: 'gpt-4o',
          });
        });

        usage = response.usage;
        modelUsed = 'gpt-4o';
        markdownResponse = response.content;
      } catch (fallbackError) {
        console.error('Error running GPT-4o fallback:', fallbackError);

        return NextResponse.json(
          {
            error: 'Failed to generate discovery brief with both Claude and GPT',
            details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Parse metadata from response
    const metadata = parseDiscoveryMetadata(markdownResponse, version as 'lite' | 'pro');

    // Log usage for tracking
    const duration = Date.now() - startTime;
    console.log('Discovery Lab analysis completed:', {
      version,
      model: modelUsed,
      duration_ms: duration,
      tokens: usage,
      requestor_email,
      target_company,
    });

    // Store report in database
    const supabase = createServerClient();
    const { data: insertedReport, error: insertError } = await supabase
      .from('discovery_briefs')
      .insert({
        lead_email: requestor_email,
        lead_name: requestor_name,
        lead_company: requestor_company || null,
        version: version,
        what_you_sell: service_offered,
        target_company: target_company,
        target_contact_name: target_contact_name || null,
        target_contact_title: target_contact_title || null,
        target_company_url: target_website || null,
        markdown_response: markdownResponse,
        metadata: {
          ...metadata,
          model: modelUsed,
          tokens: usage,
          duration_ms: duration,
          competitors: competitors || null,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save discovery brief:', insertError);
      // Continue anyway - don't fail the request just because we couldn't save
    }

    const reportId = insertedReport?.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const reportUrl = reportId ? `${appUrl}/discovery-lab/report/${reportId}` : undefined;

    // Fire Loops event for email sequences/analytics (fire-and-forget)
    onDiscoveryReportGenerated(
      requestor_email,
      version as 'lite' | 'pro',
      target_company,
      target_contact_name,
      target_contact_title,
      reportId,
      reportUrl
    ).catch((err) => console.error('Loops event failed:', err));

    // Return the result
    return NextResponse.json(
      {
        success: true,
        result: {
          markdown: markdownResponse,
          metadata,
          reportId,
          reportUrl,
        },
        usage: {
          model: modelUsed,
          tokens: usage,
          duration_ms: duration,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating discovery brief:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate discovery brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
