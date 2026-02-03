import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { topic, archetype, brandName } = await request.json();

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `
    You are a world-class social media copywriter for the DemandOS agency.

    TASK: Write a "Viral High-Value" LinkedIn Post (or Short Video Script) for the brand "${brandName}".
    TOPIC: "${topic}"
    ARCHETYPE: The brand is a "${archetype}" type.

    STYLE:
    - Hook-heavy (First line must grab attention).
    - Formatting: Short lines, ample whitespace.
    - Tone: Authoritative but aligned with the "${archetype}" persona.
    - No hashtags, no emojis unless strictly necessary for impact.
    - Ending: A strong call to discussion.

    OUTPUT: Just the post text. No preamble.
  `;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text || 'Error generating draft.';
    return NextResponse.json({ draft: text });
  } catch (error) {
    console.error('Draft generation failed:', error);
    return NextResponse.json(
      { error: 'System Error: Could not generate draft' },
      { status: 500 }
    );
  }
}
