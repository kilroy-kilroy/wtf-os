import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getStripe } from '@/lib/stripe';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getResend = () => new Resend(process.env.RESEND_API_KEY);

interface LeadStats {
  total: number;
  bySource: Record<string, number>;
  emails: string[];
}

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const REPORT_EMAIL = process.env.DAILY_REPORT_EMAIL || process.env.FROM_EMAIL || 'tim@timkilroy.com';
  const FROM_EMAIL = process.env.FROM_EMAIL || 'reports@timkilroy.com';

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const resend = getResend();

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
    }

    // 2. New User Registrations
    const { data: newUsers } = await supabase
      .from('users')
      .select('email, subscription_tier')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (newUsers) {
      stats.new_users.total = newUsers.length;
      stats.new_users.emails = newUsers.map(u => u.email);
      newUsers.forEach(user => {
        const tier = user.subscription_tier || 'lead';
        stats.new_users.bySource[tier] = (stats.new_users.bySource[tier] || 0) + 1;
      });
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
Data fetched directly from Stripe API for accuracy.
    `.trim();

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: `WTF Reports <${FROM_EMAIL}>`,
      to: REPORT_EMAIL,
      subject: `📈 Daily Leads Report: ${totalNewLeads} leads, ${totalNewSubscriptions} subs (${format(yesterday, 'MMM d')})`,
      text: emailBody,
    });

    if (emailError) {
      console.error('Failed to send daily report:', emailError);
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailError.message
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
