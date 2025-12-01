// Tooltip content definitions for dashboard and reports

export const dashboardTooltips = {
  trustVelocity: {
    label: "Trust Velocity",
    tooltip: "How quickly buyers begin opening up during the call. Higher is better. Measured from buyer disclosure moments, vulnerability signals, and conversational reciprocity."
  },
  agendaControl: {
    label: "Agenda Control",
    tooltip: "Your ability to keep the call on a linear, low-friction journey. Higher is better. Calculated from detours, interruptions, topic shifts, and transition smoothness."
  },
  patternFriction: {
    label: "Pattern Friction Index",
    tooltip: "Measures how many friction patterns appear across your calls. Lower is better. Decreasing friction means cleaner, easier conversations."
  },
  skillImprovementIndex: {
    label: "Skill Improvement Index",
    tooltip: "A composite 0 to 100 score showing how your skills are trending across the last five calls. Based on trust, clarity, depth, and pattern reduction."
  },
  quickInsights: {
    buyerMoment: {
      label: "Buyer Moment",
      tooltip: "A real buyer quote showing increased trust, urgency, or clarity during the call."
    },
    sharpMove: {
      label: "Your Sharpest Move",
      tooltip: "The strongest action you took that improved the call."
    },
    blindSpot: {
      label: "Your Biggest Blind Spot",
      tooltip: "The most consistent behavior that limited the call's effectiveness."
    }
  },
  patternRadar: {
    label: "Pattern Radar",
    tooltip: "Shows how frequently each friction pattern appears across your last ten calls. Larger zones signal more important improvement areas."
  },
  mostFrequentPattern: {
    label: "Most Frequent Pattern",
    tooltip: "The habit that shows up most often across your calls. Reducing it has high impact on trust and clarity."
  },
  mostImprovedSkill: {
    label: "Most Improved Skill",
    tooltip: "Based on your last eight calls, this is the skill improving the fastest."
  },
  recentCalls: {
    score: "Score based on this call only.",
    pattern: "A friction pattern detected during the call.",
    improvementItem: "Highest leverage action for the next call.",
    tooltip: "This table shows your last calls, with quick notes on what to improve next."
  },
  weeklyFocus: {
    label: "Weekly Coaching Focus",
    tooltip: "A single directive for the next seven days. Based on trends, patterns, and trust moments."
  },
  followUps: {
    label: "Follow Ups You Owe People",
    tooltip: "Tracks commitments made during calls so nothing slips through the cracks."
  },
  trends: {
    trustVelocity: {
      label: "Trust Velocity Trend",
      tooltip: "Shows how fast trust builds across your last twenty calls."
    },
    agendaControl: {
      label: "Agenda Control Trend",
      tooltip: "Shows how consistently you held structure across calls."
    },
    patternFriction: {
      label: "Pattern Friction Trend",
      tooltip: "Shows whether friction patterns are increasing or fading."
    }
  },
  salesIdentity: {
    label: "Sales Identity",
    tooltip: "A summary of your conversational style based on patterns, tone markers, and move sequencing."
  }
} as const;

export const proReportTooltips = {
  overallScore: {
    label: "Overall Score",
    tooltip: "This score reflects move execution, depth, alignment, and friction patterns. It is a coaching metric, not a judgment."
  },
  subScores: {
    tooltip: "These subscores show which parts of the call contributed to your overall score. Based solely on this call."
  },
  trustCurve: {
    label: "Trust Curve",
    tooltip: "Shows how buyer trust rose or stalled during this call. Peaks reflect openness and honesty. Dips reflect confusion or friction."
  },
  methodSynthesis: {
    label: "Human First Selling",
    tooltip: "Shows where you created safety, clarity, and direction. Maps your conversation to Human First Selling principles."
  },
  callOpening: {
    label: "Call Opening",
    tooltip: "The opening sets tone, clarity, and conversational safety."
  },
  gapSeeding: {
    label: "Gap Seeding",
    tooltip: "Introduces the idea that something may not be working well. Creates curiosity without pressure."
  },
  gapDeepening: {
    label: "Gap Deepening",
    tooltip: "Turns small problems into meaningful problems. Drives urgency and insight."
  },
  impactProbing: {
    label: "Impact Probing",
    tooltip: "Connects current challenges to measurable consequences. Without clear impact, urgency collapses."
  },
  decisionModel: {
    label: "Decision Model",
    tooltip: "Reveals how the buyer chooses. Criteria, people, timing, constraints, and risks."
  },
  prescription: {
    label: "Prescription",
    tooltip: "A recommendation that bridges the buyer's problem and the path forward."
  },
  patternsDetected: {
    label: "Patterns Detected",
    tooltip: "Detected sales habits that appear across calls and influence performance."
  },
  specificPatterns: {
    scenicRoute: "You lost call flow by switching topics or over-explaining.",
    generousProfessor: "You taught too much instead of guiding the buyer.",
    generousGiveaway: "You gave solutions before establishing urgency.",
    prematurePrescription: "You recommended solutions before the buyer had clarity.",
    weakClose: "You ended without driving clear next steps.",
    problemOrgy: "You stayed too long in problem exploration without creating direction."
  },
  tacticalRewrites: {
    label: "Tactical Rewrites",
    tooltip: "Shows improved phrasing for key moments. Highlights what stronger versions accomplish."
  },
  callRebuild: {
    label: "45 Second Call Rebuild",
    tooltip: "A fast rewrite of the core call moments. Shows the high clarity version of this call."
  },
  nextSteps: {
    label: "Next Steps",
    tooltip: "Highest leverage actions to take before your next call with this buyer."
  },
  followUpEmail: {
    label: "Follow Up Email",
    tooltip: "Customized email reinforcing trust, clarity, and direction from the call."
  },
  sessionSummary: {
    label: "Session Summary",
    tooltip: "Summary of what mattered most in this specific call. Does not reflect long-term trends."
  }
} as const;

export const methodologyTooltips = {
  challenger: {
    label: "Challenger",
    tooltip: "Challenger evaluates how well you introduce insight, reframe assumptions, and create constructive tension."
  },
  spin: {
    label: "SPIN",
    tooltip: "SPIN scores your balance of Situation, Problem, Implication, and Need-Payoff questioning during the call."
  },
  sandler: {
    label: "Sandler",
    tooltip: "Sandler evaluates upfront contract clarity, budget alignment, decision roles, and pressure reduction."
  },
  meddic: {
    label: "MEDDIC",
    tooltip: "MEDDIC measures Metrics, Economic buyer clarity, Decision criteria, Decision process, Implicated pain, and Champion."
  },
  neat: {
    label: "NEAT",
    tooltip: "NEAT scores your ability to uncover Need, Economic impact, Access to authority, and Timeline."
  },
  wtfMethod: {
    label: "WTF Method",
    tooltip: "The WTF Method evaluates safety, clarity, direction, and narrative control inside the conversation."
  }
} as const;

// Type exports for type-safe access
export type DashboardTooltips = typeof dashboardTooltips;
export type ProReportTooltips = typeof proReportTooltips;
export type MethodologyTooltips = typeof methodologyTooltips;
