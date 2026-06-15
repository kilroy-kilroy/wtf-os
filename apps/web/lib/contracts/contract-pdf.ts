import { htmlToPdf } from '@repo/pdf';

// Print CSS for a Letter contract: readable serif body, real margins, page breaks.
const CONTRACT_CSS = `
  @page { size: Letter; margin: 1in; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 16pt; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  ul { margin: 6pt 0 6pt 18pt; }
  .sig-block { margin-top: 36pt; page-break-inside: avoid; }
  /* position:fixed repeats on every printed page, so the {{init_*}} anchors it
     carries land on each page for Firma to bind a per-page initials field. */
  .page-initials { position: fixed; bottom: 0.3in; right: 0; font-size: 8pt; color: #555; }
`;

/**
 * Wrap merged contract HTML in a full print document and render to a PDF buffer.
 * The merged HTML still contains Firma anchors ({{sig_client}} etc.) as literal
 * text — Firma binds signature fields to them after upload.
 */
export async function renderContractPdf(mergedHtml: string): Promise<Buffer> {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${CONTRACT_CSS}</style></head><body>${mergedHtml}</body></html>`;
  return htmlToPdf(doc, { format: 'Letter' });
}
