import { runModel } from '@repo/utils';
import { SOW_SYSTEM_PROMPT, buildSowUserPrompt, type SowContext } from '@repo/prompts';

/** Draft a SOW HTML fragment from rough particulars. Server-side only. */
export async function draftSow(particulars: string, context: SowContext): Promise<string> {
  const { content } = await runModel(
    'contract-sow',
    SOW_SYSTEM_PROMPT,
    buildSowUserPrompt(particulars, context),
  );
  // Strip any stray code fences the model might add.
  return content.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
}
