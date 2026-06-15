import { describe, it, expect } from 'vitest';
import { renderContractPdf } from './contract-pdf';

// Mirrors the shape of a merged contract: initials footer, title, sections,
// numbered list, inline bold, signature block, and Firma anchors.
const SAMPLE = `
  <div class="page-initials">Initials &mdash; Client: {{init_client}} &nbsp; KLRY: {{init_counter}}</div>
  <h1>Master Services Agreement</h1>
  <h2>Section 1: Introduction</h2>
  <p>This Agreement is between KLRY, LLC and Acme, located at 1 Main St, effective Jan 1.</p>
  <ol><li>First clause.</li><li>Second clause with <strong>bold</strong> text.</li></ol>
  <div class="sig-block">
    <p><strong>For KLRY, LLC</strong><br/>Tim Kilroy, CEO<br/>Signature: {{sig_counter}} Date: {{date_counter}}</p>
    <p><strong>For Acme</strong><br/>Signature: {{sig_client}} Date: {{date_client}}</p>
  </div>
`;

describe('renderContractPdf', () => {
  it('renders merged contract HTML to a PDF buffer without a browser', async () => {
    const pdf = await renderContractPdf(SAMPLE);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    // Valid PDF files begin with the "%PDF-" magic bytes.
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  }, 30000);

  it('renders even when the template has no initials footer', async () => {
    const pdf = await renderContractPdf('<h1>SOW</h1><p>Scope.</p>');
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }, 30000);
});
