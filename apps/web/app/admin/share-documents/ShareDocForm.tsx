'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls =
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]'

export default function ShareDocForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [prospectEmail, setProspectEmail] = useState('')
  const [category, setCategory] = useState('proposal')
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [contentBody, setContentBody] = useState('')
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setContentBody(text)
    setUploadedName(file.name)
    // Auto-fill title from filename if empty
    if (!title.trim()) setTitle(file.name.replace(/\.html?$/i, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setShareUrl(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/share-documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_body: contentBody,
          prospect_name: prospectName || null,
          prospect_email: prospectEmail || null,
          category,
          requires_approval: requiresApproval,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }
      setShareUrl(json.shareUrl)
      // Reset the compose fields, keep the link visible
      setTitle('')
      setProspectName('')
      setProspectEmail('')
      setContentBody('')
      setUploadedName(null)
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="border border-slate-700/50 rounded-lg p-6">
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
        New Share-Link
      </h2>

      {shareUrl && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-300 uppercase tracking-wide mb-2">Link created — send this to your prospect</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm text-white font-mono break-all">{shareUrl}</code>
            <button
              type="button"
              onClick={copyLink}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 text-xs text-[#00D4FF] hover:underline">
              Preview
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title <span className="text-[#E51B23]">*</span></label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Huemor — Alignment Doc" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="proposal">Proposal</option>
              <option value="alignment">Alignment</option>
              <option value="scope">Scope</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Prospect name</label>
            <input className={inputCls} value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="Jeff" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Prospect email</label>
            <input className={inputCls} type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)} placeholder="jeff@huemor.com" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-slate-400">
              HTML content <span className="text-[#E51B23]">*</span>
            </label>
            <div className="flex items-center gap-3">
              {uploadedName && <span className="text-[11px] text-slate-500">loaded: {uploadedName}</span>}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs font-medium text-[#00D4FF] hover:underline"
              >
                Upload .html file
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".html,.htm,text/html" onChange={handleFile} className="hidden" />
          <textarea
            className={`${inputCls} font-mono text-xs min-h-[200px]`}
            value={contentBody}
            onChange={(e) => { setContentBody(e.target.value); setUploadedName(null) }}
            placeholder="<h1>Hi Jeff</h1><p>Here's the plan…</p>  — paste HTML here, or upload a file above"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} className="accent-[#E51B23]" />
          Require approval (prospect submits name + email to approve)
        </label>

        {error && <p className="text-sm text-[#E51B23]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-[#E51B23] text-white text-sm font-medium hover:bg-[#c8161d] disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create share-link'}
        </button>
      </form>
    </section>
  )
}
