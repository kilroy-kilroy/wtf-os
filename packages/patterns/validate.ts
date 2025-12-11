/**
 * Pattern Library Validation Script
 *
 * Run with: npx tsx packages/patterns/validate.ts
 *
 * Validates that all pattern data is correctly structured and mapped.
 */

import { PatternLibrary, PATTERN_COUNTERS } from './loader';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | void): void {
  try {
    const result = fn();
    if (result === false) {
      console.log(`❌ FAIL: ${name}`);
      failed++;
    } else {
      console.log(`✓ PASS: ${name}`);
      passed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error}`);
    failed++;
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, got undefined`);
      }
    },
  };
}

console.log('\n🔍 PATTERN LIBRARY VALIDATION\n');
console.log('='.repeat(50));

// Pattern Counts
console.log('\n📊 Pattern Counts\n');

test('Has 18 macros', () => {
  expect(PatternLibrary.macros.length).toBe(18);
});

test('Has 8 positive macros', () => {
  expect(PatternLibrary.getPositiveMacros().length).toBe(8);
});

test('Has 10 negative macros', () => {
  expect(PatternLibrary.getNegativeMacros().length).toBe(10);
});

test('Has 118 micros', () => {
  expect(PatternLibrary.micros.length).toBe(118);
});

// Category Distribution
console.log('\n📁 Category Distribution\n');

test('Connection category has 5 macros', () => {
  expect(PatternLibrary.getMacrosByCategory('connection').length).toBe(5);
});

test('Diagnosis category has 5 macros', () => {
  expect(PatternLibrary.getMacrosByCategory('diagnosis').length).toBe(5);
});

test('Control category has 4 macros', () => {
  expect(PatternLibrary.getMacrosByCategory('control').length).toBe(4);
});

test('Activation category has 4 macros', () => {
  expect(PatternLibrary.getMacrosByCategory('activation').length).toBe(4);
});

// Mapping Integrity
console.log('\n🔗 Mapping Integrity\n');

test('Every micro maps to a valid macro', () => {
  for (const micro of PatternLibrary.micros) {
    const macro = PatternLibrary.getMacro(micro.macro_id);
    if (!macro) {
      throw new Error(`Micro "${micro.id}" maps to invalid macro "${micro.macro_id}"`);
    }
  }
});

test('Every macro has at least one micro', () => {
  for (const macro of PatternLibrary.macros) {
    const micros = PatternLibrary.getMicrosForMacro(macro.id);
    if (micros.length === 0) {
      throw new Error(`Macro "${macro.id}" has no micros`);
    }
  }
});

test('Mapping file matches micro macro_id', () => {
  for (const micro of PatternLibrary.micros) {
    const mappedMacroId = PatternLibrary.mapping[micro.id];
    if (mappedMacroId !== micro.macro_id) {
      throw new Error(
        `Mapping mismatch for "${micro.id}": mapping says "${mappedMacroId}", micro says "${micro.macro_id}"`
      );
    }
  }
});

// Counter Patterns
console.log('\n↔️ Counter Patterns\n');

test('Every negative macro has a counter pattern', () => {
  const negativeMacros = PatternLibrary.getNegativeMacros();
  for (const macro of negativeMacros) {
    if (!PATTERN_COUNTERS[macro.id]) {
      throw new Error(`Negative macro "${macro.id}" has no counter pattern`);
    }
  }
});

test('All counter patterns are valid positive macros', () => {
  for (const [negative, positive] of Object.entries(PATTERN_COUNTERS)) {
    const negMacro = PatternLibrary.getMacro(negative);
    const posMacro = PatternLibrary.getMacro(positive);

    if (!negMacro) {
      throw new Error(`Counter source "${negative}" is not a valid macro`);
    }
    if (negMacro.polarity !== 'negative') {
      throw new Error(`Counter source "${negative}" is not negative`);
    }
    if (!posMacro) {
      throw new Error(`Counter target "${positive}" is not a valid macro`);
    }
    if (posMacro.polarity !== 'positive') {
      throw new Error(`Counter target "${positive}" is not positive`);
    }
  }
});

test('getCounterPattern returns correct data', () => {
  const result = PatternLibrary.getCounterPattern('soft_close_fade');
  expect(result).toBeDefined();
  expect(result?.counter.id).toBe('mirror_close');
  expect(result?.rationale).toBeDefined();
});

// Lookup Functions
console.log('\n🔎 Lookup Functions\n');

test('getMacro returns correct macro', () => {
  const macro = PatternLibrary.getMacro('cultural_handshake');
  expect(macro).toBeDefined();
  expect(macro?.name).toBe('The Cultural Handshake');
});

test('getMicro returns correct micro', () => {
  const micro = PatternLibrary.getMicro('early_humor_landing');
  expect(micro).toBeDefined();
  expect(micro?.name).toBe('Early Humor Landing');
});

test('getMacroForMicro returns correct macro', () => {
  const macro = PatternLibrary.getMacroForMicro('early_humor_landing');
  expect(macro).toBeDefined();
  expect(macro?.id).toBe('cultural_handshake');
});

test('getMicrosForMacro returns correct micros', () => {
  const micros = PatternLibrary.getMicrosForMacro('cultural_handshake');
  expect(micros.length).toBeGreaterThan(0);
  for (const micro of micros) {
    expect(micro.macro_id).toBe('cultural_handshake');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n📋 SUMMARY: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ VALIDATION FAILED\n');
  process.exit(1);
} else {
  console.log('✅ ALL VALIDATIONS PASSED\n');
  process.exit(0);
}
