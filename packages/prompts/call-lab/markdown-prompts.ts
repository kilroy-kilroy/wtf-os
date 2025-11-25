import { readFileSync } from 'fs';
import { join } from 'path';

// Read the markdown prompt files
const CALLLAB_LITE_PROMPT = readFileSync(
  join(process.cwd(), 'apps/web/prompts/calllab-lite.txt'),
  'utf-8'
);

const CALLLAB_PRO_PROMPT = readFileSync(
  join(process.cwd(), 'apps/web/prompts/calllab-pro.txt'),
  'utf-8'
);

export interface MarkdownPromptParams {
  transcript: string;
  rep_name?: string;
  prospect_company?: string;
  prospect_role?: string;
  call_stage?: string;
}

export const CALLLAB_LITE_MARKDOWN_SYSTEM = CALLLAB_LITE_PROMPT;

export const CALLLAB_LITE_MARKDOWN_USER = (params: MarkdownPromptParams) => `
Analyze this sales call transcript.

${params.rep_name ? `Rep Name: ${params.rep_name}` : ''}
${params.prospect_company ? `Prospect Company: ${params.prospect_company}` : ''}
${params.prospect_role ? `Prospect Role: ${params.prospect_role}` : ''}
${params.call_stage ? `Call Stage: ${params.call_stage}` : ''}

TRANSCRIPT:
${params.transcript}
`;

export const CALLLAB_PRO_MARKDOWN_SYSTEM = CALLLAB_PRO_PROMPT;

export const CALLLAB_PRO_MARKDOWN_USER = (params: MarkdownPromptParams) => `
Analyze this sales call transcript in detail.

${params.rep_name ? `Rep Name: ${params.rep_name}` : ''}
${params.prospect_company ? `Prospect Company: ${params.prospect_company}` : ''}
${params.prospect_role ? `Prospect Role: ${params.prospect_role}` : ''}
${params.call_stage ? `Call Stage: ${params.call_stage}` : ''}

TRANSCRIPT:
${params.transcript}
`;

// Type for markdown response metadata
export interface MarkdownResponseMetadata {
  score: number;
  effectiveness: 'High' | 'Medium' | 'Low';
  call_info?: {
    buyer?: string;
    duration?: string;
  };
}

/**
 * Parse markdown response to extract key metadata
 * This is a simple parser that looks for score and effectiveness
 */
export function parseMarkdownMetadata(markdown: string): MarkdownResponseMetadata {
  const metadata: MarkdownResponseMetadata = {
    score: 0,
    effectiveness: 'Medium',
  };

  // Extract score: look for "SCORE: X.X/10" or "**SCORE: X.X/10**"
  const scoreMatch = markdown.match(/SCORE:\s*\*?\*?(\d+\.?\d*)\s*\/\s*10/i);
  if (scoreMatch) {
    metadata.score = parseFloat(scoreMatch[1]);
  }

  // Extract effectiveness: look for "Effectiveness: High / Medium / Low"
  const effectivenessMatch = markdown.match(/Effectiveness:\s*\*?\*?(\w+)/i);
  if (effectivenessMatch) {
    const eff = effectivenessMatch[1];
    if (eff === 'High' || eff === 'Medium' || eff === 'Low') {
      metadata.effectiveness = eff as 'High' | 'Medium' | 'Low';
    }
  }

  // Extract call info
  const buyerMatch = markdown.match(/\*\*Call:\*\*\s*(.+?)(?:\n|\*\*)/);
  if (buyerMatch) {
    metadata.call_info = metadata.call_info || {};
    metadata.call_info.buyer = buyerMatch[1].trim();
  }

  const durationMatch = markdown.match(/\*\*Duration:\*\*\s*(.+?)(?:\n|\*\*)/);
  if (durationMatch) {
    metadata.call_info = metadata.call_info || {};
    metadata.call_info.duration = durationMatch[1].trim();
  }

  return metadata;
}
