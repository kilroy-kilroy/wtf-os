/**
 * Call Lab Lite HTML Report Generator
 * SalesOS/DemandOS branded template with operator console aesthetic
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
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: letter;
            margin: 0.6in;
            background: var(--black);
            @bottom-center {
                content: "Call Lab Lite — Sales Call Analysis Report | SalesOS";
                font-family: 'Poppins', sans-serif;
                font-size: 8pt;
                color: var(--light-gray);
            }
        }

        body {
            font-family: 'Poppins', 'Helvetica Neue', sans-serif;
            background: var(--black);
            color: var(--white);
            font-size: 10pt;
            line-height: 1.4;
        }

        /* Header */
        .header {
            margin-bottom: 24px;
        }

        .sys-status {
            font-size: 9pt;
            color: var(--light-gray);
            margin-bottom: 4px;
        }

        .sys-status .dot {
            color: var(--red);
        }

        .main-title {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 32pt;
            color: var(--white);
            letter-spacing: 2px;
            margin-bottom: 2px;
        }

        .subtitle {
            font-size: 10pt;
            color: var(--light-gray);
            letter-spacing: 4px;
            margin-bottom: 16px;
        }

        .call-meta {
            font-size: 10pt;
        }

        .call-meta .name {
            color: var(--yellow);
        }

        /* Score Card */
        .score-card {
            display: inline-block;
            background: var(--dark-gray);
            border: 2px solid var(--red);
            padding: 16px 32px;
            text-align: center;
            margin-bottom: 20px;
        }

        .score-number {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 42pt;
            color: var(--red);
            line-height: 1;
        }

        .score-label {
            font-size: 9pt;
            color: var(--light-gray);
            margin-top: 4px;
        }

        .effectiveness {
            font-weight: 600;
            color: var(--yellow);
            font-size: 11pt;
            margin-top: 8px;
        }

        /* Dark Card Container */
        .dark-card {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 16px;
            margin-bottom: 16px;
        }

        /* Snap Take */
        .snap-header {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 14pt;
            color: var(--red);
            margin-bottom: 8px;
        }

        .snap-body {
            font-size: 10pt;
            line-height: 1.5;
        }

        /* Pull Quote */
        .pull-quote {
            background: var(--yellow);
            color: var(--black);
            padding: 16px 20px;
            font-weight: 600;
            font-size: 12pt;
            line-height: 1.4;
            margin: 16px 0;
        }

        /* Section Headers */
        .section-header {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 16pt;
            color: var(--red);
            margin-top: 28px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--red);
        }

        /* Pattern Name */
        .pattern-name {
            font-weight: 700;
            font-size: 12pt;
            color: var(--yellow);
            margin-top: 16px;
            margin-bottom: 6px;
        }

        .pattern-body {
            font-size: 10pt;
            line-height: 1.5;
            margin-bottom: 8px;
        }

        /* Evidence Quotes */
        .evidence {
            font-size: 9pt;
            color: var(--light-gray);
            padding-left: 16px;
            border-left: 2px solid var(--mid-gray);
            margin: 8px 0 8px 8px;
            font-style: italic;
        }

        /* Fix Box */
        .fix-box {
            background: var(--mid-gray);
            border-left: 4px solid var(--red);
            padding: 12px 16px;
            margin: 12px 0;
        }

        .fix-label {
            color: var(--red);
            font-weight: 700;
        }

        /* Signals */
        .signals-container {
            margin-top: 12px;
        }

        .signal-group-header {
            font-weight: 700;
            font-size: 11pt;
            margin-bottom: 8px;
        }

        .signal-group-header.positive {
            color: var(--yellow);
        }

        .signal-group-header.negative {
            color: var(--red);
        }

        .signal-item {
            font-size: 9pt;
            padding-left: 16px;
            margin-bottom: 4px;
        }

        .signal-item::before {
            content: "•";
            margin-right: 8px;
        }

        /* Level Up */
        .try-this-label {
            color: var(--yellow);
            font-weight: 700;
            margin-top: 12px;
            margin-bottom: 8px;
        }

        .try-this-box {
            background: var(--mid-gray);
            border-left: 4px solid var(--red);
            padding: 12px 16px;
            font-size: 9pt;
            color: var(--light-gray);
        }

        /* CTA Card */
        .cta-card {
            background: var(--red);
            padding: 24px;
            text-align: center;
            margin-top: 24px;
            page-break-inside: avoid;
        }

        .cta-header {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 18pt;
            color: var(--white);
            margin-bottom: 16px;
        }

        .cta-bullet {
            font-size: 10pt;
            color: var(--white);
            margin-bottom: 4px;
        }

        .cta-button {
            font-family: 'Anton', Impact, sans-serif;
            font-size: 16pt;
            color: var(--white);
            margin-top: 16px;
            letter-spacing: 2px;
        }

        /* Bottom Line */
        .bottom-line-body {
            background: var(--dark-gray);
            border: 1px solid var(--mid-gray);
            padding: 16px;
        }

        /* Utility */
        .spacer {
            height: 16px;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="sys-status">SYS_READY <span class="dot">●</span> ANALYSIS COMPLETE</div>
    <div class="main-title">CALL LAB LITE</div>
    <div class="subtitle">DIAGNOSTIC SNAPSHOT</div>
    <div class="call-meta">
        <span class="name">{{call_name}}</span> | {{duration}} | {{date}}
    </div>
</div>

<!-- SCORE CARD -->
<div class="score-card">
    <div class="score-number">{{score}}/{{score_max}}</div>
    <div class="score-label">CALL SCORE</div>
    <div class="effectiveness">{{effectiveness}}</div>
</div>

<!-- SNAP TAKE -->
<div class="dark-card">
    <div class="snap-header">⚡ SNAP TAKE</div>
    <div class="snap-body">{{snap_take}}</div>
</div>

<!-- PULL QUOTE -->
{{pull_quote_section}}

<!-- WHAT WORKED -->
<div class="section-header">✓ WHAT WORKED</div>
{{what_worked}}

<!-- WHAT TO WATCH -->
<div class="section-header">⚠ WHAT TO WATCH</div>
{{what_to_watch}}

<!-- WHY THIS CALL WORKED -->
<div class="section-header">💡 WHY THIS CALL WORKED</div>
<div class="pattern-body">{{why_worked}}</div>

<!-- SIGNALS -->
<div class="section-header">📡 CALL SIGNALS DETECTED</div>
<div class="signals-container">
    <div class="signal-group-header positive">✓ BUYING SIGNALS</div>
    {{positive_signals}}
    <div class="spacer"></div>
    <div class="signal-group-header negative">⚠ WARNING SIGNALS</div>
    {{negative_signals}}
</div>

<!-- ONE MOVE TO LEVEL UP -->
<div class="section-header">⚡ ONE MOVE TO LEVEL UP</div>
<div class="pattern-body">{{level_up_text}}</div>
<div class="try-this-label">TRY THIS:</div>
<div class="try-this-box">"{{level_up_example}}"</div>

<!-- BOTTOM LINE -->
<div class="section-header">🎯 BOTTOM LINE</div>
<div class="bottom-line-body">{{bottom_line}}</div>

<!-- CTA -->
<div class="cta-card">
    <div class="cta-header">CALL LAB LITE SHOWED YOU WHAT HAPPENED.<br>CALL LAB PRO SHOWS YOU THE SYSTEM.</div>
    <div class="cta-bullet">→ Pattern Library: The 47 trust-building moves you're using (or missing)</div>
    <div class="cta-bullet">→ Trust Acceleration Map: See exactly when buyers go from skeptical to sold</div>
    <div class="cta-bullet">→ Tactical Rewrites: Word-for-word fixes for every weak moment</div>
    <div class="cta-bullet">→ Timestamp Analysis: Every buying signal decoded with your exact response</div>
    <div class="cta-bullet">→ Framework Breakdowns: When to deploy each close, how to recognize the setup</div>
    <div class="cta-bullet">→ Comparative Scoring: How you stack up against 8 major sales methodologies</div>
    <div class="cta-button">[ UPGRADE TO CALL LAB PRO ]</div>
</div>

</body>
</html>
`;

const PATTERN_TEMPLATE = `
<div class="pattern-name">{{name}}</div>
<div class="pattern-body">{{description}}</div>
{{evidence}}
{{fix}}
`;

const EVIDENCE_TEMPLATE = '<div class="evidence">"{{quote}}"</div>';

const FIX_TEMPLATE = `
<div class="fix-box">
    <span class="fix-label">FIX:</span> {{fix_text}}
</div>
`;

const SIGNAL_TEMPLATE = '<div class="signal-item">{{signal}}</div>';

const CTA_BULLET_TEMPLATE = '<div class="cta-bullet">→ {{bullet}}</div>';

const PULL_QUOTE_TEMPLATE = '<div class="pull-quote">"{{quote}}"</div>';

interface PatternData {
  name: string;
  description: string;
  evidence?: string[];
  fix?: string;
}

interface ReportData {
  call_name: string;
  duration: string;
  date: string;
  score: string | number;
  score_max: string | number;
  effectiveness: string;
  snap_take: string;
  pull_quote?: string;
  what_worked: PatternData[];
  what_to_watch: PatternData[];
  why_worked: string;
  positive_signals: string[];
  negative_signals: string[];
  level_up_text: string;
  level_up_example: string;
  bottom_line: string;
  cta_bullets: string[];
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
 * Generate HTML report for Call Lab Lite
 */
export function generateCallLabLiteHTML(data: ReportData): string {
  let html = HTML_TEMPLATE;

  // Replace basic fields
  html = html.replace('{{call_name}}', escapeHtml(data.call_name));
  html = html.replace('{{duration}}', escapeHtml(data.duration));
  html = html.replace('{{date}}', escapeHtml(data.date));
  html = html.replace('{{score}}', escapeHtml(String(data.score)));
  html = html.replace('{{score_max}}', escapeHtml(String(data.score_max)));
  html = html.replace('{{effectiveness}}', escapeHtml(data.effectiveness));
  html = html.replace('{{snap_take}}', escapeHtml(data.snap_take));

  // Pull quote (optional)
  if (data.pull_quote) {
    const pullQuoteHtml = PULL_QUOTE_TEMPLATE.replace('{{quote}}', escapeHtml(data.pull_quote));
    html = html.replace('{{pull_quote_section}}', pullQuoteHtml);
  } else {
    html = html.replace('{{pull_quote_section}}', '');
  }

  // What Worked patterns
  let whatWorkedHtml = '';
  for (const pattern of data.what_worked) {
    let evidenceHtml = '';
    if (pattern.evidence) {
      for (const quote of pattern.evidence) {
        evidenceHtml += EVIDENCE_TEMPLATE.replace('{{quote}}', escapeHtml(quote));
      }
    }

    let patternHtml = PATTERN_TEMPLATE.replace('{{name}}', escapeHtml(pattern.name));
    patternHtml = patternHtml.replace('{{description}}', escapeHtml(pattern.description));
    patternHtml = patternHtml.replace('{{evidence}}', evidenceHtml);
    patternHtml = patternHtml.replace('{{fix}}', '');

    whatWorkedHtml += patternHtml;
  }
  html = html.replace('{{what_worked}}', whatWorkedHtml);

  // What to Watch patterns
  let whatToWatchHtml = '';
  for (const pattern of data.what_to_watch) {
    let evidenceHtml = '';
    if (pattern.evidence) {
      for (const quote of pattern.evidence) {
        evidenceHtml += EVIDENCE_TEMPLATE.replace('{{quote}}', escapeHtml(quote));
      }
    }

    let fixHtml = '';
    if (pattern.fix) {
      fixHtml = FIX_TEMPLATE.replace('{{fix_text}}', escapeHtml(pattern.fix));
    }

    let patternHtml = PATTERN_TEMPLATE.replace('{{name}}', escapeHtml(pattern.name));
    patternHtml = patternHtml.replace('{{description}}', escapeHtml(pattern.description));
    patternHtml = patternHtml.replace('{{evidence}}', evidenceHtml);
    patternHtml = patternHtml.replace('{{fix}}', fixHtml);

    whatToWatchHtml += patternHtml;
  }
  html = html.replace('{{what_to_watch}}', whatToWatchHtml);

  // Why worked
  html = html.replace('{{why_worked}}', data.why_worked); // Allow HTML in this field

  // Signals
  let positiveSignalsHtml = '';
  for (const signal of data.positive_signals) {
    positiveSignalsHtml += SIGNAL_TEMPLATE.replace('{{signal}}', escapeHtml(signal));
  }
  html = html.replace('{{positive_signals}}', positiveSignalsHtml);

  let negativeSignalsHtml = '';
  for (const signal of data.negative_signals) {
    negativeSignalsHtml += SIGNAL_TEMPLATE.replace('{{signal}}', escapeHtml(signal));
  }
  html = html.replace('{{negative_signals}}', negativeSignalsHtml);

  // Level Up
  html = html.replace('{{level_up_text}}', escapeHtml(data.level_up_text));
  html = html.replace('{{level_up_example}}', escapeHtml(data.level_up_example));

  // Bottom Line
  html = html.replace('{{bottom_line}}', escapeHtml(data.bottom_line));

  // CTA bullets
  let ctaBulletsHtml = '';
  for (const bullet of data.cta_bullets) {
    ctaBulletsHtml += CTA_BULLET_TEMPLATE.replace('{{bullet}}', escapeHtml(bullet));
  }
  html = html.replace('{{cta_bullets}}', ctaBulletsHtml);

  return html;
}

// Type exports
export type { ReportData, PatternData };
