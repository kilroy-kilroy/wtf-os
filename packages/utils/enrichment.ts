/**
 * V3 Enrichment Pipeline (TypeScript)
 * Orchestrates external data collection in parallel:
 * - Apify: website homepage, case studies, LinkedIn posts
 * - Exa: visibility, authority, competitor searches
 * - LLM: Claude, ChatGPT, Perplexity awareness checks
 */

import type { IntakeData } from './scoring';

// ============================================
// TYPES
// ============================================

export interface EnrichmentResult {
  apify: {
    homepage: ApifyHomepage | null;
    caseStudies: ApifyCaseStudies | null;
    founderPosts: ApifyLinkedInPosts | null;
    companyPosts: ApifyLinkedInPosts | null;
  };
  exa: {
    visibility: ExaSearchResult | null;
    authority: ExaSearchResult | null;
    competitors: ExaSearchResult | null;
  };
  llmAwareness: LLMAwarenessResult | null;
  meta: {
    startedAt: string;
    completedAt: string | null;
    duration: number | null;
    errors: Array<{ source: string; error: string }>;
  };
}

interface ApifyHomepage {
  h1: string[];
  h2: string[];
  metaDescription: string;
  aboveFoldCopy: string;
  navItems: string[];
}

interface ApifyCaseStudies {
  count: number;
  caseStudies: Array<{
    title: string;
    clientName: string | null;
    hasMetrics: boolean;
    hasTestimonial: boolean;
    dateRange: string | null;
  }>;
  anonymous: boolean;
}

interface ApifyLinkedInPosts {
  posts: Array<{
    text: string;
    date: string;
    likes: number;
    comments: number;
  }>;
  postCount: number;
  avgEngagement: number;
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
  };
}

// ============================================
// APIFY SCRAPERS
// ============================================

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

async function apifyScrapeHomepage(websiteUrl: string): Promise<ApifyHomepage | null> {
  if (!APIFY_TOKEN || !websiteUrl) return null;

  try {
    const response = await fetch(`${APIFY_BASE}/acts/apify~web-scraper/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_TOKEN}`
      },
      body: JSON.stringify({
        startUrls: [{ url: websiteUrl }],
        pageFunction: `async function pageFunction(context) {
          const $ = context.jQuery;
          return {
            h1: $('h1').map((_, el) => $(el).text().trim()).get(),
            h2: $('h2').map((_, el) => $(el).text().trim()).get(),
            metaDescription: $('meta[name="description"]').attr('content') || '',
            aboveFoldCopy: $('header, [class*="hero"], [class*="banner"]').first().text().trim().substring(0, 1000),
            navItems: $('nav a, header a').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 0)
          };
        }`,
        maxPagesPerCrawl: 1
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error(`Apify returned ${response.status}`);
    const run = await response.json();

    // Wait for completion and get results
    const datasetUrl = `${APIFY_BASE}/datasets/${run.data.defaultDatasetId}/items`;
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for scrape

    const dataResponse = await fetch(datasetUrl, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
      signal: AbortSignal.timeout(15000)
    });

    const items = await dataResponse.json();
    return items[0] || null;
  } catch (error: any) {
    console.error('[Apify] Homepage scrape failed:', error.message);
    return null;
  }
}

async function apifyScrapeCaseStudies(websiteUrl: string): Promise<ApifyCaseStudies | null> {
  if (!APIFY_TOKEN || !websiteUrl) return null;

  const commonPaths = ['/case-studies', '/work', '/clients', '/portfolio', '/results'];
  const baseUrl = new URL(websiteUrl).origin;

  try {
    const startUrls = commonPaths.map(path => ({ url: `${baseUrl}${path}` }));

    const response = await fetch(`${APIFY_BASE}/acts/apify~web-scraper/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_TOKEN}`
      },
      body: JSON.stringify({
        startUrls,
        pageFunction: `async function pageFunction(context) {
          const $ = context.jQuery;
          const cards = $('[class*="case"], [class*="study"], [class*="portfolio"], [class*="work"] article, .card').slice(0, 20);
          return {
            url: context.request.url,
            title: $('h1').first().text().trim(),
            count: cards.length,
            items: cards.map((_, el) => ({
              title: $(el).find('h2, h3, h4').first().text().trim(),
              hasMetrics: /\\d+%|\\$\\d|\\dx|\\d+x/.test($(el).text()),
              hasTestimonial: $(el).find('blockquote, [class*="quote"], [class*="testimonial"]').length > 0
            })).get()
          };
        }`,
        maxPagesPerCrawl: 5
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error(`Apify returned ${response.status}`);
    const run = await response.json();

    await new Promise(resolve => setTimeout(resolve, 15000));

    const dataResponse = await fetch(`${APIFY_BASE}/datasets/${run.data.defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
      signal: AbortSignal.timeout(15000)
    });

    const items = await dataResponse.json();
    const allStudies = items.flatMap((page: any) => page.items || []);

    return {
      count: allStudies.length,
      caseStudies: allStudies.map((s: any) => ({
        title: s.title || 'Untitled',
        clientName: null,
        hasMetrics: s.hasMetrics || false,
        hasTestimonial: s.hasTestimonial || false,
        dateRange: null
      })),
      anonymous: allStudies.every((s: any) => !s.title || s.title === 'Untitled')
    };
  } catch (error: any) {
    console.error('[Apify] Case studies scrape failed:', error.message);
    return null;
  }
}

async function apifyScrapeLinkedInPosts(linkedinUrl: string | undefined): Promise<ApifyLinkedInPosts | null> {
  if (!APIFY_TOKEN || !linkedinUrl) return null;

  try {
    const response = await fetch(`${APIFY_BASE}/acts/curious_coder~linkedin-post-search-scraper/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_TOKEN}`
      },
      body: JSON.stringify({
        urls: [linkedinUrl],
        maxResults: 20,
        sortBy: 'date_posted'
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error(`Apify returned ${response.status}`);
    const run = await response.json();

    await new Promise(resolve => setTimeout(resolve, 20000));

    const dataResponse = await fetch(`${APIFY_BASE}/datasets/${run.data.defaultDatasetId}/items`, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
      signal: AbortSignal.timeout(15000)
    });

    const items = await dataResponse.json();
    const posts = items.map((item: any) => ({
      text: (item.text || item.postText || '').substring(0, 2000),
      date: item.postedDate || item.date || '',
      likes: item.numLikes || item.likes || 0,
      comments: item.numComments || item.comments || 0
    }));

    const totalEngagement = posts.reduce((sum: number, p: any) => sum + p.likes + p.comments, 0);

    return {
      posts,
      postCount: posts.length,
      avgEngagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0
    };
  } catch (error: any) {
    console.error('[Apify] LinkedIn scrape failed:', error.message);
    return null;
  }
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

async function exaVisibilitySearch(intakeData: IntakeData): Promise<ExaSearchResult | null> {
  const query = `agencies that help ${intakeData.targetMarket} with ${intakeData.coreOffer}`;
  return exaSearch(query, 50, intakeData);
}

async function exaAuthoritySearch(intakeData: IntakeData): Promise<ExaSearchResult | null> {
  const industry = intakeData.targetMarket.split(' ').slice(0, 3).join(' ');
  const query = `experts in ${industry} marketing`;
  return exaSearch(query, 20, intakeData);
}

async function exaCompetitorSearch(intakeData: IntakeData): Promise<ExaSearchResult | null> {
  const query = `${intakeData.coreOffer} for ${intakeData.targetMarket}`;
  return exaSearch(query, 5, intakeData);
}

// ============================================
// LLM AWARENESS CHECKS
// ============================================

function buildAwarenessPrompt(intakeData: IntakeData): string {
  return `Who are the best agencies helping ${intakeData.targetMarket} with ${intakeData.coreOffer}? List the top agencies with their names and why they stand out.`;
}

function checkMentions(text: string, intakeData: IntakeData) {
  const lower = (text || '').toLowerCase();
  const agencyName = (intakeData.agencyName || '').toLowerCase();
  const founderName = (intakeData.founderName || '').toLowerCase();

  return {
    agencyMentioned: agencyName.length > 2 && lower.includes(agencyName),
    founderMentioned: founderName.length > 2 && lower.includes(founderName)
  };
}

async function checkClaudeAwareness(intakeData: IntakeData): Promise<LLMAwarenessCheck> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return { provider: 'claude', available: false, agencyMentioned: false, founderMentioned: false, error: 'Not configured' };

  try {
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
        messages: [{ role: 'user', content: buildAwarenessPrompt(intakeData) }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    const text = data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';
    const mentions = checkMentions(text, intakeData);

    return { provider: 'claude', available: true, ...mentions, rawResponse: text };
  } catch (error: any) {
    return { provider: 'claude', available: false, agencyMentioned: false, founderMentioned: false, error: error.message };
  }
}

async function checkChatGPTAwareness(intakeData: IntakeData): Promise<LLMAwarenessCheck> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { provider: 'chatgpt', available: false, agencyMentioned: false, founderMentioned: false, error: 'Not configured' };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildAwarenessPrompt(intakeData) }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const mentions = checkMentions(text, intakeData);

    return { provider: 'chatgpt', available: true, ...mentions, rawResponse: text };
  } catch (error: any) {
    return { provider: 'chatgpt', available: false, agencyMentioned: false, founderMentioned: false, error: error.message };
  }
}

async function checkPerplexityAwareness(intakeData: IntakeData): Promise<LLMAwarenessCheck> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { provider: 'perplexity', available: false, agencyMentioned: false, founderMentioned: false, error: 'Not configured' };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildAwarenessPrompt(intakeData) }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const mentions = checkMentions(text, intakeData);

    return { provider: 'perplexity', available: true, ...mentions, rawResponse: text };
  } catch (error: any) {
    return { provider: 'perplexity', available: false, agencyMentioned: false, founderMentioned: false, error: error.message };
  }
}

async function runLLMAwarenessChecks(intakeData: IntakeData): Promise<LLMAwarenessResult> {
  const [claude, chatgpt, perplexity] = await Promise.allSettled([
    checkClaudeAwareness(intakeData),
    checkChatGPTAwareness(intakeData),
    checkPerplexityAwareness(intakeData)
  ]);

  const results = {
    claude: claude.status === 'fulfilled' ? claude.value : { provider: 'claude', available: false, agencyMentioned: false, founderMentioned: false, error: 'Failed' },
    chatgpt: chatgpt.status === 'fulfilled' ? chatgpt.value : { provider: 'chatgpt', available: false, agencyMentioned: false, founderMentioned: false, error: 'Failed' },
    perplexity: perplexity.status === 'fulfilled' ? perplexity.value : { provider: 'perplexity', available: false, agencyMentioned: false, founderMentioned: false, error: 'Failed' }
  };

  const checks = [results.claude, results.chatgpt, results.perplexity];
  const available = checks.filter(c => c.available);

  return {
    ...results,
    summary: {
      totalChecked: available.length,
      agencyMentionedIn: available.filter(c => c.agencyMentioned).length,
      founderMentionedIn: available.filter(c => c.founderMentioned).length,
      score: available.length > 0
        ? Math.round(((available.filter(c => c.agencyMentioned).length + available.filter(c => c.founderMentioned).length) / (available.length * 2)) * 100)
        : 0
    }
  };
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

const PIPELINE_TIMEOUT = 90000;

export async function runEnrichmentPipeline(intakeData: IntakeData): Promise<EnrichmentResult> {
  console.log(`[v3] Starting enrichment pipeline for: ${intakeData.agencyName}`);
  const startTime = Date.now();

  const result: EnrichmentResult = {
    apify: { homepage: null, caseStudies: null, founderPosts: null, companyPosts: null },
    exa: { visibility: null, authority: null, competitors: null },
    llmAwareness: null,
    meta: {
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: null,
      errors: []
    }
  };

  // All sources in parallel
  const jobs: Promise<void>[] = [
    apifyScrapeHomepage(intakeData.website).then(d => { result.apify.homepage = d; }).catch(e => { result.meta.errors.push({ source: 'apify.homepage', error: e.message }); }),
    apifyScrapeCaseStudies(intakeData.website).then(d => { result.apify.caseStudies = d; }).catch(e => { result.meta.errors.push({ source: 'apify.caseStudies', error: e.message }); }),
    apifyScrapeLinkedInPosts(intakeData.founderLinkedinUrl).then(d => { result.apify.founderPosts = d; }).catch(e => { result.meta.errors.push({ source: 'apify.founderPosts', error: e.message }); }),
    apifyScrapeLinkedInPosts(intakeData.companyLinkedinUrl).then(d => { result.apify.companyPosts = d; }).catch(e => { result.meta.errors.push({ source: 'apify.companyPosts', error: e.message }); }),
    exaVisibilitySearch(intakeData).then(d => { result.exa.visibility = d; }).catch(e => { result.meta.errors.push({ source: 'exa.visibility', error: e.message }); }),
    exaAuthoritySearch(intakeData).then(d => { result.exa.authority = d; }).catch(e => { result.meta.errors.push({ source: 'exa.authority', error: e.message }); }),
    exaCompetitorSearch(intakeData).then(d => { result.exa.competitors = d; }).catch(e => { result.meta.errors.push({ source: 'exa.competitors', error: e.message }); }),
    runLLMAwarenessChecks(intakeData).then(d => { result.llmAwareness = d; }).catch(e => { result.meta.errors.push({ source: 'llm', error: e.message }); })
  ];

  const timeout = new Promise<void>(resolve => setTimeout(() => {
    result.meta.errors.push({ source: 'pipeline', error: 'Timeout' });
    resolve();
  }, PIPELINE_TIMEOUT));

  await Promise.race([Promise.allSettled(jobs), timeout]);

  result.meta.completedAt = new Date().toISOString();
  result.meta.duration = Date.now() - startTime;

  console.log(`[v3] Enrichment complete in ${result.meta.duration}ms (${result.meta.errors.length} errors)`);
  return result;
}
