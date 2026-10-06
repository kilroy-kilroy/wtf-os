import { it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { runModel } from '@repo/utils/ai';
import { CALL_LAB_PRO_SYSTEM_PROMPT } from '@repo/prompts/call-lab/pro-json';
import { CALLLAB_LITE_MARKDOWN_SYSTEM, CALLLAB_LITE_MARKDOWN_USER, parseMarkdownMetadata } from '@repo/prompts/call-lab/markdown-prompts';
import { DISCOVERY_LAB_PRO_SYSTEM, DISCOVERY_LAB_PRO_USER } from '@repo/prompts/discovery-lab';
import { indexedTranscript, validateCallAnalysis } from './call-analysis';
const transcript=`Seller: Thanks for making time. Is the goal today to decide whether a deeper discovery session would be useful?
Buyer: Yes. We are happy staying a small studio. We don't want to grow headcount.
Seller: What made you take the meeting?
Buyer: Proposal revisions take too much time. I want to find out if you can help us clarify scope earlier.
Seller: Can you give me an example?
Buyer: Our last proposal changed three times because two partners disagreed about deliverables.
Seller: That sounds like getting both partners to agree on scope before the proposal could help. Is that accurate?
Buyer: Yes. Can you send us your whole intake workflow?
Seller: I can share the principle now: agree on the decision and the scope before pricing. Building the workflow with you would be paid work.
Buyer: That makes sense. I would like my partner in a deeper conversation.
Seller: Would Tuesday work to discuss that with your partner?
Buyer: I need to check the calendar. Email me.
Seller: Will do.`;
it.skipIf(process.env.LAB_MODEL_SMOKE !== '1')('checks real model output on synthetic calls and research without app side effects',async()=>{
 const out='/tmp/labs-synthetic-validation';await mkdir(out,{recursive:true});
 const lite=await runModel('call-lab-lite',CALLLAB_LITE_MARKDOWN_SYSTEM,CALLLAB_LITE_MARKDOWN_USER({transcript:indexedTranscript(transcript),call_stage:'qualification',analysis_context:'Complete transcript. Goal: establish fit and whether a deeper discovery meeting is worthwhile.'}),{timeoutMs:85000});
 expect(parseMarkdownMetadata(lite.content).score).not.toBeNull();expect(lite.content.split(/\s+/).length).toBeLessThan(550);await writeFile(`${out}/call-lite.md`,lite.content);
 const pro=await runModel('call-lab-pro',CALL_LAB_PRO_SYSTEM_PROMPT,`Complete synthetic qualification call. Seller is Seller. Intended outcome: agree whether deeper discovery is useful. Do not judge this as a full discovery meeting.\n${indexedTranscript(transcript)}`,{timeoutMs:85000});
 const content=pro.content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 const parsed=JSON.parse(content);const report=validateCallAnalysis(parsed.report || parsed,transcript);
 expect(report.meta.overallScore).not.toBeNull();await writeFile(`${out}/call-pro.json`,JSON.stringify(report,null,2));
 const discovery=await runModel('discovery-lab-pro',DISCOVERY_LAB_PRO_SYSTEM,DISCOVERY_LAB_PRO_USER({requestor_name:'Seller',requestor_email:'synthetic@example.com',service_offered:'Proposal scoping workshops for small agencies. No case studies supplied.',target_company:'Example Studio (synthetic)',meeting_context:'Owner wants fewer proposal revisions, not more headcount. Meeting is qualification.',evidence_context:JSON.stringify({records:[{id:'R1',content:'Example Studio describes itself as an independent design studio founded in 2014. No information about hiring or revenue.',source_urls:['https://example.com/about'],retrieved_at:'2026-10-06',status:'found'},{id:'R2',content:'LinkedIn scrape failed',source_urls:[],status:'failed'}]})}),{timeoutMs:85000});
 await writeFile(`${out}/discovery-pro.md`,discovery.content);expect(discovery.content).toContain('https://example.com/about');expect(discovery.content.split(/\s+/).length).toBeLessThan(1100);
 console.log(JSON.stringify({synthetic:true,liteTokens:lite.usage,proTokens:pro.usage,discoveryTokens:discovery.usage,output:out}));
},260000);
