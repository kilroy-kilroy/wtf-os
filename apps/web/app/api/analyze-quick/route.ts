import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Quick Analysis System Prompt - simplified for lead gen
const QUICK_ANALYZE_SYSTEM = `You are a sales call coach analyzing a short pitch. Be direct, insightful, and actionable.

Analyze the pitch and provide:
1. What worked well (1-2 points)
2. What's missing or could improve (1-2 points)
3. One specific tactical improvement with example language

Keep it punchy. No fluff. Use HTML formatting with <p>, <strong>, and <ul>/<li> tags.

Respond ONLY with the HTML analysis. Do not include any markdown code blocks or other formatting.`;

const QUICK_ANALYZE_USER = (transcript: string) => `
Analyze this 30-second sales pitch:

${transcript}

Provide your analysis in HTML format with:
- A brief "What Worked" section
- A "What's Missing" section
- One specific "Try This" improvement with exact language to use

Also, rate this pitch 1-10 based on clarity, confidence, and value proposition.

Start your response with the score in this exact format on its own line:
SCORE: X/10

Then provide the HTML analysis.
`;

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type (webm, mp3, wav, etc.)
    const validTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
    if (!validTypes.some(type => audioFile.type.includes(type.split('/')[1]))) {
      return NextResponse.json(
        { error: 'Invalid audio format. Supported: webm, mp3, wav, mp4, ogg' },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Transcribe with Whisper
    let transcript: string;
    try {
      // Convert File to the format OpenAI expects
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
      });
      transcript = transcriptionResponse.text;
    } catch (whisperError) {
      console.error('Whisper transcription error:', whisperError);
      return NextResponse.json(
        { error: 'Failed to transcribe audio. Please try again.' },
        { status: 500 }
      );
    }

    // Check if transcript is too short
    if (transcript.length < 20) {
      return NextResponse.json(
        {
          error: 'Recording too short or unclear. Please record at least a few sentences.',
          transcript
        },
        { status: 400 }
      );
    }

    // Step 2: Analyze with Claude (or fallback to GPT-4o)
    let analysis: string;
    let score: number = 5;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      // Try Claude first
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          temperature: 0.3,
          system: QUICK_ANALYZE_SYSTEM,
          messages: [{ role: 'user', content: QUICK_ANALYZE_USER(transcript) }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          analysis = content.text;
        } else {
          throw new Error('Unexpected response type');
        }
      } catch (claudeError) {
        console.error('Claude error, falling back to GPT-4o:', claudeError);
        // Fallback to GPT-4o
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 1024,
          temperature: 0.3,
          messages: [
            { role: 'system', content: QUICK_ANALYZE_SYSTEM },
            { role: 'user', content: QUICK_ANALYZE_USER(transcript) },
          ],
        });
        analysis = completion.choices[0].message.content || '';
      }
    } else {
      // Use GPT-4o if no Anthropic key
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          { role: 'system', content: QUICK_ANALYZE_SYSTEM },
          { role: 'user', content: QUICK_ANALYZE_USER(transcript) },
        ],
      });
      analysis = completion.choices[0].message.content || '';
    }

    // Extract score from analysis
    const scoreMatch = analysis.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    if (scoreMatch) {
      score = Math.round(parseFloat(scoreMatch[1]));
      // Remove score line from analysis for cleaner HTML
      analysis = analysis.replace(/SCORE:\s*\d+(?:\.\d+)?\s*\/\s*10\s*/i, '').trim();
    }

    // Clean up analysis - remove any markdown code blocks if present
    analysis = analysis
      .replace(/```html\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    return NextResponse.json({
      transcript,
      analysis,
      score,
    });
  } catch (error) {
    console.error('Quick analyze error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze recording. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
