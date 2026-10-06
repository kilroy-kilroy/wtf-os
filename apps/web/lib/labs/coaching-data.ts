import type { CallData } from '@repo/prompts/coaching/coaching-prompts';
import { patternPolarity } from '@repo/prompts/call-lab/analysis-rules';
export const measured = (n: unknown, scale = 10): number | null => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= scale ? n * 10 / scale : null;
export function readReport(row: any): any {
 const content = row.full_report || row.markdown_response;
 try { const parsed = typeof content === 'string' ? JSON.parse(content) : content; return parsed?.report || parsed || {}; } catch { return {}; }
}
export function negativePatterns(row: any): string[] {
 const report = readReport(row);
 return [...new Set<string>((report.patterns || []).filter((p:any) => p.polarity === 'negative' || (!p.polarity && patternPolarity(p.patternName || '') === 'negative')).map((p:any) => p.patternName))];
}
export function coachingCalls(reports: any[], scores: any[]): CallData[] {
 const canonical = new Map<string, any>();
 for (const row of scores) canonical.set(row.id,row);
 for (const row of reports) canonical.set(row.call_id || row.id,{...canonical.get(row.call_id),...row});
 return [...canonical.values()].map(row => {
  const report = readReport(row), pro = report.scores || {}, core = row.full_scores?.core || {}, lite = row.lite_scores || {};
  return {
   date: row.call_date || row.created_at, prospect:row.company_name || row.buyer_name || 'Unknown',
   duration_minutes:row.duration_minutes ?? null, outcome:row.outcome || 'unknown',
   overall: report.meta ? measured(report.meta.overallScore,100) : measured(row.overall_score),
   scores: {
    opening: measured(row.opening_score) ?? measured(core.control_authority) ?? measured(lite.control_confidence),
    discovery: measured(pro.discoveryDepth,100) ?? measured(row.discovery_score) ?? measured(core.discovery_depth) ?? measured(lite.discovery_depth),
    diagnostic: measured(row.diagnostic_score) ?? measured(core.diagnostic_depth),
    value_articulation: measured(row.value_score) ?? measured(core.value_articulation) ?? measured(lite.relevance_narrative),
    objection_navigation: measured(row.objection_score) ?? measured(core.objection_handling) ?? measured(lite.objection_handling),
    commitment: measured(pro.nextStepPrecision,100) ?? measured(row.commitment_score) ?? measured(core.commitment_close) ?? measured(lite.next_steps_clarity),
    human_first: measured(row.human_first_score) ?? measured(core.human_first),
   },
   patterns_detected:negativePatterns(row), key_moments:(row.key_moments || []).map((m:any) => m.description),
  };
 });
}
