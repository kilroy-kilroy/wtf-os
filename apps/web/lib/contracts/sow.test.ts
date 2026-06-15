import { describe, it, expect } from 'vitest';
import { buildSowUserPrompt, SOW_SYSTEM_PROMPT } from '@repo/prompts';

describe('buildSowUserPrompt', () => {
  it('includes the particulars and the client/company context', () => {
    const p = buildSowUserPrompt('2 landing pages, 3 weeks, $8k', { company_name: 'Acme', engagement: 'Web revamp' });
    expect(p).toContain('2 landing pages, 3 weeks, $8k');
    expect(p).toContain('Acme');
    expect(p).toContain('Web revamp');
  });

  it('still produces a prompt when context is empty', () => {
    expect(buildSowUserPrompt('do the thing', {})).toContain('do the thing');
  });
});

describe('SOW_SYSTEM_PROMPT', () => {
  it('instructs the model to return HTML fragments only', () => {
    expect(SOW_SYSTEM_PROMPT.toLowerCase()).toContain('html');
  });
});
