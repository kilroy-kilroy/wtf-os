// apps/web/lib/contracts/template-engine.ts
//
// Pure {{placeholder}} merge for contract templates. No I/O.
//
// Reserved names are NOT user fields:
//   - {{sow}}                          → the rendered Statement of Work HTML
//   - {{sig_client}} / {{sig_counter}} → Firma signature anchors (left intact)
//   - {{date_client}} / {{date_counter}} → Firma date anchors (left intact)
//   - {{init_client}} / {{init_counter}} → Firma per-page initials anchors (left intact)

export const SIGNATURE_ANCHORS = ['sig_client', 'sig_counter', 'date_client', 'date_counter'] as const;
// Per-page initials anchors. Optional — only templates that initial each page use them.
export const INITIAL_ANCHORS = ['init_client', 'init_counter'] as const;
const RESERVED = new Set<string>(['sow', ...SIGNATURE_ANCHORS, ...INITIAL_ANCHORS]);

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** All non-reserved placeholder keys in the template, sorted and de-duplicated. */
export function extractVariables(bodyHtml: string): string[] {
  const found = new Set<string>();
  for (const m of bodyHtml.matchAll(PLACEHOLDER)) {
    const key = m[1].toLowerCase();
    if (!RESERVED.has(key)) found.add(key);
  }
  return [...found].sort();
}

/**
 * Merge field values + SOW into the template body.
 * - {{sow}} is replaced with sowHtml (already trusted, rendered HTML).
 * - {{field}} is replaced with the HTML-escaped field value.
 * - Signature/date anchors are left untouched for Firma to bind.
 * - Throws if any non-reserved, non-anchor placeholder has no value.
 */
export function merge(bodyHtml: string, fieldValues: Record<string, string>, sowHtml: string): string {
  const missing = new Set<string>();
  const out = bodyHtml.replace(PLACEHOLDER, (whole, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (key === 'sow') return sowHtml;
    if (RESERVED.has(key)) return whole; // signature/date anchors stay literal
    const value = fieldValues[key];
    if (value === undefined || value === null || value === '') {
      missing.add(key);
      return whole;
    }
    return escapeHtml(String(value));
  });
  if (missing.size > 0) {
    throw new Error(`Cannot render contract — missing required field(s): ${[...missing].sort().join(', ')}`);
  }
  return out;
}
