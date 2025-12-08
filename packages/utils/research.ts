/**
 * Research utilities for Discovery Lab Pro
 * Integrates Perplexity (market + person research) and Apify (website + LinkedIn scraping)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MarketResearchResult {
  industry_trends: string;
  recent_news: string;
  market_dynamics: string;
  raw_response: string;
}

export interface CompanyResearchResult {
  company_overview: string;
  services_offerings: string;
  positioning: string;
  recent_updates: string;
  key_phrases: string[];
  raw_content: string;
}

export interface ContactResearchResult {
  linkedin_summary: string;
  role_context: string;
  tenure_experience: string;
  content_published: string; // podcasts, articles, posts
  talking_points: string[];
  raw_data: string;
}

export interface DiscoveryResearchResult {
  market: MarketResearchResult | null;
  company: CompanyResearchResult | null;
  contact: ContactResearchResult | null;
  errors: string[];
}

// ============================================================================
// PERPLEXITY API
// ============================================================================

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

async function queryPerplexity(
  systemPrompt: string,
  userQuery: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const { temperature = 0.2, maxTokens = 2048 } = options;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery },
  ];

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar-pro', // Best for research with citations
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Research market/industry trends using Perplexity
 */
export async function researchMarket(
  industry: string,
  targetCompany: string,
  serviceContext: string
): Promise<MarketResearchResult> {
  const systemPrompt = `You are a market research analyst. Provide concise, factual insights about industry trends and dynamics. Focus on actionable intelligence that would help a salesperson understand the market context. No fluff - just facts and insights.`;

  const userQuery = `Research the current state of the ${industry} industry, specifically as it relates to companies like ${targetCompany}.

Context: I'm selling ${serviceContext} to this market.

Provide:
1. KEY INDUSTRY TRENDS (last 90 days) - What's changing? What are companies focused on?
2. MARKET DYNAMICS - Who's winning? What's driving decisions? Any consolidation/M&A activity?
3. CHALLENGES & PRESSURES - What problems are companies in this space facing right now?
4. RELEVANT NEWS - Any recent announcements, funding, or shifts that matter?

Be specific and cite real examples where possible. Keep it concise and actionable.`;

  try {
    const response = await queryPerplexity(systemPrompt, userQuery, {
      maxTokens: 2048,
    });

    // Parse the response into structured sections
    return {
      industry_trends: extractSection(response, 'INDUSTRY TRENDS', 'MARKET DYNAMICS'),
      market_dynamics: extractSection(response, 'MARKET DYNAMICS', 'CHALLENGES'),
      recent_news: extractSection(response, 'NEWS', ''),
      raw_response: response,
    };
  } catch (error) {
    console.error('Market research error:', error);
    throw error;
  }
}

/**
 * Research a specific contact/person using Perplexity
 */
export async function researchContact(
  contactName: string,
  contactTitle: string,
  companyName: string,
  linkedinUrl?: string
): Promise<ContactResearchResult> {
  const systemPrompt = `You are researching a business professional to help prepare for a sales conversation. Find publicly available information about them - their background, content they've published, podcasts/interviews, LinkedIn activity, and any insights into their priorities or perspectives. Be factual and cite sources.`;

  const linkedinContext = linkedinUrl
    ? `Their LinkedIn profile is: ${linkedinUrl}`
    : '';

  const userQuery = `Research ${contactName}, ${contactTitle} at ${companyName}. ${linkedinContext}

Find:
1. PROFESSIONAL BACKGROUND - Career history, tenure at current company, previous roles
2. PUBLISHED CONTENT - Have they been on podcasts? Written articles? Given talks? What topics do they care about?
3. LINKEDIN ACTIVITY - Recent posts, comments, or shares that reveal their priorities
4. ROLE CONTEXT - What does someone in their position typically care about? What are they measured on?
5. TALKING POINTS - 2-3 specific things I could reference in conversation that would show I did my homework

Be specific. If you can't find something, say so - don't make things up.`;

  try {
    const response = await queryPerplexity(systemPrompt, userQuery, {
      maxTokens: 2048,
    });

    // Extract talking points as array
    const talkingPointsSection = extractSection(response, 'TALKING POINTS', '');
    const talkingPoints = talkingPointsSection
      .split(/\d+\.|[-•]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 10);

    return {
      linkedin_summary: extractSection(response, 'LINKEDIN', 'ROLE CONTEXT'),
      role_context: extractSection(response, 'ROLE CONTEXT', 'TALKING POINTS'),
      tenure_experience: extractSection(response, 'PROFESSIONAL BACKGROUND', 'PUBLISHED'),
      content_published: extractSection(response, 'PUBLISHED CONTENT', 'LINKEDIN'),
      talking_points: talkingPoints.slice(0, 3),
      raw_data: response,
    };
  } catch (error) {
    console.error('Contact research error:', error);
    throw error;
  }
}

// ============================================================================
// APIFY API
// ============================================================================

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyDatasetResponse {
  items: unknown[];
}

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  options: { timeoutSecs?: number; waitForFinish?: boolean } = {}
): Promise<unknown[]> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error('APIFY_API_KEY is not set');
  }

  const { timeoutSecs = 60, waitForFinish = true } = options;

  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...input,
        timeoutSecs,
      }),
    }
  );

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`Apify API error: ${runResponse.status} - ${errorText}`);
  }

  const runData: ApifyRunResponse = await runResponse.json();
  const runId = runData.data.id;

  if (!waitForFinish) {
    return [];
  }

  // Poll for completion
  let status = runData.data.status;
  let attempts = 0;
  const maxAttempts = timeoutSecs / 2;

  while (status === 'RUNNING' || status === 'READY') {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error('Apify actor timed out');
    }
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify actor failed with status: ${status}`);
  }

  // Get the dataset
  const datasetId = runData.data.defaultDatasetId;
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
  );
  const datasetData: ApifyDatasetResponse = await datasetResponse.json();

  return datasetData.items || [];
}

/**
 * Scrape a company website using Apify Website Content Crawler
 */
export async function scrapeCompanyWebsite(
  websiteUrl: string
): Promise<CompanyResearchResult> {
  // Use Apify's Website Content Crawler
  const actorId = 'apify~website-content-crawler';

  try {
    const results = await runApifyActor(
      actorId,
      {
        startUrls: [{ url: websiteUrl }],
        maxCrawlPages: 10, // Crawl homepage + key pages
        maxCrawlDepth: 2,
        includeUrlGlobs: [
          `${websiteUrl}/**`,
          `${websiteUrl.replace('www.', '')}/**`,
        ],
        excludeUrlGlobs: [
          '**/*.pdf',
          '**/*.zip',
          '**/blog/**', // Skip blog for speed
          '**/careers/**',
          '**/jobs/**',
        ],
      },
      { timeoutSecs: 120 }
    );

    // Combine and analyze the scraped content
    const allContent = results
      .map((r: any) => `## ${r.title || 'Page'}\n${r.text || ''}`)
      .join('\n\n');

    // Extract key phrases (simple extraction - could use AI for better results)
    const keyPhrases = extractKeyPhrases(allContent);

    // Use Perplexity to summarize the scraped content
    const summary = await summarizeCompanyContent(allContent, websiteUrl);

    return {
      company_overview: summary.overview,
      services_offerings: summary.services,
      positioning: summary.positioning,
      recent_updates: summary.updates,
      key_phrases: keyPhrases,
      raw_content: allContent.slice(0, 10000), // Limit for storage
    };
  } catch (error) {
    console.error('Website scraping error:', error);
    throw error;
  }
}

/**
 * Scrape LinkedIn profile using Apify
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<Partial<ContactResearchResult>> {
  // Use Apify's LinkedIn Profile Scraper
  const actorId = 'anchor~linkedin-profile-scraper';

  try {
    const results = await runApifyActor(
      actorId,
      {
        profileUrls: [linkedinUrl],
      },
      { timeoutSecs: 60 }
    );

    if (!results.length) {
      throw new Error('No LinkedIn data returned');
    }

    const profile: any = results[0];

    return {
      linkedin_summary: `${profile.firstName} ${profile.lastName} - ${profile.headline || profile.title}. ${profile.summary || ''}`,
      tenure_experience: formatExperience(profile.experience),
      role_context: profile.headline || profile.title,
      raw_data: JSON.stringify(profile, null, 2),
    };
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    // Fall back to Perplexity search if scraping fails
    throw error;
  }
}

// ============================================================================
// COMBINED RESEARCH FLOW
// ============================================================================

export interface ResearchInput {
  // Target company
  targetCompany: string;
  targetWebsite?: string;
  targetIndustry?: string;

  // Contact
  contactName?: string;
  contactTitle?: string;
  contactLinkedIn?: string;

  // Requestor context
  serviceOffered: string;

  // Options
  skipMarketResearch?: boolean;
  skipCompanyResearch?: boolean;
  skipContactResearch?: boolean;
}

/**
 * Run full research for Discovery Lab Pro
 * Runs market, company, and contact research in parallel where possible
 */
export async function runDiscoveryResearch(
  input: ResearchInput
): Promise<DiscoveryResearchResult> {
  const errors: string[] = [];
  const results: DiscoveryResearchResult = {
    market: null,
    company: null,
    contact: null,
    errors: [],
  };

  // Infer industry if not provided
  const industry = input.targetIndustry || `${input.targetCompany}'s industry`;

  // Run research in parallel
  const promises: Promise<void>[] = [];

  // Market research
  if (!input.skipMarketResearch) {
    promises.push(
      researchMarket(industry, input.targetCompany, input.serviceOffered)
        .then((r) => {
          results.market = r;
        })
        .catch((e) => {
          errors.push(`Market research failed: ${e.message}`);
        })
    );
  }

  // Company research (website scraping)
  if (!input.skipCompanyResearch && input.targetWebsite) {
    promises.push(
      scrapeCompanyWebsite(input.targetWebsite)
        .then((r) => {
          results.company = r;
        })
        .catch((e) => {
          errors.push(`Company research failed: ${e.message}`);
        })
    );
  }

  // Contact research
  if (!input.skipContactResearch && input.contactName) {
    // Try LinkedIn scraping first if URL provided
    if (input.contactLinkedIn) {
      promises.push(
        scrapeLinkedInProfile(input.contactLinkedIn)
          .then(async (linkedinData) => {
            // Supplement with Perplexity search for podcasts/content
            const perplexityData = await researchContact(
              input.contactName!,
              input.contactTitle || '',
              input.targetCompany,
              input.contactLinkedIn
            );
            results.contact = {
              ...perplexityData,
              ...linkedinData,
              raw_data: `LinkedIn:\n${linkedinData.raw_data}\n\nPerplexity:\n${perplexityData.raw_data}`,
            };
          })
          .catch(async (e) => {
            // Fall back to Perplexity only
            console.warn('LinkedIn scraping failed, falling back to Perplexity:', e.message);
            try {
              results.contact = await researchContact(
                input.contactName!,
                input.contactTitle || '',
                input.targetCompany,
                input.contactLinkedIn
              );
            } catch (e2: any) {
              errors.push(`Contact research failed: ${e2.message}`);
            }
          })
      );
    } else {
      // Perplexity only
      promises.push(
        researchContact(
          input.contactName,
          input.contactTitle || '',
          input.targetCompany
        )
          .then((r) => {
            results.contact = r;
          })
          .catch((e) => {
            errors.push(`Contact research failed: ${e.message}`);
          })
      );
    }
  }

  // Wait for all research to complete
  await Promise.all(promises);

  results.errors = errors;
  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractSection(text: string, startMarker: string, endMarker: string): string {
  const startRegex = new RegExp(`${startMarker}[:\\s]*`, 'i');
  const startMatch = text.match(startRegex);

  if (!startMatch) {
    return '';
  }

  const startIndex = startMatch.index! + startMatch[0].length;
  let endIndex = text.length;

  if (endMarker) {
    const endRegex = new RegExp(`\\n[#\\d]*\\s*${endMarker}`, 'i');
    const endMatch = text.slice(startIndex).match(endRegex);
    if (endMatch) {
      endIndex = startIndex + endMatch.index!;
    }
  }

  return text.slice(startIndex, endIndex).trim();
}

function extractKeyPhrases(text: string): string[] {
  // Simple extraction of quoted phrases and capitalized terms
  const phrases: string[] = [];

  // Extract quoted phrases
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    phrases.push(...quoted.map((q) => q.replace(/"/g, '')));
  }

  // Extract phrases that look like product/service names (Title Case phrases)
  const titleCase = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
  if (titleCase) {
    phrases.push(...titleCase.filter((p) => p.length > 5 && p.length < 50));
  }

  // Dedupe and limit
  return [...new Set(phrases)].slice(0, 10);
}

async function summarizeCompanyContent(
  content: string,
  websiteUrl: string
): Promise<{
  overview: string;
  services: string;
  positioning: string;
  updates: string;
}> {
  const systemPrompt = `You are analyzing a company's website content to prepare a sales professional for a discovery call. Extract and summarize the key information concisely.`;

  const userQuery = `Analyze this website content from ${websiteUrl}:

${content.slice(0, 8000)}

Provide a concise summary of:
1. COMPANY OVERVIEW - What do they do? Who are their customers?
2. SERVICES/OFFERINGS - What specific products or services do they offer?
3. POSITIONING - How do they differentiate themselves? What's their value proposition?
4. RECENT UPDATES - Any new launches, announcements, or changes mentioned?

Extract verbatim phrases they use to describe themselves where possible. Be specific.`;

  try {
    const response = await queryPerplexity(systemPrompt, userQuery, {
      maxTokens: 1500,
    });

    return {
      overview: extractSection(response, 'COMPANY OVERVIEW', 'SERVICES'),
      services: extractSection(response, 'SERVICES', 'POSITIONING'),
      positioning: extractSection(response, 'POSITIONING', 'RECENT'),
      updates: extractSection(response, 'RECENT UPDATES', ''),
    };
  } catch (error) {
    return {
      overview: '',
      services: '',
      positioning: '',
      updates: '',
    };
  }
}

function formatExperience(experience: any[]): string {
  if (!experience || !Array.isArray(experience)) {
    return '';
  }

  return experience
    .slice(0, 3)
    .map((exp) => {
      const duration = exp.duration || '';
      return `${exp.title} at ${exp.company} ${duration ? `(${duration})` : ''}`;
    })
    .join('. ');
}
