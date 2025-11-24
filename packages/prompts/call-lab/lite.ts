import {
  TRANSCRIPT_VALIDATION,
  EVIDENCE_RULES,
  SCORING_RUBRIC,
  GUARDRAILS,
} from './shared';

export const CALL_LAB_LITE_SYSTEM = `
You are Call Lab Lite, a fast sales call diagnostic that gives founders an immediate read on their call quality.

Your voice: Sharp, consultative, a little irreverent. You focus on what happened and what to do next.

${TRANSCRIPT_VALIDATION}

${EVIDENCE_RULES}

${SCORING_RUBRIC}

${GUARDRAILS}
`;

export interface CallLabLiteParams {
  transcript: string;
  rep_name: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
}

export const CALL_LAB_LITE_USER = (params: CallLabLiteParams) => `
Analyze this sales call transcript and provide a Lite diagnostic.

Rep Name: ${params.rep_name}
Prospect Company: ${params.prospect_company || 'Not provided'}
Prospect Role: ${params.prospect_role || 'Not provided'}
Call Stage: ${params.call_stage || 'Not provided'}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "validation": {
    "opening_lines": "First 2-3 lines quoted",
    "participants": ["Rep Name", "Prospect Name"],
    "valid": true
  },
  "overall": {
    "score": 3.8,
    "grade": "B",
    "one_liner": "Strong discovery but weak close commitment"
  },
  "scores": {
    "control_confidence": { "score": 4, "reason": "One sentence with quote" },
    "discovery_depth": { "score": 3, "reason": "One sentence with quote" },
    "relevance_narrative": { "score": 4, "reason": "One sentence with quote" },
    "objection_handling": { "score": 3, "reason": "One sentence with quote" },
    "next_steps_clarity": { "score": 4, "reason": "One sentence with quote" }
  },
  "strengths": [
    {
      "quote": "Exact transcript quote",
      "behavior": "What the rep did well",
      "note": "Why this matters"
    }
  ],
  "weaknesses": [
    {
      "quote": "Exact transcript quote",
      "behavior": "What went wrong",
      "note": "What to do instead"
    }
  ],
  "focus_area": {
    "theme": "The one thing to work on",
    "why": "Brief explanation",
    "drill": "Specific practice suggestion"
  },
  "follow_ups": [
    {
      "type": "direct_close",
      "subject": "Email subject line",
      "body": "Full email body"
    },
    {
      "type": "value_add",
      "subject": "Email subject line",
      "body": "Full email body"
    }
  ],
  "tasks": [
    "Specific task 1",
    "Specific task 2"
  ]
}

Important:
- All quotes MUST be verbatim from the transcript
- Scores are 1-5 scale
- Exactly 3 strengths and 3 weaknesses
- Follow-up emails should reference specific moments from the call
`;

// Type definitions for the response
export interface CallLabLiteResponse {
  validation: {
    opening_lines: string;
    participants: string[];
    valid: boolean;
  };
  overall: {
    score: number;
    grade: string;
    one_liner: string;
  };
  scores: {
    control_confidence: { score: number; reason: string };
    discovery_depth: { score: number; reason: string };
    relevance_narrative: { score: number; reason: string };
    objection_handling: { score: number; reason: string };
    next_steps_clarity: { score: number; reason: string };
  };
  strengths: Array<{
    quote: string;
    behavior: string;
    note: string;
  }>;
  weaknesses: Array<{
    quote: string;
    behavior: string;
    note: string;
  }>;
  focus_area: {
    theme: string;
    why: string;
    drill: string;
  };
  follow_ups: Array<{
    type: string;
    subject: string;
    body: string;
  }>;
  tasks: string[];
}
