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
// Non-global twin of the {{sow}} match: `PLACEHOLDER` is /g and therefore
// carries `lastIndex` between calls, which makes it unsafe for a bare test().
const SOW_SLOT = /\{\{\s*sow\s*\}\}/i;

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

/**
 * Merge a base agreement and, if present, append a SOW schedule after a page
 * break — one combined document. Both keep their own signature/initials anchors,
 * so the client signs both sections in a single envelope.
 */
export function combineMergedHtml(
  baseBody: string,
  sowBody: string | null | undefined,
  fieldValues: Record<string, string>,
  sowHtml: string,
): string {
  const base = merge(baseBody, fieldValues, sowHtml);
  if (!sowBody) return base;
  const sow = merge(sowBody, fieldValues, sowHtml);
  return `${base}<div class="page-break"></div>${sow}`;
}

/** True when a template body carries the {{sow}} slot that SOW content fills. */
export function hasSowSlot(bodyHtml: string | null | undefined): boolean {
  return !!bodyHtml && SOW_SLOT.test(bodyHtml);
}

/**
 * SOW scope only reaches the client through a {{sow}} slot. Not every document
 * has one — the MSA is an umbrella agreement and the Agency Studio Plus SOW is
 * fixed — so scope written against them merges into nothing and the client is
 * emailed a contract missing the very thing it was supposed to carry.
 *
 * `merge` already throws on a missing field value; this is the mirror case,
 * a value with no field to land in. Callers must refuse to send.
 */
export function assertSowHasDestination(
  baseBody: string | null | undefined,
  sowBody: string | null | undefined,
  sowHtml: string | null | undefined,
): void {
  if (!sowHtml?.trim()) return;
  if (hasSowSlot(baseBody) || hasSowSlot(sowBody)) return;
  throw new Error(
    'Cannot render contract — a Statement of Work was written but neither selected ' +
    'document has a {{sow}} section to put it in, so it would be dropped silently. ' +
    'Attach a Statement of Work template, or clear the scope.',
  );
}
