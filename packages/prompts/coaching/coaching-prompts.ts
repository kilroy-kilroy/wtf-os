// Coaching System Prompts for Weekly/Monthly/Quarterly Reports
// These generate personalized coaching reports based on call analysis data

export type ReportType = 'weekly' | 'monthly' | 'quarterly';

export interface CallData {
  date: string;
  prospect: string;
  duration_minutes: number;
  outcome: 'won' | 'lost' | 'ghosted' | 'next_step' | 'unknown';
  scores: {
    opening: number;
    discovery: number;
    diagnostic: number;
    value_articulation: number;
    objection_navigation: number;
    commitment: number;
    human_first: number;
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
- No hedging. No "it seems" or "it appears." Be definitive.
- No apologies. Just state what happened.
- Be concise but thorough for the report type.
- Prioritize actionable insight over general praise.
- Always include pattern names. They are branded IP.
- Maintain the "truth-teller rooting for you" tone.
- One harsh truth per report. Not mean. Just honest.
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

BEGIN.`;

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
  - Opening: ${call.scores.opening}/10
  - Discovery: ${call.scores.discovery}/10
  - Diagnostic: ${call.scores.diagnostic}/10
  - Value Articulation: ${call.scores.value_articulation}/10
  - Objection Navigation: ${call.scores.objection_navigation}/10
  - Commitment: ${call.scores.commitment}/10
  - Human-First: ${call.scores.human_first}/10
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

// Score aggregation helper
export interface AggregatedScores {
  overall: number;
  opening: number;
  discovery: number;
  diagnostic: number;
  value_articulation: number;
  objection_navigation: number;
  commitment: number;
  human_first: number;
  trust_velocity: number;
  agenda_control: number;
  pattern_density: number;
}

export function aggregateCallScores(calls: CallData[]): AggregatedScores {
  if (calls.length === 0) {
    return {
      overall: 0,
      opening: 0,
      discovery: 0,
      diagnostic: 0,
      value_articulation: 0,
      objection_navigation: 0,
      commitment: 0,
      human_first: 0,
      trust_velocity: 0,
      agenda_control: 0,
      pattern_density: 0,
    };
  }

  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

  const opening = avg(calls.map(c => c.scores.opening));
  const discovery = avg(calls.map(c => c.scores.discovery));
  const diagnostic = avg(calls.map(c => c.scores.diagnostic));
  const value_articulation = avg(calls.map(c => c.scores.value_articulation));
  const objection_navigation = avg(calls.map(c => c.scores.objection_navigation));
  const commitment = avg(calls.map(c => c.scores.commitment));
  const human_first = avg(calls.map(c => c.scores.human_first));

  const overall = (opening + discovery + diagnostic + value_articulation +
                   objection_navigation + commitment + human_first) / 7;

  // Derive dashboard metrics from scores
  const trust_velocity = (human_first + diagnostic) * 5; // Scale to 0-100
  const agenda_control = (opening + commitment) * 5;

  // Pattern density based on risk patterns detected
  const riskPatterns = ['Advice Avalanche', 'Soft Close Fade', 'Hourly Rate Trap',
                        'Generosity Trap', 'Interrogation Spiral', 'Scenic Route',
                        'Generous Professor'];
  const totalRiskPatterns = calls.reduce((count, call) =>
    count + call.patterns_detected.filter(p =>
      riskPatterns.some(rp => p.toLowerCase().includes(rp.toLowerCase()))
    ).length, 0);
  const pattern_density = Math.min(100, (totalRiskPatterns / calls.length) * 20);

  return {
    overall: Math.round(overall * 10) / 10,
    opening: Math.round(opening * 10) / 10,
    discovery: Math.round(discovery * 10) / 10,
    diagnostic: Math.round(diagnostic * 10) / 10,
    value_articulation: Math.round(value_articulation * 10) / 10,
    objection_navigation: Math.round(objection_navigation * 10) / 10,
    commitment: Math.round(commitment * 10) / 10,
    human_first: Math.round(human_first * 10) / 10,
    trust_velocity: Math.round(trust_velocity),
    agenda_control: Math.round(agenda_control),
    pattern_density: Math.round(pattern_density),
  };
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
