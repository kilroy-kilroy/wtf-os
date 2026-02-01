import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@repo/db/client';

/**
 * Admin Dashboard API
 *
 * Returns all metrics for the admin dashboard in a single call.
 * Auth: ADMIN_API_KEY bearer token
 *
 * GET /api/admin/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      // Call Lab Instant (free)
      instantAll,
      instantDay,
      instantWeek,
      instantMonth,
      instantUsersAll,
      instantUsersDay,
      instantUsersWeek,
      instantUsersMonth,

      // Call Lab Lite
      callLabLiteAll,
      callLabLiteDay,
      callLabLiteWeek,
      callLabLiteMonth,
      callLabLiteUsersAll,

      // Call Lab Pro
      callLabProAll,
      callLabProDay,
      callLabProWeek,
      callLabProMonth,
      callLabProUsersAll,

      // Discovery Lab Lite
      discoveryLiteAll,
      discoveryLiteDay,
      discoveryLiteWeek,
      discoveryLiteMonth,
      discoveryLiteUsersAll,

      // Discovery Lab Pro
      discoveryProAll,
      discoveryProDay,
      discoveryProWeek,
      discoveryProMonth,
      discoveryProUsersAll,

      // Assessments
      assessmentsAll,
      assessmentsDay,
      assessmentsWeek,
      assessmentsMonth,
      assessmentUsersAll,

      // Subscriptions (active)
      activeSubscriptions,

      // Instant leads (conversion tracking)
      instantLeadsAll,
      instantLeadsConverted,

      // Recent reports (for the reports table)
      recentCallLabReports,
      recentDiscoveryBriefs,
      recentAssessments,

      // Users total
      usersTotal,
      usersDay,
      usersWeek,
      usersMonth,
    ] = await Promise.all([
      // --- CALL LAB INSTANT ---
      supabase.from('instant_reports').select('*', { count: 'exact', head: true }),
      supabase.from('instant_reports').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo),
      supabase.from('instant_reports').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('instant_reports').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'instant_reports', 'email'),
      countDistinctUsers(supabase, 'instant_reports', 'email', dayAgo),
      countDistinctUsers(supabase, 'instant_reports', 'email', weekAgo),
      countDistinctUsers(supabase, 'instant_reports', 'email', monthAgo),

      // --- CALL LAB LITE ---
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'lite'),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'lite').gte('created_at', dayAgo),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'lite').gte('created_at', weekAgo),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'lite').gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'call_lab_reports', 'user_id', undefined, { tier: 'lite' }),

      // --- CALL LAB PRO ---
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'pro'),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'pro').gte('created_at', dayAgo),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'pro').gte('created_at', weekAgo),
      supabase.from('call_lab_reports').select('*', { count: 'exact', head: true }).eq('tier', 'pro').gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'call_lab_reports', 'user_id', undefined, { tier: 'pro' }),

      // --- DISCOVERY LAB LITE ---
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'lite'),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'lite').gte('created_at', dayAgo),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'lite').gte('created_at', weekAgo),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'lite').gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'discovery_briefs', 'user_id', undefined, { version: 'lite' }),

      // --- DISCOVERY LAB PRO ---
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'pro'),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'pro').gte('created_at', dayAgo),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'pro').gte('created_at', weekAgo),
      supabase.from('discovery_briefs').select('*', { count: 'exact', head: true }).eq('version', 'pro').gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'discovery_briefs', 'user_id', undefined, { version: 'pro' }),

      // --- ASSESSMENTS ---
      supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', dayAgo),
      supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', weekAgo),
      supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', monthAgo),
      countDistinctUsers(supabase, 'assessments', 'user_id', undefined, { status: 'completed' }),

      // --- SUBSCRIPTIONS ---
      supabase.from('subscriptions').select('plan_type, status, customer_email, user_id, current_period_end').eq('status', 'active'),

      // --- INSTANT LEADS (conversion) ---
      supabase.from('instant_leads').select('*', { count: 'exact', head: true }),
      supabase.from('instant_leads').select('*', { count: 'exact', head: true }).eq('upgraded_to_pro', true),

      // --- RECENT REPORTS (for admin table) ---
      supabase.from('call_lab_reports').select('id, user_id, buyer_name, company_name, overall_score, tier, created_at').order('created_at', { ascending: false }).limit(25),
      supabase.from('discovery_briefs').select('id, user_id, target_company, contact_name, contact_title, version, created_at').order('created_at', { ascending: false }).limit(25),
      supabase.from('assessments').select('id, user_id, intake_data, overall_score, status, created_at, completed_at').eq('status', 'completed').order('created_at', { ascending: false }).limit(25),

      // --- USERS ---
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    ]);

    // Parse subscriptions
    const subs = activeSubscriptions.data || [];
    const soloSubs = subs.filter((s: any) => s.plan_type === 'solo').length;
    const teamSubs = subs.filter((s: any) => s.plan_type === 'team').length;

    const response = {
      generatedAt: now.toISOString(),

      // Section 1: Free tier (Call Lab Instant, Call Lab Lite, Discovery Lab Lite)
      free: {
        callLabInstant: {
          reports: { day: instantDay.count || 0, week: instantWeek.count || 0, month: instantMonth.count || 0, allTime: instantAll.count || 0 },
          users: { day: instantUsersDay, week: instantUsersWeek, month: instantUsersMonth, allTime: instantUsersAll },
        },
        callLab: {
          reports: { day: callLabLiteDay.count || 0, week: callLabLiteWeek.count || 0, month: callLabLiteMonth.count || 0, allTime: callLabLiteAll.count || 0 },
          users: { allTime: callLabLiteUsersAll },
        },
        discoveryLab: {
          reports: { day: discoveryLiteDay.count || 0, week: discoveryLiteWeek.count || 0, month: discoveryLiteMonth.count || 0, allTime: discoveryLiteAll.count || 0 },
          users: { allTime: discoveryLiteUsersAll },
        },
      },

      // Section 2: Pro tier
      pro: {
        callLabPro: {
          reports: { day: callLabProDay.count || 0, week: callLabProWeek.count || 0, month: callLabProMonth.count || 0, allTime: callLabProAll.count || 0 },
          users: { allTime: callLabProUsersAll },
        },
        discoveryLabPro: {
          reports: { day: discoveryProDay.count || 0, week: discoveryProWeek.count || 0, month: discoveryProMonth.count || 0, allTime: discoveryProAll.count || 0 },
          users: { allTime: discoveryProUsersAll },
        },
        subscriptions: {
          solo: soloSubs,
          team: teamSubs,
          total: subs.length,
        },
      },

      // Section 3: Assessments
      assessments: {
        reports: { day: assessmentsDay.count || 0, week: assessmentsWeek.count || 0, month: assessmentsMonth.count || 0, allTime: assessmentsAll.count || 0 },
        users: { allTime: assessmentUsersAll },
      },

      // Section 4: Conversion
      conversion: {
        instantLeads: { total: instantLeadsAll.count || 0, converted: instantLeadsConverted.count || 0 },
        conversionRate: (instantLeadsAll.count && instantLeadsConverted.count)
          ? Math.round((instantLeadsConverted.count / instantLeadsAll.count) * 1000) / 10
          : 0,
      },

      // Section 5: Users
      users: {
        total: usersTotal.count || 0,
        day: usersDay.count || 0,
        week: usersWeek.count || 0,
        month: usersMonth.count || 0,
      },

      // Section 6: Recent reports
      recentReports: {
        callLab: (recentCallLabReports.data || []).map((r: any) => ({
          id: r.id,
          buyerName: r.buyer_name,
          companyName: r.company_name,
          score: r.overall_score,
          tier: r.tier,
          createdAt: r.created_at,
        })),
        discovery: (recentDiscoveryBriefs.data || []).map((r: any) => ({
          id: r.id,
          targetCompany: r.target_company,
          contactName: r.contact_name,
          contactTitle: r.contact_title,
          version: r.version,
          createdAt: r.created_at,
        })),
        assessments: (recentAssessments.data || []).map((r: any) => ({
          id: r.id,
          agencyName: r.intake_data?.agencyName,
          founderName: r.intake_data?.founderName,
          score: r.overall_score,
          createdAt: r.created_at,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Count distinct users in a table. Supabase doesn't support COUNT(DISTINCT col)
 * directly, so we fetch the column and dedupe in JS. For tables with email
 * instead of user_id (like instant_reports), pass the appropriate column.
 */
async function countDistinctUsers(
  supabase: any,
  table: string,
  column: string,
  since?: string,
  filters?: Record<string, string>
): Promise<number> {
  try {
    let query = supabase.from(table).select(column);
    if (since) query = query.gte('created_at', since);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        query = query.eq(k, v);
      }
    }
    const { data } = await query;
    if (!data) return 0;
    const unique = new Set(data.map((r: any) => r[column]).filter(Boolean));
    return unique.size;
  } catch {
    return 0;
  }
}
