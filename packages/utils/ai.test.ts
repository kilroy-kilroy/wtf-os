import { describe, it, expect } from 'vitest';
import { ensureWellFormed, describeModelError } from './ai';

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

/**
 * Fixtures mirror real SDK error objects, including the exact Anthropic body
 * observed in production when the account ran out of credits and every session
 * upload returned a bare 500 (request_id req_011CdkAsH2wia4g3dmGPXowS).
 */
function anthropicError(status: number, message: string) {
  const err = Object.assign(new Error(`${status} ...`), {
    status,
    error: { type: 'error', error: { type: 'invalid_request_error', message } },
  });
  Object.defineProperty(err, 'provider', { value: 'anthropic', enumerable: false });
  return err;
}

function openaiError(status: number, message: string) {
  const err = Object.assign(new Error(`${status} ...`), {
    status,
    error: { message, type: 'insufficient_quota', code: 'insufficient_quota' },
  });
  Object.defineProperty(err, 'provider', { value: 'openai', enumerable: false });
  return err;
}

describe('describeModelError', () => {
  it('names exhausted credits as a billing problem, not a server error', () => {
    const result = describeModelError(
      anthropicError(
        400,
        'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'
      )
    );
    expect(result).toContain('Anthropic is out of credits');
    expect(result).toContain('Add credits');
  });

  it('recognises the OpenAI flat error body shape', () => {
    const result = describeModelError(
      openaiError(429, 'You exceeded your current quota, please check your plan and billing details.')
    );
    expect(result).toContain('OpenAI is out of credits');
  });

  it('reports auth failures distinctly from billing failures', () => {
    expect(describeModelError(anthropicError(401, 'invalid x-api-key'))).toContain(
      'rejected the API key'
    );
  });

  it('reports rate limits as retryable', () => {
    expect(describeModelError(anthropicError(429, 'rate_limit_error'))).toContain('rate limit');
  });

  it('reports provider outages as retryable', () => {
    expect(describeModelError(anthropicError(529, 'overloaded_error'))).toContain('outage');
  });

  it('works without the provider tag, using a neutral noun', () => {
    // Guards the monorepo's duplicate-SDK hazard: even if the tag is missing,
    // the message must still be actionable rather than null.
    const untagged = Object.assign(new Error('400'), {
      status: 400,
      error: { type: 'error', error: { message: 'Your credit balance is too low' } },
    });
    expect(describeModelError(untagged)).toContain('The AI provider is out of credits');
  });

  it('returns null for non-provider errors so callers keep their own handling', () => {
    expect(describeModelError(new Error('boom'))).toBeNull();
    expect(describeModelError(null)).toBeNull();
    expect(describeModelError({ status: 'nope' })).toBeNull();
  });
});
