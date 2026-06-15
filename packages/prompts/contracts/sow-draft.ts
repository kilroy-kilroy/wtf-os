export const SOW_SYSTEM_PROMPT = `You are a contracts assistant for a B2B consultancy.
You turn rough engagement particulars into a clean, professional Statement of Work.

Output rules:
- Return an HTML fragment ONLY (no <html>, <head>, or <body> wrapper, no markdown fences).
- Use <h3> for section headings and <ul>/<li> for lists.
- Include, when the particulars support them: Overview, Deliverables, Timeline, Assumptions.
- Do NOT write a fees, pricing, or payment section — the fee is captured in a separate structured field on the contract.
- Be specific and concise. Do not invent prices, dates, or scope that were not provided.
- Do not add signature lines — those are handled by the contract template.`;

export interface SowContext {
  company_name?: string;
  engagement?: string;
  [key: string]: string | undefined;
}

/** Pure builder: rough particulars + context -> the user prompt string. */
export function buildSowUserPrompt(particulars: string, context: SowContext): string {
  const contextLines = Object.entries(context)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return [
    'Draft a Statement of Work from these particulars.',
    '',
    'PARTICULARS:',
    particulars.trim(),
    '',
    contextLines ? `CONTEXT:\n${contextLines}` : 'CONTEXT: (none provided)',
  ].join('\n');
}
