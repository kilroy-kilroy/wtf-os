'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteLinkButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)

  async function doDelete() {
    setDeleting(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/share-documents/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError(true)
        setDeleting(false)
        return
      }
      router.refresh()
    } catch {
      setError(true)
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Delete “{title.slice(0, 24)}{title.length > 24 ? '…' : ''}”?</span>
        <button
          type="button"
          onClick={doDelete}
          disabled={deleting}
          className="font-medium text-[#E51B23] hover:underline disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-slate-500 hover:text-slate-300">
          Cancel
        </button>
        {error && <span className="text-[#E51B23]">failed</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-slate-500 hover:text-[#E51B23]"
    >
      Delete
    </button>
  )
}
