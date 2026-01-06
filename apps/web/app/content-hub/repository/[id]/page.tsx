'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

const theme4EColors: Record<string, string> = {
  evidence: 'bg-blue-100 text-blue-700',
  education: 'bg-green-100 text-green-700',
  entertainment: 'bg-purple-100 text-purple-700',
  envision: 'bg-amber-100 text-amber-700',
}

const platformTabs = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'pull_quotes', label: 'Pull Quotes', icon: '💬' },
]

export default function ContentSourcePage() {
  const params = useParams()
  const router = useRouter()
  const sourceId = params.id as string

  const [source, setSource] = useState<ContentSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePlatform, setActivePlatform] = useState('linkedin')
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchSource()
  }, [sourceId])

  async function fetchSource() {
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
  }

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
        <div className="h-8 bg-[#e8e0d5] rounded w-1/4 mb-4" />
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <div className="h-6 bg-[#e8e0d5] rounded w-3/4 mb-4" />
          <div className="h-4 bg-[#e8e0d5] rounded w-full mb-2" />
          <div className="h-4 bg-[#e8e0d5] rounded w-full mb-2" />
          <div className="h-4 bg-[#e8e0d5] rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error && !source) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8a8078] mb-4">{error}</p>
        <Link href="/content-hub/repository" className="text-[#c45a3b] hover:underline">
          Back to repository
        </Link>
      </div>
    )
  }

  if (!source) return null

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/content-hub/repository"
        className="inline-flex items-center gap-2 text-[#8a8078] hover:text-[#2d2a26] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to repository
      </Link>

      {/* Source Content Card */}
      <div className="bg-white rounded-xl border border-[#e8e0d5] overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-[#fdfcfa] to-[#faf8f5] border-b border-[#e8e0d5]">
          {source.theme_4e && (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${theme4EColors[source.theme_4e]}`}>
              {source.theme_4e.charAt(0).toUpperCase() + source.theme_4e.slice(1)}
            </span>
          )}
          <h1 className="text-2xl font-medium text-[#2d2a26] mb-2">
            {source.title || `"${source.raw_content.slice(0, 60)}..."`}
          </h1>
          <p className="text-[#8a8078]">
            {source.source_type || 'Original'} · {source.repurpose_count} repurpose{source.repurpose_count !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-6">
          <p className="text-[#2d2a26] whitespace-pre-wrap leading-relaxed">
            {source.synopsis || source.raw_content}
          </p>
          {source.source_url && (
            <a
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#c45a3b] hover:underline mt-4 text-sm"
            >
              View original
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Repurpose Section */}
      <div className="bg-white rounded-xl border border-[#e8e0d5] overflow-hidden">
        <div className="p-6 border-b border-[#e8e0d5] flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#2d2a26]">Repurpose</h2>
          <Button
            onClick={() => handleGenerate(['linkedin', 'twitter', 'email', 'pull_quotes'])}
            disabled={generating}
            className="bg-[#c45a3b] hover:bg-[#b04a2d]"
          >
            {generating ? 'Generating...' : 'Generate All'}
          </Button>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-[#e8e0d5] bg-[#fdfcfa]">
          {platformTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePlatform(tab.id)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                activePlatform === tab.id
                  ? 'bg-white border-b-2 border-[#c45a3b] text-[#2d2a26]'
                  : 'text-[#8a8078] hover:text-[#2d2a26]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {outputs[tab.id] && (
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* Output Content */}
        <div className="p-6">
          {outputs[activePlatform] ? (
            <div>
              <div className="bg-[#faf8f5] rounded-xl p-6 border border-[#e8e0d5]">
                <p className="text-[#2d2a26] whitespace-pre-wrap leading-relaxed">
                  {outputs[activePlatform]}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleGenerate([activePlatform])}>
                    Regenerate
                  </Button>
                </div>
                <Button
                  onClick={handleCopy}
                  className={copied ? 'bg-green-600' : 'bg-[#c45a3b] hover:bg-[#b04a2d]'}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#8a8078] mb-4">
                No {platformTabs.find(t => t.id === activePlatform)?.label} content generated yet
              </p>
              <Button
                onClick={() => handleGenerate([activePlatform])}
                disabled={generating}
                variant="outline"
              >
                {generating ? 'Generating...' : `Generate ${platformTabs.find(t => t.id === activePlatform)?.label}`}
              </Button>
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
