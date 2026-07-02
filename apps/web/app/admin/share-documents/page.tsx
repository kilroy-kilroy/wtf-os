import { getSupabaseServerClient } from '@/lib/supabase-server'
import ShareDocForm from './ShareDocForm'
import DeleteLinkButton from './DeleteLinkButton'

export const dynamic = 'force-dynamic'

type ShareDocRow = {
  id: string
  title: string | null
  category: string | null
  prospect_name: string | null
  prospect_email: string | null
  requires_approval: boolean
  share_token: string | null
  viewed_at: string | null
  approved_at: string | null
  approved_name: string | null
  approved_email: string | null
  created_at: string | null
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.timkilroy.com'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ doc }: { doc: ShareDocRow }) {
  let label = 'Not viewed'
  let cls = 'bg-slate-800 text-slate-400'
  if (doc.approved_at) {
    label = 'Approved'
    cls = 'bg-emerald-500/15 text-emerald-300'
  } else if (doc.viewed_at) {
    label = 'Viewed'
    cls = 'bg-[#00D4FF]/15 text-[#00D4FF]'
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>{label}</span>
}

export default async function ShareDocumentsPage() {
  const { data } = await getSupabaseServerClient()
    .from('client_documents')
    .select('id, title, category, prospect_name, prospect_email, requires_approval, share_token, viewed_at, approved_at, approved_name, approved_email, created_at')
    .is('enrollment_id', null)
    .not('share_token', 'is', null)
    .order('created_at', { ascending: false })

  const docs = (data ?? []) as ShareDocRow[]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-white">Prospect Share-Links</h1>
        <p className="text-sm text-slate-400 mt-1">
          Create a private, unguessable link to send a proposal or alignment doc to a prospect. No login required on their end — the link itself is the gate.
        </p>
      </div>

      <ShareDocForm />

      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Existing Links ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500">No share-links yet. Create your first one above.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => {
              const url = doc.share_token ? `${APP_URL}/d/${doc.share_token}` : ''
              return (
                <div key={doc.id} className="border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-medium truncate">{doc.title || 'Untitled'}</h3>
                        <StatusBadge doc={doc} />
                        {doc.requires_approval && (
                          <span className="text-[11px] text-slate-500 uppercase tracking-wide">approval on</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {doc.prospect_name || '—'}
                        {doc.prospect_email ? ` · ${doc.prospect_email}` : ''}
                        {doc.category ? ` · ${doc.category}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Created {fmtDate(doc.created_at)}
                        {doc.viewed_at ? ` · viewed ${fmtDate(doc.viewed_at)}` : ''}
                        {doc.approved_at ? ` · approved ${fmtDate(doc.approved_at)} by ${doc.approved_name || doc.approved_email || 'prospect'}` : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#00D4FF] hover:underline break-all max-w-[240px]"
                        >
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                      <DeleteLinkButton id={doc.id} title={doc.title || 'Untitled'} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
