// Pattern Glossary - Single source of truth for all sales patterns
// Used for tooltips throughout the dashboard and reports

export interface PatternDefinition {
  name: string;
  description: string;
  type: 'positive' | 'risk' | 'metric';
}

export const patternGlossary: Record<string, PatternDefinition> = {
  // Core Metrics (dashboard KPIs)
  'trust-velocity': {
    name: 'Trust Velocity',
    description: 'How quickly the buyer relaxes and reveals meaningful information. Higher scores mean faster trust-building.',
    type: 'metric'
  },
  'agenda-control': {
    name: 'Agenda Control',
    description: 'Your ability to steer conversations toward outcomes. Measures consistency in controlling leverage moments.',
    type: 'metric'
  },
  'red-flag-frequency': {
    name: 'Red Flag Frequency',
    description: 'How often friction patterns appear in your calls. Lower is better - clean calls close faster.',
    type: 'metric'
  },

  // Risk Patterns (things to avoid)
  'the-scenic-route': {
    name: 'The Scenic Route',
    description: 'Taking too long to get to the point. Prospects tune out before you land the message.',
    type: 'risk'
  },
  'generous-professor-syndrome': {
    name: 'Generous Professor Syndrome',
    description: "Teaching so much they don't need to hire you. Save the strategy for after the sale.",
    type: 'risk'
  },
  'generous-giveaway': {
    name: 'Generous Giveaway',
    description: "Giving away the solution during discovery. Diagnose the problem, don't solve it for free.",
    type: 'risk'
  },
  'the-advice-avalanche': {
    name: 'The Advice Avalanche',
    description: 'Solving their entire problem before they pay you. They leave with a free strategy session.',
    type: 'risk'
  },
  'the-soft-close-fade': {
    name: 'The Soft Close Fade',
    description: "Ending with 'let me know' instead of asking for a decision. Gives permission to ghost.",
    type: 'risk'
  },
  'the-interrogation-spiral': {
    name: 'The Interrogation Spiral',
    description: 'Discovery that feels like a deposition. Questions without warmth or context.',
    type: 'risk'
  },
  'the-hourly-rate-trap': {
    name: 'The Hourly Rate Trap',
    description: 'Letting prospects anchor on time-for-money. Positions you as a commodity.',
    type: 'risk'
  },
  'the-generosity-trap': {
    name: 'The Generosity Trap',
    description: "Giving so much value they don't need to buy. Over-delivering before the sale.",
    type: 'risk'
  },

  // Positive Patterns (trust-building moves)
  'the-mirror-close': {
    name: 'The Mirror Close',
    description: "Reflecting the buyer's potential back to them so they see themselves differently.",
    type: 'positive'
  },
  'the-diagnostic-reveal': {
    name: 'The Diagnostic Reveal',
    description: "Naming a pattern the prospect didn't see. Creates instant credibility.",
    type: 'positive'
  },
  'the-vulnerability-flip': {
    name: 'The Vulnerability Flip',
    description: 'Turning a weakness or admission into deeper connection and trust.',
    type: 'positive'
  },
  'the-peer-validation-engine': {
    name: 'The Peer Validation Engine',
    description: 'Establishing cultural credibility by showing you understand their world.',
    type: 'positive'
  },
  'the-framework-drop': {
    name: 'The Framework Drop',
    description: 'Giving structure that creates clarity. Names their situation in a way that feels insightful.',
    type: 'positive'
  },
  'the-permission-pivot': {
    name: 'The Permission Pivot',
    description: 'Asking for permission before transitioning. Creates psychological safety.',
    type: 'positive'
  },
  'the-future-pacing': {
    name: 'The Future Pacing',
    description: 'Helping prospects visualize success. Makes the outcome feel real.',
    type: 'positive'
  },
  'the-pattern-interrupt': {
    name: 'The Pattern Interrupt',
    description: 'Breaking expected conversational patterns to regain attention.',
    type: 'positive'
  },
};

// Helper to normalize pattern key from display name
export function normalizePatternKey(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Get pattern by display name (case-insensitive, handles variations)
export function getPatternByName(displayName: string): PatternDefinition | null {
  const key = normalizePatternKey(displayName);
  if (patternGlossary[key]) {
    return patternGlossary[key];
  }

  // Try partial match
  const entries = Object.entries(patternGlossary);
  for (const [k, pattern] of entries) {
    if (normalizePatternKey(pattern.name) === key) {
      return pattern;
    }
    // Check if display name contains the pattern name
    if (displayName.toLowerCase().includes(pattern.name.toLowerCase().replace('the ', ''))) {
      return pattern;
    }
  }

  return null;
}
