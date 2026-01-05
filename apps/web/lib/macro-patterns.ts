// Macro Patterns - Pattern definitions for Call Lab Pro dashboard
// Used in example dashboard and pattern analysis

export interface MacroPattern {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative';
  category: 'closing' | 'discovery' | 'rapport' | 'control' | 'value';
}

export const MACRO_PATTERNS: MacroPattern[] = [
  // Positive patterns
  {
    id: 'mirror_close',
    name: 'The Mirror Close',
    description: "Reflecting the buyer's potential back to them so they see themselves differently.",
    type: 'positive',
    category: 'closing',
  },
  {
    id: 'diagnostic_reveal',
    name: 'The Diagnostic Reveal',
    description: "Naming a pattern the prospect didn't see. Creates instant credibility.",
    type: 'positive',
    category: 'discovery',
  },
  {
    id: 'permission_builder',
    name: 'The Permission Builder',
    description: 'Asking for permission before transitioning. Creates psychological safety.',
    type: 'positive',
    category: 'rapport',
  },
  {
    id: 'cultural_handshake',
    name: 'The Cultural Handshake',
    description: 'Establishing credibility by showing you understand their world and speak their language.',
    type: 'positive',
    category: 'rapport',
  },
  {
    id: 'self_diagnosis_pull',
    name: 'The Self-Diagnosis Pull',
    description: 'Getting the prospect to articulate their own problem, creating ownership of the pain.',
    type: 'positive',
    category: 'discovery',
  },
  {
    id: 'framework_drop',
    name: 'The Framework Drop',
    description: 'Giving structure that creates clarity. Names their situation in a way that feels insightful.',
    type: 'positive',
    category: 'value',
  },
  {
    id: 'peer_validation_engine',
    name: 'The Peer Validation Engine',
    description: 'Using relevant social proof that resonates with their specific situation.',
    type: 'positive',
    category: 'rapport',
  },
  {
    id: 'generous_professor',
    name: 'The Generous Professor',
    description: 'Teaching just enough to demonstrate expertise without giving away the full solution.',
    type: 'positive',
    category: 'value',
  },
  {
    id: 'vulnerability_flip',
    name: 'The Vulnerability Flip',
    description: 'Turning a weakness or admission into deeper connection and trust.',
    type: 'positive',
    category: 'rapport',
  },
  // Negative patterns
  {
    id: 'soft_close_fade',
    name: 'The Soft Close Fade',
    description: "Ending with 'let me know' instead of asking for a decision. Gives permission to ghost.",
    type: 'negative',
    category: 'closing',
  },
  {
    id: 'over_explain_loop',
    name: 'The Over-Explain Loop',
    description: 'Continuing to explain after the prospect is already convinced. Talking past the close.',
    type: 'negative',
    category: 'closing',
  },
  {
    id: 'premature_solution',
    name: 'The Premature Solution',
    description: 'Jumping to solutions before fully understanding the problem. Skipping discovery.',
    type: 'negative',
    category: 'discovery',
  },
  {
    id: 'surface_scanner',
    name: 'The Surface Scanner',
    description: 'Asking surface-level questions without digging deeper into real pain points.',
    type: 'negative',
    category: 'discovery',
  },
  {
    id: 'passenger',
    name: 'The Passenger',
    description: 'Letting the prospect control the entire conversation without steering toward outcomes.',
    type: 'negative',
    category: 'control',
  },
  {
    id: 'advice_avalanche',
    name: 'The Advice Avalanche',
    description: 'Solving their entire problem before they pay you. They leave with a free strategy session.',
    type: 'negative',
    category: 'value',
  },
  {
    id: 'agenda_abandoner',
    name: 'The Agenda Abandoner',
    description: 'Losing the thread of the conversation and failing to cover key topics.',
    type: 'negative',
    category: 'control',
  },
  {
    id: 'scenic_route',
    name: 'The Scenic Route',
    description: 'Taking too long to get to the point. Prospects tune out before you land the message.',
    type: 'negative',
    category: 'control',
  },
  {
    id: 'business_blitzer',
    name: 'The Business Blitzer',
    description: 'Jumping straight into business without building rapport. Feels transactional.',
    type: 'negative',
    category: 'rapport',
  },
];

// Helper to get pattern by ID
export function getPatternById(id: string): MacroPattern | undefined {
  return MACRO_PATTERNS.find((p) => p.id === id);
}

// Helper to get patterns by type
export function getPatternsByType(type: 'positive' | 'negative'): MacroPattern[] {
  return MACRO_PATTERNS.filter((p) => p.type === type);
}

// Helper to get patterns by category
export function getPatternsByCategory(category: MacroPattern['category']): MacroPattern[] {
  return MACRO_PATTERNS.filter((p) => p.category === category);
}
