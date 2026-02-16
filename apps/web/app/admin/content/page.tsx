'use client';

import { useState, useEffect } from 'react';

const PROGRAMS = [
  { slug: 'agency-studio', name: 'Agency Studio' },
  { slug: 'agency-studio-plus', name: 'Agency Studio+' },
  { slug: 'salesos-studio', name: 'SalesOS Studio' },
  { slug: 'salesos-growth', name: 'SalesOS Growth' },
  { slug: 'salesos-team', name: 'SalesOS Team' },
  { slug: 'demandos-studio', name: 'DemandOS Studio' },
  { slug: 'demandos-growth', name: 'DemandOS Growth' },
  { slug: 'demandos-team', name: 'DemandOS Team' },
];

const CONTENT_TYPES = ['video', 'deck', 'pdf', 'text', 'link'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const TYPE_COLORS: Record<ContentType, string> = {
  video: '#E51B23',
  deck: '#FFDE59',
  pdf: '#00D4FF',
  text: '#a855f7',
  link: '#22c55e',
};

export default function AdminContentPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<ContentType>('video');
  const [formUrl, setFormUrl] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formPrograms, setFormPrograms] = useState<string[]>([]);
  const [formPublished, setFormPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadContent(stored);
    }
  }, []);

  async function loadContent(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/client/content', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || []);
      }
    } catch (err) {
      console.error('Failed to load content:', err);
    }
    setLoading(false);
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('admin_api_key', apiKey);
    setAuthed(true);
    loadContent(apiKey);
  }

  function resetForm() {
    setFormTitle('');
    setFormDescription('');
    setFormType('video');
    setFormUrl('');
    setFormBody('');
    setFormThumbnail('');
    setFormPrograms([]);
    setFormPublished(true);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setFormType(item.content_type || 'video');
    setFormUrl(item.content_url || '');
    setFormBody(item.content_body || '');
    setFormThumbnail(item.thumbnail_url || '');
    setFormPublished(item.published ?? true);
    // We don't have slug info from the response (only program_ids as UUIDs),
    // so we can't pre-select programs during edit. Clear them and let admin re-select.
    setFormPrograms([]);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        content_type: formType,
        content_url: ['video', 'deck', 'pdf', 'link'].includes(formType) ? (formUrl.trim() || null) : null,
        content_body: formType === 'text' ? (formBody.trim() || null) : null,
        thumbnail_url: formThumbnail.trim() || null,
        program_slugs: formPrograms,
        published: formPublished,
      };

      let res: Response;
      if (editingId) {
        // PATCH (update)
        payload.id = editingId;
        res = await fetch('/api/client/content', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // POST (create)
        payload.sort_order = content.length;
        res = await fetch('/api/client/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        resetForm();
        await loadContent(apiKey);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.message || 'Save failed'}`);
      }
    } catch (err) {
      alert('Failed to save content');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      const res = await fetch('/api/client/content', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadContent(apiKey);
      } else {
        alert('Failed to delete content');
      }
    } catch (err) {
      alert('Failed to delete content');
    }
  }

  async function handleTogglePublished(item: any) {
    try {
      const res = await fetch('/api/client/content', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: item.id, published: !item.published }),
      });
      if (res.ok) {
        setContent(prev =>
          prev.map(c => (c.id === item.id ? { ...c, published: !item.published } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle published:', err);
    }
  }

  async function handleSort(item: any, direction: 'up' | 'down') {
    const sorted = [...content].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex(c => c.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const adjacent = sorted[swapIdx];
    const itemOrder = item.sort_order ?? idx;
    const adjacentOrder = adjacent.sort_order ?? swapIdx;

    try {
      await Promise.all([
        fetch('/api/client/content', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ id: item.id, sort_order: adjacentOrder }),
        }),
        fetch('/api/client/content', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ id: adjacent.id, sort_order: itemOrder }),
        }),
      ]);
      await loadContent(apiKey);
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  }

  function toggleProgram(slug: string) {
    setFormPrograms(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }

  // ---- Auth gate ----
  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: Content Library</h1>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Admin API Key"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none"
          />
          <button type="submit" className="w-full bg-[#E51B23] text-white py-3 font-anton uppercase">
            Access
          </button>
        </form>
      </div>
    );
  }

  // ---- Main content ----
  const sorted = [...content].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Content Library</h1>
          <div className="flex gap-3">
            <a href="/admin/clients" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Clients
            </a>
            <a href="/admin/five-minute-friday" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              5-Minute Friday
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Add/Edit Form Panel */}
        {showForm && (
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 mb-8">
            <h2 className="text-xl font-anton uppercase text-[#FFDE59] mb-4">
              {editingId ? 'Edit Content' : 'Add Content'}
            </h2>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Content title"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Content Type */}
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Content Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ContentType)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  >
                    {CONTENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Thumbnail URL</label>
                  <input
                    type="text"
                    value={formThumbnail}
                    onChange={(e) => setFormThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  />
                </div>

                {/* Published toggle */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setFormPublished(!formPublished)}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                        formPublished ? 'bg-[#E51B23]' : 'bg-[#333333]'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          formPublished ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] tracking-[2px] text-[#666666] uppercase">
                      {formPublished ? 'Published' : 'Draft'}
                    </span>
                  </label>
                </div>
              </div>

              {/* URL field — shown for video/deck/pdf/link */}
              {['video', 'deck', 'pdf', 'link'].includes(formType) && (
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">URL</label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  />
                </div>
              )}

              {/* Body field — shown for text type */}
              {formType === 'text' && (
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Body</label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={6}
                    placeholder="Content body text..."
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y"
                  />
                </div>
              )}

              {/* Programs checkboxes */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">Programs</label>
                <div className="flex flex-wrap gap-3">
                  {PROGRAMS.map(p => (
                    <label key={p.slug} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPrograms.includes(p.slug)}
                        onChange={() => toggleProgram(p.slug)}
                        className="accent-[#E51B23]"
                      />
                      <span className="text-sm text-[#999999]">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="border border-[#333333] text-[#999999] px-6 py-2 font-anton uppercase hover:text-white hover:border-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Content button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors"
            >
              + Add Content
            </button>
          </div>
        )}

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-16">Sort</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Title</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-20">Type</th>
                <th className="text-center py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-24">Published</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-24">Programs</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-28">Date</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#666666]">Loading...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#666666]">No content yet. Click &quot;+ Add Content&quot; above.</td></tr>
              ) : (
                sorted.map((item, idx) => (
                  <tr key={item.id} className="border-b border-[#222222] hover:bg-[#111111]">
                    {/* Sort arrows */}
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSort(item, 'up')}
                          disabled={idx === 0}
                          className="text-[10px] border border-[#333333] px-1.5 py-0.5 text-[#999999] hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-[#999999] disabled:hover:border-[#333333]"
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={() => handleSort(item, 'down')}
                          disabled={idx === sorted.length - 1}
                          className="text-[10px] border border-[#333333] px-1.5 py-0.5 text-[#999999] hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-[#999999] disabled:hover:border-[#333333]"
                        >
                          &#9660;
                        </button>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-white">{item.title}</p>
                        {item.description && (
                          <p className="text-[#666666] text-xs mt-0.5 truncate max-w-xs">{item.description}</p>
                        )}
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="py-3 px-2">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 border"
                        style={{
                          color: TYPE_COLORS[item.content_type as ContentType] || '#999999',
                          borderColor: TYPE_COLORS[item.content_type as ContentType] || '#333333',
                        }}
                      >
                        {item.content_type}
                      </span>
                    </td>

                    {/* Published toggle */}
                    <td className="py-3 px-2 text-center">
                      <div
                        onClick={() => handleTogglePublished(item)}
                        className={`relative inline-block w-10 h-5 rounded-full transition-colors cursor-pointer ${
                          item.published ? 'bg-[#E51B23]' : 'bg-[#333333]'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            item.published ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Programs count */}
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {item.program_ids && item.program_ids.length > 0
                        ? `${item.program_ids.length} program${item.program_ids.length > 1 ? 's' : ''}`
                        : 'All'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#666666] hover:text-[#E51B23] hover:border-[#E51B23] transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
