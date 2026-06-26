import { notFound } from 'next/navigation'
import { authorizeShareDocument } from '@/lib/client-documents/share-authorize'
import { ApproveBox } from './ApproveBox'

export const metadata = { robots: { index: false, follow: false } }

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const authz = await authorizeShareDocument(token)
  if (!authz.ok) notFound()
  const doc = authz.doc
  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#fff', fontFamily: 'var(--font-anton, sans-serif)', textTransform: 'uppercase', marginBottom: 16 }}>{doc.title}</h1>
        <iframe
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={doc.content_body ?? ''}
          title={doc.title}
          style={{ width: '100%', height: '78vh', border: 0, background: '#fff', borderRadius: 8 }}
        />
        <ApproveBox
          token={token}
          requiresApproval={doc.requires_approval}
          initiallyApproved={!!doc.approved_at}
          approvedName={doc.approved_name}
        />
      </div>
    </main>
  )
}
