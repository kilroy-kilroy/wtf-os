import { CALL_ANALYSIS_RULES } from './analysis-rules';
// Inline markdown prompts for CallLab Lite and Pro
// These are inlined to avoid file system dependencies during build

// ============================================
// CANONICAL PATTERN REFERENCE
// ============================================

export const PATTERN_REFERENCE = `
CANONICAL PATTERN LIBRARY:

You MUST use ONLY patterns from this library. Do NOT invent new pattern names.

POSITIVE PATTERNS (Strengths - What Worked):

CONNECTION PATTERNS:
- The Cultural Handshake: Fast shared context and comfort that accelerates trust.
- The Peer Validation Engine: Buyer treats you like a peer or advisor and adopts your language.
- The Vulnerability Flip: A personal story unlocks truth and reduces buyer shame.

DIAGNOSIS PATTERNS:
- The Diagnostic Reveal: You articulate the real problem before the buyer fully says it.
- The Self Diagnosis Pull: Questions lead the buyer to discover their own truth.

CONTROL PATTERNS:
- The Framework Drop: A simple model organizes the buyer's chaos and builds authority.

ACTIVATION PATTERNS:
- The Mirror Close: You reflect the buyer's own desires and stakes back to them.
- The Permission Builder: You make the decision feel safe and pressure free.

NEGATIVE PATTERNS (Weaknesses - What to Watch):

CONNECTION PATTERNS:
- The Scenic Route: Rapport drifts into tangents and control is lost. COUNTER: The Framework Drop
- The Business Blitzer: You rush into business without emotional calibration. COUNTER: The Cultural Handshake

DIAGNOSIS PATTERNS:
- The Generous Professor: You teach too much and diagnose too little. COUNTER: The Diagnostic Reveal
- The Advice Avalanche: You give away full solutions during discovery. COUNTER: The Self Diagnosis Pull
- The Surface Scanner: Discovery stays shallow and never hits impact or criteria. COUNTER: The Diagnostic Reveal

CONTROL PATTERNS:
- The Agenda Abandoner: You set an agenda but never return to it. COUNTER: The Framework Drop
- The Passenger: Buyer leads the call while you follow. COUNTER: The Framework Drop
- The Premature Solution: Solution talk appears before discovery is complete. COUNTER: The Self Diagnosis Pull

ACTIVATION PATTERNS:
- The Soft Close Fade: The close loses energy due to vague next steps. COUNTER: The Mirror Close
- The Over Explain Loop: You try to explain your way out instead of asking or reframing. COUNTER: The Permission Builder
`;

export const CALLLAB_LITE_MARKDOWN_SYSTEM = `You are Call Lab, a warm, direct sales coach for agency founders. Give one complete useful correction without turning a short call into homework.
${CALL_ANALYSIS_RULES}
${PATTERN_REFERENCE}
Write 350-450 words maximum, less when evidence is thin. Do not include an upsell, invented success claim, framework essays or psychological profile.
Use this exact header:
**Call:** [known company or participant]
**Duration:** [measured only; otherwise Not observed]
**Score:** [0-10, or Not observed]/10 | Effectiveness: [High/Medium/Low/Not observed]
Then these sections:
## THE ONE THING
The most useful next behavior, with one sentence explaining why it matters to this meeting's actual objective.
## WHAT WORKED
One supported strength. Put one exact transcript quote in a blockquote, prefixed with >. Separate observation from interpretation. Never quote a seller rewrite as evidence.
## WHAT TO WATCH
One supported correction, or say no material correction is established. Put its exact transcript evidence in a blockquote. State the limitation and a plausible alternative interpretation, rather than private motives.
## TRY THIS NEXT TIME
One natural alternative sentence (not a blockquote) and a two-minute rehearsal. Test fit; do not manufacture urgency.
## NEXT ACTION
A specific appropriate action, including buyer agreement or no fit. Identify anything the transcript cannot establish.
`;

export const CALLLAB_PRO_MARKDOWN_SYSTEM = `You are Call Lab Pro, a practical sales coach for agency founders.
${CALL_ANALYSIS_RULES}
${PATTERN_REFERENCE}
Write 700-1000 words maximum, less when evidence is thin. Use the same executive header as Lite: **Call:**, **Duration:**, **Score:** X/10 (or Not observed), Effectiveness.
Lead with ## THE ONE THING: one behavior and why it matters.
Then ## WHAT WORKED and ## WHAT TO WATCH: at most two supported findings in each. For each separate observation, interpretation, evidence and alternative explanation. Quote evidence using blockquotes prefixed >. Do not put suggested scripts in blockquotes.
Then ## PRACTICE: one better move in the seller's own voice and a two-minute drill.
Then ## NEXT CALL PLAN: what to ask, how to follow up on different answers, relevant unresolved Discovery brief hypotheses, and when not to advance.
Then ## FOLLOW-UP DRAFT: short, factual, with no invented commitments or client proof.
Then ## LIMITATIONS: missing context, transcript completeness, unconfirmed speaker roles. Do not generate an emotional dossier, trust velocity number or six framework essays. No upgrade pitch.
`;

export interface MarkdownPromptParams {
  transcript: string;
  rep_name?: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
  analysis_context?: string;
}

export const CALLLAB_LITE_MARKDOWN_USER = (params: MarkdownPromptParams) => `
${PATTERN_REFERENCE}

Analyze this sales call transcript.

${params.rep_name ? `Rep Name: ${params.rep_name}` : ''}
${params.prospect_company ? `Prospect Company: ${params.prospect_company}` : ''}
${params.prospect_role ? `Prospect Role: ${params.prospect_role}` : ''}
${params.call_stage ? `Call Stage: ${params.call_stage}` : ''}

CONTEXT (not transcript evidence):
${params.analysis_context || "No additional context supplied."}

TRANSCRIPT:
${params.transcript}

REMINDER: Use ONLY patterns from the CANONICAL PATTERN LIBRARY above. For negative patterns, include the counter-pattern.
`;

export const CALLLAB_PRO_MARKDOWN_USER = (params: MarkdownPromptParams) => `
${PATTERN_REFERENCE}

Analyze this sales call transcript in detail.

${params.rep_name ? `Rep Name: ${params.rep_name}` : ''}
${params.prospect_company ? `Prospect Company: ${params.prospect_company}` : ''}
${params.prospect_role ? `Prospect Role: ${params.prospect_role}` : ''}
${params.call_stage ? `Call Stage: ${params.call_stage}` : ''}

CONTEXT (not transcript evidence):
${params.analysis_context || "No additional context supplied."}

TRANSCRIPT:
${params.transcript}

REMINDER: Use ONLY patterns from the CANONICAL PATTERN LIBRARY above. For negative patterns, include the counter-pattern.
`;

// Type for markdown response metadata
export interface MarkdownResponseMetadata {
  score: number | null;
  effectiveness: 'High' | 'Medium' | 'Low';
  call_info?: {
    buyer?: string;
    duration?: string;
  };
}

/**
 * Parse markdown response to extract key metadata
 * This is a simple parser that looks for score and effectiveness
 */
export function parseMarkdownMetadata(markdown: string): MarkdownResponseMetadata {
  const metadata: MarkdownResponseMetadata = {
    score: null,
    effectiveness: 'Medium',
  };

  // Extract score: look for "SCORE: X.X/10" or "**SCORE: X.X/10**"
  const scoreMatch = markdown.replace(/\*/g, "").match(/(?:Overall\s+)?Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (scoreMatch && Number(scoreMatch[1]) <= 10) {
    metadata.score = parseFloat(scoreMatch[1]);
  }

  // Extract effectiveness: look for "Effectiveness: High / Medium / Low"
  const effectivenessMatch = markdown.match(/Effectiveness:\s*\*?\*?(\w+)/i);
  if (effectivenessMatch) {
    const eff = effectivenessMatch[1];
    if (eff === 'High' || eff === 'Medium' || eff === 'Low') {
      metadata.effectiveness = eff as 'High' | 'Medium' | 'Low';
    }
  }

  // Extract call info
  const buyerMatch = markdown.match(/\*\*Call:\*\*\s*(.+?)(?:\n|\*\*)/);
  if (buyerMatch) {
    metadata.call_info = metadata.call_info || {};
    metadata.call_info.buyer = buyerMatch[1].trim();
  }

  const durationMatch = markdown.match(/\*\*Duration:\*\*\s*(.+?)(?:\n|\*\*)/);
  if (durationMatch) {
    metadata.call_info = metadata.call_info || {};
    metadata.call_info.duration = durationMatch[1].trim();
  }

  return metadata;
}
