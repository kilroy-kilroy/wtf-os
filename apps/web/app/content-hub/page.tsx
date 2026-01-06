import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerClient } from '@repo/db/client'
import { cookies } from 'next/headers'
import Link from 'next/link'

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic'

async function getContentData() {
  const supabase = createServerComponentClient({ cookies })

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

const theme4EColors: Record<string, string> = {
  evidence: 'bg-blue-100 text-blue-700',
  education: 'bg-green-100 text-green-700',
  entertainment: 'bg-purple-100 text-purple-700',
  envision: 'bg-amber-100 text-amber-700',
}

export default async function ContentHubDashboard() {
  const { user, profile, org, stats, recentSources } = await getContentData()

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2d2a26]">
            Welcome back{profile?.title ? `, ${profile.title}` : ''}
          </h1>
          <p className="text-[#8a8078] mt-1">{org.name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <p className="text-sm text-[#8a8078]">Total Sources</p>
          <p className="text-3xl font-semibold text-[#c45a3b] mt-1">{stats.totalSources}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <p className="text-sm text-[#8a8078]">Total Repurposes</p>
          <p className="text-3xl font-semibold text-[#c45a3b] mt-1">{stats.totalRepurposes}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <p className="text-sm text-[#8a8078]">This Week</p>
          <p className="text-3xl font-semibold text-[#2d2a26] mt-1">-</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <p className="text-sm text-[#8a8078]">Team Members</p>
          <p className="text-3xl font-semibold text-[#2d2a26] mt-1">-</p>
        </div>
      </div>

      {/* 4E Distribution */}
      <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
        <h2 className="text-lg font-medium text-[#2d2a26] mb-4">Content by 4E Theme</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.byTheme).map(([theme, count]) => (
            <div key={theme} className="text-center">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${theme4EColors[theme]}`}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </div>
              <p className="text-2xl font-semibold text-[#2d2a26]">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-xl border border-[#e8e0d5]">
        <div className="p-6 border-b border-[#e8e0d5] flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#2d2a26]">Recent Content</h2>
          <Link
            href="/content-hub/repository"
            className="text-sm text-[#c45a3b] hover:underline"
          >
            View all
          </Link>
        </div>
        {recentSources.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#8a8078] mb-4">No content yet. Add your first piece to get started.</p>
            <Link
              href="/content-hub/repository"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c45a3b] text-white rounded-lg text-sm font-medium hover:bg-[#b04a2d] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first piece
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e0d5]">
            {recentSources.map((source: any) => (
              <Link
                key={source.id}
                href={`/content-hub/repository/${source.id}`}
                className="block p-6 hover:bg-[#faf8f5] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {source.theme_4e && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${theme4EColors[source.theme_4e]}`}>
                        {source.theme_4e.charAt(0).toUpperCase() + source.theme_4e.slice(1)}
                      </span>
                    )}
                    <h3 className="text-[#2d2a26] font-medium truncate">
                      {source.title || source.raw_content.slice(0, 60) + '...'}
                    </h3>
                    <p className="text-sm text-[#8a8078] mt-1 line-clamp-2">
                      {source.synopsis || source.raw_content.slice(0, 150)}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm text-[#8a8078]">
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
