import { MACRO_PATTERNS, getPatternById, type MacroPattern } from '@/lib/macro-patterns';

const KEYWORD_MAP: Record<string, string> = {
  'cultural handshake': 'cultural_handshake',
  cultural: 'cultural_handshake',
  handshake: 'cultural_handshake',
  'peer validation': 'peer_validation_engine',
  peer: 'peer_validation_engine',
  'validation engine': 'peer_validation_engine',
  'vulnerability flip': 'vulnerability_flip',
  vulnerability: 'vulnerability_flip',
  flip: 'vulnerability_flip',
  'scenic route': 'scenic_route',
  scenic: 'scenic_route',
  'small talk': 'scenic_route',
  'business blitzer': 'business_blitzer',
  blitzer: 'business_blitzer',
  rushed: 'business_blitzer',
  'diagnostic reveal': 'diagnostic_reveal',
  diagnostic: 'diagnostic_reveal',
  'self diagnosis': 'self_diagnosis_pull',
  'diagnosis pull': 'self_diagnosis_pull',
  'generous professor': 'generous_professor',
  generous: 'generous_professor',
  professor: 'generous_professor',
  'advice avalanche': 'advice_avalanche',
  avalanche: 'advice_avalanche',
  'surface scanner': 'surface_scanner',
  surface: 'surface_scanner',
  scanner: 'surface_scanner',
  'framework drop': 'framework_drop',
  framework: 'framework_drop',
  'agenda abandoner': 'agenda_abandoner',
  abandoner: 'agenda_abandoner',
  passenger: 'passenger',
  'premature solution': 'premature_solution',
  premature: 'premature_solution',
  'pitched too early': 'premature_solution',
  'mirror close': 'mirror_close',
  mirror: 'mirror_close',
  'permission builder': 'permission_builder',
  permission: 'permission_builder',
  'micro-commitment': 'permission_builder',
  'soft close': 'soft_close_fade',
  'soft close fade': 'soft_close_fade',
  fade: 'soft_close_fade',
  'let me know': 'soft_close_fade',
  'over-explain': 'over_explain_loop',
  'over explain': 'over_explain_loop',
  loop: 'over_explain_loop',
  'talking past': 'over_explain_loop',
};

export function extractPatternsFromMarkdown(markdown: string): string[] {
  const lower = markdown.toLowerCase();
  const found: string[] = [];
  for (const pattern of MACRO_PATTERNS) {
    if (lower.includes(pattern.name.toLowerCase())) found.push(pattern.name);
  }
  return [...new Set(found)];
}

export function mapToCanonicalPatterns(detected: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => counts.set(p.id, 0));
  for (const raw of detected) {
    const lower = raw.toLowerCase();
    for (const [keyword, id] of Object.entries(KEYWORD_MAP)) {
      if (lower.includes(keyword)) {
        counts.set(id, (counts.get(id) || 0) + 1);
        break;
      }
    }
  }
  return counts;
}

export function countPatternsInMarkdown(markdown: string): Map<string, number> {
  return mapToCanonicalPatterns(extractPatternsFromMarkdown(markdown));
}

export function topNegativePattern(counts: Map<string, number>): MacroPattern | null {
  let best: MacroPattern | null = null;
  let bestN = 0;
  counts.forEach((n, id) => {
    if (n <= bestN) return;
    const p = getPatternById(id);
    if (p?.polarity === 'negative') {
      best = p;
      bestN = n;
    }
  });
  return best;
}
