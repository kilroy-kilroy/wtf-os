/**
 * Discovery Agent Orchestrator
 *
 * Takes Copper opportunity data, runs Discovery Lab analysis,
 * returns both a condensed summary (for CRM fields) and full report (for DB).
 */

import {
  runModel,
  retryWithBackoff,
  fetchCompanyNews,
} from '@repo/utils';
import {
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';
import type { CopperCompany, CopperPerson, CopperOpportunity, DiscoverySummary } from './copper-discovery';

export interface DiscoveryAgentInput {
  opportunity: CopperOpportunity;
  company: CopperCompany | null;
  contact: CopperPerson | null;
}

export interface DiscoveryAgentResult {
  summary: DiscoverySummary;
  fullMarkdown: string;
  modelUsed: string;
  durationMs: number;
  tokens: { input: number; output: number };
}

/**
 * Run Discovery Lab analysis for a Copper opportunity.
 */
export async function runDiscoveryAgent(input: DiscoveryAgentInput): Promise<DiscoveryAgentResult> {
  const startTime = Date.now();
  const { opportunity, company, contact } = input;

  const companyName = company?.name || opportunity.name;
  const companyWebsite = company?.websites?.[0]?.url || null;
  const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null;
  const contactTitle = contact?.title || null;
  const contactEmail = contact?.emails?.[0]?.email || null;

  // Fetch company news (non-blocking if it fails)
  let newsData: { recent_news: any[]; funding_info: any; raw_response: string } = {
    recent_news: [],
    funding_info: null,
    raw_response: '',
  };
  if (companyWebsite || companyName) {
    try {
      let domain: string | undefined;
      if (companyWebsite) {
        try {
          const url = new URL(companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`);
          domain = url.hostname.replace('www.', '');
        } catch {
          domain = companyWebsite.replace('www.', '').split('/')[0];
        }
      }
      newsData = await fetchCompanyNews(companyName, domain);
    } catch (err) {
      console.warn('[DiscoveryAgent] News fetch failed:', err);
    }
  }

  // Build Discovery Lab prompt
  const promptParams: DiscoveryLabPromptParams = {
    requestor_name: 'Tim Kilroy',
    requestor_email: process.env.COPPER_API_EMAIL || '',
    requestor_company: 'TimKilroy.com',
    service_offered: 'Sales coaching and consulting',
    target_company: companyName,
    target_website: companyWebsite || undefined,
    target_contact_name: contactName || undefined,
    target_contact_title: contactTitle || undefined,
    recent_news: newsData.recent_news.length > 0 ? newsData.recent_news : undefined,
    funding_info: newsData.funding_info || undefined,
  };

  const systemPrompt = DISCOVERY_LAB_PRO_SYSTEM;
  const userPrompt = DISCOVERY_LAB_PRO_USER(promptParams);

  // Run AI analysis
  let modelUsed = 'claude-sonnet-4-5-20250929';
  let tokens: { input: number; output: number };
  let markdownResponse: string;

  try {
    const response = await retryWithBackoff(async () => {
      return await runModel('discovery-agent', systemPrompt, userPrompt);
    });
    tokens = response.usage;
    markdownResponse = response.content;
  } catch (err) {
    console.error('[DiscoveryAgent] Claude failed, trying GPT-4o:', err);
    try {
      const response = await retryWithBackoff(async () => {
        return await runModel('discovery-agent', systemPrompt, userPrompt, {
          provider: 'openai',
          model: 'gpt-4o',
        });
      });
      tokens = response.usage;
      modelUsed = 'gpt-4o';
      markdownResponse = response.content;
    } catch (fallbackErr) {
      throw new Error(`AI analysis failed: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown'}`);
    }
  }

  // Generate condensed summary for Copper fields
  const summary = extractSummary(markdownResponse, companyName, contactName);

  return {
    summary,
    fullMarkdown: markdownResponse,
    modelUsed,
    durationMs: Date.now() - startTime,
    tokens,
  };
}

/**
 * Extract a condensed 3-section summary from the full markdown report.
 * Each section is max ~500 chars for Copper text fields.
 */
function extractSummary(
  markdown: string,
  companyName: string,
  contactName: string | null,
): DiscoverySummary {
  // Try to extract sections from markdown headers
  const sections = markdown.split(/^#{1,3}\s+/m);

  let brief = '';
  let keyContacts = '';
  let conversationStarters = '';

  for (const section of sections) {
    const lower = section.toLowerCase();
    const content = section.replace(/^[^\n]+\n/, '').trim();
    const truncated = content.substring(0, 500);

    if (lower.startsWith('company') || lower.startsWith('overview') || lower.startsWith('executive') || lower.startsWith('about')) {
      if (!brief) brief = truncated;
    } else if (lower.startsWith('contact') || lower.startsWith('key people') || lower.startsWith('stakeholder') || lower.startsWith('decision')) {
      if (!keyContacts) keyContacts = truncated;
    } else if (lower.startsWith('conversation') || lower.startsWith('talking') || lower.startsWith('opener') || lower.startsWith('approach')) {
      if (!conversationStarters) conversationStarters = truncated;
    }
  }

  // Fallback: if we couldn't parse sections, use first 500 chars as brief
  if (!brief) {
    brief = markdown.substring(0, 500);
  }
  if (!keyContacts && contactName) {
    keyContacts = `Primary contact: ${contactName}. See full report for detailed analysis.`;
  }
  if (!conversationStarters) {
    conversationStarters = `Research complete for ${companyName}. See full report for talking points.`;
  }

  return { brief, keyContacts, conversationStarters };
}
