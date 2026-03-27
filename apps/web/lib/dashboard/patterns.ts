// apps/web/lib/dashboard/patterns.ts
import {
  MACRO_PATTERNS,
  getPatternById,
  MacroPattern,
} from '@/lib/macro-patterns';

// Re-export for convenience
export { MACRO_PATTERNS, getPatternById };
export type { MacroPattern };

// Types for database results
export interface CallScoreRow {
  id: string;
  overall_score: number | null;
  overall_grade: string | null;
  diagnosis_summary: string | null;
  markdown_response: string | null;
  version: string;
  created_at: string;
  ingestion_items: {
    transcript_metadata: Record<string, unknown> | null;
    created_at: string;
  } | null;
}

export interface CallSnippetRow {
  id: string;
  call_score_id: string;
  snippet_type: string;
  transcript_quote: string;
  rep_behavior: string | null;
  coaching_note: string | null;
  impact: string | null;
}

export interface FollowUpRow {
  id: string;
  call_score_id: string;
  template_type: string;
  subject_line: string | null;
  body: string;
}

export function extractPatternsFromMarkdown(markdown: string): string[] {
  const patterns: string[] = [];
  const lowerMarkdown = markdown.toLowerCase();
  MACRO_PATTERNS.forEach((pattern) => {
    if (lowerMarkdown.includes(pattern.name.toLowerCase())) {
      patterns.push(pattern.name);
    }
  });
  return [...new Set(patterns)];
}

export function mapToCanonicalPatterns(
  detectedPatterns: string[]
): Map<string, number> {
  const patternCounts = new Map<string, number>();
  MACRO_PATTERNS.forEach((p) => patternCounts.set(p.id, 0));

  const keywordMapping: Record<string, string> = {
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

  detectedPatterns.forEach((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    for (const [keyword, patternId] of Object.entries(keywordMapping)) {
      if (lowerPattern.includes(keyword)) {
        patternCounts.set(patternId, (patternCounts.get(patternId) || 0) + 1);
        break;
      }
    }
  });

  return patternCounts;
}

export function synthesizeCoachingNarrative(
  patternData: Array<{ patternId: string; frequency: number; totalCalls: number }>,
  patterns: typeof MACRO_PATTERNS
): string {
  const negativePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === 'negative' && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  const positivePatterns = patternData
    .filter((d) => {
      const pattern = patterns.find((p) => p.id === d.patternId);
      return pattern?.polarity === 'positive' && d.frequency > 0;
    })
    .sort((a, b) => b.frequency - a.frequency);

  const worstPattern = negativePatterns[0];
  const bestPattern = positivePatterns[0];

  if (!worstPattern && !bestPattern) {
    return 'Keep analyzing calls to build your pattern profile and get personalized coaching insights.';
  }

  let narrative = '';
  if (worstPattern) {
    const pattern = patterns.find((p) => p.id === worstPattern.patternId);
    if (pattern) {
      narrative += `You're using **${pattern.name}** in ${worstPattern.frequency}/${worstPattern.totalCalls} calls. `;
      narrative += `${pattern.description.slice(0, 100)}... `;
      if (pattern.correctiveMove) {
        narrative += `Try: ${pattern.correctiveMove.slice(0, 100)}`;
      }
    }
  } else if (bestPattern) {
    const pattern = patterns.find((p) => p.id === bestPattern.patternId);
    if (pattern) {
      narrative += `Strong use of **${pattern.name}** in ${bestPattern.frequency}/${bestPattern.totalCalls} calls. `;
      narrative += `Keep building on this strength.`;
    }
  }

  return narrative || 'Keep analyzing calls to build your pattern profile.';
}

export function extractBuyerInfoFromMetadata(
  transcriptMetadata: Record<string, unknown> | null
): { buyerName: string; companyName: string } | null {
  if (!transcriptMetadata) return null;

  const participants = transcriptMetadata.participants as Array<{
    name?: string;
    email?: string;
    displayName?: string;
  }> | undefined;

  if (participants && participants.length > 0) {
    const prospect = participants.length > 1 ? participants[1] : participants[0];
    const prospectName = prospect?.displayName || prospect?.name || 'Prospect';
    let companyName = 'Unknown Company';
    if (prospect?.email) {
      const domain = prospect.email.split('@')[1];
      if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail')) {
        const domainName = domain.split('.')[0];
        companyName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
    return { buyerName: prospectName, companyName };
  }

  const prospectCompany = transcriptMetadata.prospect_company as string | undefined;
  const title = transcriptMetadata.title as string | undefined;
  if (prospectCompany || title) {
    return {
      buyerName: title?.split(' - ')[0]?.trim() || 'Prospect',
      companyName: prospectCompany || 'Unknown Company',
    };
  }

  return null;
}

export function extractBuyerInfoFromMarkdown(markdown: string): {
  buyerName: string;
  companyName: string;
} {
  const callMatch = markdown.match(/\*\*Call:\*\*\s*([^-\n]+)\s*-?\s*([^\n*]*)/i);
  if (callMatch) {
    return {
      buyerName: callMatch[1].trim(),
      companyName: callMatch[2]?.trim() || 'Unknown Company',
    };
  }
  const nameMatch = markdown.match(/(?:with|Call with)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  if (nameMatch) {
    return { buyerName: nameMatch[1], companyName: 'Unknown Company' };
  }
  return { buyerName: 'Prospect', companyName: 'Unknown Company' };
}
