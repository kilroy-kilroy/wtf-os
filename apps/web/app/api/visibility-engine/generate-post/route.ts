import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { topic, archetype, brandName } = await request.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
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

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate post' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Error generating draft.';
    return NextResponse.json({ draft: text });
  } catch (error) {
    console.error('Draft generation failed:', error);
    return NextResponse.json(
      { error: 'System Error: Could not generate draft' },
      { status: 500 }
    );
  }
}
