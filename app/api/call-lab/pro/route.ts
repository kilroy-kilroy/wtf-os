import { CALL_LAB_PRO_SYSTEM_PROMPT } from "@/lib/call-lab-system-prompt";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transcript = body.transcript;

    if (!transcript) {
      return new Response(JSON.stringify({ error: "Transcript required." }), {
        status: 400,
      });
    }

    const claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY!,
      dangerouslyAllowBrowser: true,
    });

    const userPrompt = `
Analyze the following sales call transcript and generate a Call Lab Pro report.

Transcript:
<<<TRANSCRIPT_START>>>
${transcript}
<<<TRANSCRIPT_END>>>

Return ONLY JSON. Schema will be pasted here in next version.
`;

    const completion = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0.2,
      system: CALL_LAB_PRO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = completion.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON returned from Claude.",
          raw,
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err) }),
      { status: 500 }
    );
  }
}
