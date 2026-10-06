import { describe,it,expect,vi } from 'vitest';
import { parseSerpResults, generateSerpKeywords, fetchCompanyNews } from '../research';
import { collectResearch } from '../research-context';
describe('Discovery evidence',()=>{
 it('never mistakes an unrelated or empty host for the target',()=>{
  const r=parseSerpResults([{keyword:'brand',organic:[{url:'https://notexample.com',position:1},{title:'Missing URL',position:2},{url:'https://www.example.com',position:3}]}],['brand'],'example.com');
  expect(r.results[0].target_rank).toBe(3);
 });
 it('matches out-of-order responses by query and separates failure from absence',()=>{
  const r=parseSerpResults([{keyword:'b',organic:[]},{keyword:'a',failed:true}],['a','b'],'example.com');
  expect(r.results.map(x=>x.status)).toEqual(['failed','not_found']);
 });
 it('does not search for the seller service as if it were the buyer category',()=>expect(generateSerpKeywords('Example','example.com',undefined,undefined,'My seller service')).not.toContain('Example My seller service'));
 it('retains provider citations, usage and research context',async()=>{
  process.env.PERPLEXITY_API_KEY='test';
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'RECENT NEWS\n- Launch | 2026-10-01 | New product\nFUNDING\nNo recent funding found'}}],citations:['https://example.com/news'],usage:{prompt_tokens:10,completion_tokens:20}}))));
  const result=await collectResearch(()=>fetchCompanyNews('Example','example.com'));
  expect(result.evidence[0].source_urls).toEqual(['https://example.com/news']);expect(result.evidence[0].usage?.completion_tokens).toBe(20);
  vi.unstubAllGlobals();delete process.env.PERPLEXITY_API_KEY;
 });
});
