'use client'
import { useEffect, useState } from 'react'

export function ApproveBox({ token, requiresApproval, initiallyApproved, approvedName }:
  { token: string; requiresApproval: boolean; initiallyApproved: boolean; approvedName: string | null }) {
  const [approved, setApproved] = useState(initiallyApproved)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { fetch(`/api/share/${token}/view`, { method: 'POST' }) }, [token])

  if (approved) {
    return <div style={{ color: '#22c55e', marginTop: 16, fontWeight: 700 }}>✅ Approved{approvedName ? ` by ${approvedName}` : ''}. Thank you.</div>
  }
  if (!requiresApproval) return null
  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
      <input placeholder="Your full name" value={name} onChange={e => setName(e.target.value)}
        style={{ background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px' }} />
      <input placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
        style={{ background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px' }} />
      <button
        disabled={!name.trim()}
        onClick={async () => {
          const res = await fetch(`/api/share/${token}/approve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), email: email.trim() }),
          })
          const json = await res.json()
          if (json.ok) { setApproved(true); setError('') } else { setError(json.error || 'Approval failed') }
        }}
        style={{ background: '#E51B23', color: '#fff', padding: '10px 18px', border: 0, fontWeight: 700, textTransform: 'uppercase', opacity: name.trim() ? 1 : 0.4 }}>
        Approve
      </button>
      {error && <p style={{ color: '#E51B23', fontSize: 13 }}>{error}</p>}
    </div>
  )
}
