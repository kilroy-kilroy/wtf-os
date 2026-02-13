'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CallImport {
  id: string
  title: string | null
  participants: string[]
  duration_seconds: number | null
  call_date: string | null
  call_type: string | null
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_moments: any[]
  provider: string
}

export default function CallsListPage() {
  const [calls, setCalls] = useState<CallImport[]>([])
  const [loading, setLoading] = useState(true)
  const [firefliesConnected, setFirefliesConnected] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkFirefliesConnection()
    fetchCalls()
  }, [])

  async function checkFirefliesConnection() {
    try {
      const res = await fetch('/api/content-engine/integrations/fireflies/connect')
      const data = await res.json()
      setFirefliesConnected(data.connected)
    } catch (err) {
      console.error('Error checking Fireflies connection:', err)
    }
  }

  async function fetchCalls() {
    try {
      const res = await fetch('/api/content-engine/calls')
      const data = await res.json()
      setCalls(data.calls || [])
    } catch (err) {
      console.error('Error fetching calls:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnectFireflies() {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/integrations/fireflies/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to connect')
      }

      setFirefliesConnected(true)
      setShowConnectModal(false)
      setApiKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSyncFireflies() {
    setSyncing(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/integrations/fireflies/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sync')
      }

      const data = await res.json()
      // Refresh calls list
      fetchCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSyncing(false)
    }
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2d2a26]">Calls</h1>
          <p className="text-[#8a8078] mt-1">Extract content gold from your conversations</p>
        </div>
        <div className="flex gap-3">
          {firefliesConnected ? (
            <Button
              onClick={handleSyncFireflies}
              disabled={syncing}
              variant="outline"
            >
              {syncing ? 'Syncing...' : 'Sync Fireflies'}
            </Button>
          ) : (
            <Button
              onClick={() => setShowConnectModal(true)}
              className="bg-[#c45a3b] hover:bg-[#b04a2d]"
            >
              Connect Fireflies
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Calls List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-[#e8e0d5] animate-pulse">
              <div className="h-5 bg-[#e8e0d5] rounded w-1/3 mb-3" />
              <div className="h-4 bg-[#e8e0d5] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#e8e0d5] text-center">
          {firefliesConnected ? (
            <>
              <div className="w-16 h-16 bg-[#faf8f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#8a8078]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-[#8a8078] mb-4">No calls imported yet</p>
              <Button
                onClick={handleSyncFireflies}
                disabled={syncing}
                className="bg-[#c45a3b] hover:bg-[#b04a2d]"
              >
                {syncing ? 'Syncing...' : 'Sync from Fireflies'}
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#faf8f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#8a8078]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-[#8a8078] mb-4">Connect Fireflies to import your call transcripts</p>
              <Button
                onClick={() => setShowConnectModal(true)}
                className="bg-[#c45a3b] hover:bg-[#b04a2d]"
              >
                Connect Fireflies
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e8e0d5] overflow-hidden">
          <div className="divide-y divide-[#e8e0d5]">
            {calls.map((call) => (
              <Link
                key={call.id}
                href={`/content-hub/calls/${call.id}`}
                className="block p-6 hover:bg-[#faf8f5] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[#2d2a26] font-medium truncate">
                        {call.title || 'Untitled Call'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[call.processing_status]}`}>
                        {call.processing_status === 'completed'
                          ? `${call.extracted_moments?.length || 0} moments`
                          : call.processing_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#8a8078]">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(call.duration_seconds)}
                      </span>
                      <span>{formatDate(call.call_date)}</span>
                      {call.participants?.length > 0 && (
                        <span>{call.participants.length} participants</span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-[#8a8078]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Connect Fireflies Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#2d2a26]">Connect Fireflies</h2>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-[#8a8078] hover:text-[#2d2a26]"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[#8a8078]">
                Enter your Fireflies API key to import call transcripts. You can find your API key in the{' '}
                <a
                  href="https://app.fireflies.ai/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c45a3b] hover:underline"
                >
                  Fireflies Integrations page
                </a>.
              </p>

              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ff-..."
                  className="mt-1"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectFireflies}
                  disabled={connecting || !apiKey.trim()}
                  className="flex-1 bg-[#c45a3b] hover:bg-[#b04a2d]"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
