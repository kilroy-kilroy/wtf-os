/**
 * Call Lab Pro Upgrade Page - Dynamic Personalization System
 *
 * This module generates personalized upgrade page copy based on the user's
 * Call Lab Lite report data. The more specific and personal the copy,
 * the higher the conversion rate.
 */

export interface LiteReportData {
  score: number;
  max_score: number;
  effectiveness: string;
  primary_pattern: {
    name: string;
    type: 'weakness' | 'strength';
    description: string;
  };
  secondary_pattern?: {
    name: string;
    type: 'weakness' | 'strength';
    description: string;
  };
  buying_signals_detected?: number;
  missed_close_opportunities?: number;
  call_duration_minutes?: number;
  total_lite_reports_generated?: number;
  rep_name?: string;
  prospect_name?: string;
}

export interface PersonalizedCopy {
  pain_paragraph: string;
  what_you_dont_know: string;
  testimonial_quote: string;
  testimonial_attribution: string;
  cta_urgency: string;
  score: string;
  effectiveness: string;
}

/**
 * Pattern name -> plain language mapping
 * These should match your actual Lite report patterns
 */
const PATTERN_CONVERSIONS: Record<string, string> = {
  'The Advice Avalanche': 'gave away the entire strategy session',
  'The Soft Close Fade': 'ended with "let me know what you think"',
  'The Generosity Trap': "delivered so much value they don't need to hire you",
  'The Peer Validation Engine': 'built massive credibility by showing you get it',
  'The Pricing Intervention': 'diagnosed their underpricing and showed them the ceiling',
  'The Immediate Value Bomb': 'gave them actionable strategy before they paid',
  'The Mirror Close': 'reflected back their potential until they saw themselves differently',
  'The Vulnerability Flip': 'turned their objection into the reason to buy',
  'The Diagnostic Reveal': 'named their problem before they could',
  'The Permission Pattern': 'made the sale feel optional, not urgent',
  'The Premature Solution': 'solved the problem before showing them why it matters',
};

/**
 * Map patterns to relevant testimonials
 * Different testimonials resonate with different patterns
 */
const TESTIMONIAL_MAP: Record<string, { quote: string; attribution: string }> = {
  'The Advice Avalanche': {
    quote: "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
    attribution: "$2mm performance marketing agency founder"
  },
  'The Soft Close Fade': {
    quote: "I thought I was being consultative. Pro showed me I was just being scared to ask.",
    attribution: "$2mm performance marketing agency founder"
  },
  'The Generosity Trap': {
    quote: "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
    attribution: "$2mm performance marketing agency founder"
  },
  'default': {
    quote: "I've been giving away strategy for 18 months. Pro showed me I wasn't building trust—I was eliminating urgency.",
    attribution: "$2mm performance marketing agency founder"
  }
};

/**
 * Convert pattern names to plain language descriptions
 *
 * Example:
 * "The Advice Avalanche" -> "gave away the entire strategy session"
 * "The Soft Close Fade" -> "ended with 'let me know what you think'"
 */
function patternToPlainLanguage(pattern: LiteReportData['primary_pattern']): string {
  const name = pattern.name;
  const type = pattern.type;

  // Try exact match first
  if (name in PATTERN_CONVERSIONS) {
    return PATTERN_CONVERSIONS[name];
  }

  // Fall back to generic based on type
  if (type === 'weakness') {
    return 'missed key closing moments';
  } else {
    return 'built strong rapport';
  }
}

/**
 * Generate the personalized 'You know...' paragraph
 *
 * This is the most critical conversion element - it proves we analyzed
 * their actual call and makes the pain visceral.
 */
function generatePainParagraph(data: LiteReportData): string {
  const score = data.score;
  const maxScore = data.max_score;

  const primaryPlain = patternToPlainLanguage(data.primary_pattern);
  const secondaryPlain = data.secondary_pattern
    ? patternToPlainLanguage(data.secondary_pattern)
    : 'soft-closed';

  return `You know the call was a ${score}/${maxScore}. You know you ${primaryPlain}. You know you ${secondaryPlain}.`;
}

/**
 * Generate the 'What you don't know' section with specific missed opportunities
 */
function generateWhatYouDontKnow(data: LiteReportData): string {
  const buyingSignals = data.buying_signals_detected || 5;
  const missedCloses = data.missed_close_opportunities || 2;

  const examples: string[] = [];

  // Customize based on actual data
  if (buyingSignals > 3) {
    examples.push(
      `Where you missed the BUY signal (${buyingSignals} detected, how many did you act on?)`
    );
  } else {
    examples.push('Where you missed the BUY signal');
  }

  if (missedCloses > 0) {
    examples.push(
      `where you didn't handle the "UH...I DON'T KNOW IF THIS IS FOR ME" pause (${missedCloses} times)`
    );
  } else {
    examples.push(
      `where you didn't handle the "UH...I DON'T KNOW IF THIS IS FOR ME" pause`
    );
  }

  examples.push('or the <strong>exact</strong> moment trust peaked');

  return examples.join(', ') + '.';
}

/**
 * Match the testimonial to the user's specific weakness
 */
function generateTestimonialRelevance(data: LiteReportData): { quote: string; attribution: string } {
  const primaryPattern = data.primary_pattern.name;

  return TESTIMONIAL_MAP[primaryPattern] || TESTIMONIAL_MAP['default'];
}

/**
 * Generate urgency copy based on how many calls they've already done
 *
 * More calls = more urgency ("you've been doing this wrong for X calls")
 */
function generateCtaUrgency(data: LiteReportData): string {
  const totalLiteReports = data.total_lite_reports_generated || 1;

  if (totalLiteReports === 1) {
    return "You're already doing the calls.";
  } else if (totalLiteReports <= 3) {
    return `You've analyzed ${totalLiteReports} calls. How many more before you fix the pattern?`;
  } else {
    return `You've analyzed ${totalLiteReports} calls and the pattern is still there.`;
  }
}

/**
 * Main personalization function
 * Takes Lite report data and returns all personalized copy elements
 */
export function personalizeUpgradePage(liteReportData: LiteReportData): PersonalizedCopy {
  const testimonial = generateTestimonialRelevance(liteReportData);

  return {
    pain_paragraph: generatePainParagraph(liteReportData),
    what_you_dont_know: generateWhatYouDontKnow(liteReportData),
    testimonial_quote: testimonial.quote,
    testimonial_attribution: testimonial.attribution,
    cta_urgency: generateCtaUrgency(liteReportData),
    score: `${liteReportData.score}/${liteReportData.max_score}`,
    effectiveness: liteReportData.effectiveness,
  };
}

/**
 * Example usage:
 *
 * ```typescript
 * const liteData: LiteReportData = {
 *   score: 7,
 *   max_score: 10,
 *   effectiveness: 'Strong discovery, weak close',
 *   primary_pattern: {
 *     name: 'The Advice Avalanche',
 *     type: 'weakness',
 *     description: 'Tim gave away the entire strategy session...'
 *   },
 *   secondary_pattern: {
 *     name: 'The Soft Close Fade',
 *     type: 'weakness',
 *     description: 'Tim spent 57 minutes building trust...'
 *   },
 *   buying_signals_detected: 8,
 *   missed_close_opportunities: 3,
 *   total_lite_reports_generated: 1
 * };
 *
 * const personalizedCopy = personalizeUpgradePage(liteData);
 * ```
 */
