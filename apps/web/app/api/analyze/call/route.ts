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
  CALLLAB_LITE_MARKDOWN_SYSTEM,
  CALLLAB_LITE_MARKDOWN_USER,
  CALLLAB_PRO_MARKDOWN_SYSTEM,
  CALLLAB_PRO_MARKDOWN_USER,
  parseMarkdownMetadata,
  type MarkdownPromptParams,
  CALL_LAB_PRO_SYSTEM_PROMPT,
  CALL_LAB_PRO_JSON_SCHEMA,
} from '@repo/prompts';
import { onReportGenerated } from '@/lib/loops';

// Helper to send report generated email via Loops
async function sendReportEmail(
  supabase: any,
  userId: string | null | undefined,
  reportId: string,
  reportType: 'lite' | 'pro',
  prospectName?: string,
  companyName?: string
) {
  if (!userId) return;

  try {
    // Look up user's email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (user?.email) {
      await onReportGenerated(
        user.email,
        reportId,
        reportType,
        prospectName,
        companyName
      ).catch(err => {
        console.error('Failed to send Loops report email:', err);
      });
    }
  } catch (err) {
    console.error('Error looking up user for Loops:', err);
  }
}

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
      version = 'lite', // 'lite' or 'pro'
      use_markdown = true, // Default to new markdown prompts
      rep_name = 'Sales Rep',
      prospect_name,
      prospect_company,
      call_type,
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
    const promptParams: MarkdownPromptParams = {
      transcript: ingestionItem.raw_content,
      rep_name,
      prospect_company: metadata.prospect_company,
      prospect_role: metadata.prospect_role,
      call_stage: metadata.call_stage,
    };

    let usage: { input: number; output: number };
    let modelUsed: string;
    let markdownResponse: string | null = null;
    let analysisResult: CallLabLiteResponse | null = null;

    // Choose which prompt system to use
    if (use_markdown) {
      // NEW: Use markdown-based prompts
      try {
        const systemPrompt =
          version === 'pro'
            ? CALLLAB_PRO_MARKDOWN_SYSTEM
            : CALLLAB_LITE_MARKDOWN_SYSTEM;
        const userPrompt =
          version === 'pro'
            ? CALLLAB_PRO_MARKDOWN_USER(promptParams)
            : CALLLAB_LITE_MARKDOWN_USER(promptParams);

        const response = await retryWithBackoff(async () => {
          return await runModel('call-lab-' + version, systemPrompt, userPrompt);
        });

        usage = response.usage;
        modelUsed = 'claude-sonnet-4-5-20250929';
        markdownResponse = response.content;
      } catch (error) {
        console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

        // Try GPT-4o as fallback
        try {
          const systemPrompt =
            version === 'pro'
              ? CALLLAB_PRO_MARKDOWN_SYSTEM
              : CALLLAB_LITE_MARKDOWN_SYSTEM;
          const userPrompt =
            version === 'pro'
              ? CALLLAB_PRO_MARKDOWN_USER(promptParams)
              : CALLLAB_LITE_MARKDOWN_USER(promptParams);

          const response = await retryWithBackoff(async () => {
            return await runModel('call-lab-' + version, systemPrompt, userPrompt, {
              provider: 'openai',
              model: 'gpt-4o',
            });
          });

          usage = response.usage;
          modelUsed = 'gpt-4o';
          markdownResponse = response.content;
        } catch (fallbackError) {
          console.error('Error running GPT-4o fallback:', fallbackError);

          await updateIngestionItemStatus(
            supabase,
            ingestion_item_id,
            'failed',
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          );

          return NextResponse.json(
            {
              error: 'Failed to analyze call with both Claude and GPT',
              details:
                fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      }

      // Parse markdown to extract metadata
      const markdownMetadata = parseMarkdownMetadata(markdownResponse!);

      // Store markdown response in database
      try {
        const callScore = await createCallScore(supabase, {
          ingestion_item_id,
          agency_id: ingestionItem.agency_id,
          user_id: ingestionItem.user_id || undefined,
          version: version,
          overall_score: markdownMetadata.score,
          overall_grade: markdownMetadata.effectiveness,
          diagnosis_summary: markdownResponse!.substring(0, 500), // First 500 chars as summary
          markdown_response: markdownResponse!,
        });

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

        // Send report email via Loops (non-blocking)
        sendReportEmail(
          supabase,
          ingestionItem.user_id,
          callScore.id,
          version === 'pro' ? 'pro' : 'lite',
          metadata.prospect_name,
          metadata.prospect_company
        );

        // Return markdown response
        return NextResponse.json(
          {
            success: true,
            call_score_id: callScore.id,
            result: {
              markdown: markdownResponse,
              metadata: markdownMetadata,
            },
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('Error storing markdown results:', error);

        return NextResponse.json(
          {
            error: 'Failed to store analysis results',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    } else {
      // JSON-based prompts mode

      // Handle Pro JSON mode separately
      if (version === 'pro') {
        const proUserPrompt = `Analyze this sales call transcript.

Rep Name: ${rep_name}
${prospect_name ? `Prospect Name: ${prospect_name}` : ''}
${prospect_company || metadata.prospect_company ? `Prospect Company: ${prospect_company || metadata.prospect_company}` : ''}
${metadata.prospect_role ? `Prospect Role: ${metadata.prospect_role}` : ''}
${call_type || metadata.call_stage ? `Call Type: ${call_type || metadata.call_stage}` : ''}

TRANSCRIPT:
${ingestionItem.raw_content}`;

        try {
          const response = await retryWithBackoff(async () => {
            return await runModel(
              'call-lab-pro',
              CALL_LAB_PRO_SYSTEM_PROMPT,
              proUserPrompt
            );
          });

          usage = response.usage;
          modelUsed = 'claude-sonnet-4-5-20250929';

          // Parse JSON response - try to extract JSON from response
          let proResult;
          try {
            // Try to parse directly
            proResult = JSON.parse(response.content);
          } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              proResult = JSON.parse(jsonMatch[1].trim());
            } else {
              // Try to find JSON object in response
              const jsonStart = response.content.indexOf('{');
              const jsonEnd = response.content.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                proResult = JSON.parse(response.content.slice(jsonStart, jsonEnd + 1));
              } else {
                throw new Error('Could not parse JSON from response');
              }
            }
          }

          // Store Pro results in database
          const report = proResult.report || proResult;
          const overallScore = report.meta?.overallScore || 0;
          const snapTldr = report.snapTake?.tldr || '';

          const callScore = await createCallScore(supabase, {
            ingestion_item_id,
            agency_id: ingestionItem.agency_id,
            user_id: ingestionItem.user_id || undefined,
            version: 'full', // Pro uses 'full' version type in database
            overall_score: Math.round(overallScore / 10), // Convert 0-100 to 0-10
            overall_grade: overallScore >= 80 ? 'A' : overallScore >= 60 ? 'B' : overallScore >= 40 ? 'C' : 'D',
            diagnosis_summary: snapTldr,
            markdown_response: JSON.stringify(proResult, null, 2), // Store full JSON
          });

          // Also save to call_lab_reports for dashboard
          const trustVelocity = report.meta?.trustVelocity || 0;
          const primaryPattern = report.patterns?.[0]?.patternName || '';
          const nextAction = report.nextSteps?.actions?.[0] || '';

          await (supabase as any).from('call_lab_reports').insert({
            user_id: ingestionItem.user_id || null,
            buyer_name: prospect_name || metadata.prospect_name || '',
            company_name: prospect_company || metadata.prospect_company || '',
            overall_score: overallScore, // Store as 0-100
            trust_velocity: trustVelocity,
            agenda_control: report.scores?.narrativeControl || null,
            pattern_density: report.patterns?.length ? report.patterns.length * 10 : 0,
            primary_pattern: primaryPattern,
            improvement_highlight: nextAction,
            full_report: report,
            created_at: new Date().toISOString(),
            agent: 'pro',
            version: '1.0',
            call_id: callScore.id,
            transcript: ingestionItem.raw_content || '',
          });

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

          // Send report email via Loops (non-blocking)
          sendReportEmail(
            supabase,
            ingestionItem.user_id,
            callScore.id,
            'pro',
            prospect_name || metadata.prospect_name,
            prospect_company || metadata.prospect_company
          );

          // Return Pro JSON result
          return NextResponse.json(
            {
              success: true,
              call_score_id: callScore.id,
              result: proResult,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Error running Pro JSON analysis:', error);

          await updateIngestionItemStatus(
            supabase,
            ingestion_item_id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );

          return NextResponse.json(
            {
              error: 'Failed to analyze call with Pro JSON mode',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      }

      // OLD: Use JSON-based prompts for Lite (backwards compatibility)
      // Create params with required fields for old JSON prompts
      const jsonPromptParams = {
        transcript: ingestionItem.raw_content,
        rep_name: rep_name, // Always a string from default value
        prospect_company: metadata.prospect_company,
        prospect_role: metadata.prospect_role,
        call_stage: metadata.call_stage,
      };

      try {
        const response = await retryWithBackoff(async () => {
          return await runModel(
            'call-lab-lite',
            CALL_LAB_LITE_SYSTEM,
            CALL_LAB_LITE_USER(jsonPromptParams)
          );
        });

        usage = response.usage;
        modelUsed = 'claude-sonnet-4-5-20250929';

        // Parse JSON response
        analysisResult = parseModelJSON<CallLabLiteResponse>(response.content);
      } catch (error) {
        console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

        // Try GPT-4o as fallback
        try {
          const response = await retryWithBackoff(async () => {
            return await runModel(
              'call-lab-lite',
              CALL_LAB_LITE_SYSTEM,
              CALL_LAB_LITE_USER(jsonPromptParams),
              { provider: 'openai', model: 'gpt-4o' }
            );
          });

          usage = response.usage;
          modelUsed = 'gpt-4o';

          // Parse JSON response
          analysisResult = parseModelJSON<CallLabLiteResponse>(response.content);
        } catch (fallbackError) {
          console.error('Error running GPT-4o fallback:', fallbackError);

          // Update status to failed
          await updateIngestionItemStatus(
            supabase,
            ingestion_item_id,
            'failed',
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          );

          return NextResponse.json(
            {
              error: 'Failed to analyze call with both Claude and GPT',
              details:
                fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      }

      // Validate response
      if (!analysisResult!.validation?.valid) {
        return NextResponse.json(
          {
            error: 'Transcript validation failed',
            details:
              analysisResult!.validation?.opening_lines || 'Could not read transcript',
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
          overall_score: analysisResult!.overall.score,
          overall_grade: analysisResult!.overall.grade,
          diagnosis_summary: analysisResult!.overall.one_liner,
          lite_scores: analysisResult!.scores,
        });

        // Create snippets (strengths and weaknesses)
        const snippets = [
          ...analysisResult!.strengths.map((s, idx) => ({
            call_score_id: callScore.id,
            ingestion_item_id,
            snippet_type: 'strength',
            transcript_quote: s.quote,
            rep_behavior: s.behavior,
            coaching_note: s.note,
            impact: 'positive',
            display_order: idx,
          })),
          ...analysisResult!.weaknesses.map((w, idx) => ({
            call_score_id: callScore.id,
            ingestion_item_id,
            snippet_type: 'weakness',
            transcript_quote: w.quote,
            rep_behavior: w.behavior,
            coaching_note: w.note,
            impact: 'negative',
            display_order: idx + analysisResult!.strengths.length,
          })),
        ];

        await createCallSnippets(supabase, snippets);

        // Create follow-up templates
        const followUps = analysisResult!.follow_ups.map((f, idx) => ({
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

        // Send report email via Loops (non-blocking)
        sendReportEmail(
          supabase,
          ingestionItem.user_id,
          callScore.id,
          'lite',
          metadata.prospect_name,
          metadata.prospect_company
        );

        // Return results
        return NextResponse.json(
          {
            success: true,
            call_score_id: callScore.id,
            result: {
              overall_score: analysisResult!.overall.score,
              overall_grade: analysisResult!.overall.grade,
              diagnosis_summary: analysisResult!.overall.one_liner,
              scores: analysisResult!.scores,
              strengths: analysisResult!.strengths,
              weaknesses: analysisResult!.weaknesses,
              focus_area: analysisResult!.focus_area,
              follow_ups: analysisResult!.follow_ups,
              tasks: analysisResult!.tasks,
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

    // If markdown response exists, return it
    if ((callScore as any)?.markdown_response) {
      const markdownMetadata = parseMarkdownMetadata(
        (callScore as any).markdown_response
      );

      return NextResponse.json(
        {
          success: true,
          result: {
            id: (callScore as any)?.id,
            markdown: (callScore as any)?.markdown_response,
            metadata: markdownMetadata,
            version: (callScore as any)?.version,
          },
        },
        { status: 200 }
      );
    }

    // Otherwise return JSON format (backwards compatibility)
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
