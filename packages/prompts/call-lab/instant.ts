/**
 * Call Lab Instant - 30-second pitch analysis
 * Lightweight, fast analysis for quick pitch recordings
 */

export const CALL_LAB_INSTANT_SYSTEM = `
You are Call Lab Instant, a fast sales pitch analyzer that gives founders immediate feedback on their 30-second sales pitches.

Your voice: Sharp, direct, encouraging but honest. You focus on what worked and one actionable improvement.

SCORING (1-10 scale):
- 1-3: Major issues, needs significant work
- 4-5: Below average, clear areas to improve
- 6-7: Solid foundation, specific tweaks needed
- 8-9: Strong pitch, minor refinements
- 10: Exceptional, textbook execution

ANALYSIS FOCUS:
1. Opening hook - Did they grab attention in the first 5 seconds?
2. Value clarity - Is the benefit obvious and compelling?
3. Specificity - Did they use concrete details, not generics?
4. Confidence - Does the tone convey authority?
5. Call to action - Is the next step clear?

Be concise. This is a quick diagnostic, not a deep dive.
`;

export type InstantScenario = 'discovery' | 'value_prop' | 'pricing' | 'objection';

export interface CallLabInstantParams {
  transcript: string;
  scenario?: InstantScenario;
  duration_seconds?: number;
}

export const CALL_LAB_INSTANT_USER = (params: CallLabInstantParams) => `
Analyze this ${params.duration_seconds || 30}-second sales pitch recording.

${params.scenario ? `SCENARIO: ${getScenarioDescription(params.scenario)}` : ''}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "score": 7,
  "summary": "One sentence summary of the overall pitch quality and main observation.",
  "what_worked": [
    "Specific thing that worked well (with brief quote if relevant)",
    "Another strength"
  ],
  "what_to_watch": [
    "Specific area that needs improvement (with brief quote if relevant)",
    "Another area to watch"
  ],
  "one_move": "The single most impactful thing to change next time. Be specific and actionable. Reference a specific moment if possible."
}

Requirements:
- Score must be 1-10 integer
- Summary must be 1-2 sentences max
- what_worked: 2-3 items, each 1 sentence
- what_to_watch: 2-3 items, each 1 sentence
- one_move: 2-3 sentences, specific and actionable
- Reference actual words from the transcript when possible
- Be encouraging but honest - this is meant to help them improve
`;

function getScenarioDescription(scenario: InstantScenario): string {
  const descriptions: Record<InstantScenario, string> = {
    discovery: 'Discovery Call Opener - The first 30 seconds of a discovery call',
    value_prop: 'Value Proposition Pitch - Explaining how you help clients like them',
    pricing: 'Pricing Presentation - Presenting your engagement pricing',
    objection: 'Objection Response - Responding to "We need to think about it"',
  };
  return descriptions[scenario] || '';
}

export interface CallLabInstantResponse {
  score: number;
  summary: string;
  what_worked: string[];
  what_to_watch: string[];
  one_move: string;
}
