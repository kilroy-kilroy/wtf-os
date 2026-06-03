import { describe, it, expect } from 'vitest';
import { ensureWellFormed } from './ai';

// Lib-agnostic well-formedness check (tsconfig targets ES2020, which lacks the
// ES2024 String.prototype.isWellFormed type). True when no unpaired surrogate.
const isWellFormed = (s: string): boolean =>
  !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

describe('ensureWellFormed', () => {
  it('strips a lone high surrogate left by splitting an emoji mid-pair', () => {
    // 🚀 is a surrogate pair. Cutting one code unit short — exactly what
    // post.text.substring(0, 300) does when the cut lands inside an emoji —
    // leaves a lone high surrogate. This is the value that broke the API call.
    const broken = '🚀'.substring(0, 1);
    expect(isWellFormed(broken)).toBe(false);

    const fixed = ensureWellFormed(broken);
    expect(isWellFormed(fixed)).toBe(true);
    // Must JSON-serialize to a body the API can parse back.
    expect(() => JSON.parse(JSON.stringify({ content: fixed }))).not.toThrow();
  });

  it('strips a lone low surrogate', () => {
    const broken = `prefix\uDE80suffix`;
    expect(isWellFormed(broken)).toBe(false);
    expect(isWellFormed(ensureWellFormed(broken))).toBe(true);
  });

  it('preserves valid emoji (complete surrogate pairs)', () => {
    const text = 'Shipping 🚀 to the moon 🌙 — excited!';
    expect(ensureWellFormed(text)).toBe(text);
  });

  it('leaves ordinary text untouched', () => {
    const text = 'Hello, world. Café résumé. 日本語.';
    expect(ensureWellFormed(text)).toBe(text);
  });

  it('handles a realistic truncated post ending in a split emoji', () => {
    const post = 'Big news for our team 🎉' + '🚀'.substring(0, 1);
    const fixed = ensureWellFormed(post);
    expect(isWellFormed(fixed)).toBe(true);
    expect(fixed).toContain('Big news for our team 🎉');
  });
});
