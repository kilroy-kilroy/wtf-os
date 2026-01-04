import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';
import {
  findOrCreateUser,
  findOrCreateAgency,
  assignUserToAgency,
  createDiscoveryBrief,
  getDiscoveryBrief,
  createToolRun,
  updateToolRun,
} from '@repo/db';
import { runModel, retryWithBackoff, runDiscoveryResearch } from '@repo/utils';
import {
  DISCOVERY_LAB_LITE_SYSTEM,
  DISCOVERY_LAB_LITE_USER,
  DISCOVERY_LAB_PRO_SYSTEM,
  DISCOVERY_LAB_PRO_USER,
  parseDiscoveryLabMetadata,
  type DiscoveryLabPromptParams,
} from '@repo/prompts';
import { addLeadToLoops, triggerLoopsEvent } from '@/lib/loops';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate required fields (aligned with new Lindy structure)
    if (!body.service_offered || !body.target_company || !body.requestor_email) {
      return NextResponse.json(
        { error: 'Missing required fields: service_offered, target_company, and requestor_email' },
        { status: 400 }
      );
    }

    const {
      // Requestor info
      requestor_name,
      requestor_email,
      requestor_company,
      requestor_website,
      service_offered,
      // Target info
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      target_linkedin,
      target_icp,
      // Context
      competitors,
      // Pro-only research outputs (populated by research layer)
      requestor_insights,
      target_insights,
      contact_insights,
      competitor_intel,
      industry_signals,
      // Version
      version = 'lite', // 'lite' or 'pro'
    } = body;

    // Initialize Supabase client
    const supabase = createServerClient();

    // Find or create user
    const user = await findOrCreateUser(
      supabase,
      requestor_email,
      requestor_name?.split(' ')[0], // first name
      requestor_name?.split(' ').slice(1).join(' ') // last name
    );

    // Find or create agency
    let agency = null;
    if (requestor_company) {
      agency = await findOrCreateAgency(supabase, requestor_company, requestor_website);
      await assignUserToAgency(supabase, user.id, agency.id, 'member');
    } else {
      agency = await findOrCreateAgency(supabase, `${requestor_name || requestor_email}'s Agency`);
      await assignUserToAgency(supabase, user.id, agency.id, 'owner');
    }

    // Create tool run record
    const toolRun = await createToolRun(supabase, {
      user_id: user.id,
      agency_id: agency.id,
      lead_email: requestor_email,
      lead_name: requestor_name,
      tool_name: `discovery_lab_${version}`,
      tool_version: '2.0', // Updated version for Lindy-aligned prompts
      input_data: {
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
      },
    });

    // For Pro version, run research layer first
    let researchedInsights = {
      requestor_insights,
      target_insights,
      contact_insights,
      competitor_intel,
      industry_signals,
    };

    if (version === 'pro') {
      console.log('Running Discovery Lab Pro research layer...');
      try {
        const research = await runDiscoveryResearch({
          targetCompany: target_company,
          targetWebsite: target_website,
          targetIndustry: target_icp, // Use ICP as industry hint
          contactName: target_contact_name,
          contactTitle: target_contact_title,
          contactLinkedIn: target_linkedin,
          serviceOffered: service_offered,
        });

        // Format research results for the prompt
        if (research.market) {
          researchedInsights.industry_signals = `
INDUSTRY TRENDS:
${research.market.industry_trends}

MARKET DYNAMICS:
${research.market.market_dynamics}

RECENT NEWS:
${research.market.recent_news}
          `.trim();
        }

        if (research.company) {
          researchedInsights.target_insights = `
COMPANY OVERVIEW:
${research.company.company_overview}

SERVICES & OFFERINGS:
${research.company.services_offerings}

POSITIONING & DIFFERENTIATION:
${research.company.positioning}

RECENT UPDATES:
${research.company.recent_updates}

KEY PHRASES THEY USE:
${research.company.key_phrases.join(', ')}
          `.trim();
        }

        if (research.contact) {
          researchedInsights.contact_insights = `
PROFESSIONAL BACKGROUND:
${research.contact.tenure_experience}

ROLE CONTEXT:
${research.contact.role_context}

LINKEDIN SUMMARY:
${research.contact.linkedin_summary}

PUBLISHED CONTENT & MEDIA:
${research.contact.content_published}

TALKING POINTS:
${research.contact.talking_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}
          `.trim();
        }

        if (research.errors.length > 0) {
          console.warn('Research completed with some errors:', research.errors);
        }

        console.log('Research layer completed successfully');
      } catch (researchError) {
        console.error('Research layer failed, continuing without research:', researchError);
        // Continue without research - Pro will still generate output, just less informed
      }
    }

    // Prepare prompt parameters
    const promptParams: DiscoveryLabPromptParams = {
      // Requestor info
      requestor_name,
      requestor_email,
      requestor_company,
      requestor_website,
      service_offered,
      // Target info
      target_company,
      target_website,
      target_contact_name,
      target_contact_title,
      target_linkedin,
      target_icp,
      // Context
      competitors,
      // Pro research (from research layer or passed in)
      requestor_insights: researchedInsights.requestor_insights,
      target_insights: researchedInsights.target_insights,
      contact_insights: researchedInsights.contact_insights,
      competitor_intel: researchedInsights.competitor_intel,
      industry_signals: researchedInsights.industry_signals,
    };

    let usage: { input: number; output: number };
    let modelUsed: string;
    let markdownResponse: string;

    // Run AI analysis
    try {
      const systemPrompt =
        version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
      const userPrompt =
        version === 'pro'
          ? DISCOVERY_LAB_PRO_USER(promptParams)
          : DISCOVERY_LAB_LITE_USER(promptParams);

      const response = await retryWithBackoff(async () => {
        return await runModel(`discovery-lab-${version}`, systemPrompt, userPrompt);
      });

      usage = response.usage;
      modelUsed = 'claude-sonnet-4-5-20250929';
      markdownResponse = response.content;
    } catch (error) {
      console.error('Error running Claude analysis, trying GPT-4o fallback:', error);

      // Try GPT-4o as fallback
      try {
        const systemPrompt =
          version === 'pro' ? DISCOVERY_LAB_PRO_SYSTEM : DISCOVERY_LAB_LITE_SYSTEM;
        const userPrompt =
          version === 'pro'
            ? DISCOVERY_LAB_PRO_USER(promptParams)
            : DISCOVERY_LAB_LITE_USER(promptParams);

        const response = await retryWithBackoff(async () => {
          return await runModel(`discovery-lab-${version}`, systemPrompt, userPrompt, {
            provider: 'openai',
            model: 'gpt-4o',
          });
        });

        usage = response.usage;
        modelUsed = 'gpt-4o';
        markdownResponse = response.content;
      } catch (fallbackError) {
        console.error('Error running GPT-4o fallback:', fallbackError);

        // Update tool run with failure
        await updateToolRun(supabase, toolRun.id, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        });

        return NextResponse.json(
          {
            error: 'Failed to generate discovery brief with both Claude and GPT',
            details:
              fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Parse metadata from response
    const metadata = parseDiscoveryLabMetadata(markdownResponse, version as 'lite' | 'pro');

    // Store discovery brief in database
    try {
      const discoveryBrief = await createDiscoveryBrief(supabase, {
        user_id: user.id,
        agency_id: agency.id,
        version,
        what_you_sell: service_offered, // Map to existing field
        target_company,
        target_contact_name,
        target_contact_title,
        target_company_url: target_website,
        target_linkedin_url: target_linkedin,
        markdown_response: markdownResponse,
        metadata: {
          // New Lindy-aligned fields
          requestor_name,
          requestor_company,
          requestor_website,
          target_icp,
          competitors,
          // Metadata counts
          question_count: metadata.questionCount,
          hook_count: metadata.hookCount,
          competitor_count: metadata.competitorCount,
          // Research outputs (Pro only)
          ...(version === 'pro' && {
            requestor_insights: researchedInsights.requestor_insights,
            target_insights: researchedInsights.target_insights,
            contact_insights: researchedInsights.contact_insights,
            competitor_intel: researchedInsights.competitor_intel,
            industry_signals: researchedInsights.industry_signals,
          }),
        },
      });

      // Update tool run
      const duration = Date.now() - startTime;
      await updateToolRun(supabase, toolRun.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        result_ids: {
          discovery_brief_id: discoveryBrief.id,
        },
        model_used: modelUsed,
        tokens_used: usage,
      });

      // Sync lead to Loops for nurture sequence
      if (requestor_email) {
        const loopSource = version === 'pro' ? 'discovery-lab-pro' : 'discovery-lab';
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';
        const reportUrl = `${APP_URL}/discovery/${discoveryBrief.id}`;

        await addLeadToLoops(requestor_email, loopSource, {
          firstName: requestor_name?.split(' ')[0] || '',
          lastName: requestor_name?.split(' ').slice(1).join(' ') || '',
          company: requestor_company || '',
        });

        // Trigger event for automation with full personalization data
        await triggerLoopsEvent(requestor_email, 'discovery_lab_completed', {
          reportType: 'discovery',
          targetCompany: target_company || '',
          targetContact: target_contact_name || '',
          targetContactTitle: target_contact_title || '',
          reportUrl: reportUrl,
        });
      }

      // Return response
      return NextResponse.json(
        {
          success: true,
          discovery_brief_id: discoveryBrief.id,
          result: {
            markdown: markdownResponse,
            metadata,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error storing discovery brief:', error);

      // Still return the result even if storage fails
      return NextResponse.json(
        {
          success: true,
          storage_error: true,
          result: {
            markdown: markdownResponse,
            metadata,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in discovery analysis:', error);

    return NextResponse.json(
      {
        error: 'Failed to process discovery request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve an existing discovery brief
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const briefId = searchParams.get('id');

    if (!briefId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = createServerClient();
    const brief = await getDiscoveryBrief(supabase, briefId);

    if (!brief) {
      return NextResponse.json({ error: 'Discovery brief not found' }, { status: 404 });
    }

    const metadata = parseDiscoveryLabMetadata(
      brief.markdown_response || '',
      brief.version as 'lite' | 'pro'
    );

    return NextResponse.json(
      {
        success: true,
        result: {
          id: brief.id,
          markdown: brief.markdown_response,
          metadata,
          version: brief.version,
          target_company: brief.target_company,
          target_contact_name: brief.target_contact_name,
          target_contact_title: brief.target_contact_title,
          created_at: brief.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching discovery brief:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch discovery brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
