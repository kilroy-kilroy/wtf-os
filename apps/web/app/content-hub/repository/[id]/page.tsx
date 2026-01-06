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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePlatform, setActivePlatform] = useState('linkedin')
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }, [sourceId])

  useEffect(() => {
    fetchSource()
  }, [fetchSource])

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

      const data = await res.json()

      const newOutputs: Record<string, string> = { ...outputs }
      data.outputs.forEach((output: RepurposeOutput) => {
        if (output.success) {
          newOutputs[output.platform] = output.content
        }
      })
      setOutputs(newOutputs)

      // Set active tab to first generated
      if (data.outputs.length > 0 && data.outputs[0].success) {
        setActivePlatform(data.outputs[0].platform)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    const content = outputs[activePlatform]
    if (!content) return

    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
                {outputs[tab.id] && (
                  <span className="w-2 h-2 bg-[#22C55E] rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Output Content */}
        <div className="p-6">
          {outputs[activePlatform] ? (
            <div>
              <div className="bg-[#F8F8F8] rounded-lg p-6">
                <p className="text-black whitespace-pre-wrap leading-relaxed">
                  {outputs[activePlatform]}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => handleGenerate([activePlatform])}
                  disabled={generating}
                  className="px-5 py-2.5 bg-white border-2 border-black text-black rounded text-sm font-semibold hover:bg-[#F8F8F8] disabled:opacity-50 transition-colors"
                >
                  {generating ? 'Generating...' : 'Regenerate'}
                </button>
                <button
                  onClick={handleCopy}
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
    </div>
  )
}
