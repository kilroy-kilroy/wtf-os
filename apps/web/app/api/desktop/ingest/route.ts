export const maxDuration = 300; // 5 minutes — analysis can take a while

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getSubscriptionStatus } from '@/lib/subscription';
import {
  findOrCreateUser,
  findOrCreateAgency,
  assignUserToAgency,
  createIngestionItem,
  createToolRun,
  getIngestionItem,
  updateIngestionItemStatus,
  createCallScore,
  updateToolRun,
} from '@repo/db';
import {
  normalizeTranscript,
  getTranscriptStats,
  runModel,
  retryWithBackoff,
} from '@repo/utils';
import {
  CALLLAB_PRO_MARKDOWN_SYSTEM,
  CALLLAB_PRO_MARKDOWN_USER,
  parseMarkdownMetadata,
  type MarkdownPromptParams,
} from '@repo/prompts';

/**
 * POST /api/desktop/ingest
 *
 * Authenticated transcript ingest from the desktop Call Recorder app.
 * Verifies Call Lab Pro subscription, ingests the transcript, and triggers
 * Pro analysis.
 *
 * Authorization: Bearer <supabase_access_token>
 * Body: { transcript: string, metadata?: { prospect_company, prospect_role, call_stage, ... } }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email associated with this account' },
        { status: 400 }
      );
    }

    // Verify Pro subscription
    const status = await getSubscriptionStatus(supabase, user.id, user.email);
    if (!status.hasCallLabPro) {
      return NextResponse.json(
        { error: 'Call Lab Pro subscription required' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    if (!body.transcript) {
      return NextResponse.json(
        { error: 'Missing required field: transcript' },
        { status: 400 }
      );
    }

    const { transcript, metadata = {} } = body;
    const email = user.email;

    // Find or create user record
    const dbUser = await findOrCreateUser(supabase, email);

    // Find or create agency
    let agency = null;
    const { data: assignmentData } = await supabase
      .from('user_agency_assignments')
      .select('agency_id')
      .eq('user_id', dbUser.id)
      .limit(1)
      .single();

    if (assignmentData?.agency_id) {
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', assignmentData.agency_id)
        .single();
      agency = agencyData;
    }

    if (!agency) {
      agency = await findOrCreateAgency(supabase, `${email}'s Agency`);
      await assignUserToAgency(supabase, dbUser.id, agency.id, 'owner');
    }

    // Normalize and process transcript
    const normalizedTranscript = normalizeTranscript(transcript);
    const stats = getTranscriptStats(normalizedTranscript);

    // Create ingestion item
    const ingestionItem = await createIngestionItem(supabase, {
      agency_id: agency.id,
      user_id: dbUser.id,
      source_type: 'transcript',
      source_channel: 'desktop-recorder',
      raw_content: normalizedTranscript,
      content_format: 'text',
      transcript_metadata: {
        word_count: stats.wordCount,
        estimated_duration: stats.estimatedDuration,
        participant_count: stats.participantCount,
        prospect_company: metadata.prospect_company,
        prospect_role: metadata.prospect_role,
        call_stage: metadata.call_stage,
      },
    });

    // Create tool run record
    const toolRun = await createToolRun(supabase, {
      user_id: dbUser.id,
      agency_id: agency.id,
      lead_email: email,
      tool_name: 'call_lab_pro',
      tool_version: '1.0',
      ingestion_item_id: ingestionItem.id,
      input_data: {
        source: 'desktop-recorder',
        prospect_company: metadata.prospect_company,
        prospect_role: metadata.prospect_role,
        call_stage: metadata.call_stage,
      },
    });

    // Run Pro analysis inline
    const promptParams: MarkdownPromptParams = {
      transcript: normalizedTranscript,
      rep_name: metadata.rep_name || 'Sales Rep',
      prospect_company: metadata.prospect_company,
      prospect_role: metadata.prospect_role,
      call_stage: metadata.call_stage,
    };

    let markdownResponse: string;
    let modelUsed: string;
    let usage: { input: number; output: number };

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel(
          'call-lab-pro',
          CALLLAB_PRO_MARKDOWN_SYSTEM,
          CALLLAB_PRO_MARKDOWN_USER(promptParams)
        );
      }, 2);

      markdownResponse = response.content;
      modelUsed = 'claude-sonnet-4-5-20250929';
      usage = response.usage;
    } catch (error) {
      console.error('Claude analysis failed, trying GPT-4o:', error);

      try {
        const response = await retryWithBackoff(async () => {
          return await runModel(
            'call-lab-pro',
            CALLLAB_PRO_MARKDOWN_SYSTEM,
            CALLLAB_PRO_MARKDOWN_USER(promptParams),
            { provider: 'openai', model: 'gpt-4o' }
          );
        }, 2);

        markdownResponse = response.content;
        modelUsed = 'gpt-4o';
        usage = response.usage;
      } catch (fallbackError) {
        console.error('GPT-4o fallback also failed:', fallbackError);

        await updateIngestionItemStatus(
          supabase,
          ingestionItem.id,
          'failed',
          fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        );

        return NextResponse.json(
          {
            success: false,
            ingestionItemId: ingestionItem.id,
            error: 'Analysis failed — transcript has been saved and can be re-analyzed from Call Lab',
          },
          { status: 500 }
        );
      }
    }

    // Parse and store results
    const markdownMetadata = parseMarkdownMetadata(markdownResponse);

    const callScore = await createCallScore(supabase, {
      ingestion_item_id: ingestionItem.id,
      agency_id: agency.id,
      user_id: dbUser.id,
      version: 'pro',
      overall_score: markdownMetadata.score,
      overall_grade: markdownMetadata.effectiveness,
      diagnosis_summary: markdownResponse.substring(0, 500),
      markdown_response: markdownResponse,
    });

    await updateIngestionItemStatus(supabase, ingestionItem.id, 'completed');

    const duration = Date.now() - startTime;
    await updateToolRun(supabase, toolRun.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      result_ids: { call_score_id: callScore.id },
      model_used: modelUsed,
      tokens_used: usage,
    });

    return NextResponse.json({
      success: true,
      ingestionItemId: ingestionItem.id,
      callScoreId: callScore.id,
    });
  } catch (error) {
    console.error('Desktop ingest error:', error);
    return NextResponse.json(
      {
        error: 'Failed to ingest transcript',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
