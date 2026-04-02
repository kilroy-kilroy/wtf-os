import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServerClient } from '@repo/db/client';
import {
  fetchOpportunity,
  fetchCompany,
  fetchPerson,
  setDiscoveryStatus,
  writeDiscoveryResults,
} from '@/lib/copper-discovery';
import { runDiscoveryAgent } from '@/lib/discovery-agent';
import { sendSlackAlert } from '@/lib/slack';

export const maxDuration = 300; // 5 minutes — research + summarization

/**
 * Process a single opportunity: fetch data, run research, write back to Copper.
 * This runs in the background after the webhook response is sent.
 */
async function processOpportunity(opportunityId: number) {
  const supabase = createServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com';

  // Dedup check: skip if we processed this opportunity in the last 5 min
  const { data: recentLog } = await (supabase as any)
    .from('discovery_log')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (recentLog && recentLog.length > 0) {
    console.log(`[CopperWebhook] Skipping duplicate for opportunity ${opportunityId}`);
    return;
  }

  // Create log entry
  const { data: logEntry } = await (supabase as any)
    .from('discovery_log')
    .insert({
      opportunity_id: opportunityId,
      status: 'pending',
    })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    // Fetch opportunity data from Copper
    const opportunity = await fetchOpportunity(opportunityId);

    // Update log with opportunity name
    if (logId) {
      await (supabase as any)
        .from('discovery_log')
        .update({ opportunity_name: opportunity.name, status: 'running' })
        .eq('id', logId);
    }

    // Set Copper status to Running
    await setDiscoveryStatus(opportunityId, 'running').catch(err => {
      console.warn('[CopperWebhook] Failed to set Running status:', err);
    });

    // Fetch related company and contact
    const company = opportunity.company_id
      ? await fetchCompany(opportunity.company_id).catch(() => null)
      : null;

    const contact = opportunity.primary_contact_id
      ? await fetchPerson(opportunity.primary_contact_id).catch(() => null)
      : null;

    const companyName = company?.name || opportunity.name;

    // Update log with company name
    if (logId) {
      await (supabase as any)
        .from('discovery_log')
        .update({
          company_name: companyName,
          input_payload: { opportunity, company, contact },
        })
        .eq('id', logId);
    }

    // Run Discovery Lab analysis
    const result = await runDiscoveryAgent({ opportunity, company, contact });

    // Save full report to discovery_briefs
    const contactEmail = contact?.emails?.[0]?.email || null;
    const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null;

    const { data: briefRecord } = await (supabase as any)
      .from('discovery_briefs')
      .insert({
        user_id: null,
        lead_email: contactEmail,
        lead_name: contactName,
        lead_company: companyName,
        version: 'pro',
        what_you_sell: 'Sales coaching and consulting',
        target_company: companyName,
        target_contact_name: contactName,
        target_contact_title: contact?.title || null,
        target_company_url: company?.websites?.[0]?.url || null,
        markdown_response: result.fullMarkdown,
        metadata: {
          source: 'copper_webhook',
          opportunity_id: opportunityId,
          copper_company_id: opportunity.company_id,
          model: result.modelUsed,
          tokens: result.tokens,
          duration_ms: result.durationMs,
        },
      })
      .select('id')
      .single();

    const reportId = briefRecord?.id;
    const reportUrl = reportId ? `${appUrl}/discovery-lab/report/${reportId}?admin=1` : null;

    // Write condensed summary back to Copper custom fields
    await writeDiscoveryResults(opportunityId, result.summary, reportUrl);

    // Update log
    if (logId) {
      await (supabase as any)
        .from('discovery_log')
        .update({
          status: 'complete',
          output_summary: result.summary,
          discovery_brief_id: reportId,
          duration_ms: result.durationMs,
        })
        .eq('id', logId);
    }

    // Slack notification
    sendSlackAlert({
      text: `Discovery brief ready for *${companyName}* — ${opportunity.name}`,
      color: 'success',
      fields: [
        { title: 'Company', value: companyName, short: true },
        { title: 'Contact', value: contactName || 'N/A', short: true },
        { title: 'Duration', value: `${Math.round(result.durationMs / 1000)}s`, short: true },
        { title: 'Model', value: result.modelUsed, short: true },
      ],
      linkUrl: reportUrl || undefined,
      linkText: 'View Full Report',
    });

    console.log(`[CopperWebhook] Discovery complete for ${companyName} (${result.durationMs}ms)`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[CopperWebhook] Error processing opportunity ${opportunityId}:`, errorMsg);

    // Update Copper status to Error
    await setDiscoveryStatus(opportunityId, 'error').catch(() => {});

    // Update log
    if (logId) {
      await (supabase as any)
        .from('discovery_log')
        .update({ status: 'error', error_message: errorMsg })
        .eq('id', logId);
    }

    // Slack error alert
    sendSlackAlert({
      text: `Discovery agent failed for opportunity ${opportunityId}: ${errorMsg}`,
      color: 'danger',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Copper webhook payload: { ids: [123, 456], type: "opportunity", event: "new" }
    const { ids, type, event } = body;

    if (type !== 'opportunity' || event !== 'new' || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Return immediately — process in the background
    // waitUntil keeps the Vercel function alive after the response is sent
    for (const opportunityId of ids) {
      waitUntil(processOpportunity(opportunityId));
    }

    return NextResponse.json({ ok: true, processing: ids });
  } catch (err) {
    console.error('[CopperWebhook] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
