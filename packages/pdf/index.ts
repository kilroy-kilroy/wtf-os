// Legacy React PDF exports (kept for backwards compatibility)
export { CallLabReport } from './call-lab-report';
export { MarkdownReport } from './markdown-report';

// New HTML/CSS-based PDF generation
export { generateCallLabLiteHTML } from './call-lab-html-report';
export type { ReportData, PatternData } from './call-lab-html-report';
export { parseCallLabLiteMarkdown } from './call-lab-parser';
export { htmlToPdf, htmlFileToPdf } from './html-to-pdf';
export type { PdfOptions } from './html-to-pdf';
