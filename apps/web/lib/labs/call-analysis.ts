import { z } from 'zod';
import { patternPolarity } from '@repo/prompts/call-lab/analysis-rules';
const nullableScore = z.number().min(0).max(100).nullable();
const schema = z.object({
 meta: z.object({}).passthrough(),
 snapTake: z.object({ tldr:z.string(), analysis:z.string() }),
 scores: z.object({ gapCreation:nullableScore, discoveryDepth:nullableScore, narrativeControl:nullableScore, emotionalWarmth:nullableScore, credibilityFrame:nullableScore, nextStepPrecision:nullableScore }),
 patterns: z.array(z.object({ patternName:z.string() }).passthrough()).max(5),
 nextSteps: z.object({ tldr:z.string(), actions:z.array(z.string()).max(3) }),
 tacticalRewrites: z.object({ tldr:z.string(), items:z.array(z.object({ whatYouSaid:z.string(), context:z.string(), whyItMissed:z.string(), strongerAlternative:z.string() })).max(3) }),
}).passthrough();
export function indexedTranscript(text: string) {
 return text.split('\n').map((line,i) => `[L${i+1}] ${line}`).join('\n');
}
export function validateCallAnalysis(input: unknown, transcript: string) {
 const report = schema.parse(input) as any;
 const values = Object.values(report.scores).filter((n): n is number => typeof n === 'number');
 report.meta.overallScore = values.length ? Math.round(values.reduce((a,b) => a+b,0)/values.length) : null;
 report.meta.trustVelocity = null; // No validated observable definition exists yet.
 report.meta.analysisVersion = '2.0';
 report.patterns = report.patterns.map((p:any) => ({...p, polarity:patternPolarity(p.patternName)}));
 report.tacticalRewrites.items = report.tacticalRewrites.items.map((item:any) => {
   const start = transcript.indexOf(item.whatYouSaid);
   const exact = !!item.whatYouSaid.trim() && start >= 0;
   return {...item, evidenceType: exact ? 'verbatim' : 'paraphrase', sourceLine: exact ? transcript.slice(0,start).split('\n').length : null};
 });
 return report;
}

export function groundMarkdownEvidence(markdown: string, transcript: string) {
 return markdown.replace(/^>\s*(?:\[L\d+\]\s*)?["“]?(.+?)["”]?\s*$/gm, (_match, text: string) => {
  const quote = text.replace(/["”]$/, '').trim();
  const start = transcript.indexOf(quote);
  return start >= 0 && quote ? `> [L${transcript.slice(0,start).split('\n').length}] "${quote}"` : `> Paraphrase / unverified wording: ${quote}`;
 });
}
