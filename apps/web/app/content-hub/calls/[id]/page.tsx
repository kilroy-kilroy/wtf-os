'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ContentMoment {
  id: string
  timestamp: string
  quote: string
  type: string
  confidence: number
  suggested4E: string
  speaker?: string
  promoted?: boolean
  promotedSourceId?: string
}

interface CallImport {
  id: string
  title: string | null
  participants: string[]
  duration_seconds: number | null
  call_date: string | null
  call_type: string | null
  transcript: string
  summary: string | null
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_moments: ContentMoment[]
  provider: string
}

const momentTypeLabels: Record<string, string> = {
  quote: '💬 Quote',
  rant: '🔥 Rant',
  analogy: '🎯 Analogy',
  framework: '📐 Framework',
  story: '📖 Story',
  hot_take: '🌶️ Hot Take',
  data_point: '📊 Data Point',
}

const theme4EColors: Record<string, string> = {
  evidence: 'bg-blue-100 text-blue-700 border-blue-200',
  education: 'bg-green-100 text-green-700 border-green-200',
  entertainment: 'bg-purple-100 text-purple-700 border-purple-200',
  envision: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function CallReviewPage() {
  const params = useParams()
  const router = useRouter()
  const callId = params.id as string

  const [call, setCall] = useState<CallImport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [promotingMomentId, setPromotingMomentId] = useState<string | null>(null)

  useEffect(() => {
    fetchCall()
  }, [callId])

  async function fetchCall() {
    try {
      const res = await fetch(`/api/content-engine/calls/${callId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load call')
      }
      const data = await res.json()
      setCall(data.call)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleExtractMoments() {
    setExtracting(true)
    setError(null)

    try {
      const res = await fetch(`/api/content-engine/calls/${callId}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to extract moments')
      }

      // Refresh call data
      fetchCall()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setExtracting(false)
    }
  }

  async function handlePromoteMoment(momentId: string) {
    setPromotingMomentId(momentId)
    setError(null)

    try {
      const res = await fetch(`/api/content-engine/calls/${callId}/moments/${momentId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to promote moment')
      }

      const data = await res.json()

      // Update local state
      if (call) {
        setCall({
          ...call,
          extracted_moments: call.extracted_moments.map(m =>
            m.id === momentId
              ? { ...m, promoted: true, promotedSourceId: data.source.id }
              : m
          ),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPromotingMomentId(null)
    }
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[#e8e0d5] rounded w-1/4" />
        <div className="bg-white rounded-xl p-6 border border-[#e8e0d5]">
          <div className="h-6 bg-[#e8e0d5] rounded w-1/2 mb-4" />
          <div className="h-4 bg-[#e8e0d5] rounded w-full mb-2" />
          <div className="h-4 bg-[#e8e0d5] rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (error && !call) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8a8078] mb-4">{error}</p>
        <Link href="/content-hub/calls" className="text-[#c45a3b] hover:underline">
          Back to calls
        </Link>
      </div>
    )
  }

  if (!call) return null

  const moments = call.extracted_moments || []
  const pendingMoments = moments.filter(m => !m.promoted)
  const promotedMoments = moments.filter(m => m.promoted)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/content-hub/calls"
        className="inline-flex items-center gap-2 text-[#8a8078] hover:text-[#2d2a26] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to calls
      </Link>

      {/* Call Header */}
      <div className="bg-white rounded-xl border border-[#e8e0d5] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#2d2a26]">
              {call.title || 'Untitled Call'}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-[#8a8078]">
              <span>{formatDuration(call.duration_seconds)}</span>
              {call.call_date && (
                <span>{new Date(call.call_date).toLocaleDateString()}</span>
              )}
              {call.participants?.length > 0 && (
                <span>{call.participants.join(', ')}</span>
              )}
            </div>
            {call.summary && (
              <p className="mt-4 text-[#6b635a]">{call.summary}</p>
            )}
          </div>
          <div>
            {call.processing_status === 'pending' && (
              <Button
                onClick={handleExtractMoments}
                disabled={extracting}
                className="bg-[#c45a3b] hover:bg-[#b04a2d]"
              >
                {extracting ? 'Extracting...' : 'Extract Moments'}
              </Button>
            )}
            {call.processing_status === 'processing' && (
              <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                Processing...
              </span>
            )}
            {call.processing_status === 'completed' && moments.length > 0 && (
              <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                {moments.length} moments found
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Moments Section */}
      {call.processing_status === 'completed' && (
        <div className="space-y-6">
          {/* Pending Moments */}
          {pendingMoments.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-[#2d2a26] mb-4">
                Content Moments ({pendingMoments.length})
              </h2>
              <div className="space-y-4">
                {pendingMoments.map((moment) => (
                  <div
                    key={moment.id}
                    className="bg-white rounded-xl border border-[#e8e0d5] p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-[#faf8f5] rounded text-xs font-mono text-[#8a8078]">
                          {moment.timestamp}
                        </span>
                        <span className="text-sm">
                          {momentTypeLabels[moment.type] || moment.type}
                        </span>
                        {moment.suggested4E && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${theme4EColors[moment.suggested4E]}`}>
                            {moment.suggested4E.charAt(0).toUpperCase() + moment.suggested4E.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-[#8a8078]">
                          <div className="w-12 h-1.5 bg-[#e8e0d5] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${moment.confidence >= 80 ? 'bg-green-500' : moment.confidence >= 60 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                              style={{ width: `${moment.confidence}%` }}
                            />
                          </div>
                          <span>{moment.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <blockquote className="text-[#2d2a26] text-lg leading-relaxed mb-4 pl-4 border-l-2 border-[#c45a3b]">
                      "{moment.quote}"
                    </blockquote>

                    {moment.speaker && (
                      <p className="text-sm text-[#8a8078] mb-4">— {moment.speaker}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => handlePromoteMoment(moment.id)}
                        disabled={promotingMomentId === moment.id}
                        className="bg-[#c45a3b] hover:bg-[#b04a2d]"
                      >
                        {promotingMomentId === moment.id ? 'Adding...' : 'Add to Repository'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/content-hub/repository?repurpose=${moment.id}`)}
                      >
                        Repurpose Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promoted Moments */}
          {promotedMoments.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-[#2d2a26] mb-4">
                Added to Repository ({promotedMoments.length})
              </h2>
              <div className="space-y-3">
                {promotedMoments.map((moment) => (
                  <Link
                    key={moment.id}
                    href={`/content-hub/repository/${moment.promotedSourceId}`}
                    className="block bg-white rounded-xl border border-[#e8e0d5] p-4 hover:bg-[#faf8f5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-green-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <p className="text-[#2d2a26] truncate">"{moment.quote.slice(0, 80)}..."</p>
                      </div>
                      <span className="text-xs text-[#c45a3b]">View in Repository →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {moments.length === 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d5] p-12 text-center">
              <p className="text-[#8a8078]">No content moments found in this call</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript Section */}
      {call.transcript && (
        <div className="bg-white rounded-xl border border-[#e8e0d5]">
          <div className="p-4 border-b border-[#e8e0d5]">
            <h2 className="font-medium text-[#2d2a26]">Full Transcript</h2>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <pre className="text-sm text-[#6b635a] whitespace-pre-wrap font-sans leading-relaxed">
              {call.transcript}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
