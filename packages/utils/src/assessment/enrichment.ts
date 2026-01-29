/**
 * V4 Enrichment Pipeline
 * Orchestrates external data collection + AI analysis in parallel:
 * - Apify: website deep scrape, founder LinkedIn (profile+posts), company LinkedIn (profile+posts)
 * - Exa: ICP problem triangulation (3 queries), competitor landscape
 * - LLM Awareness: Claude, ChatGPT, Perplexity (3 queries each for AI discoverability)
 * - Claude Analysis: positioning coherence, content-market fit, social proof alignment
 */

import type { IntakeData } from './scoring';

// ============================================
// TYPES
// ============================================

export interface EnrichmentResult {
  apify: {
    website: ApifyWebsite | null;
    founderLinkedin: ApifyLinkedInProfile | null;
    founderPosts: ApifyLinkedInPosts | null;
    companyLinkedin: ApifyLinkedInProfile | null;
    companyPosts: ApifyLinkedInPosts | null;
  };
  exa: {
    icpProblems: ExaSearchResult[];
    competitors: ExaSearchResult | null;
  };
  llmAwareness: LLMAwarenessResult | null;
  analysis: AnalysisResult | null;
  meta: {
    startedAt: string;
    completedAt: string | null;
    duration: number | null;
    errors: Array<{ source: string; error: string }>;
  };
}

interface ApifyWebsite {
  homepage: {
    h1: string[];
    h2: string[];
    metaDescription: string;
    aboveFoldCopy: string;
    navItems: string[];
  };
  services: string[];
  caseStudies: Array<{
    title: string;
    clientName: string | null;
    hasMetrics: boolean;
    hasTestimonial: boolean;
    summary: string;
  }>;
  testimonials: Array<{
    text: string;
    author: string | null;
    company: string | null;
  }>;
  clientLogos: string[];
  blogPosts: Array<{ title: string; url: string }>;
  aboutContent: string;
  teamMembers: string[];
}

interface ApifyLinkedInProfile {
  name: string;
  headline: string;
  about: string;
  followerCount: number;
  connectionCount: number;
}

interface ApifyLinkedInPosts {
  posts: Array<{
    text: string;
    date: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
  postCount: number;
  avgEngagement: number;
  topTopics: string[];
}

interface ExaSearchResult {
  query: string;
  results: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  agencyFound: boolean;
  founderFound: boolean;
  resultCount: number;
}

interface LLMAwarenessCheck {
  provider: string;
  available: boolean;
  agencyMentioned: boolean;
  founderMentioned: boolean;
  competitorsMentioned: string[];
  rawResponse?: string;
  error?: string;
}

interface LLMAwarenessResult {
  claude: LLMAwarenessCheck;
  chatgpt: LLMAwarenessCheck;
  perplexity: LLMAwarenessCheck;
  summary: {
    totalChecked: number;
    agencyMentionedIn: number;
    founderMentionedIn: number;
    score: number;
    topCompetitors: string[];
  };
}

export interface AnalysisResult {
  positioningCoherence: {
    score: number;
    verdict: string;
    websiteMessage: string;
    linkedinMessage: string;
    alignment: 'aligned' | 'partial' | 'misaligned';
    gaps: string[];
    recommendations: string[];
  } | null;
  contentMarketFit: {
    score: number;
    verdict: string;
    topicsVsIcpProblems: {
      topContentTopics: string[];
      topIcpProblems: string[];
      overlap: number;
    };
    gaps: string[];
    recommendations: string[];
  } | null;
  socialProofAlignment: {
    score: number;
    verdict: string;
    caseStudyRelevance: string;
    testimonialStrength: string;
    logoSignalStrength: string;
    gaps: string[];
    recommendations: string[];
  } | null;
}

// ============================================
// APIFY SCRAPERS
// ============================================

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

async function runApifyActor(actorId: string, input: any, waitMs: number = 15000): Promise<any[]> {
  if (!APIFY_TOKEN) return [];

  const response = await fetch(`${APIFY_BASE}/acts/${actorId}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIFY_TOKEN}`
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`Apify returned ${response.status}`);
  const run = await response.json();

  await new Promise(resolve => setTimeout(resolve, waitMs));

  const dataResponse = await fetch(`${APIFY_BASE}/datasets/${run.data.defaultDatasetId}/items`, {
    headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
    signal: AbortSignal.timeout(15000)
  });

  return await dataResponse.json();
}

async function apifyScrapeWebsite(websiteUrl: string): Promise<ApifyWebsite | null> {
  if (!APIFY_TOKEN || !websiteUrl) return null;

  try {
    const baseUrl = new URL(websiteUrl).origin;
    const pagesToScrape = [
      { url: websiteUrl },
      { url: `${baseUrl}/services` },
      { url: `${baseUrl}/about` },
      { url: `${baseUrl}/case-studies` },
      { url: `${baseUrl}/work` },
      { url: `${baseUrl}/clients` },
      { url: `${baseUrl}/portfolio` },
      { url: `${baseUrl}/blog` },
      { url: `${baseUrl}/team` },
      { url: `${baseUrl}/testimonials` },
    ];

    const items = await runApifyActor('apify~web-scraper', {
      startUrls: pagesToScrape,
      pageFunction: `async function pageFunction(context) {
        const $ = context.jQuery;
        const url = context.request.url.toLowerCase();
        const result = { url: context.request.url, type: 'unknown' };

        // Classify page type
        if (url === '${baseUrl}/' || url === '${baseUrl}' || url === '${websiteUrl.toLowerCase()}') {
          result.type = 'homepage';
          result.h1 = $('h1').map((_, el) => $(el).text().trim()).get();
          result.h2 = $('h2').map((_, el) => $(el).text().trim()).get();
          result.metaDescription = $('meta[name="description"]').attr('content') || '';
          result.aboveFoldCopy = $('header, [class*="hero"], [class*="banner"], main > section:first-child').first().text().trim().substring(0, 2000);
          result.navItems = $('nav a, header a').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 0);
        }

        if (url.includes('service') || url.includes('solution') || url.includes('what-we-do')) {
          result.type = 'services';
          result.services = $('h2, h3, .service-title, [class*="service"]').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 2 && t.length < 200);
        }

        if (url.includes('case') || url.includes('work') || url.includes('portfolio') || url.includes('client') || url.includes('result')) {
          result.type = 'caseStudies';
          const cards = $('[class*="case"], [class*="study"], [class*="portfolio"], [class*="work"] article, .card, [class*="project"]').slice(0, 20);
          result.caseStudies = cards.map((_, el) => ({
            title: $(el).find('h2, h3, h4').first().text().trim(),
            clientName: $(el).find('[class*="client"], [class*="company"], [class*="brand"]').first().text().trim() || null,
            hasMetrics: /\\d+%|\\$\\d|\\dx|\\d+x|revenue|growth|increase|ROI/i.test($(el).text()),
            hasTestimonial: $(el).find('blockquote, [class*="quote"], [class*="testimonial"]').length > 0,
            summary: $(el).text().trim().substring(0, 500)
          })).get();
        }

        if (url.includes('testimonial') || url.includes('review')) {
          result.type = 'testimonials';
          result.testimonials = $('blockquote, [class*="testimonial"], [class*="quote"], [class*="review"]').map((_, el) => ({
            text: $(el).find('p, .text, .content').first().text().trim() || $(el).text().trim(),
            author: $(el).find('[class*="author"], [class*="name"], cite').first().text().trim() || null,
            company: $(el).find('[class*="company"], [class*="title"], [class*="role"]').first().text().trim() || null
          })).get().slice(0, 10);
        }

        if (url.includes('about') || url.includes('team')) {
          result.type = 'about';
          result.aboutContent = $('main, [class*="about"], article').first().text().trim().substring(0, 3000);
          result.teamMembers = $('[class*="team"] h3, [class*="member"] h3, [class*="person"] h3, [class*="team"] h4').map((_, el) => $(el).text().trim()).get().slice(0, 20);
        }

        if (url.includes('blog') || url.includes('insights') || url.includes('resources')) {
          result.type = 'blog';
          result.blogPosts = $('article h2 a, article h3 a, [class*="post"] h2 a, [class*="blog"] h3 a, [class*="article"] a').map((_, el) => ({
            title: $(el).text().trim(),
            url: $(el).attr('href') || ''
          })).get().slice(0, 20);
        }

        // Look for client logos on any page
        result.logos = $('img[class*="logo"], img[class*="client"], [class*="logo-grid"] img, [class*="client-logo"] img, [class*="trusted"] img').map((_, el) => $(el).attr('alt') || $(el).attr('title') || '').get().filter(t => t.length > 0).slice(0, 20);

        return result;
      }`,
      maxPagesPerCrawl: 10,
      maxConcurrency: 5
    }, 20000);

    // Aggregate results from all pages
    const result: ApifyWebsite = {
      homepage: { h1: [], h2: [], metaDescription: '', aboveFoldCopy: '', navItems: [] },
      services: [],
      caseStudies: [],
      testimonials: [],
      clientLogos: [],
      blogPosts: [],
      aboutContent: '',
      teamMembers: [],
    };

    for (const item of items) {
      if (item.type === 'homepage' || item.url?.toLowerCase() === websiteUrl.toLowerCase()) {
        result.homepage = {
          h1: item.h1 || [],
          h2: item.h2 || [],
          metaDescription: item.metaDescription || '',
          aboveFoldCopy: item.aboveFoldCopy || '',
          navItems: item.navItems || [],
        };
      }
      if (item.services?.length) result.services.push(...item.services);
      if (item.caseStudies?.length) result.caseStudies.push(...item.caseStudies);
      if (item.testimonials?.length) result.testimonials.push(...item.testimonials);
      if (item.logos?.length) result.clientLogos.push(...item.logos);
      if (item.blogPosts?.length) result.blogPosts.push(...item.blogPosts);
      if (item.aboutContent) result.aboutContent = item.aboutContent;
      if (item.teamMembers?.length) result.teamMembers.push(...item.teamMembers);
    }

    // Deduplicate
    result.clientLogos = [...new Set(result.clientLogos)];
    result.services = [...new Set(result.services)];

    return result;
  } catch (error: any) {
    console.error('[Apify] Website scrape failed:', error.message);
    return null;
  }
}

async function apifyScrapeLinkedInProfile(linkedinUrl: string | undefined): Promise<ApifyLinkedInProfile | null> {
  if (!APIFY_TOKEN || !linkedinUrl) return null;

  try {
    const items = await runApifyActor('curious_coder~linkedin-profile-scraper', {
      urls: [linkedinUrl],
    }, 15000);

    const profile = items[0];
    if (!profile) return null;

    return {
      name: profile.fullName || profile.name || '',
      headline: profile.headline || '',
      about: (profile.about || profile.summary || '').substring(0, 2000),
      followerCount: profile.followersCount || profile.followers || 0,
      connectionCount: profile.connectionsCount || profile.connections || 0,
    };
  } catch (error: any) {
    console.error('[Apify] LinkedIn profile scrape failed:', error.message);
    return null;
  }
}

async function apifyScrapeLinkedInPosts(linkedinUrl: string | undefined): Promise<ApifyLinkedInPosts | null> {
  if (!APIFY_TOKEN || !linkedinUrl) return null;

  try {
    const items = await runApifyActor('curious_coder~linkedin-post-search-scraper', {
      urls: [linkedinUrl],
      maxResults: 20,
      sortBy: 'date_posted'
    }, 20000);

    const posts = items.map((item: any) => ({
      text: (item.text || item.postText || '').substring(0, 2000),
      date: item.postedDate || item.date || '',
      likes: item.numLikes || item.likes || 0,
      comments: item.numComments || item.comments || 0,
      shares: item.numShares || item.shares || 0,
    }));

    const totalEngagement = posts.reduce((sum: number, p: any) => sum + p.likes + p.comments + p.shares, 0);

    // Extract top topics from post content
    const allText = posts.map((p: any) => p.text).join(' ').toLowerCase();
    const topTopics = extractTopics(allText);

    return {
      posts,
      postCount: posts.length,
      avgEngagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
      topTopics,
    };
  } catch (error: any) {
    console.error('[Apify] LinkedIn posts scrape failed:', error.message);
    return null;
  }
}

function extractTopics(text: string): string[] {
  // Simple keyword extraction - find repeated meaningful phrases
  const words = text.split(/\s+/).filter(w => w.length > 4);
  const freq: Record<string, number> = {};
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, '');
    if (clean.length > 4) freq[clean] = (freq[clean] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// ============================================
// EXA SEARCHES
// ============================================

const EXA_API_KEY = process.env.EXA_API_KEY;

async function exaSearch(query: string, numResults: number, intakeData: IntakeData): Promise<ExaSearchResult | null> {
  if (!EXA_API_KEY) return null;

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        numResults,
        useAutoprompt: true,
        type: 'neural'
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error(`Exa returned ${response.status}`);
    const data = await response.json();

    const results = (data.results || []).map((r: any) => ({
      url: r.url,
      title: r.title,
      snippet: (r.text || '').substring(0, 300)
    }));

    const domain = extractDomain(intakeData.website);
    const founderName = (intakeData.founderName || '').toLowerCase();

    return {
      query,
      results,
      agencyFound: results.some((r: any) => r.url?.includes(domain)),
      founderFound: results.some((r: any) =>
        r.title?.toLowerCase().includes(founderName) ||
        r.snippet?.toLowerCase().includes(founderName)
      ),
      resultCount: results.length
    };
  } catch (error: any) {
    console.error(`[Exa] Search failed for "${query}":`, error.message);
    return null;
  }
}

async function exaIcpProblemSearches(intakeData: IntakeData): Promise<ExaSearchResult[]> {
  const industry = intakeData.targetIndustry === 'Other'
    ? intakeData.targetIndustryOther || intakeData.targetMarket
    : intakeData.targetIndustry || intakeData.targetMarket;

  const queries = [
    `biggest challenges ${industry} companies face with ${intakeData.coreOffer}`,
    `why ${industry} businesses struggle with marketing and growth`,
    `${intakeData.targetMarket} pain points ${new Date().getFullYear()}`,
  ];

  const results = await Promise.allSettled(
    queries.map(q => exaSearch(q, 10, intakeData))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ExaSearchResult | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((r): r is ExaSearchResult => r !== null);
}

async function exaCompetitorSearch(intakeData: IntakeData): Promise<ExaSearchResult | null> {
  const query = `best agencies for ${intakeData.coreOffer} serving ${intakeData.targetMarket}`;
  return exaSearch(query, 20, intakeData);
}

// ============================================
// LLM AWARENESS CHECKS (expanded - 3 queries per provider)
// ============================================

function buildAwarenessPrompts(intakeData: IntakeData): string[] {
  const industry = intakeData.targetIndustry === 'Other'
    ? intakeData.targetIndustryOther || intakeData.targetMarket
    : intakeData.targetIndustry || intakeData.targetMarket;

  return [
    `Who are the best agencies helping ${intakeData.targetMarket} with ${intakeData.coreOffer}? List the top agencies with their names and why they stand out.`,
    `What are the top marketing agencies specializing in ${industry}? Name specific companies and their unique strengths.`,
    `If I'm a ${intakeData.targetCompanySize || ''} ${industry} company looking for help with ${intakeData.coreOffer}, which agencies should I consider? List specific names.`,
  ];
}

function checkMentions(text: string, intakeData: IntakeData) {
  const lower = (text || '').toLowerCase();
  const agencyName = (intakeData.agencyName || '').toLowerCase();
  const founderName = (intakeData.founderName || '').toLowerCase();

  // Also check partial matches and common variations
  const agencyWords = agencyName.split(/\s+/).filter(w => w.length > 2);
  const agencyMentioned = agencyName.length > 2 && (
    lower.includes(agencyName) ||
    (agencyWords.length > 1 && agencyWords.every(w => lower.includes(w)))
  );

  return {
    agencyMentioned,
    founderMentioned: founderName.length > 2 && lower.includes(founderName)
  };
}

function extractCompetitorNames(text: string, intakeData: IntakeData): string[] {
  // Extract names that look like agency names (capitalized multi-word or single brand names)
  const agencyName = (intakeData.agencyName || '').toLowerCase();
  const lines = text.split('\n');
  const names: string[] = [];

  for (const line of lines) {
    // Match patterns like "1. Agency Name" or "**Agency Name**" or "- Agency Name:"
    const patterns = [
      /(?:\d+\.\s*\*{0,2})([A-Z][a-zA-Z\s&.]+?)(?:\*{0,2}\s*[-–:])/g,
      /\*\*([A-Z][a-zA-Z\s&.]+?)\*\*/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 50 && !name.toLowerCase().includes(agencyName)) {
          names.push(name);
        }
      }
    }
  }

  return [...new Set(names)].slice(0, 10);
}

async function checkLLMAwareness(
  provider: string,
  apiCall: (prompt: string) => Promise<string>,
  intakeData: IntakeData
): Promise<LLMAwarenessCheck> {
  try {
    const prompts = buildAwarenessPrompts(intakeData);
    const responses = await Promise.allSettled(prompts.map(p => apiCall(p)));

    const allText = responses
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value)
      .join('\n');

    if (!allText) {
      return { provider, available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: 'No responses' };
    }

    const mentions = checkMentions(allText, intakeData);
    const competitors = extractCompetitorNames(allText, intakeData);

    return {
      provider,
      available: true,
      ...mentions,
      competitorsMentioned: competitors,
      rawResponse: allText.substring(0, 5000),
    };
  } catch (error: any) {
    return { provider, available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: error.message };
  }
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json();
  return data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';
}

async function callChatGPT(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('Not configured');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function runLLMAwarenessChecks(intakeData: IntakeData): Promise<LLMAwarenessResult> {
  const [claude, chatgpt, perplexity] = await Promise.allSettled([
    checkLLMAwareness('claude', callClaude, intakeData),
    checkLLMAwareness('chatgpt', callChatGPT, intakeData),
    checkLLMAwareness('perplexity', callPerplexity, intakeData),
  ]);

  const results = {
    claude: claude.status === 'fulfilled' ? claude.value : { provider: 'claude', available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: 'Failed' },
    chatgpt: chatgpt.status === 'fulfilled' ? chatgpt.value : { provider: 'chatgpt', available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: 'Failed' },
    perplexity: perplexity.status === 'fulfilled' ? perplexity.value : { provider: 'perplexity', available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: 'Failed' }
  };

  const checks = [results.claude, results.chatgpt, results.perplexity];
  const available = checks.filter(c => c.available);

  // Aggregate competitor mentions across all providers
  const allCompetitors = checks.flatMap(c => c.competitorsMentioned);
  const competitorFreq: Record<string, number> = {};
  for (const name of allCompetitors) {
    competitorFreq[name] = (competitorFreq[name] || 0) + 1;
  }
  const topCompetitors = Object.entries(competitorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return {
    ...results,
    summary: {
      totalChecked: available.length,
      agencyMentionedIn: available.filter(c => c.agencyMentioned).length,
      founderMentionedIn: available.filter(c => c.founderMentioned).length,
      score: available.length > 0
        ? Math.round(((available.filter(c => c.agencyMentioned).length + available.filter(c => c.founderMentioned).length) / (available.length * 2)) * 100)
        : 0,
      topCompetitors,
    }
  };
}

// ============================================
// CLAUDE ANALYSIS LAYER
// ============================================

async function runClaudeAnalysis(
  intakeData: IntakeData,
  apifyData: EnrichmentResult['apify'],
  exaData: EnrichmentResult['exa'],
  llmData: LLMAwarenessResult | null,
): Promise<AnalysisResult | null> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return null;

  const websiteSummary = apifyData.website ? JSON.stringify({
    homepage: apifyData.website.homepage,
    services: apifyData.website.services.slice(0, 10),
    caseStudyCount: apifyData.website.caseStudies.length,
    caseStudies: apifyData.website.caseStudies.slice(0, 5),
    testimonialCount: apifyData.website.testimonials.length,
    testimonials: apifyData.website.testimonials.slice(0, 5),
    clientLogos: apifyData.website.clientLogos.slice(0, 10),
    blogPostCount: apifyData.website.blogPosts.length,
    aboutContent: apifyData.website.aboutContent?.substring(0, 1000),
  }) : 'No website data available';

  const linkedinSummary = JSON.stringify({
    founderProfile: apifyData.founderLinkedin,
    founderPosts: apifyData.founderPosts ? {
      count: apifyData.founderPosts.postCount,
      avgEngagement: apifyData.founderPosts.avgEngagement,
      topTopics: apifyData.founderPosts.topTopics,
      recentPosts: apifyData.founderPosts.posts.slice(0, 5).map(p => p.text.substring(0, 300)),
    } : null,
    companyProfile: apifyData.companyLinkedin,
    companyPosts: apifyData.companyPosts ? {
      count: apifyData.companyPosts.postCount,
      avgEngagement: apifyData.companyPosts.avgEngagement,
      topTopics: apifyData.companyPosts.topTopics,
    } : null,
  });

  const contextBlock = `
AGENCY: ${intakeData.agencyName}
WEBSITE: ${intakeData.website}
CORE OFFER: ${intakeData.coreOffer}
TARGET MARKET: ${intakeData.targetMarket}
INDUSTRY: ${intakeData.targetIndustry || 'Not specified'}
COMPANY SIZE: ${intakeData.targetCompanySize || 'Not specified'}
DIFFERENTIATOR: ${intakeData.differentiator || 'Not stated'}

WEBSITE DATA:
${websiteSummary}

LINKEDIN DATA:
${linkedinSummary}

ICP PROBLEMS FROM EXA:
${JSON.stringify(exaData.icpProblems.flatMap(r => r.results.slice(0, 3).map(x => x.title)))}

COMPETITOR LANDSCAPE:
${JSON.stringify(exaData.competitors?.results.slice(0, 5).map(r => ({ title: r.title, url: r.url })))}
`;

  const analyses = await Promise.allSettled([
    callClaudeAnalysis(apiKey, `Analyze the POSITIONING COHERENCE for this agency. Compare what the website says vs what LinkedIn says vs what they claim their offer/market is.

${contextBlock}

Respond with ONLY valid JSON matching this schema:
{
  "score": <1-10>,
  "verdict": "<one sentence>",
  "websiteMessage": "<what the website communicates>",
  "linkedinMessage": "<what LinkedIn communicates>",
  "alignment": "aligned" | "partial" | "misaligned",
  "gaps": ["<gap1>", "<gap2>"],
  "recommendations": ["<rec1>", "<rec2>"]
}`),
    callClaudeAnalysis(apiKey, `Analyze the CONTENT-MARKET FIT for this agency. Do the topics they post about on LinkedIn match the problems their ICP actually has?

${contextBlock}

Respond with ONLY valid JSON matching this schema:
{
  "score": <1-10>,
  "verdict": "<one sentence>",
  "topicsVsIcpProblems": {
    "topContentTopics": ["<topic1>", "<topic2>"],
    "topIcpProblems": ["<problem1>", "<problem2>"],
    "overlap": <0-100 percent>
  },
  "gaps": ["<gap1>", "<gap2>"],
  "recommendations": ["<rec1>", "<rec2>"]
}`),
    callClaudeAnalysis(apiKey, `Analyze the SOCIAL PROOF ALIGNMENT for this agency. Are their case studies, testimonials, and client logos relevant to their stated ICP?

${contextBlock}

Respond with ONLY valid JSON matching this schema:
{
  "score": <1-10>,
  "verdict": "<one sentence>",
  "caseStudyRelevance": "<assessment>",
  "testimonialStrength": "<assessment>",
  "logoSignalStrength": "<assessment>",
  "gaps": ["<gap1>", "<gap2>"],
  "recommendations": ["<rec1>", "<rec2>"]
}`),
  ]);

  return {
    positioningCoherence: parseAnalysisResult(analyses[0]),
    contentMarketFit: parseAnalysisResult(analyses[1]),
    socialProofAlignment: parseAnalysisResult(analyses[2]),
  };
}

async function callClaudeAnalysis(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(45000)
  });

  const data = await response.json();
  return data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';
}

function parseAnalysisResult(result: PromiseSettledResult<string>): any {
  if (result.status !== 'fulfilled') return null;
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let text = result.value;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) text = jsonMatch[1];
    return JSON.parse(text.trim());
  } catch {
    console.error('[Analysis] Failed to parse Claude response');
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch {
    return (url || '').toLowerCase();
  }
}

// ============================================
// MAIN PIPELINE
// ============================================

const PIPELINE_TIMEOUT = 120000; // 2 minutes for expanded pipeline

export async function runEnrichmentPipeline(intakeData: IntakeData): Promise<EnrichmentResult> {
  console.log(`[v4] Starting enrichment pipeline for: ${intakeData.agencyName}`);
  const startTime = Date.now();

  const result: EnrichmentResult = {
    apify: { website: null, founderLinkedin: null, founderPosts: null, companyLinkedin: null, companyPosts: null },
    exa: { icpProblems: [], competitors: null },
    llmAwareness: null,
    analysis: null,
    meta: {
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: null,
      errors: []
    }
  };

  // Phase 1: Data collection (all parallel)
  const dataJobs: Promise<void>[] = [
    apifyScrapeWebsite(intakeData.website).then(d => { result.apify.website = d; }).catch(e => { result.meta.errors.push({ source: 'apify.website', error: e.message }); }),
    apifyScrapeLinkedInProfile(intakeData.founderLinkedinUrl).then(d => { result.apify.founderLinkedin = d; }).catch(e => { result.meta.errors.push({ source: 'apify.founderProfile', error: e.message }); }),
    apifyScrapeLinkedInPosts(intakeData.founderLinkedinUrl).then(d => { result.apify.founderPosts = d; }).catch(e => { result.meta.errors.push({ source: 'apify.founderPosts', error: e.message }); }),
    apifyScrapeLinkedInProfile(intakeData.companyLinkedinUrl).then(d => { result.apify.companyLinkedin = d; }).catch(e => { result.meta.errors.push({ source: 'apify.companyProfile', error: e.message }); }),
    apifyScrapeLinkedInPosts(intakeData.companyLinkedinUrl).then(d => { result.apify.companyPosts = d; }).catch(e => { result.meta.errors.push({ source: 'apify.companyPosts', error: e.message }); }),
    exaIcpProblemSearches(intakeData).then(d => { result.exa.icpProblems = d; }).catch(e => { result.meta.errors.push({ source: 'exa.icpProblems', error: e.message }); }),
    exaCompetitorSearch(intakeData).then(d => { result.exa.competitors = d; }).catch(e => { result.meta.errors.push({ source: 'exa.competitors', error: e.message }); }),
    runLLMAwarenessChecks(intakeData).then(d => { result.llmAwareness = d; }).catch(e => { result.meta.errors.push({ source: 'llm', error: e.message }); })
  ];

  const dataTimeout = new Promise<void>(resolve => setTimeout(() => {
    result.meta.errors.push({ source: 'pipeline.data', error: 'Timeout' });
    resolve();
  }, 90000));

  await Promise.race([Promise.allSettled(dataJobs), dataTimeout]);

  // Phase 2: Claude analysis (needs data from phase 1)
  try {
    const analysis = await Promise.race([
      runClaudeAnalysis(intakeData, result.apify, result.exa, result.llmAwareness),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 45000))
    ]);
    result.analysis = analysis;
  } catch (e: any) {
    result.meta.errors.push({ source: 'analysis', error: e.message });
  }

  result.meta.completedAt = new Date().toISOString();
  result.meta.duration = Date.now() - startTime;

  console.log(`[v4] Enrichment complete in ${result.meta.duration}ms (${result.meta.errors.length} errors)`);
  return result;
}
