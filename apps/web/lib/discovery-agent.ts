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

  // Generate condensed summary for Copper fields using AI
  const summary = await generateCopperSummary(markdownResponse, companyName, contactName);

  return {
    summary,
    fullMarkdown: markdownResponse,
    modelUsed,
    durationMs: Date.now() - startTime,
    tokens,
  };
}

/**
 * Use a fast AI model to generate a clean, plain-text summary for Copper CRM fields.
 * No markdown, no formatting — just scannable text that reads well in a CRM sidebar.
 */
async function generateCopperSummary(
  fullReport: string,
  companyName: string,
  contactName: string | null,
): Promise<DiscoverySummary> {
  const summaryPrompt = `You are summarizing a sales research report for a CRM record. Write in plain text — NO markdown, NO headers, NO bullets with *, NO bold. Use line breaks and dashes for structure.

From the research report below, produce exactly 3 sections:

DISCOVERY BRIEF:
A 3-4 sentence synopsis of the company — what they do, their size/stage, and the most important strategic context for a sales conversation. Keep it under 400 characters.

KEY CONTACTS:
The primary contact's name, title, and 1-2 sentences about their likely priorities and decision-making role. If other stakeholders are mentioned, list them briefly. Keep it under 400 characters.

CONVERSATION STARTERS:
3-4 specific, personalized talking points or questions that show you did your homework. Each on its own line, prefixed with a dash. Keep it under 500 characters.

Format your response exactly as:
DISCOVERY BRIEF:
[text]

KEY CONTACTS:
[text]

CONVERSATION STARTERS:
[text]

---
RESEARCH REPORT:
${fullReport.substring(0, 6000)}`;

  try {
    const response = await runModel('discovery-agent-summary', summaryPrompt, '', {
      provider: 'openai',
      model: 'gpt-4o-mini',
    });

    const text = response.content;

    // Parse the 3 sections
    const briefMatch = text.match(/DISCOVERY BRIEF:\s*([\s\S]*?)(?=KEY CONTACTS:|$)/i);
    const contactsMatch = text.match(/KEY CONTACTS:\s*([\s\S]*?)(?=CONVERSATION STARTERS:|$)/i);
    const startersMatch = text.match(/CONVERSATION STARTERS:\s*([\s\S]*?)$/i);

    return {
      brief: briefMatch?.[1]?.trim() || `Research complete for ${companyName}. See full report.`,
      keyContacts: contactsMatch?.[1]?.trim() || (contactName ? `Primary contact: ${contactName}` : 'See full report for contact analysis.'),
      conversationStarters: startersMatch?.[1]?.trim() || 'See full report for talking points.',
    };
  } catch (err) {
    console.error('[DiscoveryAgent] Summary generation failed, using fallback:', err);
    return {
      brief: `Research complete for ${companyName}. See full report for details.`,
      keyContacts: contactName ? `Primary contact: ${contactName}` : 'See full report for contact analysis.',
      conversationStarters: 'See full report for personalized talking points.',
    };
  }
}
