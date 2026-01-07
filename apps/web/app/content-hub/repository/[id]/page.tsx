'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ContentSource {
  id: string
  title: string | null
  synopsis: string | null
  raw_content: string
  theme_4e: string | null
  source_type: string | null
  source_url: string | null
  repurpose_count: number
  created_at: string
}

interface SavedRepurpose {
  id: string
  source_id: string
  user_id: string | null
  voice_profile_id: string | null
  platform: string
  content: string
  created_at: string
  voice_profile?: {
    id: string
    user_id: string
    title: string | null
    full_name: string | null
  } | null
}

interface RepurposeOutput {
  platform: string
  content: string
  repurposeId: string
  success: boolean
}

// 4E Theme colors from style guide
const theme4EColors: Record<string, { bg: string; text: string; primary: string }> = {
  evidence: { bg: '#DBEAFE', text: '#1E40AF', primary: '#3B82F6' },
  education: { bg: '#DCFCE7', text: '#166534', primary: '#10B981' },
  entertainment: { bg: '#FEF3C7', text: '#92400E', primary: '#F59E0B' },
  envision: { bg: '#FCE7F3', text: '#9D174D', primary: '#EC4899' },
}

const platformTabs = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'pull_quotes', label: 'Pull Quotes', icon: '💬' },
]

export default function ContentSourcePage() {
  const params = useParams()
  const sourceId = params.id as string

  const [source, setSource] = useState<ContentSource | null>(null)
  const [savedRepurposes, setSavedRepurposes] = useState<SavedRepurpose[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePlatform, setActivePlatform] = useState('linkedin')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedRepurpose, setSelectedRepurpose] = useState<SavedRepurpose | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get repurposes for the active platform, sorted by most recent first
  const platformRepurposes = savedRepurposes.filter(r => r.platform === activePlatform)
  const latestRepurpose = platformRepurposes[0]

  // Count repurposes per platform for the tab badges
  const repurposeCounts = platformTabs.reduce((acc, tab) => {
    acc[tab.id] = savedRepurposes.filter(r => r.platform === tab.id).length
    return acc
  }, {} as Record<string, number>)

  const fetchSource = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-engine/sources?limit=100`)
      const data = await res.json()
      const found = data.sources?.find((s: ContentSource) => s.id === sourceId)
      if (!found) {
        setError('Content not found')
        return
      }
      setSource(found)
    } catch (err) {
      setError('Failed to load content')
    }
  }, [sourceId])

  const fetchRepurposes = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-engine/sources/${sourceId}/repurposes`)
      const data = await res.json()
      if (data.repurposes) {
        setSavedRepurposes(data.repurposes)
      }
    } catch (err) {
      console.error('Failed to load repurposes:', err)
    }
  }, [sourceId])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      // Fetch current user ID
      try {
        const profileRes = await fetch('/api/content-engine/profile')
        const profileData = await profileRes.json()
        if (profileData.profile?.id) {
          setCurrentUserId(profileData.profile.id)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      }
      await Promise.all([fetchSource(), fetchRepurposes()])
      setLoading(false)
    }
    loadData()
  }, [fetchSource, fetchRepurposes])

  async function handleGenerate(platforms: string[]) {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: sourceId,
          platforms,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate content')
      }

      // Refresh repurposes and source after generating
      await Promise.all([fetchRepurposes(), fetchSource()])

      // Set active tab to first generated platform
      if (platforms.length > 0) {
        setActivePlatform(platforms[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy(content?: string) {
    const textToCopy = content || latestRepurpose?.content
    if (!textToCopy) return

    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Check if a repurpose belongs to the current user
  function isOwnRepurpose(repurpose: SavedRepurpose): boolean {
    return repurpose.voice_profile?.id === currentUserId
  }

  // Handle viewing a previous version in the modal
  function handleViewVersion(repurpose: SavedRepurpose) {
    setSelectedRepurpose(repurpose)
  }

  // Close the version modal
  function handleCloseModal() {
    setSelectedRepurpose(null)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-[#E5E5E5] rounded w-32 mb-6" />
        <div className="bg-white rounded-xl overflow-hidden border-t-4 border-[#E5E5E5]">
          <div className="p-8">
            <div className="h-8 bg-[#E5E5E5] rounded w-3/4 mb-4" />
            <div className="h-4 bg-[#E5E5E5] rounded w-full mb-2" />
            <div className="h-4 bg-[#E5E5E5] rounded w-full mb-2" />
            <div className="h-4 bg-[#E5E5E5] rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !source) {
    return (
      <div className="text-center py-12">
        <p className="text-[#666666] mb-4">{error}</p>
        <Link href="/content-hub/repository" className="text-[#E51B23] font-semibold hover:underline">
          Back to repository
        </Link>
      </div>
    )
  }

  if (!source) return null

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/content-hub/repository"
        className="inline-flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to repository
      </Link>

      {/* Source Content Card */}
      <div className="bg-white rounded-xl overflow-hidden border-t-4 border-[#E51B23] shadow-sm">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            {source.theme_4e && (
              <span
                className="inline-block px-3.5 py-1.5 rounded text-xs font-semibold mb-4"
                style={{
                  backgroundColor: theme4EColors[source.theme_4e]?.bg || '#F3F3F3',
                  color: theme4EColors[source.theme_4e]?.text || '#666666',
                }}
              >
                {source.theme_4e.charAt(0).toUpperCase() + source.theme_4e.slice(1)}
              </span>
            )}
            <h1
              className="text-[32px] text-black tracking-[0.5px] mb-2"
              style={{ fontFamily: "'Anton', sans-serif" }}
            >
              {(source.title || `"${source.raw_content.slice(0, 60)}..."`).toUpperCase()}
            </h1>
            <p className="text-[#666666] text-sm">
              {source.source_type || 'original'} · {source.repurpose_count} repurpose{source.repurpose_count !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Synopsis Box with red left border */}
          <div className="bg-[#F8F8F8] rounded-lg p-5 border-l-4 border-[#E51B23]">
            <p className="text-black leading-relaxed">
              {source.synopsis || source.raw_content}
            </p>
            {source.source_url && (
              <a
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#E51B23] font-semibold hover:underline mt-3 text-sm"
              >
                View original →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Repurpose Section */}
      <div className="bg-white rounded-xl overflow-hidden border-t-4 border-[#E51B23] shadow-sm">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2
            className="text-2xl text-black tracking-[0.5px]"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            REPURPOSE
          </h2>
          <button
            onClick={() => handleGenerate(['linkedin', 'twitter', 'email', 'pull_quotes'])}
            disabled={generating}
            className="px-6 py-2.5 bg-[#E51B23] text-white rounded text-sm font-semibold hover:bg-[#CC171F] disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate All'}
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b-2 border-[#E5E5E5]">
          {platformTabs.map((tab) => {
            const isActive = activePlatform === tab.id
            const count = repurposeCounts[tab.id] || 0
            return (
              <button
                key={tab.id}
                onClick={() => setActivePlatform(tab.id)}
                className="flex items-center gap-2 px-6 py-4 text-sm transition-colors"
                style={{
                  color: isActive ? 'black' : '#666666',
                  fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? '3px solid #E51B23' : '3px solid transparent',
                  marginBottom: '-2px',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#E51B23] text-white">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Output Content */}
        <div className="p-6">
          {platformRepurposes.length > 0 ? (
            <div className="space-y-4">
              {/* Latest/Selected Repurpose */}
              <div className="bg-[#F8F8F8] rounded-lg p-6">
                {/* Author and date info */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E5]">
                  <div className="flex items-center gap-2 text-sm text-[#666666]">
                    <span className="w-6 h-6 rounded-full bg-[#E51B23] text-white flex items-center justify-center text-xs font-bold">
                      {latestRepurpose?.voice_profile?.full_name?.[0] || latestRepurpose?.voice_profile?.title?.[0] || 'U'}
                    </span>
                    <span>
                      {latestRepurpose?.voice_profile?.full_name || latestRepurpose?.voice_profile?.title || 'Team member'}
                    </span>
                    <span className="text-[#999999]">·</span>
                    <span className="text-[#999999]">{latestRepurpose && formatDate(latestRepurpose.created_at)}</span>
                  </div>
                  {platformRepurposes.length > 1 && (
                    <span className="text-xs text-[#999999]">
                      +{platformRepurposes.length - 1} more version{platformRepurposes.length > 2 ? 's' : ''}
                    </span>
                  )}
                </div>

                <p className="text-black whitespace-pre-wrap leading-relaxed">
                  {latestRepurpose?.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleGenerate([activePlatform])}
                    disabled={generating}
                    className="px-5 py-2.5 bg-white border-2 border-black text-black rounded text-sm font-semibold hover:bg-[#F8F8F8] disabled:opacity-50 transition-colors"
                  >
                    {generating ? 'Generating...' : 'Generate New Version'}
                  </button>
                  {latestRepurpose && !isOwnRepurpose(latestRepurpose) && (
                    <button
                      onClick={() => handleGenerate([activePlatform])}
                      disabled={generating}
                      className="px-5 py-2.5 bg-[#FFDE59] text-black border-2 border-black rounded text-sm font-semibold hover:bg-[#F5D64D] disabled:opacity-50 transition-colors"
                    >
                      {generating ? 'Generating...' : 'Regenerate in My Voice'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleCopy()}
                  className={`px-6 py-2.5 rounded text-sm font-semibold transition-colors ${
                    copied
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#E51B23] text-white hover:bg-[#CC171F]'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>

              {/* Previous Versions */}
              {platformRepurposes.length > 1 && (
                <div className="mt-6 pt-6 border-t border-[#E5E5E5]">
                  <h3 className="text-sm font-semibold text-[#666666] mb-3">Previous Versions</h3>
                  <div className="space-y-3">
                    {platformRepurposes.slice(1).map((repurpose) => (
                      <button
                        key={repurpose.id}
                        onClick={() => handleViewVersion(repurpose)}
                        className="w-full text-left p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#E51B23] hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-[#999999]">
                            <span className="w-5 h-5 rounded-full bg-[#E5E5E5] text-[#666666] flex items-center justify-center text-[10px] font-bold">
                              {repurpose.voice_profile?.full_name?.[0] || repurpose.voice_profile?.title?.[0] || 'U'}
                            </span>
                            <span>
                              {repurpose.voice_profile?.full_name || repurpose.voice_profile?.title || 'Team member'}
                            </span>
                            <span>·</span>
                            <span>{formatDate(repurpose.created_at)}</span>
                          </div>
                          <span className="text-xs text-[#E51B23] font-medium">View full →</span>
                        </div>
                        <p className="text-sm text-[#666666] line-clamp-2">
                          {repurpose.content}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#F8F8F8] rounded-lg">
              <p className="text-[#666666] mb-4">
                No {platformTabs.find(t => t.id === activePlatform)?.label} content generated yet
              </p>
              <button
                onClick={() => handleGenerate([activePlatform])}
                disabled={generating}
                className="px-6 py-3 bg-white border-2 border-black text-black rounded text-sm font-semibold hover:bg-[#F8F8F8] disabled:opacity-50 transition-colors"
              >
                {generating ? 'Generating...' : `Generate ${platformTabs.find(t => t.id === activePlatform)?.label}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Version Detail Modal */}
      {selectedRepurpose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Red accent bar */}
            <div className="h-1 bg-[#E51B23]" />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className="text-2xl text-black tracking-[0.5px]"
                    style={{ fontFamily: "'Anton', sans-serif" }}
                  >
                    {platformTabs.find(t => t.id === selectedRepurpose.platform)?.label?.toUpperCase() || 'CONTENT'}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-[#666666] mt-1">
                    <span className="w-6 h-6 rounded-full bg-[#E51B23] text-white flex items-center justify-center text-xs font-bold">
                      {selectedRepurpose.voice_profile?.full_name?.[0] || selectedRepurpose.voice_profile?.title?.[0] || 'U'}
                    </span>
                    <span>
                      {selectedRepurpose.voice_profile?.full_name || selectedRepurpose.voice_profile?.title || 'Team member'}
                    </span>
                    <span className="text-[#999999]">·</span>
                    <span className="text-[#999999]">{formatDate(selectedRepurpose.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-[#999999] hover:text-black transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="bg-[#F8F8F8] rounded-lg p-6 mb-6">
                <p className="text-black whitespace-pre-wrap leading-relaxed">
                  {selectedRepurpose.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {!isOwnRepurpose(selectedRepurpose) && (
                    <button
                      onClick={() => {
                        handleCloseModal()
                        handleGenerate([selectedRepurpose.platform])
                      }}
                      disabled={generating}
                      className="px-5 py-2.5 bg-[#FFDE59] text-black border-2 border-black rounded text-sm font-semibold hover:bg-[#F5D64D] disabled:opacity-50 transition-colors"
                    >
                      {generating ? 'Generating...' : 'Regenerate in My Voice'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(selectedRepurpose.content)}
                  className={`px-6 py-2.5 rounded text-sm font-semibold transition-colors ${
                    copied
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#E51B23] text-white hover:bg-[#CC171F]'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
