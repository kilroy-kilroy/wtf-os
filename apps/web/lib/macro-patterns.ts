/**
 * The 18 Canonical Macro Patterns
 *
 * These are the ONLY patterns that appear in the dashboard.
 * If it's not one of these 18 patterns, it doesn't get a tile, a score, or a graph.
 */

export type MacroCategory = 'connection' | 'diagnosis' | 'control' | 'activation';

export type MacroPolarity = 'positive' | 'negative';

export interface MacroPattern {
  id: string;
  name: string;
  category: MacroCategory;
  polarity: MacroPolarity;
  description: string;
  correctiveMove?: string;  // For negative patterns - what to do instead
}

export const MACRO_CATEGORIES: Record<MacroCategory, { label: string; color: string; bgColor: string }> = {
  connection: {
    label: 'CONNECTION & RAPPORT',
    color: '#FFDE59',
    bgColor: 'bg-[#FFDE59]',
  },
  diagnosis: {
    label: 'DIAGNOSIS & DISCOVERY',
    color: '#3B82F6',
    bgColor: 'bg-blue-500',
  },
  control: {
    label: 'CONTROL & AGENDA',
    color: '#F97316',
    bgColor: 'bg-orange-500',
  },
  activation: {
    label: 'ACTIVATION & CLOSE',
    color: '#E51B23',
    bgColor: 'bg-[#E51B23]',
  },
};

/**
 * The 18 Canonical Macro Patterns
 *
 * CONNECTION & RAPPORT (5)
 * - Cultural Handshake (positive)
 * - Peer Validation Engine (positive)
 * - Vulnerability Flip (positive)
 * - Scenic Route (negative) - taking too long to get to business
 * - Business Blitzer (negative) - rushing past rapport
 *
 * DIAGNOSIS & DISCOVERY (5)
 * - Diagnostic Reveal (positive)
 * - Self Diagnosis Pull (positive)
 * - Generous Professor (positive)
 * - Advice Avalanche (negative) - giving too much free advice
 * - Surface Scanner (negative) - staying too shallow
 *
 * CONTROL & AGENDA (4)
 * - Framework Drop (positive)
 * - Agenda Abandoner (negative) - losing control of the call
 * - Passenger (negative) - letting prospect drive
 * - Premature Solution (negative) - solving before diagnosing
 *
 * ACTIVATION & CLOSE (4)
 * - Mirror Close (positive)
 * - Permission Builder (positive)
 * - Soft Close Fade (negative) - weak close attempts
 * - Over-Explain Loop (negative) - talking past the close
 */

export const MACRO_PATTERNS: MacroPattern[] = [
  // CONNECTION & RAPPORT
  {
    id: 'cultural_handshake',
    name: 'Cultural Handshake',
    category: 'connection',
    polarity: 'positive',
    description: 'Establishing authentic connection through shared context, industry knowledge, or mutual understanding.',
  },
  {
    id: 'peer_validation_engine',
    name: 'Peer Validation Engine',
    category: 'connection',
    polarity: 'positive',
    description: 'Using relevant peer stories and social proof to build credibility and trust.',
  },
  {
    id: 'vulnerability_flip',
    name: 'Vulnerability Flip',
    category: 'connection',
    polarity: 'positive',
    description: 'Strategically showing authenticity or admitting limitations to deepen trust.',
  },
  {
    id: 'scenic_route',
    name: 'Scenic Route',
    category: 'connection',
    polarity: 'negative',
    description: 'Taking too long to get to business, excessive small talk, meandering conversation.',
    correctiveMove: 'Transition to business within 2-3 minutes. Use a bridge phrase: "I appreciate the background. Let me ask..."',
  },
  {
    id: 'business_blitzer',
    name: 'Business Blitzer',
    category: 'connection',
    polarity: 'negative',
    description: 'Rushing past rapport, diving straight into pitch mode without establishing connection.',
    correctiveMove: 'Start with 60-90 seconds of genuine curiosity about their situation before any pitch.',
  },

  // DIAGNOSIS & DISCOVERY
  {
    id: 'diagnostic_reveal',
    name: 'Diagnostic Reveal',
    category: 'diagnosis',
    polarity: 'positive',
    description: 'Uncovering root problems through strategic questioning that reveals insights to the prospect.',
  },
  {
    id: 'self_diagnosis_pull',
    name: 'Self Diagnosis Pull',
    category: 'diagnosis',
    polarity: 'positive',
    description: 'Guiding prospects to articulate their own problems and needs through powerful questions.',
  },
  {
    id: 'generous_professor',
    name: 'Generous Professor',
    category: 'diagnosis',
    polarity: 'positive',
    description: 'Sharing valuable diagnostic insights that demonstrate expertise while creating reciprocity.',
  },
  {
    id: 'advice_avalanche',
    name: 'Advice Avalanche',
    category: 'diagnosis',
    polarity: 'negative',
    description: 'Giving away too much free consulting, solving problems before earning the right.',
    correctiveMove: 'Stop after one insight. Ask: "Does that resonate?" Wait for them to ask for more.',
  },
  {
    id: 'surface_scanner',
    name: 'Surface Scanner',
    category: 'diagnosis',
    polarity: 'negative',
    description: 'Staying too shallow in discovery, missing the real pain beneath surface complaints.',
    correctiveMove: 'Ask "What happens if you don\'t solve this?" three times to find the real impact.',
  },

  // CONTROL & AGENDA
  {
    id: 'framework_drop',
    name: 'Framework Drop',
    category: 'control',
    polarity: 'positive',
    description: 'Establishing clear structure and agenda that positions you as the expert guide.',
  },
  {
    id: 'agenda_abandoner',
    name: 'Agenda Abandoner',
    category: 'control',
    polarity: 'negative',
    description: 'Losing control of call structure, letting conversation drift without purpose.',
    correctiveMove: 'Reset with: "I want to make sure we cover what matters most. Can we refocus on..."',
  },
  {
    id: 'passenger',
    name: 'Passenger',
    category: 'control',
    polarity: 'negative',
    description: 'Letting the prospect drive the entire conversation, reactive instead of leading.',
    correctiveMove: 'Take the wheel: "Great question. Before I answer, help me understand..."',
  },
  {
    id: 'premature_solution',
    name: 'Premature Solution',
    category: 'control',
    polarity: 'negative',
    description: 'Jumping to solutions before fully understanding the problem, pitching too early.',
    correctiveMove: 'Hold back. Say: "I have some ideas, but first I need to understand [specific gap]."',
  },

  // ACTIVATION & CLOSE
  {
    id: 'mirror_close',
    name: 'Mirror Close',
    category: 'activation',
    polarity: 'positive',
    description: 'Reflecting the prospect\'s own words back to show understanding and create alignment.',
  },
  {
    id: 'permission_builder',
    name: 'Permission Builder',
    category: 'activation',
    polarity: 'positive',
    description: 'Building momentum through micro-commitments and explicit permission to proceed.',
  },
  {
    id: 'soft_close_fade',
    name: 'Soft Close Fade',
    category: 'activation',
    polarity: 'negative',
    description: 'Weak close attempts, ending with "let me know" instead of specific next steps.',
    correctiveMove: 'Always propose a specific next step with date/time: "Let\'s schedule the follow-up for Tuesday at 2pm."',
  },
  {
    id: 'over_explain_loop',
    name: 'Over-Explain Loop',
    category: 'activation',
    polarity: 'negative',
    description: 'Talking past the close, continuing to sell after they\'re ready to buy.',
    correctiveMove: 'When you see buying signals, stop talking and ask: "What questions do you have?"',
  },
];

// Helper functions
export function getPatternById(id: string): MacroPattern | undefined {
  return MACRO_PATTERNS.find(p => p.id === id);
}

export function getPatternByName(name: string): MacroPattern | undefined {
  return MACRO_PATTERNS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

export function getPatternsByCategory(category: MacroCategory): MacroPattern[] {
  return MACRO_PATTERNS.filter(p => p.category === category);
}

export function getPositivePatterns(): MacroPattern[] {
  return MACRO_PATTERNS.filter(p => p.polarity === 'positive');
}

export function getNegativePatterns(): MacroPattern[] {
  return MACRO_PATTERNS.filter(p => p.polarity === 'negative');
}

export function getCategoryColor(category: MacroCategory): string {
  return MACRO_CATEGORIES[category].color;
}

export function getCategoryLabel(category: MacroCategory): string {
  return MACRO_CATEGORIES[category].label;
}

// Pattern data for dashboard display
export interface PatternData {
  patternId: string;
  frequency: number;      // X of Y calls
  totalCalls: number;
  trend: 'up' | 'down' | 'stable';
  representativeQuote?: string;
  coachingNote?: string;
}

// Next Call Focus data
export interface NextCallFocusData {
  pattern: MacroPattern;
  whyCostingDeals: string;
  correctiveMove: string;
  exampleLanguage?: string;
}

// Momentum data
export interface MomentumData {
  mostImproved?: {
    pattern: MacroPattern;
    changeSinceLastPeriod: number;  // percentage points
    explanation: string;
  };
  mostRegressed?: {
    pattern: MacroPattern;
    changeSinceLastPeriod: number;
    explanation: string;
  };
}
