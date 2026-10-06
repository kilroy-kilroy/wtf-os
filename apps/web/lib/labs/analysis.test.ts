import { describe,it,expect } from 'vitest';
import { parseMarkdownMetadata } from '@repo/prompts/call-lab/markdown-prompts';
import { aggregateCallScores } from '@repo/prompts/coaching/coaching-prompts';
import { coachingCalls, negativePatterns } from './coaching-data';
import { validateCallAnalysis } from './call-analysis';
import { parseDiscoveryMetadata, DISCOVERY_LAB_PRO_SYSTEM } from '@repo/prompts/discovery-lab';
describe('evidence and analysis regressions',()=>{
 it.each(['**Score:** 6/10','**SCORE: 6/10**','Score: 6/10'])('parses rendered score %s',s=>expect(parseMarkdownMetadata(s).score).toBe(6));
 it('preserves measured zero and absent score',()=>{expect(parseMarkdownMetadata('Score: 0/10').score).toBe(0);expect(parseMarkdownMetadata('Not enough evidence').score).toBeNull();expect(parseMarkdownMetadata('Score: 60/10').score).toBeNull();});
 it('deduplicates canonical call IDs without inventing dimensions',()=>{
  const calls=coachingCalls([{id:'report',call_id:'score',full_report:{meta:{overallScore:70},scores:{discoveryDepth:0,nextStepPrecision:80}}}],[{id:'score',overall_score:7}]);
  expect(calls).toHaveLength(1);expect(calls[0].scores.discovery).toBe(0);expect(calls[0].scores.commitment).toBe(8);expect(calls[0].scores.opening).toBeNull();
  const aggregate=aggregateCallScores(calls);expect(aggregate.discovery).toBe(0);expect(aggregate.opening).toBeNull();expect(aggregate.overall).toBe(7);expect(aggregate.trust_velocity).toBeNull();expect(aggregate.sample_counts.opening).toBe(0);
 });
 it('counts distinct negative patterns only',()=>expect(negativePatterns({full_report:{patterns:[{patternName:'The Framework Drop'},{patternName:'The Soft Close Fade'},{patternName:'The Soft Close Fade'}]}})).toEqual(['The Soft Close Fade']));
 it('computes aggregate score and labels non-verbatim evidence',()=>{
  const r=validateCallAnalysis({meta:{overallScore:100,trustVelocity:99},snapTake:{tldr:'Test',analysis:'Test'},scores:{gapCreation:null,discoveryDepth:60,narrativeControl:80,emotionalWarmth:null,credibilityFrame:null,nextStepPrecision:0},patterns:[],nextSteps:{tldr:'Ask',actions:['Ask']},tacticalRewrites:{tldr:'Rewrite',items:[{whatYouSaid:'Would Tuesday work?',context:'End',whyItMissed:'Unconfirmed',strongerAlternative:'What time?'},{whatYouSaid:'Tuesday is booked',context:'End',whyItMissed:'Unknown',strongerAlternative:'Confirm'}]}},'Seller: Would Tuesday work?\nBuyer: Let me check.');
  expect(r.meta.overallScore).toBe(47);expect(r.meta.trustVelocity).toBeNull();expect(r.tacticalRewrites.items[0].evidenceType).toBe('verbatim');expect(r.tacticalRewrites.items[1].evidenceType).toBe('paraphrase');
 });
 it('counts competitors only within a competitor section',()=>expect(parseDiscoveryMetadata('## COMPETITORS\n- **One** - context\n- **Two** - context\n## NEXT STEPS\n**Not a competitor**','pro').competitorCount).toBe(2));
 it('explicitly distinguishes research failure and no fit',()=>{expect(DISCOVERY_LAB_PRO_SYSTEM).toContain('A failed scrape is not inactivity');expect(DISCOVERY_LAB_PRO_SYSTEM).toContain('disprove');});
});
import { exportHtml, exportMarkdown } from './export';
it('escapes report HTML and retains all new sections and evidence links',()=>{
 const html=exportHtml('## WHAT WE DO NOT KNOW\n<script>alert(1)</script>\nhttps://example.com/source');
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('https://example.com/source');
 expect(exportMarkdown(JSON.stringify({snapTake:{tldr:'Review',analysis:'Details'},meta:{overallScore:null},scores:{discoveryDepth:0},nextSteps:{actions:['Ask about scope']}}))).toContain('Not observed');
});

it('handles long competitor headings and whitespace without regex backtracking',()=>{const source='##'+ 'competit'.repeat(20000)+'\n'+' '.repeat(100000)+'- **One**\n## NEXT\n- **Ignore**';expect(parseDiscoveryMetadata(source,'pro').competitorCount).toBe(1);});
