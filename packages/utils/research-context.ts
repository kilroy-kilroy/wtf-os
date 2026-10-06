import { AsyncLocalStorage } from 'node:async_hooks';
export interface ResearchEvidence {
 id: string; question: string; content: string; source_urls: string[];
 retrieved_at: string; status: 'found' | 'unverified' | 'failed';
 usage?: { prompt_tokens: number; completion_tokens: number };
}
const context = new AsyncLocalStorage<{ signal: AbortSignal; evidence: ResearchEvidence[] }>();
export async function collectResearch<T>(fn: () => Promise<T>, timeoutMs = 90_000) {
 const signal = AbortSignal.timeout(timeoutMs);
 const evidence: ResearchEvidence[] = [];
 const value = await context.run({ signal, evidence }, fn);
 return { value, evidence: [...evidence] };
}
export const researchSignal = () => context.getStore()?.signal;
export function recordEvidence(value: Omit<ResearchEvidence,'id'>) {
 const store = context.getStore();
 if (store && !store.signal.aborted) store.evidence.push({id:`R${store.evidence.length+1}`, ...value});
}
