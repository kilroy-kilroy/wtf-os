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
// APOLLO API - Company & Contact Enrichment
// ============================================================================

export interface ApolloCompanyData {
  name: string;
  domain: string;
  industry: string;
  employee_count: string;
  estimated_num_employees: number;
  founded_year: number;
  linkedin_url: string;
  description: string;
  short_description: string;
  annual_revenue: string;
  total_funding: string;
  latest_funding_round_type: string;
  latest_funding_round_amount: number;
  latest_funding_round_date: string;
  headquarters: {
    city: string;
    state: string;
    country: string;
  };
  technologies: string[];
  keywords: string[];
  raw_data: Record<string, unknown>;
}

export interface ApolloContactData {
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  headline: string;
  employment_history: Array<{
    title: string;
    organization_name: string;
    start_date: string;
    end_date: string | null;
    current: boolean;
  }>;
  seniority: string;
  departments: string[];
  raw_data: Record<string, unknown>;
}

/**
 * Enrich company data using Apollo API
 */
export async function enrichCompanyWithApollo(
  domain: string
): Promise<ApolloCompanyData | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn('APOLLO_API_KEY not set, skipping Apollo enrichment');
    return null;
  }

  try {
    const response = await fetch('https://api.apollo.io/api/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const org = data.organization;

    if (!org) {
      return null;
    }

    return {
      name: org.name || '',
      domain: org.primary_domain || domain,
      industry: org.industry || '',
      employee_count: org.estimated_num_employees
        ? formatEmployeeCount(org.estimated_num_employees)
        : '',
      estimated_num_employees: org.estimated_num_employees || 0,
      founded_year: org.founded_year || 0,
      linkedin_url: org.linkedin_url || '',
      description: org.description || '',
      short_description: org.short_description || '',
      annual_revenue: org.annual_revenue_printed || '',
      total_funding: org.total_funding_printed || '',
      latest_funding_round_type: org.latest_funding_round_type || '',
      latest_funding_round_amount: org.latest_funding_round_amount || 0,
      latest_funding_round_date: org.latest_funding_round_date || '',
      headquarters: {
        city: org.city || '',
        state: org.state || '',
        country: org.country || '',
      },
      technologies: org.technologies || [],
      keywords: org.keywords || [],
      raw_data: org,
    };
  } catch (error) {
    console.error('Apollo company enrichment error:', error);
    return null;
  }
}

/**
 * Search and enrich contact using Apollo API
 */
export async function enrichContactWithApollo(
  contactName: string,
  companyDomain: string
): Promise<ApolloContactData | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn('APOLLO_API_KEY not set, skipping Apollo contact enrichment');
    return null;
  }

  try {
    // Split name into first/last
    const nameParts = contactName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const searchResponse = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_domain: companyDomain,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Apollo people match error: ${searchResponse.status} - ${errorText}`);
      return null;
    }

    const searchData = await searchResponse.json();
    const person = searchData.person;

    if (!person) {
      return null;
    }

    return formatApolloContact(person);
  } catch (error) {
    console.error('Apollo contact enrichment error:', error);
    return null;
  }
}

function formatApolloContact(person: any): ApolloContactData {
  return {
    first_name: person.first_name || '',
    last_name: person.last_name || '',
    name: person.name || `${person.first_name} ${person.last_name}`,
    title: person.title || '',
    email: person.email || '',
    linkedin_url: person.linkedin_url || '',
    headline: person.headline || person.title || '',
    employment_history: (person.employment_history || []).map((job: any) => ({
      title: job.title || '',
      organization_name: job.organization_name || '',
      start_date: job.start_date || '',
      end_date: job.end_date || null,
      current: job.current || false,
    })),
    seniority: person.seniority || '',
    departments: person.departments || [],
    raw_data: person,
  };
}

function formatEmployeeCount(count: number): string {
  if (count < 10) return '1-10 employees';
  if (count < 50) return '10-50 employees';
  if (count < 200) return '50-200 employees';
  if (count < 500) return '200-500 employees';
  if (count < 1000) return '500-1000 employees';
  if (count < 5000) return '1000-5000 employees';
  return '5000+ employees';
}

/**
 * Fetch job posting signals using Perplexity (real-time search)
 * Returns open roles that signal priorities, gaps, or budget allocation
 */
export async function fetchJobPostings(
  companyName: string,
  serviceContext: string,
  domain?: string
): Promise<{
  job_postings: Array<{ title: string; department: string; signal: string }>;
  raw_response: string;
}> {
  const systemPrompt = `You are a business intelligence researcher. Analyze job postings to extract strategic signals about company priorities and gaps. Be specific and factual.`;

  const userQuery = `Find current job postings and recent hiring activity for ${companyName}${domain ? ` (${domain})` : ''}.

Focus on roles related to: ${serviceContext}

I need:
1. OPEN ROLES - Up to 5 most relevant open positions (title, department, what it signals about their priorities)
2. HIRING PATTERN - Are they building a new team, replacing departures, or scaling existing capabilities?
3. GAPS - Based on what they're hiring for, what capabilities are they missing right now?

Format each role as:
- Title | Department | Signal (what this tells us about their priorities or gaps)

If no relevant job postings found, explicitly say "No relevant job postings found for ${companyName}".`;

  try {
    const response = await queryPerplexity(systemPrompt, userQuery, {
      maxTokens: 1000,
    });

    // Parse job postings from response
    const postings: Array<{ title: string; department: string; signal: string }> = [];
    const lines = response.split('\n');
    for (const line of lines) {
      const match = line.match(/^[-•*]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
      if (match) {
        postings.push({
          title: match[1].trim(),
          department: match[2].trim(),
          signal: match[3].trim(),
        });
      }
    }

    return {
      job_postings: postings.slice(0, 5),
      raw_response: response,
    };
  } catch (error) {
    console.error('Job postings fetch error:', error);
    return {
      job_postings: [],
      raw_response: '',
    };
  }
}

/**
 * Fetch recent news and funding using Perplexity (real-time search)
 */
export async function fetchCompanyNews(
  companyName: string,
  domain?: string
): Promise<{
  recent_news: Array<{ title: string; date: string; summary: string }>;
  funding_info: { round: string; amount: string; date: string; investors: string } | null;
  raw_response: string;
}> {
  const systemPrompt = `You are a business news researcher. Provide factual, recent news about companies. Always include dates and be specific. If you can't find recent news, say so.`;

  const userQuery = `Find the most recent news about ${companyName}${domain ? ` (${domain})` : ''} from the last 6 months.

I need:
1. RECENT NEWS - Up to 3 most significant recent news items (product launches, partnerships, leadership changes, awards)
2. FUNDING - Any funding rounds in the last 12 months (round type, amount, date, lead investors)

Format each news item as:
- Title | Date | One-sentence summary

For funding, format as:
- Round Type | Amount | Date | Lead Investors

If no recent news or funding found, explicitly say "No recent news found" or "No recent funding found".`;

  try {
    const response = await queryPerplexity(systemPrompt, userQuery, {
      maxTokens: 1500,
    });

    // Parse news items
    const newsSection = extractSection(response, 'RECENT NEWS', 'FUNDING');
    const newsItems = parseNewsItems(newsSection);

    // Parse funding
    const fundingSection = extractSection(response, 'FUNDING', '');
    const fundingInfo = parseFundingInfo(fundingSection);

    return {
      recent_news: newsItems,
      funding_info: fundingInfo,
      raw_response: response,
    };
  } catch (error) {
    console.error('Company news fetch error:', error);
    return {
      recent_news: [],
      funding_info: null,
      raw_response: '',
    };
  }
}

function parseNewsItems(text: string): Array<{ title: string; date: string; summary: string }> {
  const items: Array<{ title: string; date: string; summary: string }> = [];
  const lines = text.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));

  for (const line of lines) {
    const parts = line.replace(/^[-\d.]\s*/, '').split('|').map(p => p.trim());
    if (parts.length >= 2) {
      items.push({
        title: parts[0] || '',
        date: parts[1] || '',
        summary: parts[2] || parts[0] || '',
      });
    }
  }

  return items.slice(0, 3);
}

function parseFundingInfo(text: string): { round: string; amount: string; date: string; investors: string } | null {
  if (text.toLowerCase().includes('no recent funding') || text.toLowerCase().includes('not found') || !text.trim()) {
    return null;
  }

  const lines = text.split('\n').filter(line => line.trim().startsWith('-') || line.includes('|'));
  for (const line of lines) {
    const parts = line.replace(/^[-\d.]\s*/, '').split('|').map(p => p.trim());
    if (parts.length >= 2) {
      return {
        round: parts[0] || '',
        amount: parts[1] || '',
        date: parts[2] || '',
        investors: parts[3] || '',
      };
    }
  }

  return null;
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

// ============================================================================
// V2 RESEARCH CHAIN - BrightData + Website Tech Detection
// ============================================================================

const BRIGHT_DATA_API = process.env.BRIGHT_DATA_API;
const BRIGHT_DATA_BASE = 'https://api.brightdata.com/datasets/v3';

const BD_DISCOVERY_DATASETS = {
  linkedinProfile: 'gd_l1viktl72bvl7bjuj0',
  linkedinPosts: 'gd_lyy3tktm25m4avu764',
  googleSerp: 'gd_l1vijqt9jfj7olije8',
};

/**
 * Compose an AbortSignal from a timeout + optional parent signal.
 * Works on Node 18+ (unlike AbortSignal.any which requires Node 20.3+).
 */
function composedSignal(timeoutMs: number, parentSignal?: AbortSignal): AbortSignal {
  if (!parentSignal) return AbortSignal.timeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (parentSignal.aborted) {
    controller.abort();
    clearTimeout(timer);
    return controller.signal;
  }

  parentSignal.addEventListener('abort', () => {
    controller.abort();
    clearTimeout(timer);
  }, { once: true });

  return controller.signal;
}

async function bdDiscoveryTrigger(datasetId: string, input: any[]): Promise<string | null> {
  if (!BRIGHT_DATA_API) return null;

  try {
    const response = await fetch(`${BRIGHT_DATA_BASE}/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Retry with wrapped format
      const response2 = await fetch(`${BRIGHT_DATA_BASE}/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response2.ok) return null;
      const data2 = await response2.json();
      return data2.snapshot_id || null;
    }

    const data = await response.json();
    return data.snapshot_id || null;
  } catch (error: any) {
    console.error(`[BrightData:Discovery] Trigger error for ${datasetId}:`, error.message);
    return null;
  }
}

async function bdDiscoveryPoll(snapshotId: string, maxWaitMs: number = 60000, abortSignal?: AbortSignal): Promise<any[]> {
  if (!BRIGHT_DATA_API || !snapshotId) return [];

  const startTime = Date.now();
  const pollInterval = 10000;

  while (Date.now() - startTime < maxWaitMs) {
    if (abortSignal?.aborted) {
      console.warn(`[BrightData:Discovery] Snapshot ${snapshotId} aborted by chain timeout`);
      return [];
    }

    try {
      const response = await fetch(`${BRIGHT_DATA_BASE}/snapshot/${snapshotId}?format=json`, {
        headers: { 'Authorization': `Bearer ${BRIGHT_DATA_API}` },
        signal: composedSignal(15000, abortSignal),
      });

      if (response.status === 200) {
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      }
      // 202 = still running, keep polling
    } catch (e: any) {
      if (abortSignal?.aborted) return [];
      // Continue polling on network errors
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.warn(`[BrightData:Discovery] Snapshot ${snapshotId} timed out after ${maxWaitMs}ms`);
  return [];
}

// ---------- LinkedIn Personal Profile (v2 Source 2) ----------

export interface LinkedInProfileResult {
  name: string;
  headline: string;
  about: string;
  current_title: string;
  current_company: string;
  tenure_months: number | null;
  previous_roles: Array<{ title: string; company: string; duration: string }>;
  career_arc: string;
  education: string;
  archetype: 'operator' | 'strategist' | 'founder' | 'new_hire' | 'lifer' | 'unknown';
  raw_data: string;
}

export async function researchLinkedInProfile(linkedinUrl: string, abortSignal?: AbortSignal): Promise<LinkedInProfileResult | null> {
  if (!BRIGHT_DATA_API || !linkedinUrl) return null;

  try {
    const url = linkedinUrl.trim().replace(/\/$/, '');
    console.log(`[Discovery:v2] Scraping LinkedIn profile: ${url}`);

    // Try synchronous /scrape endpoint first
    const fetchSignal = composedSignal(120000, abortSignal);
    const response = await fetch(`${BRIGHT_DATA_BASE}/scrape?dataset_id=${BD_DISCOVERY_DATASETS.linkedinProfile}&format=json&include_errors=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [{ url }] }),
      signal: fetchSignal,
    });

    let results: any[];
    if (response.status === 202) {
      const data = await response.json();
      if (!data.snapshot_id) return null;
      results = await bdDiscoveryPoll(data.snapshot_id, 120000, abortSignal);
    } else if (response.ok) {
      results = await response.json();
      if (!Array.isArray(results)) results = [results];
    } else {
      // Fallback to trigger/poll
      const snapshotId = await bdDiscoveryTrigger(BD_DISCOVERY_DATASETS.linkedinProfile, [{ url }]);
      if (!snapshotId) return null;
      results = await bdDiscoveryPoll(snapshotId, 60000, abortSignal);
    }

    const profile = results[0];
    if (!profile) return null;

    // Extract experience history
    const experience = (profile.experience || profile.positions || []).slice(0, 5);
    const currentJob = experience.find((e: any) => e.current || e.is_current) || experience[0];
    const previousRoles = experience.slice(1, 4).map((e: any) => ({
      title: e.title || e.position || '',
      company: e.company || e.organization_name || e.company_name || '',
      duration: e.duration || e.date_range || '',
    }));

    // Calculate tenure
    let tenureMonths: number | null = null;
    if (currentJob?.start_date || currentJob?.date_range) {
      const startStr = currentJob.start_date || currentJob.date_range?.split('–')[0]?.trim();
      if (startStr) {
        const startDate = new Date(startStr);
        if (!isNaN(startDate.getTime())) {
          tenureMonths = Math.round((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        }
      }
    }

    // Determine career arc
    const titles = experience.map((e: any) => (e.title || e.position || '').toLowerCase());
    let careerArc = '';
    if (titles.length >= 2) {
      const hasOps = titles.some((t: string) => /ops|operations|manager|director/i.test(t));
      const hasLeadership = titles.some((t: string) => /ceo|coo|vp|president|founder|owner/i.test(t));
      const hasConsulting = titles.some((t: string) => /consultant|advisor|mba|strategy/i.test(t));
      const hasAgency = titles.some((t: string) => /agency|marketing|brand/i.test(t));

      if (hasOps && hasLeadership) careerArc = 'ops → leadership';
      else if (hasConsulting && hasLeadership) careerArc = 'consulting → leadership';
      else if (hasAgency) careerArc = 'agency → in-house';
      else careerArc = titles.slice(0, 3).join(' → ');
    }

    // Determine archetype
    let archetype: LinkedInProfileResult['archetype'] = 'unknown';
    const currentTitle = (currentJob?.title || profile.headline || '').toLowerCase();

    if (/founder|owner|co-founder/i.test(currentTitle)) {
      archetype = 'founder';
    } else if (tenureMonths !== null && tenureMonths < 12) {
      archetype = 'new_hire';
    } else if (tenureMonths !== null && tenureMonths > 120) {
      archetype = 'lifer';
    } else if (/mba|consultant|strategy|strategist/i.test(titles.join(' '))) {
      archetype = 'strategist';
    } else {
      archetype = 'operator';
    }

    // Education
    const education = (profile.education || [])
      .slice(0, 2)
      .map((e: any) => `${e.degree || e.field_of_study || ''} at ${e.school || e.institution || ''}`.trim())
      .filter((e: string) => e.length > 3)
      .join('; ');

    return {
      name: profile.full_name || profile.name || '',
      headline: profile.headline || profile.position || '',
      about: (profile.about || profile.summary || '').substring(0, 2000),
      current_title: currentJob?.title || profile.headline || '',
      current_company: currentJob?.company || currentJob?.organization_name || '',
      tenure_months: tenureMonths,
      previous_roles: previousRoles,
      career_arc: careerArc,
      education,
      archetype,
      raw_data: JSON.stringify(profile, null, 2),
    };
  } catch (error: any) {
    console.error('[Discovery:v2] LinkedIn profile scrape failed:', error.message);
    return null;
  }
}

// ---------- LinkedIn Posts (v2 Source 3) ----------

export interface LinkedInPostsResult {
  posts: Array<{
    text: string;
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
  post_count: number;
  avg_engagement: number;
  top_topics: string[];
  tone: string;
  last_post_date: string | null;
  raw_data: string;
}

export async function researchLinkedInPosts(linkedinUrl: string, abortSignal?: AbortSignal): Promise<LinkedInPostsResult | null> {
  if (!BRIGHT_DATA_API || !linkedinUrl) return null;

  try {
    const url = linkedinUrl.trim().replace(/\/$/, '');
    console.log(`[Discovery:v2] Scraping LinkedIn posts: ${url}`);

    const fetchSignal = composedSignal(120000, abortSignal);
    const response = await fetch(`${BRIGHT_DATA_BASE}/scrape?dataset_id=${BD_DISCOVERY_DATASETS.linkedinPosts}&format=json&include_errors=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [{ url }] }),
      signal: fetchSignal,
    });

    let results: any[];
    if (response.status === 202) {
      const data = await response.json();
      if (!data.snapshot_id) return null;
      results = await bdDiscoveryPoll(data.snapshot_id, 120000, abortSignal);
    } else if (response.ok) {
      results = await response.json();
      if (!Array.isArray(results)) results = [results];
    } else {
      return null;
    }

    if (!results.length) return null;

    // Filter to profile owner's posts
    const profileSlug = url.split('/in/')[1]?.split('/')[0]?.split('?')[0]?.toLowerCase() || '';
    const ownPosts = profileSlug
      ? results.filter((item: any) => {
          const userId = (item.user_id || '').toLowerCase();
          return !userId || userId === profileSlug;
        })
      : results;
    const source = ownPosts.length > 0 ? ownPosts : results;

    const posts = source.slice(0, 10).map((item: any) => ({
      text: (item.post_text || item.text || item.content || item.description || '').substring(0, 2000),
      date: item.date_posted || item.post_date || item.date || item.posted_at || '',
      likes: item.num_likes || item.likes || item.reactions || 0,
      comments: item.num_comments || item.comments || 0,
      shares: item.num_shares || item.shares || item.reposts || 0,
    }));

    const totalEngagement = posts.reduce((sum: number, p) => sum + p.likes + p.comments + p.shares, 0);
    const allText = posts.map(p => p.text).join(' ').toLowerCase();

    // Extract topics
    const words = allText.split(/\s+/).filter(w => w.length > 4);
    const freq: Record<string, number> = {};
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, '');
      if (clean.length > 4) freq[clean] = (freq[clean] || 0) + 1;
    }
    const topTopics = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Determine tone
    let tone = 'professional';
    if (/excited|amazing|incredible|love|passion/i.test(allText)) tone = 'promotional';
    else if (/think|believe|perspective|insight|reflect/i.test(allText)) tone = 'thoughtful';
    else if (/frustrat|broken|wrong|fail|problem/i.test(allText)) tone = 'critical';

    const lastPostDate = posts.length > 0 ? posts[0].date : null;

    return {
      posts,
      post_count: posts.length,
      avg_engagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
      top_topics: topTopics,
      tone,
      last_post_date: lastPostDate,
      raw_data: JSON.stringify(source.slice(0, 5), null, 2),
    };
  } catch (error: any) {
    console.error('[Discovery:v2] LinkedIn posts scrape failed:', error.message);
    return null;
  }
}

// ---------- Google SERP (v2 Source 4) ----------

export interface SerpResult {
  keyword: string;
  target_rank: number | null; // null = not found on page 1
  top_results: Array<{ position: number; title: string; url: string; domain: string }>;
}

export interface GoogleSerpResult {
  results: SerpResult[];
  raw_data: string;
}

export async function researchGoogleSerp(
  keywords: string[],
  targetDomain: string,
  abortSignal?: AbortSignal
): Promise<GoogleSerpResult | null> {
  if (!BRIGHT_DATA_API || !keywords.length) return null;

  try {
    console.log(`[Discovery:v2] SERP search for ${keywords.length} keywords, target: ${targetDomain}`);

    const input = keywords.map(keyword => ({
      keyword,
      url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
      country: 'us',
      language: 'en',
    }));

    const snapshotId = await bdDiscoveryTrigger(BD_DISCOVERY_DATASETS.googleSerp, input);
    if (!snapshotId) {
      // Try synchronous /scrape endpoint
      const fetchSignal = composedSignal(120000, abortSignal);
      const response = await fetch(`${BRIGHT_DATA_BASE}/scrape?dataset_id=${BD_DISCOVERY_DATASETS.googleSerp}&format=json&include_errors=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: fetchSignal,
      });

      if (!response.ok) return null;

      let results: any[];
      if (response.status === 202) {
        const data = await response.json();
        if (!data.snapshot_id) return null;
        results = await bdDiscoveryPoll(data.snapshot_id, 120000, abortSignal);
      } else {
        results = await response.json();
        if (!Array.isArray(results)) results = [results];
      }

      return parseSerpResults(results, keywords, targetDomain);
    }

    const results = await bdDiscoveryPoll(snapshotId, 120000, abortSignal);
    return parseSerpResults(results, keywords, targetDomain);
  } catch (error: any) {
    console.error('[Discovery:v2] Google SERP search failed:', error.message);
    return null;
  }
}

function parseSerpResults(results: any[], keywords: string[], targetDomain: string): GoogleSerpResult {
  const cleanDomain = targetDomain.replace('www.', '').toLowerCase();
  const serpResults: SerpResult[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const result = results[i] || results.find((r: any) =>
      (r.keyword || r.query || '').toLowerCase() === keywords[i].toLowerCase()
    );

    if (!result) {
      serpResults.push({
        keyword: keywords[i],
        target_rank: null,
        top_results: [],
      });
      continue;
    }

    // Extract organic results
    const organicResults = (result.organic || result.organic_results || result.results || [])
      .slice(0, 10)
      .map((r: any, idx: number) => ({
        position: r.position || r.rank || idx + 1,
        title: r.title || '',
        url: r.url || r.link || '',
        domain: extractDomainFromUrl(r.url || r.link || ''),
      }));

    // Find target rank
    const targetResult = organicResults.find((r: any) =>
      r.domain.includes(cleanDomain) || cleanDomain.includes(r.domain)
    );

    serpResults.push({
      keyword: keywords[i],
      target_rank: targetResult?.position || null,
      top_results: organicResults.slice(0, 3),
    });
  }

  return {
    results: serpResults,
    raw_data: JSON.stringify(results, null, 2).substring(0, 10000),
  };
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// ---------- Website Tech Stack Detection (v2 Source 5) ----------

export interface WebsiteTechResult {
  platform: string;
  built_by: string | null;
  email_platform: string | null;
  chat_widget: string | null;
  analytics: string | null;
  other_tools: string[];
  raw_html_snippet: string;
}

export async function researchWebsiteTech(websiteUrl: string): Promise<WebsiteTechResult | null> {
  if (!websiteUrl) return null;

  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    console.log(`[Discovery:v2] Scraping website tech: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Detect platform
    let platform = 'Unknown';
    if (lowerHtml.includes('shopify') || lowerHtml.includes('cdn.shopify.com')) platform = 'Shopify';
    else if (lowerHtml.includes('wp-content') || lowerHtml.includes('wordpress')) platform = 'WordPress';
    else if (lowerHtml.includes('squarespace')) platform = 'Squarespace';
    else if (lowerHtml.includes('wix.com') || lowerHtml.includes('wixsite')) platform = 'Wix';
    else if (lowerHtml.includes('hubspot')) platform = 'HubSpot';
    else if (lowerHtml.includes('webflow') || lowerHtml.includes('webflow.io')) platform = 'Webflow';
    else if (lowerHtml.includes('next') && lowerHtml.includes('_next')) platform = 'Next.js';
    else if (lowerHtml.includes('gatsby')) platform = 'Gatsby';

    // Detect agency/builder credit
    let builtBy: string | null = null;
    const footerMatch = html.match(/(?:website\s+(?:by|designed\s+by|built\s+by|powered\s+by)|designed\s+(?:by|&\s*built\s*by)|developed\s+by|crafted\s+by)\s+[<>a-zA-Z\s="'\/]*?>?\s*([A-Za-z][A-Za-z0-9\s&.]+?)(?:<\/|[|•\-]|\s{2})/i);
    if (footerMatch) {
      builtBy = footerMatch[1].trim().replace(/<[^>]+>/g, '').trim();
      if (builtBy.length < 2 || builtBy.length > 60) builtBy = null;
    }

    // Detect email platform
    let emailPlatform: string | null = null;
    if (lowerHtml.includes('klaviyo')) emailPlatform = 'Klaviyo';
    else if (lowerHtml.includes('mailchimp') || lowerHtml.includes('mc.js')) emailPlatform = 'Mailchimp';
    else if (lowerHtml.includes('convertkit')) emailPlatform = 'ConvertKit';
    else if (lowerHtml.includes('activecampaign')) emailPlatform = 'ActiveCampaign';
    else if (lowerHtml.includes('hubspot') && lowerHtml.includes('forms')) emailPlatform = 'HubSpot';
    else if (lowerHtml.includes('constantcontact')) emailPlatform = 'Constant Contact';

    // Detect chat widget
    let chatWidget: string | null = null;
    if (lowerHtml.includes('intercom')) chatWidget = 'Intercom';
    else if (lowerHtml.includes('drift')) chatWidget = 'Drift';
    else if (lowerHtml.includes('tidio')) chatWidget = 'Tidio';
    else if (lowerHtml.includes('zendesk') && lowerHtml.includes('chat')) chatWidget = 'Zendesk Chat';
    else if (lowerHtml.includes('crisp')) chatWidget = 'Crisp';
    else if (lowerHtml.includes('livechat')) chatWidget = 'LiveChat';
    else if (lowerHtml.includes('tawk.to') || lowerHtml.includes('tawk')) chatWidget = 'Tawk.to';

    // Detect analytics
    let analytics: string | null = null;
    if (lowerHtml.includes('gtag') || lowerHtml.includes('google-analytics') || lowerHtml.includes('googletagmanager')) analytics = 'GA4';
    if (lowerHtml.includes('segment')) analytics = analytics ? `${analytics}, Segment` : 'Segment';
    if (lowerHtml.includes('mixpanel')) analytics = analytics ? `${analytics}, Mixpanel` : 'Mixpanel';
    if (lowerHtml.includes('hotjar')) analytics = analytics ? `${analytics}, Hotjar` : 'Hotjar';

    // Other notable tools
    const otherTools: string[] = [];
    if (lowerHtml.includes('stripe')) otherTools.push('Stripe');
    if (lowerHtml.includes('calendly')) otherTools.push('Calendly');
    if (lowerHtml.includes('typeform')) otherTools.push('Typeform');
    if (lowerHtml.includes('zapier')) otherTools.push('Zapier');
    if (lowerHtml.includes('recaptcha') || lowerHtml.includes('captcha')) otherTools.push('reCAPTCHA');

    return {
      platform,
      built_by: builtBy,
      email_platform: emailPlatform,
      chat_widget: chatWidget,
      analytics,
      other_tools: otherTools,
      raw_html_snippet: html.substring(0, 5000),
    };
  } catch (error: any) {
    console.error('[Discovery:v2] Website tech scrape failed:', error.message);
    return null;
  }
}

// ---------- SERP Keyword Generator ----------

export function generateSerpKeywords(
  targetCompany: string,
  targetWebsite: string | undefined,
  targetIcp: string | undefined,
  competitors: string | undefined,
  serviceOffered?: string
): string[] {
  const keywords: string[] = [];

  // Branded search
  keywords.push(targetCompany);

  // Try to infer location and service from available data
  if (targetIcp) {
    keywords.push(`${targetCompany} ${targetIcp}`);
  }

  // Service-category keyword to probe their capabilities beyond primary offering
  // e.g. "InteractOne marketing services" or "InteractOne email marketing"
  if (serviceOffered) {
    const serviceKeyword = serviceOffered.split(',')[0]?.trim();
    if (serviceKeyword) {
      keywords.push(`${targetCompany} ${serviceKeyword}`);
    }
  }

  if (targetWebsite) {
    const domain = extractDomainFromUrl(
      targetWebsite.startsWith('http') ? targetWebsite : `https://${targetWebsite}`
    );
    const parts = domain.split('.')[0];
    if (parts !== targetCompany.toLowerCase().replace(/\s+/g, '')) {
      keywords.push(parts);
    }
  }

  // Competitor comparison
  if (competitors) {
    const firstCompetitor = competitors.split(',')[0]?.trim();
    if (firstCompetitor) {
      keywords.push(`${firstCompetitor} vs ${targetCompany}`);
    }
  }

  return keywords.slice(0, 5);
}

// ---------- V2 Combined Research Flow ----------

export interface V2ResearchInput {
  // Requestor
  requestor_name: string;
  requestor_company?: string;
  requestor_website?: string;
  service_offered: string;

  // Target
  target_company: string;
  target_website?: string;
  target_contact: string;
  target_title?: string;
  target_linkedin?: string;
  target_icp?: string;
  competitors?: string;
}

export interface V2ResearchResult {
  // Source 1: Perplexity
  perplexity: {
    company_snapshot: string;
    funding_info: { round: string; amount: string; date: string; investors: string } | null;
    recent_news: Array<{ title: string; date: string; summary: string }>;
    industry_momentum: string;
    momentum_read: string;
    raw_response: string;
  } | null;

  // Source 1b: Perplexity Job Postings
  job_postings: Array<{ title: string; department: string; signal: string }> | null;

  // Source 2: LinkedIn Profile
  linkedin_profile: LinkedInProfileResult | null;

  // Source 3: LinkedIn Posts
  linkedin_posts: LinkedInPostsResult | null;

  // Source 4: Google SERP
  google_serp: GoogleSerpResult | null;

  // Source 5: Website Tech
  website_tech: WebsiteTechResult | null;

  // Apollo enrichment (kept from v1)
  apollo_company: ApolloCompanyData | null;
  apollo_contact: ApolloContactData | null;

  errors: string[];
}

/**
 * Run the v2 5-source research chain for Discovery Lab Pro
 */
export async function runV2DiscoveryResearch(input: V2ResearchInput): Promise<V2ResearchResult> {
  const errors: string[] = [];
  const result: V2ResearchResult = {
    perplexity: null,
    job_postings: null,
    linkedin_profile: null,
    linkedin_posts: null,
    google_serp: null,
    website_tech: null,
    apollo_company: null,
    apollo_contact: null,
    errors: [],
  };

  // Extract domain
  let domain: string | undefined;
  if (input.target_website) {
    try {
      const url = new URL(input.target_website.startsWith('http') ? input.target_website : `https://${input.target_website}`);
      domain = url.hostname.replace('www.', '');
    } catch {
      domain = input.target_website.replace('www.', '').split('/')[0];
    }
  }

  // Generate SERP keywords
  const serpKeywords = generateSerpKeywords(
    input.target_company,
    input.target_website,
    input.target_icp,
    input.competitors,
    input.service_offered
  );

  // AbortController to cancel in-flight BrightData polls when chain timeout fires
  const chainAbort = new AbortController();

  // Check Brightdata API key early and warn
  if (!BRIGHT_DATA_API) {
    console.warn('[Discovery:v2] BRIGHT_DATA_API is not set - LinkedIn, SERP, and ChatGPT sources will be skipped');
    errors.push('BRIGHT_DATA_API not configured - LinkedIn profile, LinkedIn posts, and Google SERP data unavailable');
  }

  // Run all 5 sources + Apollo enrichment in parallel
  const promises: Promise<void>[] = [];

  // Source 1: Perplexity (company context + news + industry)
  promises.push(
    (async () => {
      try {
        const [newsData, marketData, jobData] = await Promise.all([
          fetchCompanyNews(input.target_company, domain),
          researchMarket(
            input.target_icp || `${input.target_company}'s industry`,
            input.target_company,
            input.service_offered
          ),
          fetchJobPostings(input.target_company, input.service_offered, domain),
        ]);

        result.perplexity = {
          company_snapshot: marketData.raw_response.substring(0, 3000),
          funding_info: newsData.funding_info,
          recent_news: newsData.recent_news,
          industry_momentum: marketData.industry_trends,
          momentum_read: marketData.market_dynamics,
          raw_response: `${marketData.raw_response}\n\n${newsData.raw_response}`,
        };
        result.job_postings = jobData.job_postings.length > 0 ? jobData.job_postings : null;
      } catch (e: any) {
        errors.push(`Perplexity research failed: ${e.message}`);
      }
    })()
  );

  // Source 2: BrightData LinkedIn Profile
  if (input.target_linkedin) {
    promises.push(
      researchLinkedInProfile(input.target_linkedin, chainAbort.signal)
        .then(r => {
          result.linkedin_profile = r;
          if (!r) {
            console.warn('[Discovery:v2] LinkedIn profile returned null for:', input.target_linkedin);
            errors.push('LinkedIn profile scrape returned no data');
          }
        })
        .catch(e => { if (!chainAbort.signal.aborted) errors.push(`LinkedIn profile failed: ${e.message}`); })
    );
  } else {
    console.warn('[Discovery:v2] No target_linkedin URL provided - skipping LinkedIn profile');
  }

  // Source 3: BrightData LinkedIn Posts
  if (input.target_linkedin) {
    promises.push(
      researchLinkedInPosts(input.target_linkedin, chainAbort.signal)
        .then(r => {
          result.linkedin_posts = r;
          if (!r) {
            console.warn('[Discovery:v2] LinkedIn posts returned null for:', input.target_linkedin);
            errors.push('LinkedIn posts scrape returned no data');
          }
        })
        .catch(e => { if (!chainAbort.signal.aborted) errors.push(`LinkedIn posts failed: ${e.message}`); })
    );
  }

  // Source 4: BrightData Google SERP
  if (serpKeywords.length > 0 && domain) {
    promises.push(
      researchGoogleSerp(serpKeywords, domain, chainAbort.signal)
        .then(r => {
          result.google_serp = r;
          if (!r) {
            console.warn('[Discovery:v2] Google SERP returned null for keywords:', serpKeywords);
            errors.push('Google SERP search returned no data');
          }
        })
        .catch(e => { if (!chainAbort.signal.aborted) errors.push(`Google SERP failed: ${e.message}`); })
    );
  } else {
    console.warn('[Discovery:v2] No domain available for SERP search - skipping');
  }

  // Source 5: Website tech detection
  if (input.target_website) {
    promises.push(
      researchWebsiteTech(input.target_website)
        .then(r => { result.website_tech = r; })
        .catch(e => { errors.push(`Website tech failed: ${e.message}`); })
    );
  }

  // Apollo company enrichment
  if (domain) {
    promises.push(
      enrichCompanyWithApollo(domain)
        .then(r => { result.apollo_company = r; })
        .catch(e => { errors.push(`Apollo company failed: ${e.message}`); })
    );
  }

  // Apollo contact enrichment
  if (input.target_contact && domain) {
    promises.push(
      enrichContactWithApollo(input.target_contact, domain)
        .then(r => { result.apollo_contact = r; })
        .catch(e => { errors.push(`Apollo contact failed: ${e.message}`); })
    );
  }

  // Wait for all with timeout - abort in-flight BrightData polls on timeout
  // 240s gives BrightData sources enough time to complete even with slow scrapes
  const timeout = new Promise<void>(resolve => setTimeout(() => {
    chainAbort.abort();
    errors.push('Research chain timed out after 240s');
    resolve();
  }, 240000));

  await Promise.race([Promise.allSettled(promises), timeout]);

  result.errors = errors;
  return result;
}
