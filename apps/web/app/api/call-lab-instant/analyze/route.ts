import { authorizeLab, grantGuest, reportLink, readLabJson, readLabBytes, limitLab, sameOrigin, labFailure, LabError } from '@/lib/labs/access';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import { createServerClient } from '@repo/db/client';
import { createInstantReport, type InstantReportAnalysis } from '@repo/db';
import { runModel, parseModelJSON, retryWithBackoff } from '@repo/utils';
import {
  CALL_LAB_INSTANT_SYSTEM,
  CALL_LAB_INSTANT_USER,
  type CallLabInstantResponse,
  type InstantScenario,
} from '@repo/prompts';

// Cost tracking (in cents)
const WHISPER_COST_PER_MINUTE = 0.6; // $0.006/min = 0.6 cents
const GPT_COST_PER_500_TOKENS = 0.15; // ~$0.003/1K tokens = 0.15 cents per 500

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    sameOrigin(request);
    await limitLab(request, 'instant-analysis');
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024) throw new LabError(413, 'Audio upload too large.');
    // Parse multipart form data
    const bytes = await readLabBytes(request, 6 * 1024 * 1024);
    const formData = await new Response(new Uint8Array(bytes), {headers:{'Content-Type':request.headers.get('content-type') || ''}}).formData();
    const audioFile = formData.get('audio') as File | null;
    const scenario = formData.get('scenario') as InstantScenario | null;
    const durationStr = formData.get('duration') as string | null;
    const duration = durationStr ? parseInt(durationStr, 10) : 30;

    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for 30-sec audio)
    if (audioFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(duration) || duration < 1 || duration > 120) throw new LabError(400, 'Duration must be between 1 and 120 seconds.');
    if (!audioFile.type.startsWith('audio/') && audioFile.type !== 'video/webm') throw new LabError(400, 'Unsupported audio format.');

    // Initialize OpenAI for Whisper
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Transcribe with Whisper
    let transcript: string;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
      });

      transcript = transcription as unknown as string;

      if (!transcript || transcript.trim().length === 0) {
        return NextResponse.json(
          { error: 'Could not transcribe audio. Please speak clearly and try again.' },
          { status: 400 }
        );
      }
    } catch (whisperError) {
      console.error('Whisper transcription error:', whisperError);
      return NextResponse.json(
        {
          error: 'Failed to transcribe audio',

        },
        { status: 500 }
      );
    }

    // Step 2: Analyze with AI
    let analysisResult: CallLabInstantResponse;
    let modelUsed = 'claude-sonnet-4-6';

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel(
          'call-lab-lite', // Use same config
          CALL_LAB_INSTANT_SYSTEM,
          CALL_LAB_INSTANT_USER({
            transcript,
            scenario: scenario || undefined,
            duration_seconds: duration,
          })
        );
      });

      analysisResult = parseModelJSON<CallLabInstantResponse>(response.content);
    } catch (claudeError) {
      console.error('Claude analysis error, trying GPT-4o fallback:', claudeError);

      // Fallback to GPT-4o
      try {
        const response = await retryWithBackoff(async () => {
          return await runModel(
            'call-lab-lite',
            CALL_LAB_INSTANT_SYSTEM,
            CALL_LAB_INSTANT_USER({
              transcript,
              scenario: scenario || undefined,
              duration_seconds: duration,
            }),
            { provider: 'openai', model: 'gpt-4o' }
          );
        });

        analysisResult = parseModelJSON<CallLabInstantResponse>(response.content);
        modelUsed = 'gpt-4o';
      } catch (gptError) {
        console.error('GPT-4o fallback error:', gptError);
        return NextResponse.json(
          {
            error: 'Failed to analyze pitch',

          },
          { status: 500 }
        );
      }
    }

    // Validate score
    if (!analysisResult.score || analysisResult.score < 1 || analysisResult.score > 10) {
      analysisResult.score = 5; // Default to middle score if invalid
    }

    // Step 3: Generate report ID and save to database
    const reportId = nanoid(10);
    const supabase = createServerClient();

    // Calculate cost (approximate)
    const whisperCost = Math.ceil((duration / 60) * WHISPER_COST_PER_MINUTE);
    const analysisCost = GPT_COST_PER_500_TOKENS; // Approximate
    const totalCostCents = Math.ceil(whisperCost + analysisCost);

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

    try {
      const analysis: InstantReportAnalysis = {
        // Instant scores (for solo recordings)
        instant: analysisResult.instant,
        // WTF Method scores (primary)
        wtf: analysisResult.wtf,
        // Technical scores (secondary)
        technical: analysisResult.technical,
        // Narrative feedback
        summary: analysisResult.summary,
        what_worked: analysisResult.what_worked,
        what_to_watch: analysisResult.what_to_watch,
        one_move: analysisResult.one_move,
      };

      await createInstantReport(supabase, {
        id: reportId,
        transcript,
        analysis,
        score: analysisResult.score,
        scenario_type: scenario || undefined,
        duration_seconds: duration,
        cost_cents: totalCostCents,
        user_agent: userAgent,
        ip_address: ipAddress,
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      throw new LabError(503, 'Unable to save the report. Please retry.');
    }

    await grantGuest('instant', reportId);
    const processingTime = Date.now() - startTime;

    // Return results
    return NextResponse.json({
      success: true,
      reportId,
      transcript,
      score: analysisResult.score,
      analysis: {
        // Instant scores (for solo recordings)
        instant: analysisResult.instant,
        // WTF Method scores (primary)
        wtf: analysisResult.wtf,
        // Technical scores (secondary)
        technical: analysisResult.technical,
        // Narrative feedback
        summary: analysisResult.summary,
        what_worked: analysisResult.what_worked,
        what_to_watch: analysisResult.what_to_watch,
        one_move: analysisResult.one_move,
      },
      meta: {
        model: modelUsed,
        processing_time_ms: processingTime,
      },
    });
  } catch (error) {
    const failure = labFailure(error); if (failure) return failure;
    console.error('Call Lab Instant analyze error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process recording',

      },
      { status: 500 }
    );
  }
}
