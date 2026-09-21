import { describe, it, expect } from 'vitest';
import { normalizeInlineText, blankFirmaAnchors, listMarker, INITIALS_LAYOUT, SIGNATURE_LAYOUT } from '@repo/pdf';

// react-pdf treats "\n" inside <Text> as a hard break, so template paragraphs
// that wrap across source lines used to break mid-clause at whatever column the
// author happened to stop at. 11 of the MSA's 12 paragraphs did this.
describe('normalizeInlineText', () => {
  it('folds a source line wrap into a single space', () => {
    const wrapped = 'sets forth the terms under which KLRY,\n  LLC, a Delaware corporation,';
    expect(normalizeInlineText(wrapped)).toBe('sets forth the terms under which KLRY, LLC, a Delaware corporation,');
  });

  it('collapses runs of spaces and tabs too', () => {
    expect(normalizeInlineText('a   b\t\tc')).toBe('a b c');
  });

  it('keeps the single space that separates inline elements', () => {
    expect(normalizeInlineText(' and ')).toBe(' and ');
  });
});

// Signature placement is by coordinate now, so these anchors bind nothing — but
// they are still text, and they used to print to the client verbatim.
describe('blankFirmaAnchors', () => {
  it('replaces a signature anchor with a rule', () => {
    expect(blankFirmaAnchors('Signature: {{sig_client}}')).toBe('Signature: __________________');
  });

  it('gives dates a shorter rule than signatures, and initials shorter still', () => {
    const date = blankFirmaAnchors('{{date_counter}}').length;
    const sig = blankFirmaAnchors('{{sig_counter}}').length;
    const init = blankFirmaAnchors('{{init_client}}').length;
    expect(sig).toBeGreaterThan(date);
    expect(date).toBeGreaterThan(init);
  });

  it('handles every anchor in a signature block, whatever the spacing', () => {
    const out = blankFirmaAnchors('Sig: {{ sig_client }} Date: {{date_client}} Init: {{init_counter}}');
    expect(out).not.toMatch(/\{\{/);
  });

  it('leaves real merge fields alone — those are handled by the merge engine', () => {
    expect(blankFirmaAnchors('{{client_company_name}}')).toBe('{{client_company_name}}');
    expect(blankFirmaAnchors('{{sow}}')).toBe('{{sow}}');
  });
});

describe('listMarker', () => {
  it('numbers the top level A. B. C., matching the executed contracts', () => {
    expect([0, 1, 2].map((i) => listMarker(i, 0, true))).toEqual(['A.', 'B.', 'C.']);
  });

  it('drops to a. b. c. one level in', () => {
    expect([0, 1, 2].map((i) => listMarker(i, 1, true))).toEqual(['a.', 'b.', 'c.']);
  });

  it('keeps going past Z rather than running out of alphabet', () => {
    expect(listMarker(26, 0, true)).toBe('AA.');
  });

  it('bullets unordered lists at every depth', () => {
    expect(listMarker(3, 0, false)).toBe('•');
    expect(listMarker(3, 1, false)).toBe('•');
  });
});

describe('INITIALS_LAYOUT', () => {
  it('ends at the right edge of the text column, like the drawn rule', () => {
    // 612pt page, 64pt margins -> the column ends at 89.5% of page width.
    expect(INITIALS_LAYOUT.client.x + INITIALS_LAYOUT.client.width).toBeCloseTo(89.5, 1);
  });

  it('stacks the two parties without overlapping', () => {
    const clientBottom = INITIALS_LAYOUT.client.y + INITIALS_LAYOUT.client.height;
    expect(clientBottom).toBeLessThan(INITIALS_LAYOUT.counter.y);
  });

  it('sits below the signature slots, so the footer never collides with them', () => {
    const lowestSignature = SIGNATURE_LAYOUT.counter.signature.y + SIGNATURE_LAYOUT.counter.signature.height;
    expect(INITIALS_LAYOUT.client.y).toBeGreaterThan(lowestSignature);
  });
});
