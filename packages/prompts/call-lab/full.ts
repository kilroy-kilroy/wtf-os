import {
  TRANSCRIPT_VALIDATION,
  EVIDENCE_RULES,
  SCORING_RUBRIC,
  FRAMEWORKS,
  GUARDRAILS,
} from './shared';

export const CALL_LAB_FULL_SYSTEM = `
You are SalesOS Call Lab, the complete call grading and coaching system.

Your voice: Sharp, consultative, irreverent. Tim Kilroy's voice—focused on what happened in the moment and what to do next time.

${TRANSCRIPT_VALIDATION}

${EVIDENCE_RULES}

${SCORING_RUBRIC}

${FRAMEWORKS}

${GUARDRAILS}

You evaluate calls across three layers:
1. Core Call Scoring (10 categories, 1-10 scale)
2. FYFS Alignment Scoring (6 categories)
3. Emotional Intelligence Layer (4 categories)

You also score against Challenger, Gap Selling, SPIN, and BANT frameworks.
`;

export interface CallLabFullParams {
  transcript: string;
  rep_name: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
  deal_tier?: string;
  known_objections?: string[];
  icp_context?: string;
}

export const CALL_LAB_FULL_USER = (params: CallLabFullParams) => `
Analyze this sales call transcript with full diagnostic depth.

Rep Name: ${params.rep_name}
Prospect Company: ${params.prospect_company || 'Not provided'}
Prospect Role: ${params.prospect_role || 'Not provided'}
Call Stage: ${params.call_stage || 'Not provided'}
Deal Tier: ${params.deal_tier || 'Not provided'}
Known Objections: ${params.known_objections?.join(', ') || 'None provided'}
ICP Context: ${params.icp_context || 'Not provided'}

TRANSCRIPT:
${params.transcript}

---

Respond with this EXACT JSON structure:

{
  "validation": {
    "opening_lines": "First 2-3 lines quoted",
    "participants": [{"name": "Name", "role": "rep|prospect"}],
    "valid": true
  },

  "summary": {
    "diagnosis": "One paragraph high-level diagnosis",
    "prospect_fit_score": 8,
    "call_quality_grade": "A-",
    "likelihood_to_advance": 0.75,
    "killer_highlight": { "quote": "...", "why": "..." },
    "biggest_miss": { "quote": "...", "why": "..." }
  },

  "scores": {
    "overall": 8.2,
    "core": {
      "control_authority": { "score": 8, "evidence": "quote", "note": "..." },
      "discovery_depth": { "score": 7, "evidence": "quote", "note": "..." },
      "narrative_framing": { "score": 8, "evidence": "quote", "note": "..." },
      "relevance_resonance": { "score": 9, "evidence": "quote", "note": "..." },
      "solution_fit": { "score": 7, "evidence": "quote", "note": "..." },
      "objection_navigation": { "score": 6, "evidence": "quote", "note": "..." },
      "value_creation": { "score": 8, "evidence": "quote", "note": "..." },
      "proof_story_use": { "score": 7, "evidence": "quote", "note": "..." },
      "risk_reduction": { "score": 6, "evidence": "quote", "note": "..." },
      "next_step_clarity": { "score": 8, "evidence": "quote", "note": "..." }
    },
    "fyfs": {
      "gap_clarity": { "score": 9, "evidence": "quote", "note": "..." },
      "storytelling": { "score": 8, "evidence": "quote", "note": "..." },
      "guide_not_respond": { "score": 7, "evidence": "quote", "note": "..." },
      "category_framing": { "score": 6, "evidence": "quote", "note": "..." },
      "high_signal_questions": { "score": 8, "evidence": "quote", "note": "..." },
      "client_leadership": { "score": 8, "evidence": "quote", "note": "..." }
    },
    "eq": {
      "tone_warmth_pacing": { "score": 8, "evidence": "quote", "note": "..." },
      "presence": { "score": 7, "evidence": "quote", "note": "..." },
      "listening_quality": { "score": 9, "evidence": "quote", "note": "..." },
      "rapport": { "score": 9, "evidence": "quote", "note": "..." }
    }
  },

  "frameworks": {
    "challenger": {
      "score": 8.5,
      "teach": { "status": "strong", "evidence": "quote" },
      "tailor": { "status": "strong", "evidence": "quote" },
      "take_control": { "status": "moderate", "evidence": "quote" }
    },
    "gap_selling": {
      "score": 9,
      "current_state": { "status": "discussed", "evidence": "quote" },
      "future_state": { "status": "discussed", "evidence": "quote" },
      "gap": { "status": "discussed", "evidence": "quote" }
    },
    "spin": {
      "score": 8,
      "situation": { "status": "discussed", "evidence": "quote" },
      "problem": { "status": "discussed", "evidence": "quote" },
      "implication": { "status": "partial", "evidence": "quote" },
      "need_payoff": { "status": "not_discussed", "evidence": null }
    },
    "bant": {
      "score": 7.5,
      "budget": { "status": "partial", "evidence": "quote" },
      "authority": { "status": "confirmed", "evidence": "quote" },
      "need": { "status": "strong", "evidence": "quote" },
      "timeline": { "status": "unclear", "evidence": "quote" }
    }
  },

  "metrics": {
    "talk_listen_ratio": { "rep": 35, "prospect": 65 },
    "engagement_level": "high",
    "objections_surfaced": ["objection 1", "objection 2"],
    "decision_process_clarity": "moderate"
  },

  "moments": {
    "best": [
      { "quote": "...", "timestamp": "12:34", "why": "..." }
    ],
    "missed": [
      { "quote": "...", "timestamp": "15:20", "opportunity": "..." }
    ],
    "red_flags": [
      { "quote": "...", "timestamp": "20:15", "risk": "..." }
    ],
    "coachable": [
      { "quote": "...", "timestamp": "25:00", "lesson": "...", "drill": "..." }
    ]
  },

  "phrases": {
    "high_impact": ["Verbatim quote 1", "Verbatim quote 2"],
    "detrimental": ["Verbatim quote 1"],
    "alternatives": [
      {
        "prospect_said": "quote",
        "rep_said": "quote",
        "better_response": "suggested response"
      }
    ]
  },

  "improvement": {
    "theme": "Primary improvement theme",
    "drills": ["Drill 1", "Drill 2"],
    "role_plays": ["Scenario 1", "Scenario 2"],
    "next_call_focus": "Specific thing to do differently"
  },

  "follow_ups": [
    {
      "type": "commitment",
      "subject": "...",
      "body": "..."
    },
    {
      "type": "value_reinforcement",
      "subject": "...",
      "body": "..."
    },
    {
      "type": "soft_ask_authority",
      "subject": "...",
      "body": "..."
    }
  ],

  "tasks": [
    { "task": "...", "tied_to": "promise from call" }
  ]
}

Important:
- ALL evidence fields MUST contain verbatim transcript quotes
- Status options: "discussed", "partial", "not_discussed", "strong", "moderate", "weak"
- Timestamps should be approximate if not available
- Follow-up emails must reference specific call moments
`;

// Type definition for the full response (simplified)
export interface CallLabFullResponse {
  validation: {
    opening_lines: string;
    participants: Array<{ name: string; role: string }>;
    valid: boolean;
  };
  summary: {
    diagnosis: string;
    prospect_fit_score: number;
    call_quality_grade: string;
    likelihood_to_advance: number;
    killer_highlight: { quote: string; why: string };
    biggest_miss: { quote: string; why: string };
  };
  scores: {
    overall: number;
    core: Record<string, { score: number; evidence: string; note: string }>;
    fyfs: Record<string, { score: number; evidence: string; note: string }>;
    eq: Record<string, { score: number; evidence: string; note: string }>;
  };
  frameworks: Record<string, any>;
  metrics: {
    talk_listen_ratio: { rep: number; prospect: number };
    engagement_level: string;
    objections_surfaced: string[];
    decision_process_clarity: string;
  };
  moments: {
    best: Array<{ quote: string; timestamp: string; why: string }>;
    missed: Array<{ quote: string; timestamp: string; opportunity: string }>;
    red_flags: Array<{ quote: string; timestamp: string; risk: string }>;
    coachable: Array<{ quote: string; timestamp: string; lesson: string; drill: string }>;
  };
  phrases: {
    high_impact: string[];
    detrimental: string[];
    alternatives: Array<{
      prospect_said: string;
      rep_said: string;
      better_response: string;
    }>;
  };
  improvement: {
    theme: string;
    drills: string[];
    role_plays: string[];
    next_call_focus: string;
  };
  follow_ups: Array<{
    type: string;
    subject: string;
    body: string;
  }>;
  tasks: Array<{
    task: string;
    tied_to: string;
  }>;
}
