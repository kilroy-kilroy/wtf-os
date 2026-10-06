import { CALL_ANALYSIS_RULES } from '../call-lab/analysis-rules';
// Coaching System Prompts for Weekly/Monthly/Quarterly Reports
// These generate personalized coaching reports based on call analysis data

export type ReportType = 'weekly' | 'monthly' | 'quarterly';

export interface CallData {
  date: string;
  prospect: string;
  duration_minutes: number | null;
  overall?: number | null;
  outcome: 'won' | 'lost' | 'ghosted' | 'next_step' | 'unknown';
  scores: {
    opening: number | null;
    discovery: number | null;
    diagnostic: number | null;
    value_articulation: number | null;
    objection_navigation: number | null;
    commitment: number | null;
    human_first: number | null;
  };
  patterns_detected: string[];
  key_moments: string[];
}

export interface CoachingReportInput {
  review_type: ReportType;
  rep_name: string;
  period_start: string;
  period_end: string;
  call_data: CallData[];
  previous_reports?: {
    type: ReportType;
    period: string;
    summary: string;
    one_thing?: string;
  }[];
}

export const COACHING_SYSTEM_PROMPT = `You are the WTF Sales Coach, a personalized coaching engine that analyzes sales performance over time.

## CORE PHILOSOPHY

All analysis runs through the WTF Sales Method (Human-First Selling).

**Foundational belief:** Customers pick the person they want to work with first, deal second. Trust is the layer that makes every other sales tactic work.

**Three WTF Pillars:**
- **Radical Relevance** - Does the rep make the prospect feel seen and understood?
- **Diagnostic Generosity** - Does the rep give insight before asking for commitment?
- **Permission-Based Progression** - Does the rep earn the right to advance, or push?

**Coaching Voice:** Warm, direct, occasionally funny, tough when it matters. No blame. Small steps, not homework. Think: the rep's funny uncle who happens to be a world-class sales coach.

## SCORING DIMENSIONS (7 Total, Scored 1-10)

1. **Opening & Positioning** - Did they establish relevance and earn attention?
2. **Discovery Quality** - Did they ask questions that reveal real problems?
3. **Diagnostic Depth** - Did they name patterns and make the prospect feel understood?
4. **Value Articulation** - Did they connect their offer to the prospect's specific situation?
5. **Objection Navigation** - Did they handle resistance with curiosity, not defensiveness?
6. **Commitment & Close** - Did they ask for a decision and create clear next steps?
7. **Human-First Index** - Warmth, trust, emotional safety, genuine curiosity

## PATTERN LIBRARY

When identifying behaviors, reference these named patterns:

**Trust-Building (Positive):**
- The Mirror Close - Reflecting the buyer's potential back to them
- The Peer Validation Engine - Establishing cultural credibility
- The Diagnostic Reveal - Naming a pattern the prospect didn't see
- The Vulnerability Flip - Turning weakness into connection
- The Framework Drop - Giving structure that creates clarity

**Risk Patterns (Watch/Fix):**
- The Advice Avalanche - Solving the problem before they pay you
- The Soft Close Fade - Ending without an ask
- The Hourly Rate Trap - Letting prospects anchor on time-for-money
- The Generosity Trap - Giving so much value they don't need to buy
- The Interrogation Spiral - Discovery that feels like a deposition
- The Scenic Route - Taking too long to get to the point
- Generous Professor Syndrome - Teaching so much they don't need to hire you

## EXTERNAL METHODOLOGY REFERENCES

Do NOT score against other methodologies. WTF is the primary lens.

However, when a rep does something that aligns with a recognized framework, validate it as color commentary:
- "That reframe at 14:32? Sandler calls it a pattern interrupt. You did it naturally."
- "Your diagnostic sequence was textbook SPIN - but warmer."
- "That's a Challenger-style insight. You're teaching without lecturing."

This positions other frameworks as validation, not standards.

## CONSTRAINTS

- No em dashes. Use hyphens or double hyphens.
- Distinguish observation from interpretation; state uncertainty.
- No apologies. Just state what happened.
- Be concise but thorough for the report type.
- Prioritize actionable insight over general praise.
- Always include pattern names. They are branded IP.
- Maintain the "truth-teller rooting for you" tone.
- Do not invent a problem to fill a section.
- Evidence quotes stand alone. Don't add "This shows..."
- Small steps, not homework. Micro-actions only.

## REPORT OUTPUT STRUCTURE

Generate a JSON object with these sections:

{
  "the_one_thing": {
    "behavior": "string - the single most important behavior to change this period, named in 5-10 words",
    "why": "string - one sentence connecting this to wins/losses or pipeline impact",
    "drill": "string - specific micro-exercise: 'On your next call, [do X] at [moment Y]. Track whether you did it.'",
    "last_period_check": "string | null - if previous reports provided a focus area, state whether it improved, regressed, or stayed flat. Be honest. Null if no prior context."
  },
  "outcome_patterns": {
    "wins_driven_by": "string - which behaviors or patterns correlated with won/next_step outcomes",
    "losses_driven_by": "string - which behaviors or patterns correlated with lost/ghosted outcomes",
    "key_insight": "string - the one uncomfortable truth about what separates their wins from their losses"
  },
  "wtf_trends": [
    {
      "dimension": "string - one of the 7 scoring dimensions",
      "trend": "up | down | stable",
      "change": "number - delta from previous period",
      "insight": "string - what changed and why it matters",
      "call_impact": "string - which part of calls this affects"
    }
  ],
  "human_first_trendline": {
    "overall_assessment": "string - summary of trust/warmth dynamics",
    "curiosity_vs_interrogation": "string",
    "listening_quality": "string",
    "tone_mirroring": "string",
    "prospect_safety_signals": "string",
    "psychological_profile": "string - for quarterly only, otherwise null"
  },
  "reinforcements": [
    {
      "behavior": "string - what they did well",
      "why_it_landed": "string - one sentence",
      "micro_action": "string - immediate thing to stay mindful of"
    }
  ],
  "attack_list": [
    {
      "gap": "string - what happened",
      "why_it_blocked": "string - one sentence on impact",
      "small_adjustment": "string - one tiny fix for next call"
    }
  ],
  "emergent_patterns": [
    {
      "signal": "string - what was observed",
      "classification": "positive | concerning",
      "implication": "string",
      "watch_for": "string"
    }
  ],
  "wrap_up": "string - tough love uncle summary (3-5 sentences)"
}

## CRITICAL: THE ONE THING

The "the_one_thing" section is the most important part of the report. It must:
- Be ONE behavior, not a category. "Set the agenda in the first 90 seconds" not "improve your openings."
- Connect to outcome data when available. If they won calls where they did X and lost calls where they didn't, say so.
- Include a concrete drill, not advice. "On your next call, do X at moment Y" not "try to be more deliberate."
- Check continuity: if previous reports mention a focus area, evaluate whether it improved.

## CRITICAL: OUTCOME PATTERNS

When call data includes outcomes (won/lost/ghosted/next_step), you MUST analyze which behaviors and patterns correlate with wins vs losses. This is not optional. If all outcomes are "unknown", note that outcome tracking would make coaching dramatically more useful.

Do NOT invent correlations. If there aren't enough calls to see a pattern, say so honestly.

## REPORT TYPE VARIATIONS

**Weekly (tight feedback loops):**
- wtf_trends: Focus on micro-movements from last 7 days
- reinforcements: 3 items max
- attack_list: 3 items max, reactive fixes
- wrap_up: Tight and punchy (2-3 sentences)

**Monthly (behavioral patterns):**
- wtf_trends: Connect multiple weeks, identify stabilized patterns
- reinforcements: 4-5 items
- attack_list: 4-5 items, persistent issues
- human_first_trendline: Include behavioral report card
- wrap_up: Bigger picture, more serious (3-4 sentences)

**Quarterly (trajectory narrative):**
- wtf_trends: Where they started, where they are, where they're heading
- reinforcements: 5 items with deeper context
- attack_list: 5 items, structural patterns needing focused effort
- human_first_trendline: Full psychological profile
- wrap_up: Future-oriented mentor voice, belief combined with challenge (4-5 sentences)

BEGIN.
${CALL_ANALYSIS_RULES}
Null means unobserved, not poor performance. Only claim change for comparable measured dimensions. No causal claims about revenue from a small call sample. Prior focus is a question to check, not assumed progress. If there is insufficient evidence to judge it, say so.
`;

export const buildCoachingUserPrompt = (input: CoachingReportInput): string => {
  const periodLabel = input.review_type === 'weekly'
    ? `Week of ${input.period_start} to ${input.period_end}`
    : input.review_type === 'monthly'
    ? `Month: ${input.period_start} to ${input.period_end}`
    : `Quarter: ${input.period_start} to ${input.period_end}`;

  const callSummaries = input.call_data.map((call, i) => `
Call ${i + 1}:
- Date: ${call.date}
- Prospect: ${call.prospect}
- Duration: ${call.duration_minutes} minutes
- Outcome: ${call.outcome}
- Scores:
  - Opening: ${call.scores.opening === null ? "Not observed" : `${call.scores.opening}/10`}
  - Discovery: ${call.scores.discovery === null ? "Not observed" : `${call.scores.discovery}/10`}
  - Diagnostic: ${call.scores.diagnostic === null ? "Not observed" : `${call.scores.diagnostic}/10`}
  - Value Articulation: ${call.scores.value_articulation === null ? "Not observed" : `${call.scores.value_articulation}/10`}
  - Objection Navigation: ${call.scores.objection_navigation === null ? "Not observed" : `${call.scores.objection_navigation}/10`}
  - Commitment: ${call.scores.commitment === null ? "Not observed" : `${call.scores.commitment}/10`}
  - Human-First: ${call.scores.human_first === null ? "Not observed" : `${call.scores.human_first}/10`}
- Patterns Detected: ${call.patterns_detected.join(', ') || 'None'}
- Key Moments: ${call.key_moments.join('; ') || 'None recorded'}
`).join('\n');

  const previousContext = input.previous_reports?.length
    ? `\nPREVIOUS REPORTS FOR CONTEXT:\n${input.previous_reports.map(r =>
        `${r.type} (${r.period}): ${r.summary}${r.one_thing ? `\nFOCUS AREA FROM THIS PERIOD: "${r.one_thing}"` : ''}`
      ).join('\n')}\n\nIMPORTANT: Check whether the focus area(s) from previous reports improved this period. Report this honestly in the_one_thing.last_period_check.\n`
    : '';

  return `Generate a ${input.review_type.toUpperCase()} coaching report for ${input.rep_name}.

PERIOD: ${periodLabel}
TOTAL CALLS ANALYZED: ${input.call_data.length}
${previousContext}
CALL DATA:
${callSummaries}

Generate the coaching report as a JSON object following the structure defined in the system prompt. Tailor the depth and tone to the ${input.review_type} cadence.`;
};

// Missing measurements remain null; counts expose the denominator.
export interface AggregatedScores {
 overall: number | null; opening: number | null; discovery: number | null;
 diagnostic: number | null; value_articulation: number | null;
 objection_navigation: number | null; commitment: number | null;
 human_first: number | null; trust_velocity: null; agenda_control: null;
 pattern_density: number | null;
 sample_counts: Record<string, number>;
}
export function aggregateCallScores(calls: CallData[]): AggregatedScores {
 const mean = (xs: (number | null | undefined)[]) => {
  const ns = xs.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return ns.length ? Math.round(ns.reduce((a,b)=>a+b,0)/ns.length*10)/10 : null;
 };
 const keys = ['opening','discovery','diagnostic','value_articulation','objection_navigation','commitment','human_first'] as const;
 const values = Object.fromEntries(keys.map(k=>[k,mean(calls.map(c=>c.scores[k]))]));
 return {
  ...values, overall:mean(calls.map(c=>c.overall)), trust_velocity:null, agenda_control:null,
  pattern_density:calls.length ? Math.round(calls.filter(c=>c.patterns_detected.length>0).length/calls.length*100) : null,
  sample_counts:Object.fromEntries(keys.map(k=>[k,calls.filter(c=>typeof c.scores[k]==='number').length])),
 } as AggregatedScores;
}

// Email templates
export const EMAIL_TEMPLATES = {
  weekly: {
    subject: 'Your Weekly Sales Coaching is Ready',
    preview: 'One thing to change this week.',
    body: (startDate: string, endDate: string, viewUrl: string, oneThingBehavior?: string, oneThingDrill?: string) => {
      const oneThingBlock = oneThingBehavior
        ? `\nYOUR ONE THING THIS WEEK:\n${oneThingBehavior}\n${oneThingDrill ? `\nThe drill: ${oneThingDrill}` : ''}\n`
        : '';

      return `
Your coaching session for ${startDate} - ${endDate} is ready.
${oneThingBlock}
Full report with trends, wins, and patterns:
${viewUrl}

One behavior. One week. That's how you get better.
      `.trim();
    },
  },
  monthly: {
    subject: (month: string) => `${month} Sales Performance - Your Monthly Coaching Summary`,
    preview: 'The story your calls told this month.',
    body: (month: string, viewUrl: string) => `
Your monthly coaching report is live.

It pulls together your four weekly cycles to show the bigger picture.
Strengths. Drifts. Patterns that matter.

Read Your ${month} Report:
${viewUrl}
    `.trim(),
  },
  quarterly: {
    subject: (quarter: string) => `${quarter} Sales Performance - Time for the Big View`,
    preview: 'Three months. One trajectory.',
    body: (quarter: string, viewUrl: string) => `
Quarterly coaching is ready.

This is the long-view narrative of where you're improving and where you need to dig in.
Take a moment with it.

View Your ${quarter} Report:
${viewUrl}
    `.trim(),
  },
};
