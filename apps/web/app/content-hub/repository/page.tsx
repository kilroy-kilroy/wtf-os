'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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

const theme4EColors: Record<string, string> = {
  evidence: 'bg-blue-100 text-blue-700 border-blue-200',
  education: 'bg-green-100 text-green-700 border-green-200',
  entertainment: 'bg-purple-100 text-purple-700 border-purple-200',
  envision: 'bg-amber-100 text-amber-700 border-amber-200',
}

const themeLabels = ['All', 'Evidence', 'Education', 'Entertainment', 'Envision']

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2d2a26]">Content Repository</h1>
          <p className="text-[#8a8078] mt-1">Browse and repurpose your team&apos;s content</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#c45a3b] hover:bg-[#b04a2d]"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {themeLabels.map((theme) => {
            const isActive = theme === 'All' ? !selectedTheme : selectedTheme === theme.toLowerCase()
            return (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme === 'All' ? null : theme.toLowerCase())}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#c45a3b] text-white'
                    : 'bg-white text-[#6b635a] border border-[#e8e0d5] hover:border-[#c45a3b]'
                }`}
              >
                {theme}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-[#e8e0d5] animate-pulse">
              <div className="h-4 bg-[#e8e0d5] rounded w-1/4 mb-4" />
              <div className="h-6 bg-[#e8e0d5] rounded w-3/4 mb-3" />
              <div className="h-4 bg-[#e8e0d5] rounded w-full mb-2" />
              <div className="h-4 bg-[#e8e0d5] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#e8e0d5] text-center">
          <p className="text-[#8a8078] mb-4">
            {searchQuery || selectedTheme ? 'No content matches your filters' : 'No content yet'}
          </p>
          {!searchQuery && !selectedTheme && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#c45a3b] hover:bg-[#b04a2d]"
            >
              Add your first piece
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <Link
              key={source.id}
              href={`/content-hub/repository/${source.id}`}
              className="block bg-white rounded-xl p-6 border border-[#e8e0d5] hover:shadow-md hover:border-[#c45a3b]/30 transition-all group"
            >
              {source.theme_4e && (
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 border ${theme4EColors[source.theme_4e]}`}>
                  {source.theme_4e.charAt(0).toUpperCase() + source.theme_4e.slice(1)}
                </span>
              )}
              <h3 className="text-[#2d2a26] font-medium line-clamp-2 group-hover:text-[#c45a3b] transition-colors">
                {source.title || `"${source.raw_content.slice(0, 50)}..."`}
              </h3>
              <p className="text-sm text-[#8a8078] mt-2 line-clamp-3">
                {source.synopsis || source.raw_content.slice(0, 150)}
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e8e0d5]">
                <span className="text-xs text-[#8a8078]">
                  {source.source_type || 'Original'}
                </span>
                <span className="text-xs text-[#c45a3b] font-medium">
                  {source.repurpose_count} repurpose{source.repurpose_count !== 1 ? 's' : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#2d2a26]">Add Content</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8a8078] hover:text-[#2d2a26]"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newTitle">Title (optional)</Label>
                <Input
                  id="newTitle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Give your content a title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="newUrl">Source URL (optional)</Label>
                <Input
                  id="newUrl"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="newContent">
                  Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="newContent"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste your content here..."
                  className="mt-1 min-h-[200px]"
                />
                <p className="text-xs text-[#8a8078] mt-1">
                  {newContent.length} characters (minimum 50)
                </p>
              </div>

              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddContent}
                  disabled={saving || newContent.trim().length < 50}
                  className="flex-1 bg-[#c45a3b] hover:bg-[#b04a2d]"
                >
                  {saving ? 'Saving...' : 'Add Content'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
