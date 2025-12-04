import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  findOrCreateUser,
  findOrCreateAgency,
  assignUserToAgency,
  createDiscoveryBrief,
  updateDiscoveryBrief,
  getDiscoveryBrief,
  createToolRun,
  updateToolRun,
} from '@repo/db';
import { runModel, retryWithBackoff } from '@repo/utils';
import {
  DISCOVERY_LAB_LITE_SYSTEM,
  DISCOVERY_LAB_LITE_USER,
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  parseDiscoveryLabMetadata,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.what_you_sell || !body.target_company || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: what_you_sell, target_company, and email' },
        { status: 400 }
      );
    }

    const {
      // User info
      email,
      first_name,
      last_name,
      agency_name,
      // Required inputs
      what_you_sell,
      target_company,
      // Optional inputs
      market_concerns,
      target_contact_name,
      target_contact_title,
      // Pro-only inputs
      target_company_url,
      target_linkedin_url,
      product_strengths,
      deal_size,
      deal_stage,
      deal_urgency,
      // Version
      version = 'lite', // 'lite' or 'pro'
    } = body;

    // Initialize Supabase client
    const supabase = createServerClient();

    // Find or create user
    const user = await findOrCreateUser(supabase, email, first_name, last_name);

    // Find or create agency
    let agency = null;
    if (agency_name) {
      agency = await findOrCreateAgency(supabase, agency_name);
      await assignUserToAgency(supabase, user.id, agency.id, 'member');
    } else {
      agency = await findOrCreateAgency(supabase, `${first_name || email}'s Agency`);
      await assignUserToAgency(supabase, user.id, agency.id, 'owner');
    }

    // Create tool run record
    const toolRun = await createToolRun(supabase, {
      user_id: user.id,
      agency_id: agency.id,
      lead_email: email,
      lead_name: first_name ? `${first_name} ${last_name || ''}`.trim() : undefined,
      tool_name: `discovery_lab_${version}`,
      tool_version: '1.0',
      input_data: {
        what_you_sell,
        target_company,
        market_concerns,
        target_contact_name,
        target_contact_title,
        target_company_url,
        target_linkedin_url,
        product_strengths,
        deal_size,
        deal_stage,
        deal_urgency,
      },
    });

    // Prepare prompt parameters
    const promptParams: DiscoveryLabPromptParams = {
      what_you_sell,
      market_concerns,
      target_company,
      target_contact_name,
      target_contact_title,
      target_company_url,
      target_linkedin_url,
      product_strengths,
      deal_size,
      deal_stage,
      deal_urgency,
    };

    let usage: { input: number; output: number };
    let modelUsed: string;
    let markdownResponse: string;

    // Run AI analysis
    try {
      const systemPrompt =
        version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
      const userPrompt =
        version === 'pro'
          ? DISCOVERY_LAB_PRO_USER(promptParams)
          : DISCOVERY_LAB_LITE_USER(promptParams);

      const response = await retryWithBackoff(async () => {
        return await runModel(`discovery-lab-${version}`, systemPrompt, userPrompt);
      });

      usage = response.usage;
      modelUsed = 'claude-sonnet-4-5-20250929';
      markdownResponse = response.content;
    } catch (error) {
      console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

      // Try GPT-4o as fallback
      try {
        const systemPrompt =
          version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
        const userPrompt =
          version === 'pro'
            ? DISCOVERY_LAB_PRO_USER(promptParams)
            : DISCOVERY_LAB_LITE_USER(promptParams);

        const response = await retryWithBackoff(async () => {
          return await runModel(`discovery-lab-${version}`, systemPrompt, userPrompt, {
            provider: 'openai',
            model: 'gpt-4o',
          });
        });

        usage = response.usage;
        modelUsed = 'gpt-4o';
        markdownResponse = response.content;
      } catch (fallbackError) {
        console.error('Error running GPT-4o fallback:', fallbackError);

        // Update tool run with failure
        await updateToolRun(supabase, toolRun.id, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        });

        return NextResponse.json(
          {
            error: 'Failed to generate discovery brief with both Claude and GPT',
            details:
              fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Parse metadata from response
    const metadata = parseDiscoveryLabMetadata(markdownResponse, version as 'lite' | 'pro');

    // Store discovery brief in database
    try {
      const discoveryBrief = await createDiscoveryBrief(supabase, {
        user_id: user.id,
        agency_id: agency.id,
        version,
        what_you_sell,
        market_concerns,
        target_company,
        target_contact_name,
        target_contact_title,
        target_company_url,
        target_linkedin_url,
        product_strengths,
        deal_context: {
          size: deal_size,
          stage: deal_stage,
          urgency: deal_urgency,
        },
        markdown_response: markdownResponse,
        metadata: {
          question_count: metadata.questionCount,
          meeting_frame_count: metadata.meetingFrameCount,
        },
      });

      // Update tool run
      const duration = Date.now() - startTime;
      await updateToolRun(supabase, toolRun.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        result_ids: {
          discovery_brief_id: discoveryBrief.id,
        },
        model_used: modelUsed,
        tokens_used: usage,
      });

      // Return response
      return NextResponse.json(
        {
          success: true,
          discovery_brief_id: discoveryBrief.id,
          result: {
            markdown: markdownResponse,
            metadata,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error storing discovery brief:', error);

      return NextResponse.json(
        {
          error: 'Failed to store discovery brief',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in discovery analysis:', error);

    return NextResponse.json(
      {
        error: 'Failed to process discovery request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve an existing discovery brief
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const briefId = searchParams.get('id');

    if (!briefId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = createServerClient();
    const brief = await getDiscoveryBrief(supabase, briefId);

    if (!brief) {
      return NextResponse.json({ error: 'Discovery brief not found' }, { status: 404 });
    }

    const metadata = parseDiscoveryLabMetadata(
      brief.markdown_response || '',
      brief.version as 'lite' | 'pro'
    );

    return NextResponse.json(
      {
        success: true,
        result: {
          id: brief.id,
          markdown: brief.markdown_response,
          metadata,
          version: brief.version,
          target_company: brief.target_company,
          target_contact_name: brief.target_contact_name,
          target_contact_title: brief.target_contact_title,
          created_at: brief.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching discovery brief:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch discovery brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
