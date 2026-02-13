export const maxDuration = 300; // 5 minutes - research chain (240s) + Claude analysis

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  runModel,
  retryWithBackoff,
  enrichCompanyWithApollo,
  enrichContactWithApollo,
  fetchCompanyNews,
  runV2DiscoveryResearch,
  type V2ResearchResult,
} from '@repo/utils';
import {
  DISCOVERY_LAB_LITE_SYSTEM,
  DISCOVERY_LAB_LITE_USER,
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  parseDiscoveryMetadata,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';
import { onDiscoveryReportGenerated } from '@/lib/loops';
import { addDiscoveryLabSubscriber } from '@/lib/beehiiv';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.requestor_name || !body.requestor_email || !body.service_offered || !body.target_company) {
      return NextResponse.json(
        {
          error: 'Missing required fields: requestor_name, requestor_email, service_offered, and target_company are required',
        },
        { status: 400 }
      );
    }

    const {
      requestor_name,
      requestor_email,
      requestor_company,
      requestor_website,
      service_offered,
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      target_linkedin,
      target_icp,
      competitors,
      version = 'lite', // 'lite' or 'pro'
      send_email = false, // Whether to email the report to the user
    } = body;

    // Extract domain from website URL for API enrichment
    let domain: string | undefined;
    if (target_website) {
      try {
        const url = new URL(target_website.startsWith('http') ? target_website : `https://${target_website}`);
        domain = url.hostname.replace('www.', '');
      } catch {
        domain = target_website.replace('www.', '').split('/')[0];
      }
    }

    // For Pro v2: run 5-source research chain
    // For Lite: run lightweight enrichment (Apollo + Perplexity news)
    let v2Research: V2ResearchResult | null = null;
    let apolloCompany: Awaited<ReturnType<typeof enrichCompanyWithApollo>> = null;
    let apolloContact: Awaited<ReturnType<typeof enrichContactWithApollo>> = null;
    let newsData: Awaited<ReturnType<typeof fetchCompanyNews>> = { recent_news: [], funding_info: null, raw_response: '' };

    if (version === 'pro') {
      // V2: Run full 5-source research chain (parallel)
      if (!process.env.BRIGHT_DATA_API) {
        console.error('[Discovery:Pro] BRIGHT_DATA_API env var is NOT set - LinkedIn and SERP sources will be unavailable. Add BRIGHT_DATA_API to your environment variables.');
      }
      console.log('Running v2 research chain for:', { target_company, domain, target_contact_name, target_linkedin, hasBrightDataKey: !!process.env.BRIGHT_DATA_API });
      v2Research = await runV2DiscoveryResearch({
        requestor_name,
        requestor_company,
        requestor_website,
        service_offered,
        target_company,
        target_website,
        target_contact: target_contact_name || '',
        target_title: target_contact_title,
        target_linkedin,
        target_icp,
        competitors,
      });

      // Use Apollo/Perplexity results from v2 chain
      apolloCompany = v2Research.apollo_company;
      apolloContact = v2Research.apollo_contact;
      if (v2Research.perplexity) {
        newsData = {
          recent_news: v2Research.perplexity.recent_news,
          funding_info: v2Research.perplexity.funding_info,
          raw_response: v2Research.perplexity.raw_response,
        };
      }

      console.log('V2 research results:', {
        hasPerplexity: !!v2Research.perplexity,
        hasLinkedInProfile: !!v2Research.linkedin_profile,
        hasLinkedInPosts: !!v2Research.linkedin_posts,
        hasSerp: !!v2Research.google_serp,
        hasWebsiteTech: !!v2Research.website_tech,
        hasApolloCompany: !!v2Research.apollo_company,
        hasApolloContact: !!v2Research.apollo_contact,
        errors: v2Research.errors,
      });
    } else {
      // Lite: lightweight enrichment
      console.log('Fetching enriched data for:', { target_company, domain, target_contact_name });
      const results = await Promise.all([
        domain
          ? enrichCompanyWithApollo(domain).catch((e) => {
              console.warn('Apollo company enrichment failed:', e.message);
              return null;
            })
          : Promise.resolve(null),
        domain && target_contact_name
          ? enrichContactWithApollo(target_contact_name, domain).catch((e) => {
              console.warn('Apollo contact enrichment failed:', e.message);
              return null;
            })
          : Promise.resolve(null),
        fetchCompanyNews(target_company, domain).catch((e) => {
          console.warn('Perplexity news fetch failed:', e.message);
          return { recent_news: [] as any[], funding_info: null, raw_response: '' };
        }),
      ]);
      apolloCompany = results[0];
      apolloContact = results[1];
      newsData = results[2];

      console.log('Enrichment results:', {
        hasApolloCompany: !!apolloCompany,
        hasApolloContact: !!apolloContact,
        newsCount: newsData.recent_news.length,
        hasFunding: !!newsData.funding_info,
      });
    }

    // Prepare prompt parameters with enriched data
    const promptParams: DiscoveryLabPromptParams = {
      requestor_name,
      requestor_email,
      requestor_company,
      requestor_website,
      service_offered,
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      target_linkedin,
      target_icp,
      competitors,
      // Add enriched company data
      enriched_company: apolloCompany
        ? {
            industry: apolloCompany.industry,
            employee_count: apolloCompany.employee_count,
            founded_year: apolloCompany.founded_year,
            headquarters: apolloCompany.headquarters
              ? `${apolloCompany.headquarters.city}, ${apolloCompany.headquarters.state || apolloCompany.headquarters.country}`
              : undefined,
            description: apolloCompany.short_description || apolloCompany.description?.slice(0, 300),
            annual_revenue: apolloCompany.annual_revenue,
            total_funding: apolloCompany.total_funding,
            latest_funding_round: apolloCompany.latest_funding_round_type
              ? `${apolloCompany.latest_funding_round_type}${apolloCompany.latest_funding_round_date ? ` (${apolloCompany.latest_funding_round_date})` : ''}`
              : undefined,
            technologies: apolloCompany.technologies,
          }
        : undefined,
      // Add enriched contact data
      enriched_contact: apolloContact
        ? {
            title: apolloContact.title,
            linkedin_url: apolloContact.linkedin_url,
            seniority: apolloContact.seniority,
            employment_history: apolloContact.employment_history
              ?.slice(0, 3)
              .map((j) => `${j.title} at ${j.organization_name}`)
              .join(' → '),
          }
        : undefined,
      // Add news and funding
      recent_news: newsData.recent_news.length > 0 ? newsData.recent_news : undefined,
      funding_info: newsData.funding_info || undefined,
      // V2 research data (Pro only)
      v2_research: v2Research
        ? {
            perplexity_snapshot: v2Research.perplexity?.company_snapshot,
            industry_momentum: v2Research.perplexity?.industry_momentum,
            momentum_read: v2Research.perplexity?.momentum_read,
            job_postings: v2Research.job_postings || undefined,
            linkedin_profile: v2Research.linkedin_profile
              ? {
                  name: v2Research.linkedin_profile.name,
                  headline: v2Research.linkedin_profile.headline,
                  current_title: v2Research.linkedin_profile.current_title,
                  tenure_months: v2Research.linkedin_profile.tenure_months,
                  previous_roles: v2Research.linkedin_profile.previous_roles,
                  career_arc: v2Research.linkedin_profile.career_arc,
                  education: v2Research.linkedin_profile.education,
                  archetype: v2Research.linkedin_profile.archetype,
                }
              : undefined,
            linkedin_posts: v2Research.linkedin_posts
              ? {
                  posts: v2Research.linkedin_posts.posts.map(p => ({
                    text: p.text,
                    date: p.date,
                    likes: p.likes,
                    comments: p.comments,
                  })),
                  post_count: v2Research.linkedin_posts.post_count,
                  avg_engagement: v2Research.linkedin_posts.avg_engagement,
                  top_topics: v2Research.linkedin_posts.top_topics,
                  tone: v2Research.linkedin_posts.tone,
                  last_post_date: v2Research.linkedin_posts.last_post_date,
                }
              : undefined,
            serp_results: v2Research.google_serp?.results.map(r => ({
              keyword: r.keyword,
              target_rank: r.target_rank,
              top_results: r.top_results.map(tr => ({
                position: tr.position,
                title: tr.title,
                domain: tr.domain,
              })),
            })),
            website_tech: v2Research.website_tech
              ? {
                  platform: v2Research.website_tech.platform,
                  built_by: v2Research.website_tech.built_by,
                  email_platform: v2Research.website_tech.email_platform,
                  chat_widget: v2Research.website_tech.chat_widget,
                  analytics: v2Research.website_tech.analytics,
                  other_tools: v2Research.website_tech.other_tools,
                }
              : undefined,
          }
        : undefined,
    };

    let usage: { input: number; output: number };
    let modelUsed: string;
    let markdownResponse: string;

    // Choose prompts based on version
    const systemPrompt = version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
    const userPrompt =
      version === 'pro'
        ? DISCOVERY_LAB_PRO_USER(promptParams)
        : DISCOVERY_LAB_LITE_USER(promptParams);

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel('discovery-lab-' + version, systemPrompt, userPrompt);
      });

      usage = response.usage;
      modelUsed = 'claude-sonnet-4-5-20250929';
      markdownResponse = response.content;
    } catch (error) {
      console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

      // Try GPT-4o as fallback
      try {
        const response = await retryWithBackoff(async () => {
          return await runModel('discovery-lab-' + version, systemPrompt, userPrompt, {
            provider: 'openai',
            model: 'gpt-4o',
          });
        });

        usage = response.usage;
        modelUsed = 'gpt-4o';
        markdownResponse = response.content;
      } catch (fallbackError) {
        console.error('Error running GPT-4o fallback:', fallbackError);

        return NextResponse.json(
          {
            error: 'Failed to generate discovery brief with both Claude and GPT',
            details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Parse metadata from response
    const metadata = parseDiscoveryMetadata(markdownResponse, version as 'lite' | 'pro');

    // Log usage for tracking
    const duration = Date.now() - startTime;
    console.log('Discovery Lab analysis completed:', {
      version,
      model: modelUsed,
      duration_ms: duration,
      tokens: usage,
      requestor_email,
      target_company,
    });

    // Store report in database (cast to any since discovery_briefs not in generated types)
    const supabase = createServerClient();
    const { data: insertedReport, error: insertError } = await (supabase as any)
      .from('discovery_briefs')
      .insert({
        lead_email: requestor_email,
        lead_name: requestor_name,
        lead_company: requestor_company || null,
        version: version,
        what_you_sell: service_offered,
        target_company: target_company,
        target_contact_name: target_contact_name || null,
        target_contact_title: target_contact_title || null,
        target_company_url: target_website || null,
        markdown_response: markdownResponse,
        metadata: {
          ...metadata,
          model: modelUsed,
          tokens: usage,
          duration_ms: duration,
          competitors: competitors || null,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save discovery brief:', insertError);
      // Continue anyway - don't fail the request just because we couldn't save
    }

    const reportId = insertedReport?.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
    const reportUrl = reportId ? `${appUrl}/discovery-lab/report/${reportId}` : undefined;

    // Fire Loops event for email delivery and analytics
    // For Pro reports, this triggers the email with report link
    let emailSent = false;
    if (version === 'pro') {
      const loopsResult = await onDiscoveryReportGenerated(
        requestor_email,
        version as 'lite' | 'pro',
        target_company,
        target_contact_name,
        target_contact_title,
        reportId,
        reportUrl
      );
      emailSent = loopsResult.success;
      if (!loopsResult.success) {
        console.error('Loops event failed:', loopsResult.error);
      }
    } else {
      // Fire-and-forget for lite version
      onDiscoveryReportGenerated(
        requestor_email,
        version as 'lite' | 'pro',
        target_company,
        target_contact_name,
        target_contact_title,
        reportId,
        reportUrl
      ).catch((err) => console.error('Loops event failed:', err));
    }

    // Add to Beehiiv newsletter (fire-and-forget)
    addDiscoveryLabSubscriber(
      requestor_email,
      requestor_name,
      requestor_company
    ).catch((err) => console.error('Beehiiv subscriber add failed:', err));

    // Return the result
    return NextResponse.json(
      {
        success: true,
        result: {
          markdown: markdownResponse,
          metadata,
          reportId,
          reportUrl,
        },
        emailSent,
        usage: {
          model: modelUsed,
          tokens: usage,
          duration_ms: duration,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating discovery brief:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate discovery brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
