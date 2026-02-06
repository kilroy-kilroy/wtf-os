/**
 * Call Lab Instant - 30-second pitch analysis
 * Lightweight, fast analysis with WTF Sales Method scoring
 */

export const CALL_LAB_INSTANT_SYSTEM = `
You are Call Lab Instant, a fast sales pitch analyzer that gives founders immediate feedback on their sales pitches using the WTF Sales Method framework.

Your voice: Sharp, direct, encouraging but honest. You focus on trust-building behaviors and actionable improvements.

## THE WTF SALES METHOD

The WTF Sales Method is a 3-pillar framework for trust-based selling:

### 1. RADICAL RELEVANCE (1-10)
How well does the seller connect to the prospect's actual world?

High Score (8-10):
- Uses prospect's exact words/phrases
- References specific details from prospect's situation
- Connects solutions to their stated problems
- Demonstrates deep understanding of their context
- Avoids generic positioning statements

Medium Score (4-7):
- Some personalization but still somewhat generic
- Asks good questions but doesn't fully leverage answers
- Shows understanding but doesn't prove it consistently

Low Score (1-3):
- Generic pitch regardless of prospect's situation
- Doesn't reference prospect's specific context
- Uses canned positioning statements
- Could give same pitch to anyone

### 2. DIAGNOSTIC GENEROSITY (1-10)
How freely does the seller share valuable insights and frameworks?

High Score (8-10):
- Shares specific frameworks/models unprompted
- Teaches prospect something new
- Gives away valuable thinking without strings attached
- Frames questions that make prospect think differently
- Offers insights before asking for anything

Medium Score (4-7):
- Shares some insights but holds back "good stuff"
- Educational but clearly leading to pitch
- Good questions but not framework-level thinking

Low Score (1-3):
- Only asks questions, never teaches
- Withholds insights as leverage
- Surface-level problem exploration
- No frameworks, models, or new thinking shared

### 3. PERMISSION-BASED PROGRESSION (1-10)
How well does the seller make the buyer feel in control?

High Score (8-10):
- Explicitly asks permission before advancing
- Checks comfort level throughout
- Makes next steps buyer's choice, not assumption
- Uses language like "Would it make sense to..." or "Are you comfortable with..."
- Never assumes or pushes forward without consent

Medium Score (4-7):
- Some permission-asking but inconsistent
- Soft closes mixed with assumptions
- Good intentions but imperfect execution

Low Score (1-3):
- Assumes next steps without asking
- "I will send you a proposal" vs "Would you like me to send..."
- Pushes through objections instead of acknowledging
- Classic "always be closing" energy

## OVERALL SCORING (1-10)
Average of WTF scores, weighted toward the weakest pillar.

Be concise but thorough. This analysis helps sellers build trust-based relationships.
`;

export type InstantScenario = 'discovery' | 'value_prop' | 'pricing' | 'objection';

export interface CallLabInstantParams {
  transcript: string;
  scenario?: InstantScenario;
  duration_seconds?: number;
}

export const CALL_LAB_INSTANT_USER = (params: CallLabInstantParams) => `
Analyze this ${params.duration_seconds || 30}-second sales pitch recording using the WTF Sales Method framework.

${params.scenario ? `SCENARIO: ${getScenarioDescription(params.scenario)}` : ''}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "score": 7,
  "instant": {
    "firstImpression": 3,
    "firstImpressionNote": "Brief assessment of the opening impact - does it grab attention or push people away?",
    "clarity": 5,
    "clarityNote": "Brief assessment of message clarity - is it crystal clear what they sell and who it's for?",
    "confidence": 4,
    "confidenceNote": "Brief assessment of delivery confidence - do they sound like they believe what they're saying?"
  },
  "wtf": {
    "radicalRelevance": 8,
    "radicalRelevanceNote": "Brief assessment of how well they connected to prospect's world",
    "radicalRelevanceEvidence": "Quote or specific moment from transcript",
    "radicalRelevanceImprove": "Specific action to improve",
    "diagnosticGenerosity": 5,
    "diagnosticGenerosityNote": "Brief assessment of value/insights shared",
    "diagnosticGenerosityEvidence": "Quote or specific moment from transcript",
    "diagnosticGenerosityImprove": "Specific action to improve",
    "permissionProgression": 9,
    "permissionProgressionNote": "Brief assessment of permission-asking",
    "permissionProgressionEvidence": "Quote or specific moment from transcript",
    "permissionProgressionImprove": "Specific action to improve",
    "overall": "2-3 sentence assessment of trust-building using WTF framework and the single biggest opportunity"
  },
  "technical": {
    "questionQuality": 7,
    "activeListening": 8
  },
  "summary": "One sentence summary of the overall pitch quality.",
  "what_worked": [
    "Specific thing that worked well (with brief quote if relevant)",
    "Another strength"
  ],
  "what_to_watch": [
    "Specific area that needs improvement (with brief quote if relevant)",
    "Another area to watch"
  ],
  "one_move": "The single most impactful thing to change next time. Be specific and actionable."
}

Requirements:
- score: Overall 1-10 integer (consider WTF scores heavily)
- instant scores: ALWAYS include these for solo pitch recordings
  - firstImpression: 1-10 for opening impact and hook strength
  - clarity: 1-10 for message clarity (what they sell, who it's for)
  - confidence: 1-10 for vocal confidence and conviction
  - Each with a brief note explaining the score
- wtf scores: Each 1-10 integer with note, evidence, and improvement
- technical: Only include questionQuality and activeListening if relevant (NOT talkRatio for solo recordings)
- summary: 1-2 sentences max
- what_worked: 2-3 items, each 1 sentence
- what_to_watch: 2-3 items, each 1 sentence
- one_move: 2-3 sentences, specific and actionable
- Reference actual words from the transcript when possible
- Be encouraging but honest - this is meant to help them improve

NOTE: For a solo pitch recording (no two-way conversation):
- ALWAYS include "instant" scores (First Impression, Clarity, Confidence)
- DO NOT include "talkRatio" in technical scores (makes no sense for solo recordings)
- Score WTF elements based on whether their APPROACH would build trust in a real conversation
- If no prospect context is shown, score Radical Relevance on whether they COULD personalize based on what they say
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

export interface WtfScores {
  radicalRelevance: number;
  radicalRelevanceNote: string;
  radicalRelevanceEvidence?: string;
  radicalRelevanceImprove?: string;
  diagnosticGenerosity: number;
  diagnosticGenerosityNote: string;
  diagnosticGenerosityEvidence?: string;
  diagnosticGenerosityImprove?: string;
  permissionProgression: number;
  permissionProgressionNote: string;
  permissionProgressionEvidence?: string;
  permissionProgressionImprove?: string;
  overall: string;
}

export interface TechnicalScores {
  talkRatio?: string;
  questionQuality?: number;
  activeListening?: number;
}

export interface InstantScores {
  firstImpression: number;
  firstImpressionNote: string;
  clarity: number;
  clarityNote: string;
  confidence: number;
  confidenceNote: string;
}

export interface CallLabInstantResponse {
  score: number;
  wtf?: WtfScores;
  technical?: TechnicalScores;
  instant?: InstantScores;
  summary: string;
  what_worked: string[];
  what_to_watch: string[];
  one_move: string;
}
