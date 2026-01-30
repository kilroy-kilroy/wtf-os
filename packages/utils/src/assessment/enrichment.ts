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
    queriesUsed: string[];
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
  icpProblemAwareness: {
    score: number;
    verdict: string;
    problemCoverage: Array<{
      problem: string;
      addressed: boolean;
      where: string;
    }>;
    coveragePercent: number;
    missingProblems: string[];
    contentOpportunities: string[];
    recommendations: string[];
  } | null;
}

// ============================================
// BRIGHT DATA SCRAPERS
// ============================================

const BRIGHT_DATA_API = process.env.BRIGHT_DATA_API;
const BRIGHT_DATA_BASE = 'https://api.brightdata.com/datasets/v3';

// Dataset IDs from Bright Data scraper library
const BD_DATASETS = {
  linkedinProfile: 'gd_l1viktl72bvl7bjuj0',
  linkedinCompany: 'gd_l1vikfnt1wgvvqz95w',
  linkedinPosts: 'gd_lyy3tktm25m4avu764',
  chatgpt: 'gd_m7aof0k82r803d5bjm',
};

async function bdTrigger(datasetId: string, input: any[]): Promise<string | null> {
  if (!BRIGHT_DATA_API) return null;

  try {
    // Try trigger endpoint with bare array first, fall back to scrape endpoint
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
      const body = await response.text().catch(() => '');
      console.error(`[BrightData] Trigger (bare array) failed for ${datasetId}: ${response.status} - ${body}`);

      // Retry with {"input": [...]} wrapper format
      const response2 = await fetch(`${BRIGHT_DATA_BASE}/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response2.ok) {
        const body2 = await response2.text().catch(() => '');
        console.error(`[BrightData] Trigger (wrapped) failed for ${datasetId}: ${response2.status} - ${body2}`);
        return null;
      }

      const data2 = await response2.json();
      return data2.snapshot_id || null;
    }

    const data = await response.json();
    return data.snapshot_id || null;
  } catch (error: any) {
    console.error(`[BrightData] Trigger error for ${datasetId}:`, error.message);
    return null;
  }
}

async function bdPollAndDownload(snapshotId: string, maxWaitMs: number = 60000): Promise<any[]> {
  if (!BRIGHT_DATA_API || !snapshotId) return [];

  const startTime = Date.now();
  const pollInterval = 10000; // Docs recommend 10s intervals

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Per docs: poll snapshot endpoint, 202=running, 200=ready
      const response = await fetch(`${BRIGHT_DATA_BASE}/snapshot/${snapshotId}?format=json`, {
        headers: { 'Authorization': `Bearer ${BRIGHT_DATA_API}` },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log(`[BrightData] Snapshot ${snapshotId} ready, got ${Array.isArray(data) ? data.length : 1} results`);
        return Array.isArray(data) ? data : [data];
      }

      if (response.status === 202) {
        // Still running, continue polling
      } else {
        const body = await response.text().catch(() => '');
        console.error(`[BrightData] Snapshot ${snapshotId} unexpected status ${response.status}: ${body}`);
        return [];
      }
    } catch {
      // Continue polling on network errors
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.warn(`[BrightData] Snapshot ${snapshotId} timed out after ${maxWaitMs}ms`);
  return [];
}

async function bdScrapeLinkedInProfile(linkedinUrl: string | undefined): Promise<ApifyLinkedInProfile | null> {
  if (!BRIGHT_DATA_API || !linkedinUrl) return null;

  try {
    // Normalize LinkedIn URL
    const url = linkedinUrl.trim().replace(/\/$/, '');
    console.log(`[BrightData] Scraping LinkedIn profile: ${url}`);
    const snapshotId = await bdTrigger(BD_DATASETS.linkedinProfile, [{ url }]);
    if (!snapshotId) return null;

    const results = await bdPollAndDownload(snapshotId, 60000);
    const profile = results[0];
    if (!profile) return null;

    return {
      name: profile.full_name || profile.name || profile.fullName || '',
      headline: profile.headline || profile.position || '',
      about: (profile.about || profile.summary || profile.description || '').substring(0, 2000),
      followerCount: profile.followers || profile.follower_count || profile.followersCount || 0,
      connectionCount: profile.connections || profile.connection_count || profile.connectionsCount || 0,
    };
  } catch (error: any) {
    console.error('[BrightData] LinkedIn profile scrape failed:', error.message);
    return null;
  }
}

async function bdScrapeLinkedInCompany(linkedinUrl: string | undefined): Promise<ApifyLinkedInProfile | null> {
  if (!BRIGHT_DATA_API || !linkedinUrl) return null;

  try {
    const url = linkedinUrl.trim().replace(/\/$/, '');
    console.log(`[BrightData] Scraping LinkedIn company: ${url}`);
    const snapshotId = await bdTrigger(BD_DATASETS.linkedinCompany, [{ url }]);
    if (!snapshotId) return null;

    const results = await bdPollAndDownload(snapshotId, 60000);
    const company = results[0];
    if (!company) return null;

    return {
      name: company.name || company.company_name || '',
      headline: company.tagline || company.headline || '',
      about: (company.about || company.description || company.overview || '').substring(0, 2000),
      followerCount: company.followers || company.follower_count || company.followersCount || 0,
      connectionCount: company.employee_count || company.employees || 0,
    };
  } catch (error: any) {
    console.error('[BrightData] LinkedIn company scrape failed:', error.message);
    return null;
  }
}

async function bdScrapeLinkedInPosts(linkedinUrl: string | undefined): Promise<ApifyLinkedInPosts | null> {
  if (!BRIGHT_DATA_API || !linkedinUrl) return null;

  try {
    const snapshotId = await bdTrigger(BD_DATASETS.linkedinPosts, [{ url: linkedinUrl }]);
    if (!snapshotId) return null;

    const results = await bdPollAndDownload(snapshotId, 60000);
    if (!results.length) return null;

    const posts = results.slice(0, 20).map((item: any) => ({
      text: (item.post_text || item.text || item.content || item.description || '').substring(0, 2000),
      date: item.post_date || item.date || item.posted_at || '',
      likes: item.num_likes || item.likes || item.reactions || 0,
      comments: item.num_comments || item.comments || 0,
      shares: item.num_shares || item.shares || item.reposts || 0,
    }));

    const totalEngagement = posts.reduce((sum: number, p: any) => sum + p.likes + p.comments + p.shares, 0);
    const allText = posts.map((p: any) => p.text).join(' ').toLowerCase();
    const topTopics = extractTopics(allText);

    return {
      posts,
      postCount: posts.length,
      avgEngagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
      topTopics,
    };
  } catch (error: any) {
    console.error('[BrightData] LinkedIn posts scrape failed:', error.message);
    return null;
  }
}

async function bdSearchChatGPT(prompt: string): Promise<string> {
  if (!BRIGHT_DATA_API) throw new Error('Not configured');

  // Use synchronous /scrape endpoint (real-time) per Bright Data docs
  const response = await fetch(`${BRIGHT_DATA_BASE}/scrape?dataset_id=${BD_DATASETS.chatgpt}&format=json&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BRIGHT_DATA_API}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [{
        url: 'https://chatgpt.com/',
        prompt,
        country: '',
        web_search: false,
        additional_prompt: '',
      }],
    }),
    signal: AbortSignal.timeout(90000), // ChatGPT scraping can be slow
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[BrightData] ChatGPT scrape failed: ${response.status} - ${body}`);
    throw new Error(`ChatGPT scrape failed: ${response.status}`);
  }

  // 200 = data ready, 202 = async (poll snapshot)
  if (response.status === 202) {
    const data = await response.json();
    if (data.snapshot_id) {
      const results = await bdPollAndDownload(data.snapshot_id, 60000);
      const result = results[0];
      if (!result) throw new Error('No result from async');
      return extractBdChatGPTText(result);
    }
    throw new Error('No snapshot_id in 202 response');
  }

  const results = await response.json();
  const result = Array.isArray(results) ? results[0] : results;
  if (!result) throw new Error('No result');

  return extractBdChatGPTText(result);
}

function extractBdChatGPTText(result: any): string {
  // BD ChatGPT scraper returns answer_html (raw HTML) — extract plain text
  if (result.answer_html) {
    // Strip HTML tags to get plain text
    const text = result.answer_html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 10) return text;
  }
  // Try other possible fields
  if (result.answer_text && result.answer_text.length > 10) return result.answer_text;
  if (result.answer && result.answer.length > 10) return result.answer;
  if (result.content && result.content.length > 10) return result.content;
  if (result.response && result.response.length > 10) return result.response;
  if (result.text && result.text.length > 10) return result.text;
  // Log the actual keys so we can debug
  console.log(`[BrightData] ChatGPT result keys: ${Object.keys(result).join(', ')}`);
  return JSON.stringify(result);
}

// ============================================
// APIFY SCRAPERS (fallback for website scraping)
// ============================================

const APIFY_TOKEN = process.env.APIFY_API_KEY || process.env.APIFY_API_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

async function runApifyActor(actorId: string, input: any, maxWaitMs: number = 60000): Promise<any[]> {
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
  const runId = run.data?.id;
  if (!runId) throw new Error('No run ID returned');

  // Poll for completion instead of fixed wait
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds between polls
  let status = run.data?.status;

  while (Date.now() - startTime < maxWaitMs) {
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const statusResponse = await fetch(`${APIFY_BASE}/acts/${actorId}/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
        signal: AbortSignal.timeout(10000)
      });
      const statusData = await statusResponse.json();
      status = statusData.data?.status;
    } catch {
      // If status check fails, keep waiting
    }
  }

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
      { url: `${baseUrl}/testimonial` },
      { url: `${baseUrl}/reviews` },
      { url: `${baseUrl}/results` },
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

        if (url.includes('case') || url.includes('work') || url.includes('portfolio') || url.includes('client') || url.includes('result') || url.includes('gen-plus')) {
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

        if (url.includes('testimonial') || url.includes('review') || url.includes('fire-yourself') || url.includes('gen-plus')) {
          result.type = 'testimonials';
          // Try structured testimonial elements first
          var testimonials = $('blockquote, [class*="testimonial"], [class*="quote"], [class*="review"], [class*="client-story"], [class*="success"]').map((_, el) => ({
            text: $(el).find('p, .text, .content').first().text().trim() || $(el).text().trim(),
            author: $(el).find('[class*="author"], [class*="name"], cite, strong, b').first().text().trim() || null,
            company: $(el).find('[class*="company"], [class*="title"], [class*="role"]').first().text().trim() || null
          })).get().slice(0, 15);
          // Fallback: grab any paragraphs on testimonial pages as potential testimonials
          if (testimonials.length === 0 && (url.includes('testimonial') || url.includes('review'))) {
            testimonials = $('main p, article p, .content p, section p').filter((_, el) => $(el).text().trim().length > 50).map((_, el) => ({
              text: $(el).text().trim().substring(0, 500),
              author: null,
              company: null
            })).get().slice(0, 10);
          }
          result.testimonials = testimonials;
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

        // Look for client logos on any page — broad search
        result.logos = $('img[class*="logo"], img[class*="client"], img[class*="partner"], img[class*="brand"], [class*="logo"] img, [class*="client"] img, [class*="partner"] img, [class*="trusted"] img, [class*="featured"] img').map((_, el) => $(el).attr('alt') || $(el).attr('title') || $(el).attr('src')?.split('/').pop()?.replace(/[-_]/g, ' ')?.replace(/\.\w+$/, '') || '').get().filter(t => t.length > 1 && t.length < 100).slice(0, 30);
        // Also check for client names in text on /gen-plus, /clients type pages
        if (url.includes('gen-plus') || url.includes('client') || url.includes('partner')) {
          var clientNames = $('h3, h4, [class*="client-name"], [class*="company"], figcaption').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 2 && t.length < 60);
          if (clientNames.length > 0) result.logos = (result.logos || []).concat(clientNames);
        }

        return result;
      }`,
      maxPagesPerCrawl: 15,
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

const EXA_API_KEY = process.env.EXA_API_KEY || process.env.EXA_API;

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

async function buildAwarenessPrompts(intakeData: IntakeData): Promise<string[]> {
  // Use Claude to generate the queries a real buyer would type.
  // The user filled out what they do (coreOffer), who they serve (statedICP/targetMarket),
  // and what industry/size. Claude reads all of this and produces 3 natural queries
  // that the user's ICP would actually search for.

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: build simple queries from the data directly
    return buildFallbackPrompts(intakeData);
  }

  const context = `
The person taking this assessment runs a business:
- Business name: ${intakeData.agencyName || 'Unknown'}
- What they do (core offer): ${intakeData.coreOffer || 'Unknown'}
- Who they serve (ICP): ${intakeData.statedICP || intakeData.targetMarket || 'Unknown'}
- Target industry: ${intakeData.targetIndustry || 'Not specified'}
- Target company size: ${intakeData.targetCompanySize || 'Not specified'}
- Their differentiator: ${intakeData.differentiator || 'Not stated'}
`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `${context}

Generate exactly 3 search queries that this person's IDEAL CUSTOMER would type into an AI assistant (ChatGPT, Claude, Perplexity) when looking for help.

The queries should sound like a real person with a real problem — casual, specific, sometimes messy. Think about how someone actually talks when they need help:
- "Good SEO agency for dental offices who need better local visibility"
- "I need an amazon agency that can really scale my car parts biz"
- "What agencies can help my business? I am a high-end cabinet maker that isn't getting good inquiries"
- "Great web developer for SMB in Augusta"
- "Best agency coaches for agencies under $10mm"

The queries should:
1. Describe what KIND of business/person they're looking for (agency, coach, consultant, developer, etc.)
2. Mention the ICP's industry or business type naturally
3. Reference the actual problem or need
4. Sound like a real person typed them, not a template
5. Each query should take a different angle (one direct, one problem-focused, one casual)

Return ONLY the 3 queries, one per line. No numbering, no quotes, no explanation.`
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return buildFallbackPrompts(intakeData);

    const data = await response.json();
    const text = data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';

    const queries = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 10 && l.length < 300);
    if (queries.length >= 2) return queries.slice(0, 3);

    return buildFallbackPrompts(intakeData);
  } catch {
    return buildFallbackPrompts(intakeData);
  }
}

function buildFallbackPrompts(intakeData: IntakeData): string[] {
  // Simple fallback using the actual fields directly.
  // Pattern: "good {what they do} for {who they serve}"
  const offer = intakeData.coreOffer || 'marketing help';
  const icp = intakeData.statedICP || intakeData.targetMarket || 'small businesses';
  // Take just the first line of coreOffer for a cleaner query
  const offerShort = offer.split('\n')[0].trim().substring(0, 80);

  return [
    `Best ${offerShort} for ${icp}. Who are the go-to people? Give me names.`,
    `I need help with ${offerShort}. My business is ${icp}. Who should I talk to?`,
    `Good ${offerShort} providers that specialize in ${icp}. Recommendations?`,
  ];
}

function checkMentions(text: string, intakeData: IntakeData) {
  const lower = (text || '').toLowerCase();
  const agencyName = (intakeData.agencyName || '').toLowerCase();
  const founderName = (intakeData.founderName || '').toLowerCase();

  // Check agency name — full match, word-by-word, and domain-based
  const agencyWords = agencyName.split(/[\s\-–.]+/).filter(w => w.length > 2);
  const domain = extractDomain(intakeData.website || '').replace(/\.com|\.co|\.io|\.org|\.net/g, '');
  const agencyMentioned = agencyName.length > 2 && (
    lower.includes(agencyName) ||
    (agencyWords.length > 1 && agencyWords.every(w => lower.includes(w))) ||
    (domain.length > 3 && lower.includes(domain))
  );

  // Check founder name — full name, and also first+last appearing near each other
  const founderWords = founderName.split(/\s+/).filter(w => w.length > 2);
  const founderMentioned = founderName.length > 2 && (
    lower.includes(founderName) ||
    (founderWords.length >= 2 && founderWords.every(w => lower.includes(w)))
  );

  return { agencyMentioned: agencyMentioned || founderMentioned, founderMentioned };
}

function extractCompetitorNames(text: string, intakeData: IntakeData): string[] {
  const agencyName = (intakeData.agencyName || '').toLowerCase();
  const founderName = (intakeData.founderName || '').toLowerCase();
  const lines = text.split('\n');
  const names: string[] = [];

  // Generic category words that indicate a description, not a business name
  const genericTerms = [
    'consulting', 'firms', 'agencies', 'services', 'solutions', 'group',
    'management', 'strategy', 'marketing', 'digital', 'growth', 'revenue',
    'advisory', 'partners', 'network', 'platform', 'institute', 'association',
  ];

  // Business suffixes that indicate a company name
  const businessSuffixes = /\b(inc|llc|ltd|co|corp|group|agency|media|labs|studios?|digital|creative|consulting|partners|associates|solutions|enterprises)\b/i;

  for (const line of lines) {
    const patterns = [
      /(?:\d+\.\s*\*{0,2})([A-Z][a-zA-Z\s&.]+?)(?:\*{0,2}\s*[-–:])/g,
      /\*\*([A-Z][a-zA-Z\s&.]+?)\*\*/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const name = match[1].trim();
        if (name.length < 3 || name.length > 40) continue;
        if (name.toLowerCase().includes(agencyName)) continue;
        if (founderName && name.toLowerCase().includes(founderName)) continue;

        // Filter out generic category descriptions
        const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const genericWordCount = words.filter(w => genericTerms.some(t => w.includes(t))).length;
        if (words.length > 0 && genericWordCount === words.length) continue;

        if (/^The\s+\w+$/i.test(name) && genericTerms.some(t => name.toLowerCase().includes(t))) continue;

        // Filter out individual people's names (2-3 words, all capitalized, no business suffix)
        // e.g. "Jeb Blount", "Marcus Sheridan" — these are people, not companies
        const nameWords = name.split(/\s+/);
        if (nameWords.length >= 2 && nameWords.length <= 3 &&
            nameWords.every(w => /^[A-Z][a-z]+$/.test(w)) &&
            !businessSuffixes.test(name)) {
          continue;
        }

        // Filter out action phrases / advice headings that start with verbs
        // e.g. "Review Your Value Proposition", "Improve Client Retention"
        const actionVerbs = /^(review|improve|expand|enhance|invest|consider|explore|develop|build|create|focus|implement|leverage|optimize|increase|reduce|establish|strengthen|evaluate|adopt|prioritize|ensure)\b/i;
        if (actionVerbs.test(name)) continue;

        // Must contain at least one word that looks like a proper noun / brand
        // Filter out pure generic phrases like "Client Retention" or "Marketing Efforts"
        const hasProperNoun = nameWords.some(w =>
          /^[A-Z]/.test(w) && !genericTerms.some(t => w.toLowerCase().includes(t)) &&
          !['Your', 'The', 'And', 'For', 'With', 'Our', 'Their', 'Its', 'New', 'Best', 'Top', 'Key', 'How', 'Why', 'More', 'All', 'Any', 'Each', 'Most', 'Some', 'Client', 'Base', 'Efforts', 'Retention', 'Proposition', 'Value'].includes(w)
        );
        if (!hasProperNoun) continue;

        names.push(name);
      }
    }
  }

  return [...new Set(names)].slice(0, 10);
}

async function checkLLMAwareness(
  provider: string,
  apiCall: (prompt: string) => Promise<string>,
  intakeData: IntakeData,
  prompts?: string[],
): Promise<LLMAwarenessCheck> {
  try {
    if (!prompts) prompts = await buildAwarenessPrompts(intakeData);
    console.log(`[LLM-${provider}] Queries:`, prompts);
    const responses = await Promise.allSettled(prompts.map(p => apiCall(p)));

    const allText = responses
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value)
      .join('\n');

    if (!allText) {
      console.log(`[LLM-${provider}] No responses received`);
      return { provider, available: false, agencyMentioned: false, founderMentioned: false, competitorsMentioned: [], error: 'No responses' };
    }

    console.log(`[LLM-${provider}] Response length: ${allText.length}, first 300: ${allText.substring(0, 300)}`);
    const mentions = checkMentions(allText, intakeData);
    const competitors = extractCompetitorNames(allText, intakeData);
    console.log(`[LLM-${provider}] Mentions: agency=${mentions.agencyMentioned}, founder=${mentions.founderMentioned}, competitors=${competitors.join(', ')}`);

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
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
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
  // Try Bright Data ChatGPT scraper first (real ChatGPT responses)
  if (BRIGHT_DATA_API) {
    try {
      const result = await bdSearchChatGPT(prompt);
      if (result) return result;
    } catch {
      console.log('[v4] Bright Data ChatGPT failed, falling back to OpenAI API');
    }
  }

  // Fallback to OpenAI API
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
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
  // Generate queries once and share across all providers
  const queriesUsed = await buildAwarenessPrompts(intakeData);
  console.log(`[LLM] Awareness queries generated:`, queriesUsed);

  const [claude, chatgpt, perplexity] = await Promise.allSettled([
    checkLLMAwareness('claude', callClaude, intakeData, queriesUsed),
    checkLLMAwareness('chatgpt', callChatGPT, intakeData, queriesUsed),
    checkLLMAwareness('perplexity', callPerplexity, intakeData, queriesUsed),
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
      queriesUsed,
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
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
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
    callClaudeAnalysis(apiKey, `Analyze the ICP PROBLEM AWARENESS for this agency. Cross-reference the ICP problems discovered via Exa research against ALL of the agency's content — website copy, blog posts, LinkedIn posts, case studies. For each ICP problem, determine if the agency addresses it anywhere, and where.

${contextBlock}

Respond with ONLY valid JSON matching this schema:
{
  "score": <1-10>,
  "verdict": "<one sentence>",
  "problemCoverage": [
    {"problem": "<icp problem>", "addressed": true/false, "where": "<where addressed or 'Not found'>"},
    ...
  ],
  "coveragePercent": <0-100>,
  "missingProblems": ["<problem not addressed>", ...],
  "contentOpportunities": ["<specific content piece they should create>", ...],
  "recommendations": ["<rec1>", "<rec2>"]
}`),
  ]);

  return {
    positioningCoherence: parseAnalysisResult(analyses[0]),
    contentMarketFit: parseAnalysisResult(analyses[1]),
    socialProofAlignment: parseAnalysisResult(analyses[2]),
    icpProblemAwareness: parseAnalysisResult(analyses[3]),
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
    let text = result.value;
    // Try multiple extraction strategies
    const jsonMatch =
      text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) text = jsonMatch[1];
    // Strip any leading/trailing non-JSON characters
    text = text.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    return JSON.parse(text);
  } catch {
    console.error('[Analysis] Failed to parse Claude response:', result.value?.substring(0, 200));
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
    bdScrapeLinkedInProfile(intakeData.founderLinkedinUrl)
      .then(d => { if (d) result.apify.founderLinkedin = d; })
      .catch(() => apifyScrapeLinkedInProfile(intakeData.founderLinkedinUrl).then(d => { result.apify.founderLinkedin = d; }))
      .catch(e => { result.meta.errors.push({ source: 'bd.founderProfile', error: e.message }); }),
    // BD posts dataset requires post/article URLs, not profile URLs — use Apify for posts
    apifyScrapeLinkedInPosts(intakeData.founderLinkedinUrl).then(d => { result.apify.founderPosts = d; }).catch(e => { result.meta.errors.push({ source: 'apify.founderPosts', error: e.message }); }),
    bdScrapeLinkedInCompany(intakeData.companyLinkedinUrl)
      .then(d => { if (d) result.apify.companyLinkedin = d; })
      .catch(() => apifyScrapeLinkedInProfile(intakeData.companyLinkedinUrl).then(d => { result.apify.companyLinkedin = d; }))
      .catch(e => { result.meta.errors.push({ source: 'bd.companyProfile', error: e.message }); }),
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
