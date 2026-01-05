/**
 * Discovery Lab HTML Report Generator
 * SalesOS branded template with operator console aesthetic
 *
 * Generates HTML reports that can be converted to PDF
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
                content: "Discovery Lab - Sales Call Analysis Report | SalesOS";
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
            font-size: 14pt;
            color: var(--red);
            margin-top: 20px;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 2px solid var(--red);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-icon {
            font-size: 14pt;
        }

        /* Dark Card Container */
        .dark-card {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 14px;
            margin-bottom: 14px;
        }

        /* Authority Snapshot */
        .authority-snapshot {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 14px;
            margin-bottom: 16px;
        }

        .authority-line {
            font-size: 10pt;
            color: var(--text-gray);
            margin-bottom: 10px;
        }

        .authority-line strong {
            color: var(--yellow);
        }

        .authority-statement {
            background: var(--yellow);
            color: var(--black);
            padding: 12px 16px;
            font-weight: 600;
            font-size: 10pt;
            line-height: 1.4;
            margin-top: 12px;
        }

        /* Probe Section */
        .probe-item {
            margin-bottom: 12px;
            padding-left: 12px;
            border-left: 3px solid var(--red);
        }

        .probe-tag {
            font-size: 8pt;
            color: var(--red);
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }

        .probe-question {
            font-size: 10pt;
            color: var(--white);
            font-weight: 600;
            margin-bottom: 4px;
        }

        .probe-followup {
            font-size: 9pt;
            color: var(--text-gray);
            padding-left: 12px;
            font-style: italic;
        }

        /* Hooks */
        .hook-item {
            margin-bottom: 12px;
        }

        .hook-name {
            font-weight: 700;
            color: var(--yellow);
            font-size: 10pt;
            margin-bottom: 4px;
        }

        .hook-description {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Competitor Card */
        .competitor-card {
            background: var(--mid-gray);
            border-left: 4px solid var(--red);
            padding: 10px 14px;
            margin-bottom: 10px;
        }

        .competitor-name {
            font-weight: 700;
            color: var(--yellow);
            font-size: 10pt;
            margin-bottom: 4px;
        }

        .competitor-why {
            font-size: 9pt;
            color: var(--text-gray);
        }

        /* Emotional Probe */
        .emotional-probe {
            background: linear-gradient(135deg, var(--dark-gray) 0%, #2a1a1a 100%);
            border: 2px solid var(--red);
            padding: 16px;
            margin-bottom: 16px;
        }

        .emotional-quote {
            font-size: 11pt;
            color: var(--white);
            font-style: italic;
            line-height: 1.5;
        }

        /* Discovery Flow */
        .flow-step {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
        }

        .flow-number {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 18pt;
            color: var(--red);
            min-width: 28px;
        }

        .flow-content {
            flex: 1;
        }

        .flow-title {
            font-weight: 700;
            color: var(--yellow);
            font-size: 10pt;
            margin-bottom: 4px;
        }

        .flow-script {
            font-size: 9pt;
            color: var(--text-gray);
            background: var(--mid-gray);
            padding: 8px 12px;
            border-left: 3px solid var(--red);
            font-style: italic;
        }

        /* Call Objective */
        .objective-box {
            background: var(--red);
            padding: 16px 20px;
            text-align: center;
        }

        .objective-text {
            font-size: 11pt;
            color: var(--white);
            font-weight: 600;
        }

        /* CTA Card */
        .cta-card {
            background: linear-gradient(135deg, var(--dark-gray) 0%, #1a1a2a 100%);
            border: 2px solid var(--yellow);
            padding: 20px;
            text-align: center;
            margin-top: 20px;
            page-break-inside: avoid;
        }

        .cta-header {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 14pt;
            color: var(--yellow);
            margin-bottom: 12px;
        }

        .cta-bullet {
            font-size: 9pt;
            color: var(--text-gray);
            margin-bottom: 4px;
            text-align: left;
        }

        .cta-button {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 14pt;
            color: var(--white);
            background: var(--red);
            padding: 12px 24px;
            margin-top: 16px;
            display: inline-block;
            letter-spacing: 2px;
        }

        /* Utility */
        .page-break {
            page-break-before: always;
        }

        .spacer {
            height: 12px;
        }
    </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="sys-status">SYSTEM STATUS: <span class="dot">●</span> READY</div>
    <div class="main-title">DISCOVERY <span class="highlight">LAB</span></div>
    <div class="subtitle">CALL GUIDE</div>
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

<!-- AUTHORITY SNAPSHOT -->
<div class="section-header"><span class="section-icon">🎯</span> AUTHORITY SNAPSHOT</div>
<div class="authority-snapshot">
    <div class="authority-line"><strong>Your Service:</strong> {{service_reframed}}</div>
    <div class="authority-line"><strong>Target Company:</strong> {{target_company}} {{target_website}}</div>
    <div class="authority-line"><strong>Contact:</strong> {{target_contact}} - {{target_title}}</div>
    <div class="authority-statement">{{authority_line}}</div>
</div>

<!-- PAIN / IMPACT PROBES -->
<div class="section-header"><span class="section-icon">🔍</span> PAIN / IMPACT PROBES</div>
{{probes_html}}

<!-- MARKET & COMPETITOR HOOKS -->
<div class="section-header"><span class="section-icon">🎣</span> MARKET & COMPETITOR HOOKS</div>
{{hooks_html}}

<!-- COMPETITOR SET -->
<div class="section-header"><span class="section-icon">🥊</span> COMPETITOR SET</div>
{{competitors_html}}

<!-- EMOTIONAL / IDENTITY PROBE -->
<div class="section-header"><span class="section-icon">❤️</span> EMOTIONAL / IDENTITY PROBE</div>
<div class="emotional-probe">
    <div class="emotional-quote">"{{emotional_probe}}"</div>
</div>

<!-- QUICK DISCOVERY FLOW -->
<div class="section-header"><span class="section-icon">⚡</span> QUICK DISCOVERY FLOW</div>
{{flow_html}}

<!-- CALL OBJECTIVE -->
<div class="section-header"><span class="section-icon">👉</span> CALL OBJECTIVE</div>
<div class="objective-box">
    <div class="objective-text">{{call_objective}}</div>
</div>

<!-- UPGRADE CTA -->
<div class="cta-card">
    <div class="cta-header">UPGRADE TO DISCOVERY LAB PRO</div>
    <div class="cta-bullet">→ Full company research and positioning analysis</div>
    <div class="cta-bullet">→ LinkedIn intelligence on your specific contact</div>
    <div class="cta-bullet">→ Competitor analysis with positioning against each</div>
    <div class="cta-bullet">→ Complete conversation decision tree</div>
    <div class="cta-bullet">→ What they'll Google after your call</div>
    <div class="cta-bullet">→ Opening 60-second script</div>
    <div class="cta-bullet">→ Post-call action plan</div>
    <div class="cta-button">[ UPGRADE TO PRO ]</div>
</div>

</body>
</html>
`;

// Templates for repeated elements
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

const COMPETITOR_TEMPLATE = `
<div class="competitor-card">
    <div class="competitor-name">{{name}}</div>
    <div class="competitor-why">{{why}}</div>
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

// Type definitions
export interface ProbeData {
  tag: string; // PRIMARY or SECONDARY
  question: string;
  followup: string;
}

export interface HookData {
  name: string;
  description: string;
}

export interface CompetitorData {
  name: string;
  why: string;
}

export interface FlowStepData {
  title: string;
  script: string;
}

export interface DiscoveryLabReportData {
  // Meta
  date: string;
  requestor_name: string;
  requestor_company: string;

  // Target
  target_company: string;
  target_website: string;
  target_contact: string;
  target_title: string;

  // Authority Snapshot
  service_reframed: string;
  authority_line: string;

  // Content sections
  probes: ProbeData[];
  hooks: HookData[];
  competitors: CompetitorData[];
  emotional_probe: string;
  flow_steps: FlowStepData[];
  call_objective: string;
}

/**
 * Escape HTML special characters to prevent XSS
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
 * Generate HTML report for Discovery Lab
 */
export function generateDiscoveryLabHTML(data: DiscoveryLabReportData): string {
  let html = HTML_TEMPLATE;

  // Replace basic fields
  html = html.replace(/\{\{date\}\}/g, escapeHtml(data.date));
  html = html.replace(/\{\{target_company\}\}/g, escapeHtml(data.target_company));
  html = html.replace(/\{\{target_website\}\}/g, escapeHtml(data.target_website || ''));
  html = html.replace(/\{\{target_contact\}\}/g, escapeHtml(data.target_contact || 'Contact'));
  html = html.replace(/\{\{target_title\}\}/g, escapeHtml(data.target_title || ''));
  html = html.replace(/\{\{service_reframed\}\}/g, escapeHtml(data.service_reframed));
  html = html.replace(/\{\{authority_line\}\}/g, escapeHtml(data.authority_line));
  html = html.replace(/\{\{emotional_probe\}\}/g, escapeHtml(data.emotional_probe));
  html = html.replace(/\{\{call_objective\}\}/g, escapeHtml(data.call_objective));

  // Generate probes HTML
  let probesHtml = '';
  for (const probe of data.probes) {
    let probeHtml = PROBE_TEMPLATE;
    probeHtml = probeHtml.replace('{{tag}}', escapeHtml(probe.tag));
    probeHtml = probeHtml.replace('{{question}}', escapeHtml(probe.question));
    probeHtml = probeHtml.replace('{{followup}}', escapeHtml(probe.followup));
    probesHtml += probeHtml;
  }
  html = html.replace('{{probes_html}}', probesHtml);

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
    let competitorHtml = COMPETITOR_TEMPLATE;
    competitorHtml = competitorHtml.replace('{{name}}', escapeHtml(competitor.name));
    competitorHtml = competitorHtml.replace('{{why}}', escapeHtml(competitor.why));
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

  return html;
}
