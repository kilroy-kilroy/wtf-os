import {
  PatternLibrary,
  PATTERN_COUNTERS,
  getStrengthFromConfidence,
  getSeverityFromConfidence,
  validateAnalysisPatterns,
  type DetectedPattern,
} from '../loader';

describe('Pattern Library', () => {
  describe('Pattern Counts', () => {
    test('has 18 macros', () => {
      expect(PatternLibrary.macros).toHaveLength(18);
    });

    test('has 8 positive macros', () => {
      expect(PatternLibrary.getPositiveMacros()).toHaveLength(8);
    });

    test('has 10 negative macros', () => {
      expect(PatternLibrary.getNegativeMacros()).toHaveLength(10);
    });

    test('has 118 micros', () => {
      expect(PatternLibrary.micros).toHaveLength(118);
    });

    test('getCounts returns correct totals', () => {
      const counts = PatternLibrary.getCounts();
      expect(counts.totalMacros).toBe(18);
      expect(counts.positiveMacros).toBe(8);
      expect(counts.negativeMacros).toBe(10);
      expect(counts.totalMicros).toBe(109);
    });
  });

  describe('Macro Lookups', () => {
    test('getMacro returns correct macro', () => {
      const macro = PatternLibrary.getMacro('cultural_handshake');
      expect(macro).toBeDefined();
      expect(macro?.name).toBe('The Cultural Handshake');
      expect(macro?.polarity).toBe('positive');
      expect(macro?.category).toBe('connection');
    });

    test('getMacro returns undefined for invalid ID', () => {
      const macro = PatternLibrary.getMacro('nonexistent_pattern');
      expect(macro).toBeUndefined();
    });

    test('getMacrosByCategory returns correct macros', () => {
      const connectionMacros = PatternLibrary.getMacrosByCategory('connection');
      expect(connectionMacros.length).toBeGreaterThan(0);
      connectionMacros.forEach((m) => {
        expect(m.category).toBe('connection');
      });
    });
  });

  describe('Micro Lookups', () => {
    test('getMicro returns correct micro', () => {
      const micro = PatternLibrary.getMicro('early_humor_landing');
      expect(micro).toBeDefined();
      expect(micro?.name).toBe('Early Humor Landing');
      expect(micro?.macro_id).toBe('cultural_handshake');
    });

    test('getMicrosForMacro returns all micros for a macro', () => {
      const micros = PatternLibrary.getMicrosForMacro('cultural_handshake');
      expect(micros.length).toBeGreaterThan(0);
      micros.forEach((m) => {
        expect(m.macro_id).toBe('cultural_handshake');
      });
    });

    test('getMacroForMicro returns correct macro', () => {
      const macro = PatternLibrary.getMacroForMicro('early_humor_landing');
      expect(macro).toBeDefined();
      expect(macro?.id).toBe('cultural_handshake');
    });
  });

  describe('Pattern Mapping', () => {
    test('every micro maps to a valid macro', () => {
      PatternLibrary.micros.forEach((micro) => {
        const macro = PatternLibrary.getMacro(micro.macro_id);
        expect(macro).toBeDefined();
      });
    });

    test('every macro has at least one micro', () => {
      PatternLibrary.macros.forEach((macro) => {
        const micros = PatternLibrary.getMicrosForMacro(macro.id);
        expect(micros.length).toBeGreaterThan(0);
      });
    });

    test('mapping file matches micro macro_id', () => {
      PatternLibrary.micros.forEach((micro) => {
        const mappedMacroId = PatternLibrary.mapping[micro.id];
        expect(mappedMacroId).toBe(micro.macro_id);
      });
    });
  });

  describe('Counter Patterns', () => {
    test('every negative macro has a counter pattern', () => {
      const negativeMacros = PatternLibrary.getNegativeMacros();
      negativeMacros.forEach((macro) => {
        const counter = PATTERN_COUNTERS[macro.id];
        expect(counter).toBeDefined();
      });
    });

    test('counter patterns are valid positive macros', () => {
      Object.entries(PATTERN_COUNTERS).forEach(([negative, positive]) => {
        const negMacro = PatternLibrary.getMacro(negative);
        const posMacro = PatternLibrary.getMacro(positive);

        expect(negMacro?.polarity).toBe('negative');
        expect(posMacro?.polarity).toBe('positive');
      });
    });

    test('getCounterPattern returns correct data', () => {
      const result = PatternLibrary.getCounterPattern('soft_close_fade');
      expect(result).toBeDefined();
      expect(result?.counter.id).toBe('mirror_close');
      expect(result?.rationale).toBeDefined();
    });
  });

  describe('Validation', () => {
    test('isValidMicro returns true for valid IDs', () => {
      expect(PatternLibrary.isValidMicro('early_humor_landing')).toBe(true);
    });

    test('isValidMicro returns false for invalid IDs', () => {
      expect(PatternLibrary.isValidMicro('fake_micro')).toBe(false);
    });

    test('isValidMacro returns true for valid IDs', () => {
      expect(PatternLibrary.isValidMacro('cultural_handshake')).toBe(true);
    });

    test('isValidMacro returns false for invalid IDs', () => {
      expect(PatternLibrary.isValidMacro('fake_macro')).toBe(false);
    });

    test('validateMapping returns true for correct mappings', () => {
      expect(
        PatternLibrary.validateMapping('early_humor_landing', 'cultural_handshake')
      ).toBe(true);
    });

    test('validateMapping returns false for incorrect mappings', () => {
      expect(
        PatternLibrary.validateMapping('early_humor_landing', 'scenic_route')
      ).toBe(false);
    });
  });

  describe('validateAnalysisPatterns', () => {
    test('accepts valid patterns', () => {
      const validPatterns: DetectedPattern[] = [
        {
          macro_id: 'cultural_handshake',
          macro_name: 'The Cultural Handshake',
          category: 'connection',
          polarity: 'positive',
          macro_summary: 'Test summary',
          detected_micros: [
            {
              micro_id: 'early_humor_landing',
              micro_name: 'Early Humor Landing',
              confidence: 0.85,
              evidence: [{ quote: 'Test quote' }],
            },
          ],
        },
      ];

      expect(() => validateAnalysisPatterns(validPatterns)).not.toThrow();
    });

    test('throws for invalid macro', () => {
      const invalidPatterns: DetectedPattern[] = [
        {
          macro_id: 'invented_pattern',
          macro_name: 'Invented Pattern',
          category: 'connection',
          polarity: 'positive',
          macro_summary: 'Test',
          detected_micros: [],
        },
      ];

      expect(() => validateAnalysisPatterns(invalidPatterns)).toThrow(
        'Invalid macro pattern: invented_pattern'
      );
    });

    test('throws for invalid micro', () => {
      const invalidPatterns: DetectedPattern[] = [
        {
          macro_id: 'cultural_handshake',
          macro_name: 'The Cultural Handshake',
          category: 'connection',
          polarity: 'positive',
          macro_summary: 'Test',
          detected_micros: [
            {
              micro_id: 'invented_micro',
              micro_name: 'Invented Micro',
              confidence: 0.85,
              evidence: [],
            },
          ],
        },
      ];

      expect(() => validateAnalysisPatterns(invalidPatterns)).toThrow(
        'Invalid micro pattern: invented_micro'
      );
    });

    test('throws for wrong micro-to-macro mapping', () => {
      const invalidPatterns: DetectedPattern[] = [
        {
          macro_id: 'scenic_route', // Wrong macro for this micro
          macro_name: 'The Scenic Route',
          category: 'connection',
          polarity: 'negative',
          macro_summary: 'Test',
          detected_micros: [
            {
              micro_id: 'early_humor_landing', // This belongs to cultural_handshake
              micro_name: 'Early Humor Landing',
              confidence: 0.85,
              evidence: [],
            },
          ],
        },
      ];

      expect(() => validateAnalysisPatterns(invalidPatterns)).toThrow(
        'early_humor_landing should map to cultural_handshake, not scenic_route'
      );
    });
  });

  describe('Helper Functions', () => {
    test('getStrengthFromConfidence returns correct strength', () => {
      expect(getStrengthFromConfidence(0.95)).toBe('STRONG');
      expect(getStrengthFromConfidence(0.85)).toBe('STRONG');
      expect(getStrengthFromConfidence(0.75)).toBe('MEDIUM');
      expect(getStrengthFromConfidence(0.7)).toBe('MEDIUM');
      expect(getStrengthFromConfidence(0.65)).toBe('DEVELOPING');
    });

    test('getSeverityFromConfidence returns correct severity', () => {
      expect(getSeverityFromConfidence(0.95)).toBe('HIGH');
      expect(getSeverityFromConfidence(0.85)).toBe('HIGH');
      expect(getSeverityFromConfidence(0.75)).toBe('MEDIUM');
      expect(getSeverityFromConfidence(0.7)).toBe('MEDIUM');
      expect(getSeverityFromConfidence(0.65)).toBe('LOW');
    });
  });

  describe('Category Distribution', () => {
    test('connection category has correct count', () => {
      const macros = PatternLibrary.getMacrosByCategory('connection');
      expect(macros).toHaveLength(5);
    });

    test('diagnosis category has correct count', () => {
      const macros = PatternLibrary.getMacrosByCategory('diagnosis');
      expect(macros).toHaveLength(5);
    });

    test('control category has correct count', () => {
      const macros = PatternLibrary.getMacrosByCategory('control');
      expect(macros).toHaveLength(4);
    });

    test('activation category has correct count', () => {
      const macros = PatternLibrary.getMacrosByCategory('activation');
      expect(macros).toHaveLength(4);
    });
  });
});
