import { NextRequest, NextResponse } from 'next/server';
import { VisibilityLabProInput, VisibilityLabProReport } from '@/lib/visibility-lab-pro/types';
import { buildVisibilityLabProPrompt } from '@repo/prompts';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const input: VisibilityLabProInput = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = buildVisibilityLabProPrompt(input);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'user', content: systemPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate Pro analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json(
        { error: 'No response from Visibility Lab Pro engine' },
        { status: 500 }
      );
    }

    // Clean potential Markdown formatting and extract JSON
    let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Try to extract JSON object if there's surrounding text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    try {
      const report = JSON.parse(cleanedText) as VisibilityLabProReport;
      return NextResponse.json(report);
    } catch {
      console.error("Failed to parse JSON. Raw text:", text.substring(0, 500));

      // Only flag as safety filter if the AI explicitly refused the request
      const lowerText = text.toLowerCase();
      const isRefusal = (
        (lowerText.includes("i'm sorry") || lowerText.includes("i cannot") || lowerText.includes("i can't")) &&
        (lowerText.includes("assist") || lowerText.includes("provide") || lowerText.includes("generate") || lowerText.includes("help"))
      );

      if (isRefusal) {
        return NextResponse.json(
          { error: 'AI Safety Filter Triggered. Please try again with different inputs.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Analysis failed: AI returned invalid data. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Visibility Lab Pro Analysis Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
