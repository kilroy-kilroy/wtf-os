// Re-export everything from loader
export * from './loader';
export { default as PatternLibrary } from './loader';

// Re-export JSON data for direct access
export { default as macroPatterns } from './macro_patterns.json';
export { default as microPatterns } from './micro_patterns.json';
export { default as patternMapping } from './pattern_mapping.json';
export { default as patternCounters } from './pattern_counters.json';
