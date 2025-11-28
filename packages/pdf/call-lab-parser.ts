/**
 * Call Lab Lite Markdown Parser
 * Extracts structured data from Call Lab Lite markdown reports
 */

import type { ReportData, PatternData } from './call-lab-html-report';

/**
 * Parse Call Lab Lite markdown into structured data
 */
export function parseCallLabLiteMarkdown(markdown: string): ReportData {
  const data: ReportData = {
    call_name: '',
    duration: '',
    date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    score: '0',
    score_max: '10',
    effectiveness: '',
    snap_take: '',
    pull_quote: '',
    what_worked: [],
    what_to_watch: [],
    why_worked: '',
    positive_signals: [],
    negative_signals: [],
    level_up_text: '',
    level_up_example: '',
    bottom_line: '',
    cta_bullets: [
      'The exact moment the buyer decided (and how to recognize it)',
      'Pattern library with reusable sales frameworks',
      'Trust curve analysis and emotional arc mapping',
      'Complete close map with tactical rewrites',
      'Advanced ambiguity detection and buyer psychology',
    ],
  };

  // Extract header info (call name, score, effectiveness)
  const headerMatch = markdown.match(/##\s*CALL LAB LITE.*?DIAGNOSTIC SNAPSHOT\s*(.*?)(?=##)/is);
  if (headerMatch) {
    const headerText = headerMatch[1];

    // Extract call info
    const callMatch = headerText.match(/\*\*Call:\*\*\s*(.+?)(?:\n|\*\*)/);
    if (callMatch) {
      data.call_name = callMatch[1].trim();
    }

    // Extract duration
    const durationMatch = headerText.match(/\*\*Duration:\*\*\s*(.+?)(?:\n|\*\*)/);
    if (durationMatch) {
      data.duration = durationMatch[1].trim();
    }

    // Extract score
    const scoreMatch = headerText.match(/\*\*Score:\*\*\s*(\d+\.?\d*)\s*\/\s*(\d+)/);
    if (scoreMatch) {
      data.score = scoreMatch[1];
      data.score_max = scoreMatch[2];
    }

    // Extract effectiveness
    const effectivenessMatch = headerText.match(/\*\*Effectiveness:\*\*\s*(.+?)(?:\n|$)/);
    if (effectivenessMatch) {
      data.effectiveness = effectivenessMatch[1].trim();
    }
  }

  // Extract Snap Take
  const snapTakeMatch = markdown.match(/\*\*SNAP TAKE\*\*\s*\n\n([\s\S]+?)(?=\n\n##|$)/i);
  if (snapTakeMatch) {
    data.snap_take = snapTakeMatch[1].trim();
  }

  // Extract Pull Quote (often appears after snap take or in notable quotes section)
  const pullQuoteMatch = markdown.match(/[""]([^""]+)[""](?:\s*--|\s*-\s*|\s*$)/);
  if (pullQuoteMatch) {
    data.pull_quote = pullQuoteMatch[1].trim();
  }

  // Extract What Worked section
  const whatWorkedMatch = markdown.match(/##\s*WHAT WORKED\s*([\s\S]+?)(?=##\s*WHAT TO WATCH|##\s*WHY THIS CALL|$)/i);
  if (whatWorkedMatch) {
    data.what_worked = extractPatterns(whatWorkedMatch[1]);
  }

  // Extract What to Watch section
  const whatToWatchMatch = markdown.match(/##\s*WHAT TO WATCH\s*([\s\S]+?)(?=##\s*WHY THIS CALL|##\s*ONE MOVE|##\s*CALL SIGNALS|$)/i);
  if (whatToWatchMatch) {
    data.what_to_watch = extractPatterns(whatToWatchMatch[1], true);
  }

  // Extract Why This Call Worked
  const whyWorkedMatch = markdown.match(/##\s*WHY THIS CALL WORKED\s*([\s\S]+?)(?=##\s*ONE MOVE|##\s*CALL SIGNALS|$)/i);
  if (whyWorkedMatch) {
    data.why_worked = whyWorkedMatch[1].trim();
  }

  // Extract Call Signals
  const signalsMatch = markdown.match(/##\s*CALL SIGNALS DETECTED\s*([\s\S]+?)(?=##\s*ONE MOVE|##\s*UNLOCK|##\s*BOTTOM LINE|$)/i);
  if (signalsMatch) {
    const signalsText = signalsMatch[1];

    // Split into positive and negative
    const positiveMatch = signalsText.match(/BUYING SIGNALS.*?\n([\s\S]+?)(?=WARNING SIGNALS|$)/i);
    if (positiveMatch) {
      data.positive_signals = extractBulletList(positiveMatch[1]);
    }

    const negativeMatch = signalsText.match(/WARNING SIGNALS.*?\n([\s\S]+?)$/i);
    if (negativeMatch) {
      data.negative_signals = extractBulletList(negativeMatch[1]);
    }
  }

  // Extract One Move to Level Up
  const levelUpMatch = markdown.match(/##\s*ONE MOVE TO LEVEL UP\s*([\s\S]+?)(?=##\s*UNLOCK|##\s*BOTTOM LINE|$)/i);
  if (levelUpMatch) {
    const levelUpText = levelUpMatch[1];

    // Extract main text (before "Try this:")
    const textMatch = levelUpText.match(/^(.+?)(?=Try this:|$)/is);
    if (textMatch) {
      data.level_up_text = textMatch[1].trim();
    }

    // Extract example (after "Try this:")
    const exampleMatch = levelUpText.match(/Try this:\s*[""]?([^""]+?)[""]?(?:\n\n|$)/is);
    if (exampleMatch) {
      data.level_up_example = exampleMatch[1].trim();
    }
  }

  // Extract Bottom Line
  const bottomLineMatch = markdown.match(/##\s*BOTTOM LINE\s*([\s\S]+?)(?=##\s*UNLOCK|$)/i);
  if (bottomLineMatch) {
    data.bottom_line = bottomLineMatch[1].trim();
  }

  return data;
}

/**
 * Extract pattern sections from markdown text
 */
function extractPatterns(text: string, includeFixes: boolean = false): PatternData[] {
  const patterns: PatternData[] = [];

  // Match pattern headers (bold text) followed by content
  // Look for ### or **Pattern Name** style headers
  const patternRegex = /(?:###|^\*\*)\s*([A-Z][^\n*]+?)(?:\*\*|\n)([\s\S]+?)(?=(?:###|^\*\*)|$)/gm;

  let match;
  while ((match = patternRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const content = match[2].trim();

    // Extract description (everything before first quote or fix)
    const descMatch = content.match(/^(.+?)(?=[""]|FIX:|$)/s);
    const description = descMatch ? descMatch[1].trim() : content;

    // Extract evidence quotes
    const quoteRegex = /[""]([^""]+?)[""]/g;
    const evidence: string[] = [];
    let quoteMatch;
    while ((quoteMatch = quoteRegex.exec(content)) !== null) {
      evidence.push(quoteMatch[1].trim());
    }

    // Extract fix if present
    let fix: string | undefined;
    if (includeFixes) {
      const fixMatch = content.match(/FIX:\s*(.+?)(?=\n\n|$)/s);
      if (fixMatch) {
        fix = fixMatch[1].trim();
      }
    }

    patterns.push({
      name,
      description,
      evidence: evidence.length > 0 ? evidence : undefined,
      fix,
    });
  }

  return patterns;
}

/**
 * Extract bullet list items from markdown text
 */
function extractBulletList(text: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with - or • or *
    if (trimmed.match(/^[-•*]\s+/)) {
      const item = trimmed.replace(/^[-•*]\s+/, '').trim();
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}
