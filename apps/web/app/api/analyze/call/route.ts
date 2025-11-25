import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  getIngestionItem,
  updateIngestionItemStatus,
  createCallScore,
  createCallSnippets,
  createFollowUpTemplates,
  updateToolRun,
} from '@repo/db';
import {
  runModel,
  parseModelJSON,
  retryWithBackoff,
  calculateAverageScore,
  scoreToGrade5,
} from '@repo/utils';
import {
  CALL_LAB_LITE_SYSTEM,
  CALL_LAB_LITE_USER,
  type CallLabLiteResponse,
} from '@repo/prompts';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.ingestion_item_id) {
      return NextResponse.json(
        { error: 'Missing required field: ingestion_item_id' },
        { status: 400 }
      );
    }

    const {
      ingestion_item_id,
      version = 'lite',
      rep_name = 'Sales Rep',
      known_objections,
      icp_context,
    } = body;

    // Initialize Supabase client
    const supabase = createServerClient();

    // Get ingestion item
    const ingestionItem = await getIngestionItem(supabase, ingestion_item_id);

    if (!ingestionItem) {
      return NextResponse.json({ error: 'Ingestion item not found' }, { status: 404 });
    }

    if (!ingestionItem.raw_content) {
      return NextResponse.json(
        { error: 'No transcript content found' },
        { status: 400 }
      );
    }

    // Update status to processing
    await updateIngestionItemStatus(supabase, ingestion_item_id, 'processing');

    // Extract metadata
    const metadata = (ingestionItem.transcript_metadata as any) || {};

    // Prepare prompt parameters
    const promptParams = {
      transcript: ingestionItem.raw_content,
      rep_name,
      prospect_company: metadata.prospect_company,
      prospect_role: metadata.prospect_role,
      call_stage: metadata.call_stage,
    };

    // Run AI analysis with retry logic
    let analysisResult: CallLabLiteResponse;
    let usage: { input: number; output: number };
    let modelUsed: string;

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel(
          'call-lab-lite',
          CALL_LAB_LITE_SYSTEM,
          CALL_LAB_LITE_USER(promptParams)
        );
      });

      usage = response.usage;
      modelUsed = 'claude-3-opus-20240229';

      // Parse JSON response
      analysisResult = parseModelJSON<CallLabLiteResponse>(response.content);
    } catch (error) {
      console.error('Error running AI analysis:', error);

      // Update status to failed
      await updateIngestionItemStatus(
        supabase,
        ingestion_item_id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return NextResponse.json(
        {
          error: 'Failed to analyze call',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Validate response
    if (!analysisResult.validation?.valid) {
      return NextResponse.json(
        {
          error: 'Transcript validation failed',
          details: analysisResult.validation?.opening_lines || 'Could not read transcript',
        },
        { status: 400 }
      );
    }

    // Store results in database
    try {
      // Create call score
      const callScore = await createCallScore(supabase, {
        ingestion_item_id,
        agency_id: ingestionItem.agency_id,
        user_id: ingestionItem.user_id || undefined,
        version: 'lite',
        overall_score: analysisResult.overall.score,
        overall_grade: analysisResult.overall.grade,
        diagnosis_summary: analysisResult.overall.one_liner,
        lite_scores: analysisResult.scores,
      });

      // Create snippets (strengths and weaknesses)
      const snippets = [
        ...analysisResult.strengths.map((s, idx) => ({
          call_score_id: callScore.id,
          ingestion_item_id,
          snippet_type: 'strength',
          transcript_quote: s.quote,
          rep_behavior: s.behavior,
          coaching_note: s.note,
          impact: 'positive',
          display_order: idx,
        })),
        ...analysisResult.weaknesses.map((w, idx) => ({
          call_score_id: callScore.id,
          ingestion_item_id,
          snippet_type: 'weakness',
          transcript_quote: w.quote,
          rep_behavior: w.behavior,
          coaching_note: w.note,
          impact: 'negative',
          display_order: idx + analysisResult.strengths.length,
        })),
      ];

      await createCallSnippets(supabase, snippets);

      // Create follow-up templates
      const followUps = analysisResult.follow_ups.map((f, idx) => ({
        call_score_id: callScore.id,
        template_type: f.type,
        subject_line: f.subject,
        body: f.body,
        display_order: idx,
      }));

      await createFollowUpTemplates(supabase, followUps);

      // Update ingestion item status
      await updateIngestionItemStatus(supabase, ingestion_item_id, 'completed');

      // Update tool run
      const duration = Date.now() - startTime;
      await updateToolRun(supabase, body.tool_run_id || '', {
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        result_ids: {
          call_score_id: callScore.id,
        },
        model_used: modelUsed,
        tokens_used: usage,
      });

      // Return results
      return NextResponse.json(
        {
          success: true,
          call_score_id: callScore.id,
          result: {
            overall_score: analysisResult.overall.score,
            overall_grade: analysisResult.overall.grade,
            diagnosis_summary: analysisResult.overall.one_liner,
            scores: analysisResult.scores,
            strengths: analysisResult.strengths,
            weaknesses: analysisResult.weaknesses,
            focus_area: analysisResult.focus_area,
            follow_ups: analysisResult.follow_ups,
            tasks: analysisResult.tasks,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error storing results:', error);

      return NextResponse.json(
        {
          error: 'Failed to store analysis results',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error analyzing call:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze call',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve an existing call score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callScoreId = searchParams.get('id');

    if (!callScoreId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: callScore, error: scoreError } = await supabase
      .from('call_scores')
      .select('*')
      .eq('id', callScoreId)
      .single();

    if (scoreError) throw scoreError;

    const { data: snippets, error: snippetsError } = await supabase
      .from('call_snippets')
      .select('*')
      .eq('call_score_id', callScoreId)
      .order('display_order', { ascending: true });

    if (snippetsError) throw snippetsError;

    const { data: followUps, error: followUpsError } = await supabase
      .from('follow_up_templates')
      .select('*')
      .eq('call_score_id', callScoreId)
      .order('display_order', { ascending: true });

    if (followUpsError) throw followUpsError;

    return NextResponse.json(
      {
        success: true,
        result: {
          id: (callScore as any)?.id,
          overall_score: (callScore as any)?.overall_score,
          overall_grade: (callScore as any)?.overall_grade,
          diagnosis_summary: (callScore as any)?.diagnosis_summary,
          lite_scores: (callScore as any)?.lite_scores,
          version: (callScore as any)?.version,
          snippets: snippets as any,
          follow_ups: followUps as any,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching call score:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch call score',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
