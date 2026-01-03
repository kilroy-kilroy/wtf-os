import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { addLeadToLoops, sendEmail, updateContactSubscription } from '@/lib/loops';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LeadStats {
  total: number;
  bySource: Record<string, number>;
  emails: string[];
}

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const REPORT_EMAIL = process.env.DAILY_REPORT_EMAIL || 'tim@timkilroy.com';

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Get yesterday's date range
    const yesterday = subDays(new Date(), 1);
    const startDate = startOfDay(yesterday).toISOString();
    const endDate = endOfDay(yesterday).toISOString();
    const dateStr = format(yesterday, 'MMMM d, yyyy');

    // Collect stats from all sources
    const stats: Record<string, LeadStats> = {
      quick_analyze_leads: { total: 0, bySource: {}, emails: [] },
      new_users: { total: 0, bySource: {}, emails: [] },
      new_subscriptions: { total: 0, bySource: {}, emails: [] },
      tool_runs_leads: { total: 0, bySource: {}, emails: [] },
    };

    // Track Loops sync results
    const loopsSyncResults = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 1. Quick Analyze Leads (Call Lab Instant)
    const { data: quickLeads } = await supabase
      .from('quick_analyze_leads')
      .select('email, source')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (quickLeads) {
      stats.quick_analyze_leads.total = quickLeads.length;
      stats.quick_analyze_leads.emails = quickLeads.map(l => l.email);
      quickLeads.forEach(lead => {
        const src = lead.source || 'unknown';
        stats.quick_analyze_leads.bySource[src] = (stats.quick_analyze_leads.bySource[src] || 0) + 1;
      });

      // Sync to Loops
      for (const lead of quickLeads) {
        const result = await addLeadToLoops(lead.email, lead.source || 'call-lab-instant');
        if (result.success) {
          loopsSyncResults.synced++;
        } else {
          loopsSyncResults.failed++;
          loopsSyncResults.errors.push(`${lead.email}: ${result.error}`);
        }
      }
    }

    // 2. New User Registrations
    const { data: newUsers } = await supabase
      .from('users')
      .select('email, subscription_tier, first_name')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (newUsers) {
      stats.new_users.total = newUsers.length;
      stats.new_users.emails = newUsers.map(u => u.email);
      newUsers.forEach(user => {
        const tier = user.subscription_tier || 'lead';
        stats.new_users.bySource[tier] = (stats.new_users.bySource[tier] || 0) + 1;
      });

      // Sync to Loops
      for (const user of newUsers) {
        const result = await addLeadToLoops(user.email, 'registered-user', {
          firstName: user.first_name || '',
          subscriptionTier: user.subscription_tier || 'lead',
        });
        if (result.success) {
          loopsSyncResults.synced++;
        } else {
          loopsSyncResults.failed++;
          loopsSyncResults.errors.push(`${user.email}: ${result.error}`);
        }
      }
    }

    // 3. New Subscriptions - Fetch directly from Stripe API (more reliable than DB)
    const stripe = getStripe();
    const stripeSubscriptions: { email: string; plan: string; status: string }[] = [];

    if (stripe) {
      try {
        // Get subscriptions created in the date range
        const yesterdayStart = Math.floor(startOfDay(yesterday).getTime() / 1000);
        const yesterdayEnd = Math.floor(endOfDay(yesterday).getTime() / 1000);

        const subs = await stripe.subscriptions.list({
          created: { gte: yesterdayStart, lte: yesterdayEnd },
          limit: 100,
          expand: ['data.customer'],
        });

        for (const sub of subs.data) {
          const customer = sub.customer as import('stripe').Stripe.Customer;
          if (customer.email) {
            const planType = sub.items.data[0]?.price?.id?.toLowerCase().includes('team') ? 'team' : 'solo';
            stripeSubscriptions.push({
              email: customer.email,
              plan: planType,
              status: sub.status,
            });

            // Update contact in Loops with subscriber status
            const result = await updateContactSubscription(
              customer.email,
              'subscriber',
              planType as 'solo' | 'team'
            );
            if (result.success) {
              loopsSyncResults.synced++;
            } else {
              loopsSyncResults.failed++;
              loopsSyncResults.errors.push(`${customer.email}: ${result.error}`);
            }
          }
        }

        stats.new_subscriptions.total = stripeSubscriptions.length;
        stats.new_subscriptions.emails = stripeSubscriptions.map(s => s.email);
        stripeSubscriptions.forEach(sub => {
          const plan = `${sub.plan}_${sub.status}`;
          stats.new_subscriptions.bySource[plan] = (stats.new_subscriptions.bySource[plan] || 0) + 1;
        });
      } catch (stripeErr) {
        console.error('Stripe API error, falling back to DB:', stripeErr);
        // Fallback to database if Stripe fails
        const { data: newSubs } = await supabase
          .from('subscriptions')
          .select('customer_email, plan_type, status')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (newSubs) {
          stats.new_subscriptions.total = newSubs.length;
          stats.new_subscriptions.emails = newSubs.map(s => s.customer_email);
          newSubs.forEach(sub => {
            const plan = `${sub.plan_type}_${sub.status}`;
            stats.new_subscriptions.bySource[plan] = (stats.new_subscriptions.bySource[plan] || 0) + 1;
          });
        }
      }
    }

    // 4. Anonymous Tool Run Leads
    const { data: toolLeads } = await supabase
      .from('tool_runs')
      .select('lead_email, tool_name')
      .not('lead_email', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (toolLeads) {
      // Deduplicate by email
      const uniqueEmails = [...new Set(toolLeads.map(t => t.lead_email))];
      stats.tool_runs_leads.total = uniqueEmails.length;
      stats.tool_runs_leads.emails = uniqueEmails as string[];
      toolLeads.forEach(lead => {
        const tool = lead.tool_name || 'unknown';
        stats.tool_runs_leads.bySource[tool] = (stats.tool_runs_leads.bySource[tool] || 0) + 1;
      });

      // Sync unique leads to Loops
      const seenEmails = new Set<string>();
      for (const lead of toolLeads) {
        if (lead.lead_email && !seenEmails.has(lead.lead_email)) {
          seenEmails.add(lead.lead_email);
          const result = await addLeadToLoops(lead.lead_email, lead.tool_name || 'tool-run');
          if (result.success) {
            loopsSyncResults.synced++;
          } else {
            loopsSyncResults.failed++;
            loopsSyncResults.errors.push(`${lead.lead_email}: ${result.error}`);
          }
        }
      }
    }

    // 5. Get ALL active Stripe subscribers (for complete picture)
    const allActiveSubscribers: { email: string; plan: string; started: string }[] = [];

    if (stripe) {
      try {
        const activeSubs = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          expand: ['data.customer'],
        });

        for (const sub of activeSubs.data) {
          const customer = sub.customer as import('stripe').Stripe.Customer;
          if (customer.email) {
            const planType = sub.items.data[0]?.price?.id?.toLowerCase().includes('team') ? 'team' : 'solo';
            allActiveSubscribers.push({
              email: customer.email,
              plan: planType,
              started: format(new Date(sub.created * 1000), 'MMM d, yyyy'),
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch all active subscribers:', err);
      }
    }

    // Calculate totals
    const totalNewLeads = stats.quick_analyze_leads.total +
                          stats.new_users.total +
                          stats.tool_runs_leads.total;
    const totalNewSubscriptions = stats.new_subscriptions.total;
    const totalActiveSubscribers = allActiveSubscribers.length;

    // Combine all unique emails
    const allEmails = new Set<string>();
    Object.values(stats).forEach(s => s.emails.forEach(e => allEmails.add(e)));

    // Build email report
    const emailBody = `
Daily Leads & Signups Report
${dateStr}
${'='.repeat(50)}

SUMMARY
-------
Total New Leads (yesterday): ${totalNewLeads}
Total New Paid Subscriptions (yesterday): ${totalNewSubscriptions}
Total Unique New Emails: ${allEmails.size}

💰 TOTAL ACTIVE PAYING CUSTOMERS: ${totalActiveSubscribers}

LOOPS SYNC RESULTS
------------------
✅ Synced to Loops: ${loopsSyncResults.synced}
❌ Failed: ${loopsSyncResults.failed}
${loopsSyncResults.errors.length > 0 ? `Errors:\n${loopsSyncResults.errors.slice(0, 5).join('\n')}` : ''}

YESTERDAY'S BREAKDOWN BY SOURCE
-------------------------------

📊 Call Lab Instant Leads: ${stats.quick_analyze_leads.total}
${Object.entries(stats.quick_analyze_leads.bySource).map(([k, v]) => `   - ${k}: ${v}`).join('\n') || '   (none)'}

👤 New User Registrations: ${stats.new_users.total}
${Object.entries(stats.new_users.bySource).map(([k, v]) => `   - ${k}: ${v}`).join('\n') || '   (none)'}

💳 New Stripe Subscriptions: ${stats.new_subscriptions.total}
${Object.entries(stats.new_subscriptions.bySource).map(([k, v]) => `   - ${k}: ${v}`).join('\n') || '   (none)'}

🔧 Tool Run Leads (Anonymous): ${stats.tool_runs_leads.total}
${Object.entries(stats.tool_runs_leads.bySource).map(([k, v]) => `   - ${k}: ${v}`).join('\n') || '   (none)'}

ALL NEW EMAILS YESTERDAY (${allEmails.size})
${'─'.repeat(30)}
${[...allEmails].join('\n') || '(none)'}

${'='.repeat(50)}
ALL ACTIVE PAYING SUBSCRIBERS (${totalActiveSubscribers})
${'='.repeat(50)}
${allActiveSubscribers.map(s => `${s.email} - ${s.plan} (since ${s.started})`).join('\n') || '(none)'}

---
This is an automated daily report from WTF Growth OS.
Data fetched directly from Stripe API and synced to Loops.
    `.trim();

    // Send email via Loops
    const emailResult = await sendEmail(
      REPORT_EMAIL,
      `📈 Daily Leads Report: ${totalNewLeads} leads, ${totalNewSubscriptions} subs (${format(yesterday, 'MMM d')})`,
      emailBody
    );

    if (!emailResult.success) {
      console.error('Failed to send daily report via Loops:', emailResult.error);
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      stats: {
        totalNewLeads,
        totalNewSubscriptions,
        totalActiveSubscribers,
        uniqueEmails: allEmails.size,
        breakdown: {
          quickAnalyzeLeads: stats.quick_analyze_leads.total,
          newUsers: stats.new_users.total,
          newSubscriptions: stats.new_subscriptions.total,
          toolRunLeads: stats.tool_runs_leads.total,
        },
        allActiveSubscribers,
        loopsSync: loopsSyncResults,
      },
      emailSentTo: REPORT_EMAIL,
    });
  } catch (error) {
    console.error('Daily leads report cron error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
