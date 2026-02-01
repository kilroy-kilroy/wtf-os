/**
 * Discovery Lab Pro HTML Report Generator
 * SalesOS branded template with operator console aesthetic
 *
 * Comprehensive playbook PDF with all Pro features
 */

// HTML Template with embedded CSS
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;600;700&display=swap');

        :root {
            --red: #E51B23;
            --black: #000000;
            --yellow: #FFDE59;
            --white: #FFFFFF;
            --dark-gray: #1A1A1A;
            --mid-gray: #333333;
            --light-gray: #666666;
            --text-gray: #CCCCCC;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: letter;
            margin: 0.5in;
            background: var(--black);
            @bottom-center {
                content: "Discovery Lab Pro - Complete Call Playbook | SalesOS";
                font-family: 'Poppins', sans-serif;
                font-size: 8pt;
                color: var(--light-gray);
            }
        }

        body {
            font-family: 'Poppins', 'Helvetica Neue', sans-serif;
            background: var(--black);
            color: var(--white);
            font-size: 9pt;
            line-height: 1.4;
        }

        /* Header */
        .header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--red);
        }

        .sys-status {
            font-size: 8pt;
            color: var(--light-gray);
            letter-spacing: 2px;
            margin-bottom: 4px;
        }

        .sys-status .dot {
            color: var(--red);
        }

        .main-title {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 28pt;
            color: var(--white);
            letter-spacing: 2px;
            margin-bottom: 2px;
        }

        .main-title .highlight {
            color: var(--yellow);
        }

        .main-title .pro {
            color: var(--red);
        }

        .subtitle {
            font-size: 9pt;
            color: var(--light-gray);
            letter-spacing: 3px;
            margin-bottom: 12px;
        }

        .meta-row {
            display: flex;
            gap: 24px;
            font-size: 9pt;
            flex-wrap: wrap;
        }

        .meta-item .label {
            color: var(--light-gray);
        }

        .meta-item .value {
            color: var(--yellow);
            font-weight: 600;
        }

        /* Section Headers */
        .section-header {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 13pt;
            color: var(--red);
            margin-top: 18px;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid var(--red);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-icon {
            font-size: 13pt;
        }

        /* Dark Card Container */
        .dark-card {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 12px;
            margin-bottom: 12px;
        }

        /* Executive Summary */
        .executive-summary {
            background: linear-gradient(135deg, var(--dark-gray) 0%, #2a1a1a 100%);
            border: 2px solid var(--red);
            padding: 14px;
            margin-bottom: 16px;
        }

        .executive-text {
            font-size: 10pt;
            color: var(--white);
            line-height: 1.5;
        }

        /* Authority Snapshot */
        .authority-snapshot {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 12px;
            margin-bottom: 14px;
        }

        .authority-line {
            font-size: 9pt;
            color: var(--text-gray);
            margin-bottom: 8px;
        }

        .authority-line strong {
            color: var(--yellow);
        }

        .authority-statement {
            background: var(--yellow);
            color: var(--black);
            padding: 10px 14px;
            font-weight: 600;
            font-size: 9pt;
            line-height: 1.4;
            margin-top: 10px;
        }

        /* Prospect Psychology */
        .psychology-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .psychology-item {
            background: var(--mid-gray);
            padding: 10px;
        }

        .psychology-label {
            font-size: 8pt;
            color: var(--red);
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }

        .psychology-value {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Probe Section */
        .probe-group-header {
            font-size: 10pt;
            color: var(--yellow);
            font-weight: 700;
            margin: 12px 0 8px 0;
        }

        .probe-item {
            margin-bottom: 10px;
            padding-left: 10px;
            border-left: 3px solid var(--red);
        }

        .probe-tag {
            font-size: 7pt;
            color: var(--red);
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 3px;
        }

        .probe-question {
            font-size: 9pt;
            color: var(--white);
            font-weight: 600;
            margin-bottom: 3px;
        }

        .probe-followup {
            font-size: 8pt;
            color: var(--text-gray);
            padding-left: 10px;
            font-style: italic;
        }

        /* Hooks */
        .hook-item {
            margin-bottom: 10px;
        }

        .hook-name {
            font-weight: 700;
            color: var(--yellow);
            font-size: 9pt;
            margin-bottom: 3px;
        }

        .hook-description {
            font-size: 8pt;
            color: var(--text-gray);
        }

        /* Competitor Card */
        .competitor-card {
            background: var(--mid-gray);
            border-left: 3px solid var(--red);
            padding: 10px 12px;
            margin-bottom: 10px;
        }

        .competitor-name {
            font-weight: 700;
            color: var(--yellow);
            font-size: 10pt;
            margin-bottom: 6px;
        }

        .competitor-detail {
            font-size: 8pt;
            color: var(--text-gray);
            margin-bottom: 3px;
        }

        .competitor-detail strong {
            color: var(--white);
        }

        .competitor-question {
            font-size: 8pt;
            color: var(--white);
            background: var(--dark-gray);
            padding: 6px 10px;
            margin-top: 6px;
            font-style: italic;
        }

        /* Emotional Probe */
        .emotional-probe {
            background: linear-gradient(135deg, var(--dark-gray) 0%, #2a1a1a 100%);
            border: 2px solid var(--red);
            padding: 14px;
            margin-bottom: 14px;
        }

        .emotional-quote {
            font-size: 10pt;
            color: var(--white);
            font-style: italic;
            line-height: 1.5;
        }

        /* Discovery Flow */
        .flow-step {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
        }

        .flow-number {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 16pt;
            color: var(--red);
            min-width: 24px;
        }

        .flow-content {
            flex: 1;
        }

        .flow-title {
            font-weight: 700;
            color: var(--yellow);
            font-size: 9pt;
            margin-bottom: 3px;
        }

        .flow-script {
            font-size: 8pt;
            color: var(--text-gray);
            background: var(--mid-gray);
            padding: 6px 10px;
            border-left: 3px solid var(--red);
            font-style: italic;
        }

        /* Decision Tree */
        .decision-branch {
            margin-bottom: 12px;
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 10px;
        }

        .branch-condition {
            font-size: 9pt;
            color: var(--yellow);
            font-weight: 700;
            margin-bottom: 6px;
        }

        .branch-guidance {
            font-size: 8pt;
            color: var(--text-gray);
            margin-bottom: 6px;
        }

        .branch-script {
            font-size: 8pt;
            color: var(--white);
            background: var(--mid-gray);
            padding: 6px 10px;
            font-style: italic;
        }

        /* Google Section */
        .google-item {
            margin-bottom: 10px;
        }

        .google-label {
            font-size: 8pt;
            color: var(--red);
            font-weight: 700;
            margin-bottom: 3px;
        }

        .google-value {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Opening Script */
        .opening-part {
            margin-bottom: 12px;
        }

        .opening-label {
            font-size: 8pt;
            color: var(--yellow);
            font-weight: 700;
            margin-bottom: 4px;
        }

        .opening-script {
            font-size: 9pt;
            color: var(--white);
            background: var(--mid-gray);
            padding: 8px 12px;
            font-style: italic;
        }

        /* Objectives */
        .objective-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .objective-item {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 10px;
        }

        .objective-label {
            font-size: 8pt;
            color: var(--red);
            font-weight: 700;
            margin-bottom: 4px;
        }

        .objective-label.green {
            color: #4CAF50;
        }

        .objective-value {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Top 5 Findings */
        .finding-item {
            background: linear-gradient(135deg, var(--dark-gray) 0%, #2a1a1a 100%);
            border: 2px solid var(--red);
            padding: 14px;
            margin-bottom: 12px;
        }

        .finding-number {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 14pt;
            color: var(--red);
            margin-bottom: 4px;
        }

        .finding-title {
            font-weight: 700;
            color: var(--yellow);
            font-size: 10pt;
            margin-bottom: 8px;
        }

        .finding-detail {
            font-size: 8pt;
            color: var(--text-gray);
            margin-bottom: 4px;
        }

        .finding-detail strong {
            color: var(--white);
        }

        .finding-confidence {
            font-size: 7pt;
            color: var(--light-gray);
            font-style: italic;
            margin-top: 4px;
        }

        /* Objection Handles */
        .objection-item {
            margin-bottom: 12px;
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 10px;
        }

        .objection-label {
            font-size: 9pt;
            color: var(--red);
            font-weight: 700;
            margin-bottom: 6px;
        }

        .objection-handle {
            font-size: 8pt;
            color: var(--white);
            background: var(--mid-gray);
            padding: 6px 10px;
            font-style: italic;
            border-left: 3px solid var(--yellow);
        }

        /* What We Don't Know */
        .gaps-section {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 12px;
            margin-bottom: 10px;
        }

        .gaps-label {
            font-size: 8pt;
            color: var(--yellow);
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }

        .gaps-list {
            font-size: 8pt;
            color: var(--text-gray);
        }

        .gaps-list li {
            margin-bottom: 4px;
        }

        /* Post-Call Actions */
        .action-item {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
            align-items: flex-start;
        }

        .action-number {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 14pt;
            color: var(--red);
            min-width: 20px;
        }

        .action-content {
            flex: 1;
        }

        .action-timing {
            font-size: 8pt;
            color: var(--yellow);
            font-weight: 700;
            margin-bottom: 2px;
        }

        .action-text {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Pro Badge */
        .pro-badge {
            display: inline-block;
            background: var(--red);
            color: var(--white);
            font-size: 7pt;
            font-weight: 700;
            padding: 2px 6px;
            margin-left: 8px;
            letter-spacing: 1px;
        }

        /* Page Break */
        .page-break {
            page-break-before: always;
        }

        /* Utility */
        .spacer {
            height: 10px;
        }
    </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="sys-status">SYSTEM STATUS: <span class="dot">●</span> PRO ACTIVE</div>
    <div class="main-title">DISCOVERY <span class="highlight">LAB</span> <span class="pro">PRO</span></div>
    <div class="subtitle">COMPLETE CALL PLAYBOOK</div>
    <div class="meta-row">
        <div class="meta-item">
            <span class="label">Target: </span>
            <span class="value">{{target_company}}</span>
        </div>
        <div class="meta-item">
            <span class="label">Contact: </span>
            <span class="value">{{target_contact}}</span>
        </div>
        <div class="meta-item">
            <span class="label">Generated: </span>
            <span class="value">{{date}}</span>
        </div>
    </div>
</div>

<!-- TOP 5 FINDINGS -->
<div class="section-header"><span class="section-icon">🎯</span> TOP 5 FINDINGS <span class="pro-badge">PRO</span></div>
{{findings_html}}

<!-- EXECUTIVE SUMMARY -->
<div class="section-header"><span class="section-icon">📊</span> EXECUTIVE SUMMARY <span class="pro-badge">PRO</span></div>
<div class="executive-summary">
    <div class="executive-text">{{executive_summary}}</div>
</div>

<!-- AUTHORITY SNAPSHOT -->
<div class="section-header"><span class="section-icon">🎯</span> AUTHORITY SNAPSHOT</div>
<div class="authority-snapshot">
    <div class="authority-line"><strong>Your Service:</strong> {{service_reframed}}</div>
    <div class="authority-line"><strong>Target Company:</strong> {{target_company}} {{target_website}}</div>
    <div class="authority-line"><strong>Contact:</strong> {{target_contact}} - {{target_title}}</div>
    <div class="authority-line"><strong>Recent Signals:</strong> {{recent_signals}}</div>
    <div class="authority-statement">{{authority_line}}</div>
</div>

<!-- PROSPECT PSYCHOLOGY -->
<div class="section-header"><span class="section-icon">🧠</span> PROSPECT PSYCHOLOGY <span class="pro-badge">PRO</span></div>
<div class="psychology-grid">
    <div class="psychology-item">
        <div class="psychology-label">SUCCESS METRICS</div>
        <div class="psychology-value">{{psychology_success}}</div>
    </div>
    <div class="psychology-item">
        <div class="psychology-label">FEARS</div>
        <div class="psychology-value">{{psychology_fears}}</div>
    </div>
    <div class="psychology-item">
        <div class="psychology-label">WHAT THEY NEED TO HEAR</div>
        <div class="psychology-value">{{psychology_need}}</div>
    </div>
    <div class="psychology-item">
        <div class="psychology-label">WHAT MAKES THEM SAY YES</div>
        <div class="psychology-value">{{psychology_yes}}</div>
    </div>
</div>

<!-- PAIN / IMPACT PROBES -->
<div class="section-header"><span class="section-icon">🔍</span> PAIN / IMPACT PROBES <span class="pro-badge">8 TOTAL</span></div>
<div class="probe-group-header">PRIMARY PROBES</div>
{{primary_probes_html}}
<div class="probe-group-header">SECONDARY PROBES</div>
{{secondary_probes_html}}

<!-- MARKET & COMPETITOR HOOKS -->
<div class="section-header"><span class="section-icon">🎣</span> MARKET & COMPETITOR HOOKS</div>
{{hooks_html}}

<!-- COMPETITOR SET -->
<div class="section-header"><span class="section-icon">🥊</span> COMPETITOR POSITIONING <span class="pro-badge">PRO</span></div>
{{competitors_html}}

<!-- EMOTIONAL / IDENTITY PROBE -->
<div class="section-header"><span class="section-icon">❤️</span> EMOTIONAL / IDENTITY PROBE</div>
<div class="emotional-probe">
    <div class="emotional-quote">"{{emotional_probe}}"</div>
</div>

<!-- QUICK DISCOVERY FLOW -->
<div class="section-header"><span class="section-icon">⚡</span> QUICK DISCOVERY FLOW</div>
{{flow_html}}

<div class="page-break"></div>

<!-- CONVERSATION DECISION TREE -->
<div class="section-header"><span class="section-icon">🗺️</span> CONVERSATION DECISION TREE <span class="pro-badge">PRO</span></div>
{{decision_tree_html}}

<!-- WHAT THEY'LL GOOGLE -->
<div class="section-header"><span class="section-icon">🔍</span> WHAT THEY'LL GOOGLE <span class="pro-badge">PRO</span></div>
{{google_html}}

<!-- OPENING 60 SECONDS -->
<div class="section-header"><span class="section-icon">🎬</span> OPENING 60 SECONDS <span class="pro-badge">PRO</span></div>
{{opening_html}}

<!-- OBJECTION HANDLES -->
<div class="section-header"><span class="section-icon">🛡</span> OBJECTION HANDLES <span class="pro-badge">PRO</span></div>
{{objections_html}}

<!-- CALL OBJECTIVE & SUCCESS METRICS -->
<div class="section-header"><span class="section-icon">👉</span> CALL OBJECTIVE & SUCCESS METRICS</div>
<div class="objective-grid">
    <div class="objective-item">
        <div class="objective-label">PRIMARY GOAL</div>
        <div class="objective-value">{{primary_objective}}</div>
    </div>
    <div class="objective-item">
        <div class="objective-label green">SUCCESS LOOKS LIKE</div>
        <div class="objective-value">{{success_criteria}}</div>
    </div>
    <div class="objective-item">
        <div class="objective-label">MINIMUM VIABLE OUTCOME</div>
        <div class="objective-value">{{minimum_viable_outcome}}</div>
    </div>
    <div class="objective-item">
        <div class="objective-label">RED FLAGS</div>
        <div class="objective-value">{{red_flags}}</div>
    </div>
</div>

<!-- WHAT WE DON'T KNOW -->
<div class="section-header"><span class="section-icon">⚠️</span> WHAT WE DON'T KNOW <span class="pro-badge">PRO</span></div>
<div class="gaps-section">
    <div class="gaps-label">INFORMATION GAPS</div>
    <div class="gaps-list">{{gaps_html}}</div>
</div>
<div class="gaps-section">
    <div class="gaps-label">ASSUMPTIONS TO VALIDATE</div>
    <div class="gaps-list">{{assumptions_html}}</div>
</div>
<div class="gaps-section">
    <div class="gaps-label">RED FLAGS TO WATCH</div>
    <div class="gaps-list">{{red_flags_to_watch_html}}</div>
</div>

<!-- POST-CALL ACTIONS -->
<div class="section-header"><span class="section-icon">📋</span> POST-CALL ACTIONS <span class="pro-badge">PRO</span></div>
{{actions_html}}

</body>
</html>
`;

// Templates
const PROBE_TEMPLATE = `
<div class="probe-item">
    <div class="probe-tag">{{tag}}</div>
    <div class="probe-question">{{question}}</div>
    <div class="probe-followup">→ {{followup}}</div>
</div>
`;

const HOOK_TEMPLATE = `
<div class="hook-item">
    <div class="hook-name">{{name}}</div>
    <div class="hook-description">{{description}}</div>
</div>
`;

const COMPETITOR_PRO_TEMPLATE = `
<div class="competitor-card">
    <div class="competitor-name">{{name}}</div>
    <div class="competitor-detail"><strong>Good at:</strong> {{strength}}</div>
    <div class="competitor-detail"><strong>Falls short:</strong> {{weakness}}</div>
    <div class="competitor-detail"><strong>Position against:</strong> {{positioning}}</div>
    <div class="competitor-question">"{{question}}"</div>
</div>
`;

const FLOW_STEP_TEMPLATE = `
<div class="flow-step">
    <div class="flow-number">{{number}}</div>
    <div class="flow-content">
        <div class="flow-title">{{title}}</div>
        <div class="flow-script">"{{script}}"</div>
    </div>
</div>
`;

const DECISION_BRANCH_TEMPLATE = `
<div class="decision-branch">
    <div class="branch-condition">{{condition}}</div>
    <div class="branch-guidance">{{guidance}}</div>
    <div class="branch-script">"{{script}}"</div>
</div>
`;

const GOOGLE_ITEM_TEMPLATE = `
<div class="google-item">
    <div class="google-label">{{label}}</div>
    <div class="google-value">{{value}}</div>
</div>
`;

const OPENING_PART_TEMPLATE = `
<div class="opening-part">
    <div class="opening-label">{{label}}</div>
    <div class="opening-script">"{{script}}"</div>
</div>
`;

const FINDING_TEMPLATE = `
<div class="finding-item">
    <div class="finding-number">{{number}}</div>
    <div class="finding-title">{{title}}</div>
    <div class="finding-detail"><strong>What it is:</strong> {{what}}</div>
    <div class="finding-detail"><strong>Why it matters:</strong> {{why}}</div>
    <div class="finding-detail"><strong>What to do:</strong> {{action}}</div>
    <div class="finding-confidence">Confidence: {{confidence}}</div>
</div>
`;

const OBJECTION_TEMPLATE = `
<div class="objection-item">
    <div class="objection-label">{{objection}}</div>
    <div class="objection-handle">"{{handle}}"</div>
</div>
`;

const ACTION_TEMPLATE = `
<div class="action-item">
    <div class="action-number">{{number}}</div>
    <div class="action-content">
        <div class="action-timing">{{timing}}</div>
        <div class="action-text">{{action}}</div>
    </div>
</div>
`;

// Type definitions
export interface ProbeData {
  tag: string;
  question: string;
  followup: string;
}

export interface HookData {
  name: string;
  description: string;
}

export interface CompetitorProData {
  name: string;
  strength: string;
  weakness: string;
  positioning: string;
  question: string;
}

export interface FlowStepData {
  title: string;
  script: string;
}

export interface DecisionBranchData {
  condition: string;
  guidance: string;
  script: string;
}

export interface GoogleItemData {
  label: string;
  value: string;
}

export interface OpeningPartData {
  label: string;
  script: string;
}

export interface ActionData {
  timing: string;
  action: string;
}

export interface FindingData {
  title: string;
  what: string;
  why: string;
  action: string;
  confidence: string;
}

export interface ObjectionData {
  objection: string;
  handle: string;
}

export interface DiscoveryLabProReportData {
  // Meta
  date: string;
  requestor_name: string;
  requestor_company: string;

  // Target
  target_company: string;
  target_website: string;
  target_contact: string;
  target_title: string;

  // Executive Summary
  executive_summary: string;

  // Authority Snapshot
  service_reframed: string;
  recent_signals: string;
  authority_line: string;

  // Prospect Psychology
  psychology_success: string;
  psychology_fears: string;
  psychology_need: string;
  psychology_yes: string;

  // Top 5 Findings
  findings: FindingData[];

  // Content sections
  primary_probes: ProbeData[];
  secondary_probes: ProbeData[];
  hooks: HookData[];
  competitors: CompetitorProData[];
  emotional_probe: string;
  flow_steps: FlowStepData[];

  // Pro sections
  decision_branches: DecisionBranchData[];
  google_items: GoogleItemData[];
  opening_parts: OpeningPartData[];
  objections: ObjectionData[];

  // Objectives
  primary_objective: string;
  success_criteria: string;
  minimum_viable_outcome: string;
  red_flags: string;

  // What We Don't Know
  gaps: string[];
  assumptions: string[];
  red_flags_to_watch: string[];

  // Post-call actions
  actions: ActionData[];
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate HTML report for Discovery Lab Pro
 */
export function generateDiscoveryLabProHTML(data: DiscoveryLabProReportData): string {
  let html = HTML_TEMPLATE;

  // Replace basic fields
  html = html.replace(/\{\{date\}\}/g, escapeHtml(data.date));
  html = html.replace(/\{\{target_company\}\}/g, escapeHtml(data.target_company));
  html = html.replace(/\{\{target_website\}\}/g, escapeHtml(data.target_website || ''));
  html = html.replace(/\{\{target_contact\}\}/g, escapeHtml(data.target_contact || 'Contact'));
  html = html.replace(/\{\{target_title\}\}/g, escapeHtml(data.target_title || ''));
  html = html.replace(/\{\{executive_summary\}\}/g, escapeHtml(data.executive_summary));
  html = html.replace(/\{\{service_reframed\}\}/g, escapeHtml(data.service_reframed));
  html = html.replace(/\{\{recent_signals\}\}/g, escapeHtml(data.recent_signals));
  html = html.replace(/\{\{authority_line\}\}/g, escapeHtml(data.authority_line));

  // Psychology
  html = html.replace(/\{\{psychology_success\}\}/g, escapeHtml(data.psychology_success));
  html = html.replace(/\{\{psychology_fears\}\}/g, escapeHtml(data.psychology_fears));
  html = html.replace(/\{\{psychology_need\}\}/g, escapeHtml(data.psychology_need));
  html = html.replace(/\{\{psychology_yes\}\}/g, escapeHtml(data.psychology_yes));

  // Emotional probe
  html = html.replace(/\{\{emotional_probe\}\}/g, escapeHtml(data.emotional_probe));

  // Objectives
  html = html.replace(/\{\{primary_objective\}\}/g, escapeHtml(data.primary_objective));
  html = html.replace(/\{\{success_criteria\}\}/g, escapeHtml(data.success_criteria || ''));
  html = html.replace(/\{\{minimum_viable_outcome\}\}/g, escapeHtml(data.minimum_viable_outcome || ''));
  html = html.replace(/\{\{red_flags\}\}/g, escapeHtml(data.red_flags));

  // Generate Top 5 Findings HTML
  let findingsHtml = '';
  for (const [index, finding] of (data.findings || []).entries()) {
    let findingHtml = FINDING_TEMPLATE;
    findingHtml = findingHtml.replace('{{number}}', String(index + 1));
    findingHtml = findingHtml.replace('{{title}}', escapeHtml(finding.title));
    findingHtml = findingHtml.replace('{{what}}', escapeHtml(finding.what));
    findingHtml = findingHtml.replace('{{why}}', escapeHtml(finding.why));
    findingHtml = findingHtml.replace('{{action}}', escapeHtml(finding.action));
    findingHtml = findingHtml.replace('{{confidence}}', escapeHtml(finding.confidence));
    findingsHtml += findingHtml;
  }
  html = html.replace('{{findings_html}}', findingsHtml);

  // Generate primary probes HTML
  let primaryProbesHtml = '';
  for (const probe of data.primary_probes) {
    let probeHtml = PROBE_TEMPLATE;
    probeHtml = probeHtml.replace('{{tag}}', escapeHtml(probe.tag));
    probeHtml = probeHtml.replace('{{question}}', escapeHtml(probe.question));
    probeHtml = probeHtml.replace('{{followup}}', escapeHtml(probe.followup));
    primaryProbesHtml += probeHtml;
  }
  html = html.replace('{{primary_probes_html}}', primaryProbesHtml);

  // Generate secondary probes HTML
  let secondaryProbesHtml = '';
  for (const probe of data.secondary_probes) {
    let probeHtml = PROBE_TEMPLATE;
    probeHtml = probeHtml.replace('{{tag}}', escapeHtml(probe.tag));
    probeHtml = probeHtml.replace('{{question}}', escapeHtml(probe.question));
    probeHtml = probeHtml.replace('{{followup}}', escapeHtml(probe.followup));
    secondaryProbesHtml += probeHtml;
  }
  html = html.replace('{{secondary_probes_html}}', secondaryProbesHtml);

  // Generate hooks HTML
  let hooksHtml = '';
  for (const hook of data.hooks) {
    let hookHtml = HOOK_TEMPLATE;
    hookHtml = hookHtml.replace('{{name}}', escapeHtml(hook.name));
    hookHtml = hookHtml.replace('{{description}}', escapeHtml(hook.description));
    hooksHtml += hookHtml;
  }
  html = html.replace('{{hooks_html}}', hooksHtml);

  // Generate competitors HTML
  let competitorsHtml = '';
  for (const competitor of data.competitors) {
    let competitorHtml = COMPETITOR_PRO_TEMPLATE;
    competitorHtml = competitorHtml.replace('{{name}}', escapeHtml(competitor.name));
    competitorHtml = competitorHtml.replace('{{strength}}', escapeHtml(competitor.strength));
    competitorHtml = competitorHtml.replace('{{weakness}}', escapeHtml(competitor.weakness));
    competitorHtml = competitorHtml.replace('{{positioning}}', escapeHtml(competitor.positioning));
    competitorHtml = competitorHtml.replace('{{question}}', escapeHtml(competitor.question));
    competitorsHtml += competitorHtml;
  }
  html = html.replace('{{competitors_html}}', competitorsHtml);

  // Generate flow steps HTML
  let flowHtml = '';
  data.flow_steps.forEach((step, index) => {
    let stepHtml = FLOW_STEP_TEMPLATE;
    stepHtml = stepHtml.replace('{{number}}', String(index + 1));
    stepHtml = stepHtml.replace('{{title}}', escapeHtml(step.title));
    stepHtml = stepHtml.replace('{{script}}', escapeHtml(step.script));
    flowHtml += stepHtml;
  });
  html = html.replace('{{flow_html}}', flowHtml);

  // Generate decision tree HTML
  let decisionTreeHtml = '';
  for (const branch of data.decision_branches) {
    let branchHtml = DECISION_BRANCH_TEMPLATE;
    branchHtml = branchHtml.replace('{{condition}}', escapeHtml(branch.condition));
    branchHtml = branchHtml.replace('{{guidance}}', escapeHtml(branch.guidance));
    branchHtml = branchHtml.replace('{{script}}', escapeHtml(branch.script));
    decisionTreeHtml += branchHtml;
  }
  html = html.replace('{{decision_tree_html}}', decisionTreeHtml);

  // Generate google section HTML
  let googleHtml = '';
  for (const item of data.google_items) {
    let itemHtml = GOOGLE_ITEM_TEMPLATE;
    itemHtml = itemHtml.replace('{{label}}', escapeHtml(item.label));
    itemHtml = itemHtml.replace('{{value}}', escapeHtml(item.value));
    googleHtml += itemHtml;
  }
  html = html.replace('{{google_html}}', googleHtml);

  // Generate opening script HTML
  let openingHtml = '';
  for (const part of data.opening_parts) {
    let partHtml = OPENING_PART_TEMPLATE;
    partHtml = partHtml.replace('{{label}}', escapeHtml(part.label));
    partHtml = partHtml.replace('{{script}}', escapeHtml(part.script));
    openingHtml += partHtml;
  }
  html = html.replace('{{opening_html}}', openingHtml);

  // Generate objection handles HTML
  let objectionsHtml = '';
  for (const objection of (data.objections || [])) {
    let objHtml = OBJECTION_TEMPLATE;
    objHtml = objHtml.replace('{{objection}}', escapeHtml(objection.objection));
    objHtml = objHtml.replace('{{handle}}', escapeHtml(objection.handle));
    objectionsHtml += objHtml;
  }
  html = html.replace('{{objections_html}}', objectionsHtml);

  // Generate What We Don't Know HTML
  const gapsHtml = (data.gaps || []).map(g => `<li>${escapeHtml(g)}</li>`).join('');
  html = html.replace('{{gaps_html}}', gapsHtml);
  const assumptionsHtml = (data.assumptions || []).map(a => `<li>${escapeHtml(a)}</li>`).join('');
  html = html.replace('{{assumptions_html}}', assumptionsHtml);
  const redFlagsToWatchHtml = (data.red_flags_to_watch || []).map(r => `<li>${escapeHtml(r)}</li>`).join('');
  html = html.replace('{{red_flags_to_watch_html}}', redFlagsToWatchHtml);

  // Generate actions HTML
  let actionsHtml = '';
  data.actions.forEach((action, index) => {
    let actionHtml = ACTION_TEMPLATE;
    actionHtml = actionHtml.replace('{{number}}', String(index + 1));
    actionHtml = actionHtml.replace('{{timing}}', escapeHtml(action.timing));
    actionHtml = actionHtml.replace('{{action}}', escapeHtml(action.action));
    actionsHtml += actionHtml;
  });
  html = html.replace('{{actions_html}}', actionsHtml);

  return html;
}
