import macros from './macro_patterns.json';
import micros from './micro_patterns.json';
import mapping from './pattern_mapping.json';
import counters from './pattern_counters.json';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type MacroCategory = 'connection' | 'diagnosis' | 'control' | 'activation';
export type Polarity = 'positive' | 'negative';
export type Strength = 'STRONG' | 'MEDIUM' | 'DEVELOPING';
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MacroPattern {
  id: string;
  name: string;
  category: MacroCategory;
  polarity: Polarity;
  summary: string;
  behavioral_signals: string[];
}

export interface MicroPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  polarity: Polarity;
  macro_id: string;
}

export interface PatternCounter {
  counter_id: string;
  counter_name: string;
  rationale: string;
}

export interface DetectedMicro {
  micro_id: string;
  micro_name: string;
  confidence: number;
  evidence: Array<{
    quote: string;
    timestamp?: string;
  }>;
}

export interface DetectedPattern {
  macro_id: string;
  macro_name: string;
  category: MacroCategory;
  polarity: Polarity;
  strength?: Strength;
  severity?: Severity;
  macro_summary: string;
  detected_micros: DetectedMicro[];
  why_it_worked?: string;
  how_to_reuse?: string;
  fix?: string;
  counter_pattern_id?: string;
  counter_pattern_name?: string;
}

// ============================================
// PATTERN LIBRARY
// ============================================

export const PatternLibrary = {
  macros: macros.macros as MacroPattern[],
  micros: micros.micros as MicroPattern[],
  mapping: mapping.mapping as Record<string, string>,
  counters: counters.counters as Record<string, PatternCounter>,

  // Get a single macro by ID
  getMacro(id: string): MacroPattern | undefined {
    return this.macros.find((m) => m.id === id);
  },

  // Get a single micro by ID
  getMicro(id: string): MicroPattern | undefined {
    return this.micros.find((m) => m.id === id);
  },

  // Get all micros that belong to a macro
  getMicrosForMacro(macroId: string): MicroPattern[] {
    return this.micros.filter((m) => m.macro_id === macroId);
  },

  // Get the macro that a micro belongs to
  getMacroForMicro(microId: string): MacroPattern | undefined {
    const macroId = this.mapping[microId];
    return this.getMacro(macroId);
  },

  // Get all positive macros
  getPositiveMacros(): MacroPattern[] {
    return this.macros.filter((m) => m.polarity === 'positive');
  },

  // Get all negative macros
  getNegativeMacros(): MacroPattern[] {
    return this.macros.filter((m) => m.polarity === 'negative');
  },

  // Get all macros in a category
  getMacrosByCategory(category: MacroCategory): MacroPattern[] {
    return this.macros.filter((m) => m.category === category);
  },

  // Get positive macros in a category
  getPositiveMacrosByCategory(category: MacroCategory): MacroPattern[] {
    return this.macros.filter(
      (m) => m.category === category && m.polarity === 'positive'
    );
  },

  // Get negative macros in a category
  getNegativeMacrosByCategory(category: MacroCategory): MacroPattern[] {
    return this.macros.filter(
      (m) => m.category === category && m.polarity === 'negative'
    );
  },

  // Get the counter pattern for a negative macro
  getCounterPattern(negativePatternId: string): {
    counter: MacroPattern;
    rationale: string;
  } | undefined {
    const counterInfo = this.counters[negativePatternId];
    if (!counterInfo) return undefined;

    const counter = this.getMacro(counterInfo.counter_id);
    if (!counter) return undefined;

    return {
      counter,
      rationale: counterInfo.rationale,
    };
  },

  // Validate that a micro ID exists
  isValidMicro(microId: string): boolean {
    return this.micros.some((m) => m.id === microId);
  },

  // Validate that a macro ID exists
  isValidMacro(macroId: string): boolean {
    return this.macros.some((m) => m.id === macroId);
  },

  // Validate that a micro maps to the expected macro
  validateMapping(microId: string, expectedMacroId: string): boolean {
    return this.mapping[microId] === expectedMacroId;
  },

  // Get all micro IDs as a set for fast lookup
  getMicroIds(): Set<string> {
    return new Set(this.micros.map((m) => m.id));
  },

  // Get all macro IDs as a set for fast lookup
  getMacroIds(): Set<string> {
    return new Set(this.macros.map((m) => m.id));
  },

  // Get pattern counts
  getCounts(): {
    totalMacros: number;
    positiveMacros: number;
    negativeMacros: number;
    totalMicros: number;
    positiveMicros: number;
    negativeMicros: number;
  } {
    const positiveMacros = this.getPositiveMacros().length;
    const negativeMacros = this.getNegativeMacros().length;
    const positiveMicros = this.micros.filter(
      (m) => m.polarity === 'positive'
    ).length;
    const negativeMicros = this.micros.filter(
      (m) => m.polarity === 'negative'
    ).length;

    return {
      totalMacros: this.macros.length,
      positiveMacros,
      negativeMacros,
      totalMicros: this.micros.length,
      positiveMicros,
      negativeMicros,
    };
  },
};

// ============================================
// PATTERN COUNTERS (exported separately for convenience)
// ============================================

export const PATTERN_COUNTERS: Record<string, string> = {
  scenic_route: 'framework_drop',
  business_blitzer: 'cultural_handshake',
  generous_professor: 'diagnostic_reveal',
  advice_avalanche: 'self_diagnosis_pull',
  surface_scanner: 'diagnostic_reveal',
  agenda_abandoner: 'framework_drop',
  passenger: 'framework_drop',
  premature_solution: 'self_diagnosis_pull',
  soft_close_fade: 'mirror_close',
  over_explain_loop: 'permission_builder',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate strength label based on confidence score
 */
export function getStrengthFromConfidence(confidence: number): Strength {
  if (confidence >= 0.85) return 'STRONG';
  if (confidence >= 0.7) return 'MEDIUM';
  return 'DEVELOPING';
}

/**
 * Calculate severity label based on confidence score
 */
export function getSeverityFromConfidence(confidence: number): Severity {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.7) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get the strength/severity icon
 */
export function getStrengthIcon(strength: Strength): string {
  const icons: Record<Strength, string> = {
    STRONG: '⚡',
    MEDIUM: '◆',
    DEVELOPING: '◇',
  };
  return icons[strength];
}

/**
 * Get the severity icon
 */
export function getSeverityIcon(severity: Severity): string {
  const icons: Record<Severity, string> = {
    HIGH: '⚠️',
    MEDIUM: '⚠︎',
    LOW: '⚐',
  };
  return icons[severity];
}

/**
 * Get category badge color class
 */
export function getCategoryColorClass(category: MacroCategory): string {
  const colors: Record<MacroCategory, string> = {
    connection: 'badge-connection',
    diagnosis: 'badge-diagnosis',
    control: 'badge-control',
    activation: 'badge-activation',
  };
  return colors[category];
}

/**
 * Validate analysis output against pattern library
 * Throws if invalid patterns are detected
 */
export function validateAnalysisPatterns(
  detectedPatterns: DetectedPattern[]
): void {
  const validMacroIds = PatternLibrary.getMacroIds();
  const validMicroIds = PatternLibrary.getMicroIds();

  for (const pattern of detectedPatterns) {
    // Check macro is valid
    if (!validMacroIds.has(pattern.macro_id)) {
      throw new Error(`Invalid macro pattern: ${pattern.macro_id}`);
    }

    // Check all detected micros are valid
    for (const micro of pattern.detected_micros) {
      if (!validMicroIds.has(micro.micro_id)) {
        throw new Error(`Invalid micro pattern: ${micro.micro_id}`);
      }

      // Verify mapping is correct
      const expectedMacro = PatternLibrary.mapping[micro.micro_id];
      if (expectedMacro !== pattern.macro_id) {
        throw new Error(
          `Micro ${micro.micro_id} should map to ${expectedMacro}, not ${pattern.macro_id}`
        );
      }
    }
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default PatternLibrary;
