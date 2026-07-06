// Legacy React PDF exports (kept for backwards compatibility)
export { CallLabReport } from './call-lab-report';
export { MarkdownReport } from './markdown-report';

// Call Lab HTML/CSS-based PDF generation
export { generateCallLabLiteHTML } from './call-lab-html-report';
export type { ReportData, PatternData } from './call-lab-html-report';
export { parseCallLabLiteMarkdown } from './call-lab-parser';

// Discovery Lab HTML/CSS-based PDF generation
export { generateDiscoveryLabHTML } from './discovery-lab-html-report';
export type {
  DiscoveryLabReportData,
  ProbeData as DiscoveryProbeData,
  HookData as DiscoveryHookData,
  CompetitorData as DiscoveryCompetitorData,
  FlowStepData as DiscoveryFlowStepData,
} from './discovery-lab-html-report';
export {
  parseDiscoveryLabMarkdown,
  isDiscoveryLabMarkdown,
  isDiscoveryLabProMarkdown,
} from './discovery-lab-parser';

// Discovery Lab Pro HTML/CSS-based PDF generation
export { generateDiscoveryLabProHTML } from './discovery-lab-pro-html-report';
export type {
  DiscoveryLabProReportData,
  CompetitorProData,
  DecisionBranchData,
  GoogleItemData,
  OpeningPartData,
  ActionData,
} from './discovery-lab-pro-html-report';
export { parseDiscoveryLabProMarkdown } from './discovery-lab-pro-parser';

// Robot-Tim Positioning Engine HTML/CSS-based PDF generation
export { generateRobotTimHTML } from './robot-tim-html-report';
export type { RobotTimReportData } from './robot-tim-html-report';

// HTML to PDF converter
export { htmlToPdf, htmlFileToPdf } from './html-to-pdf';
export type { PdfOptions } from './html-to-pdf';

// Contract PDF (react-pdf)
export { renderContractReport } from './contract-report';
