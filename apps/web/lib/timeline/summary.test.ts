// apps/web/lib/timeline/summary.test.ts
import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt } from './summary';

describe('buildSummaryPrompt', () => {
  it('lists events newest-first and asks for state + next step', () => {
    const prompt = buildSummaryPrompt([
      { source_type: 'call', title: 'Call: pricing', summary: 'discussed tiers', occurred_at: '2026-07-08T00:00:00Z' },
      { source_type: 'assessment', title: 'GrowthOS — 68', summary: null, occurred_at: '2026-07-01T00:00:00Z' },
    ]);
    expect(prompt).toContain('Call: pricing');
    expect(prompt).toContain('GrowthOS — 68');
    expect(prompt.toLowerCase()).toContain('next step');
  });

  it('handles an empty timeline', () => {
    expect(buildSummaryPrompt([])).toContain('No activity');
  });
});
