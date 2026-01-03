/**
 * Macro Patterns - Re-export from patterns package
 *
 * This file provides convenient access to the pattern library
 * for dashboard and UI components.
 */

import { PatternLibrary, type MacroPattern } from '@wtf/patterns/loader';

// Export the macro patterns array directly
export const MACRO_PATTERNS: MacroPattern[] = PatternLibrary.macros;

// Helper to get a pattern by ID
export function getPatternById(id: string): MacroPattern | undefined {
  return PatternLibrary.getMacro(id);
}

// Re-export types and utilities that might be useful
export type { MacroPattern, MacroCategory, Polarity } from '@wtf/patterns/loader';
export { PatternLibrary } from '@wtf/patterns/loader';
