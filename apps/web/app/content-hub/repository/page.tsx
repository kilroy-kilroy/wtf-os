'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ContentSource {
  id: string
  title: string | null
  synopsis: string | null
  raw_content: string
  theme_4e: string | null
  source_type: string | null
  repurpose_count: number
  created_at: string
}

// 4E Theme colors from style guide
const theme4EColors: Record<string, { bg: string; text: string; primary: string }> = {
  evidence: { bg: '#DBEAFE', text: '#1E40AF', primary: '#3B82F6' },
  education: { bg: '#DCFCE7', text: '#166534', primary: '#10B981' },
  entertainment: { bg: '#FEF3C7', text: '#92400E', primary: '#F59E0B' },
  envision: { bg: '#FCE7F3', text: '#9D174D', primary: '#EC4899' },
}

const themeFilters = [
  { key: 'all', label: 'All', color: '#E51B23' },
  { key: 'evidence', label: 'Evidence', color: '#3B82F6' },
  { key: 'education', label: 'Education', color: '#10B981' },
  { key: 'entertainment', label: 'Entertainment', color: '#F59E0B' },
  { key: 'envision', label: 'Envision', color: '#EC4899' },
]

export default function ContentRepository() {
  const [sources, setSources] = useState<ContentSource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Add content form state
  const [newContent, setNewContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (selectedTheme) params.set('theme', selectedTheme.toLowerCase())

      const res = await fetch(`/api/content-engine/sources?${params}`)
      const data = await res.json()
      setSources(data.sources || [])
    } catch (err) {
      console.error('Error fetching sources:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedTheme])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  async function handleAddContent() {
    if (!newContent.trim()) {
      setSaveError('Content is required')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      // Get user's org
      const orgsRes = await fetch('/api/content-engine/orgs')
      const orgsData = await orgsRes.json()
      if (!orgsData.orgs?.length) {
        throw new Error('No organization found')
      }

      const res = await fetch('/api/content-engine/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgsData.orgs[0].id,
          raw_content: newContent,
          title: newTitle || undefined,
          source_url: newUrl || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save content')
      }

      // Reset and refresh
      setNewContent('')
      setNewTitle('')
      setNewUrl('')
      setShowAddModal(false)
      fetchSources()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[42px] text-black tracking-[1px] mb-2"
            style={{ fontFamily: "'Anton', sans-serif" }}
          >
            CONTENT REPOSITORY
          </h1>
          <p className="text-[#666666] text-base">Browse and repurpose your team&apos;s content</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded text-sm font-semibold hover:bg-[#222] transition-all duration-150"
        >
          <span className="text-lg font-light">+</span>
          Add Content
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="flex-1 min-w-[280px] relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#999999]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border-2 border-[#E5E5E5] rounded-lg text-[15px] bg-white outline-none transition-colors focus:border-[#E51B23]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          />
        </div>

        {/* 4E Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {themeFilters.map((filter) => {
            const isActive = filter.key === 'all' ? !selectedTheme : selectedTheme === filter.key
            return (
              <button
                key={filter.key}
                onClick={() => setSelectedTheme(filter.key === 'all' ? null : filter.key)}
                className="px-[18px] py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-150"
                style={{
                  backgroundColor: isActive ? filter.color : 'white',
                  color: isActive ? 'white' : 'black',
                  border: `2px solid ${isActive ? filter.color : '#E5E5E5'}`,
                }}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border-2 border-[#E5E5E5] animate-pulse">
              <div className="h-1 bg-[#E5E5E5]" />
              <div className="p-6">
                <div className="h-4 bg-[#E5E5E5] rounded w-1/4 mb-4" />
                <div className="h-6 bg-[#E5E5E5] rounded w-3/4 mb-3" />
                <div className="h-4 bg-[#E5E5E5] rounded w-full mb-2" />
                <div className="h-4 bg-[#E5E5E5] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border-t-4 border-[#E51B23] text-center shadow-sm">
          <p className="text-[#666666] mb-4">
            {searchQuery || selectedTheme ? 'No content matches your filters' : 'No content yet'}
          </p>
          {!searchQuery && !selectedTheme && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded text-sm font-semibold hover:bg-[#222] transition-colors"
            >
              <span className="text-lg font-light">+</span>
              Add your first piece
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((source) => (
            <Link
              key={source.id}
              href={`/content-hub/repository/${source.id}`}
              className="block bg-white rounded-xl overflow-hidden border-2 border-[#E5E5E5] hover:border-[#D1D1D1] hover:shadow-md transition-all group"
            >
              {/* Red accent bar at top */}
              <div className="h-1 bg-[#E51B23]" />

              <div className="p-6">
                {/* Theme Badge */}
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

                {/* Title */}
                <h3 className="text-black font-bold text-xl leading-tight line-clamp-2 mb-3 group-hover:text-[#E51B23] transition-colors">
                  {source.title || `"${source.raw_content.slice(0, 50)}..."`}
                </h3>

                {/* Synopsis */}
                <p className="text-sm text-[#666666] line-clamp-3 leading-relaxed">
                  {source.synopsis || source.raw_content.slice(0, 150)}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#E5E5E5]">
                  <span className="text-[13px] text-[#666666]">
                    {source.source_type || 'original'}
                  </span>
                  <span className="text-[13px] text-[#E51B23] font-semibold">
                    {source.repurpose_count} repurpose{source.repurpose_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Add New Card */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-[#E5E5E5] hover:border-[#D1D1D1] min-h-[280px] flex flex-col items-center justify-center transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-[#F8F8F8] flex items-center justify-center mb-4">
              <span className="text-3xl text-[#666666]">+</span>
            </div>
            <span className="text-[15px] font-semibold text-[#666666]">Add Content</span>
          </button>
        </div>
      )}

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            {/* Red accent bar */}
            <div className="h-1 bg-[#E51B23]" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-2xl text-black tracking-[0.5px]"
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  ADD CONTENT
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[#999999] hover:text-black transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="newTitle" className="text-[13px] uppercase tracking-[0.5px] text-[#666666]">
                    Title (optional)
                  </Label>
                  <Input
                    id="newTitle"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Give your content a title"
                    className="mt-2 border-2 border-[#E5E5E5] focus:border-[#E51B23] rounded-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="newUrl" className="text-[13px] uppercase tracking-[0.5px] text-[#666666]">
                    Source URL (optional)
                  </Label>
                  <Input
                    id="newUrl"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-2 border-2 border-[#E5E5E5] focus:border-[#E51B23] rounded-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="newContent" className="text-[13px] uppercase tracking-[0.5px] text-[#666666]">
                    Content <span className="text-[#E51B23]">*</span>
                  </Label>
                  <Textarea
                    id="newContent"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste your content here..."
                    className="mt-2 min-h-[200px] border-2 border-[#E5E5E5] focus:border-[#E51B23] rounded-lg"
                  />
                  <p className="text-xs text-[#999999] mt-2">
                    {newContent.length} characters (minimum 50)
                  </p>
                </div>

                {saveError && (
                  <p className="text-sm text-[#EF4444] font-medium">{saveError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 bg-white border-2 border-black text-black rounded-md text-sm font-semibold hover:bg-[#F8F8F8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContent}
                    disabled={saving || newContent.trim().length < 50}
                    className="flex-1 px-6 py-3 bg-[#E51B23] text-white rounded-md text-sm font-semibold hover:bg-[#CC171F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Add Content'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
