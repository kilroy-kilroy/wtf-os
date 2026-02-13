import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth-server'
import { createServerClient } from '@repo/db/client'
import Link from 'next/link'

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic'

// 4E Theme colors from style guide
const theme4EColors: Record<string, { bg: string; text: string; primary: string }> = {
  evidence: { bg: '#DBEAFE', text: '#1E40AF', primary: '#3B82F6' },
  education: { bg: '#DCFCE7', text: '#166534', primary: '#10B981' },
  entertainment: { bg: '#FEF3C7', text: '#92400E', primary: '#F59E0B' },
  envision: { bg: '#FCE7F3', text: '#9D174D', primary: '#EC4899' },
}

async function getContentData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/content-hub/login')
  }

  // Use service client for queries (bypasses RLS)
  const serviceClient = createServerClient()

  // Check if user has a content profile
  const { data: profile } = await (serviceClient as any)
    .from('content_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Check if user belongs to any org
  const { data: memberships } = await (serviceClient as any)
    .from('content_org_members')
    .select('*, org:content_orgs(*)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)

  // If no profile or no org, redirect to onboarding
  if (!profile?.onboarding_completed || !memberships?.length) {
    redirect('/content-hub/onboarding')
  }

  const orgId = memberships[0].org.id

  // Get content stats
  const { data: sources } = await (serviceClient as any)
    .from('content_sources')
    .select('theme_4e, repurpose_count')
    .eq('org_id', orgId)
    .eq('visibility', 'team')

  // Get recent sources
  const { data: recentSources } = await (serviceClient as any)
    .from('content_sources')
    .select('*')
    .eq('org_id', orgId)
    .eq('visibility', 'team')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = {
    totalSources: sources?.length || 0,
    totalRepurposes: sources?.reduce((acc: number, s: any) => acc + (s.repurpose_count || 0), 0) || 0,
    byTheme: {
      evidence: sources?.filter((s: any) => s.theme_4e === 'evidence').length || 0,
      education: sources?.filter((s: any) => s.theme_4e === 'education').length || 0,
      entertainment: sources?.filter((s: any) => s.theme_4e === 'entertainment').length || 0,
      envision: sources?.filter((s: any) => s.theme_4e === 'envision').length || 0,
    },
  }

  return {
    user,
    profile,
    org: memberships[0].org,
    stats,
    recentSources: recentSources || [],
  }
}

export default async function ContentHubDashboard() {
  const { profile, org, stats, recentSources } = await getContentData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1
          className="text-[42px] text-black tracking-[1px] mb-2"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          DASHBOARD
        </h1>
        <p className="text-[#666666] text-base">
          Welcome back{profile?.title ? `, ${profile.title}` : ''} &middot; {org.name}
        </p>
      </div>

      {/* Stats Grid - Metric Cards with colored top borders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Sources */}
        <div className="bg-white rounded-xl p-6 border-t-4 border-[#E51B23] shadow-sm">
          <p className="text-[13px] text-[#666666] uppercase tracking-[0.5px] mb-2">Total Sources</p>
          <p
            className="text-4xl text-black"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            {stats.totalSources}
          </p>
        </div>

        {/* Total Repurposes */}
        <div className="bg-white rounded-xl p-6 border-t-4 border-[#E51B23] shadow-sm">
          <p className="text-[13px] text-[#666666] uppercase tracking-[0.5px] mb-2">Total Repurposes</p>
          <p
            className="text-4xl text-black"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            {stats.totalRepurposes}
          </p>
        </div>

        {/* This Week - Yellow accent */}
        <div className="bg-white rounded-xl p-6 border-t-4 border-[#FFDE59] shadow-sm">
          <p className="text-[13px] text-[#666666] uppercase tracking-[0.5px] mb-2">This Week</p>
          <p
            className="text-4xl text-black"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            -
          </p>
        </div>

        {/* Team Members - Black accent */}
        <div className="bg-white rounded-xl p-6 border-t-4 border-black shadow-sm">
          <p className="text-[13px] text-[#666666] uppercase tracking-[0.5px] mb-2">Team Members</p>
          <p
            className="text-4xl text-black"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            -
          </p>
        </div>
      </div>

      {/* 4E Distribution */}
      <div className="bg-white rounded-xl p-7 border-t-4 border-[#E51B23] shadow-sm">
        <h2
          className="text-xl text-black tracking-[0.5px] mb-6"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          CONTENT BY 4E THEME
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.byTheme).map(([theme, count]) => {
            const colors = theme4EColors[theme]
            return (
              <div
                key={theme}
                className="text-center p-5 rounded-lg"
                style={{ backgroundColor: colors.bg }}
              >
                <span
                  className="inline-block px-3 py-1 text-xs font-semibold rounded mb-3 border"
                  style={{
                    backgroundColor: 'white',
                    color: colors.primary,
                    borderColor: colors.primary,
                  }}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </span>
                <p
                  className="text-[32px] text-black"
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  {count}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-xl overflow-hidden border-t-4 border-[#E51B23] shadow-sm">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2
            className="text-xl text-black tracking-[0.5px]"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            RECENT CONTENT
          </h2>
          <Link
            href="/content-hub/repository"
            className="text-sm text-[#E51B23] font-semibold hover:underline"
          >
            View all
          </Link>
        </div>
        {recentSources.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#666666] mb-4">No content yet. Add your first piece to get started.</p>
            <Link
              href="/content-hub/repository"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded text-sm font-semibold hover:bg-[#222] transition-colors"
            >
              <span className="text-lg font-light">+</span>
              Add your first piece
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {recentSources.map((source: any) => (
              <Link
                key={source.id}
                href={`/content-hub/repository/${source.id}`}
                className="block p-6 hover:bg-[#F8F8F8] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {source.theme_4e && (
                      <span
                        className="inline-block px-3 py-1 rounded text-xs font-semibold mb-2"
                        style={{
                          backgroundColor: theme4EColors[source.theme_4e]?.bg || '#F3F3F3',
                          color: theme4EColors[source.theme_4e]?.text || '#666666',
                        }}
                      >
                        {source.theme_4e.charAt(0).toUpperCase() + source.theme_4e.slice(1)}
                      </span>
                    )}
                    <h3 className="text-black font-bold text-lg truncate">
                      {source.title || source.raw_content.slice(0, 60) + '...'}
                    </h3>
                    <p className="text-sm text-[#666666] mt-1 line-clamp-2">
                      {source.synopsis || source.raw_content.slice(0, 150)}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm text-[#E51B23] font-semibold">
                      {source.repurpose_count} repurpose{source.repurpose_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
