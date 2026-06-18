import { runModel, parseModelJSON } from '@repo/utils';

interface SessionAIResult {
  synopsis: string;
  teaching: string;
}

const SYSTEM_PROMPT = `You are Tim Kilroy, a sales coaching expert who uses the WTF (Why They Fund) methodology. You are generating content for your client portal from a call transcript.

Generate two sections:

SYNOPSIS:
- 2-3 paragraphs summarizing what was discussed
- Third-person neutral tone ("Tim and the group discussed..." or "Tim and [Client] discussed...")
- Focus on topics covered, questions asked, decisions made, and key moments
- For office hours: capture the different topics/questions that came up from the group
- For 1:1s: capture what was specific to that client's situation

TEACHING:
- Written in Tim's voice as the coach (first person)
- Extract 1-2 standalone principles or lessons from the call
- Should be valuable even to someone who wasn't on the call
- Actionable — give the reader something to do or think about differently
- Think "newsletter insight" not "meeting minutes"
- Tone: direct, warm, no jargon, conversational

Return ONLY valid JSON with this exact structure: { "synopsis": "...", "teaching": "..." }
Do not include any text outside the JSON object.`;

export async function generateSessionContent(
  transcript: string,
  type: 'office-hours' | 'one-on-one',
  clientName?: string,
): Promise<SessionAIResult> {
  const callDescription = type === 'office-hours'
    ? 'an office hours group call'
    : `a monthly 1:1 coaching call with ${clientName || 'a client'}`;

  const { content } = await runModel(
    'session-content',
    SYSTEM_PROMPT,
    `Here is the transcript from ${callDescription}:\n\n${transcript}`,
  );

  // parseModelJSON strips markdown code fences and parses the JSON payload.
  return parseModelJSON<SessionAIResult>(content);
}

export async function regenerateField(
  transcript: string,
  field: 'synopsis' | 'teaching',
  type: 'office-hours' | 'one-on-one',
  clientName?: string,
): Promise<string> {
  const result = await generateSessionContent(transcript, type, clientName);
  return result[field];
}
