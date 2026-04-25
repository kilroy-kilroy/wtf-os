// apps/web/components/client/DocumentUploadSlot.tsx
'use client';

import { useState } from 'react';

export type ExistingDoc = {
  id: string;
  category: string;
  title: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

/**
 * Generic file upload slot used across the client portal.
 *
 * NOTE: `existing` is treated as an INITIAL value only. The component owns
 * its display list after mount via internal state and `onChange` callbacks.
 * If a parent re-fetches and needs to reset the list, force a remount via a
 * `key` prop change.
 */
type Props = {
  category: string;
  label: string;
  existing: ExistingDoc[];
  readOnly?: boolean;
  onChange?: (docs: ExistingDoc[]) => void;
  helpText?: string;
};

const MAX_MB = 20;

export default function DocumentUploadSlot({
  category, label, existing, readOnly, onChange, helpText,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localDocs, setLocalDocs] = useState<ExistingDoc[]>(existing);

  // Sequential uploads: each file awaits the previous to avoid a stale-closure
  // bug where parallel updates would clobber each other. Modern networks make
  // sequential uploads acceptable for the typical ~6 files this slot accepts.
  async function uploadOne(file: File): Promise<ExistingDoc | null> {
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`File too large: ${file.name} exceeds ${MAX_MB} MB`);
      return null;
    }
    const sign = await fetch('/api/client/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sign', category, fileName: file.name, sizeBytes: file.size }),
    }).then((r) => r.json());
    if (!sign.uploadUrl) {
      alert('Upload failed: ' + (sign.error ?? 'unknown'));
      return null;
    }
    const put = await fetch(sign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!put.ok) {
      alert('Upload to storage failed: ' + put.statusText);
      return null;
    }
    const commit = await fetch('/api/client/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'commit',
        storagePath: sign.storagePath,
        category,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    }).then((r) => r.json());
    if (!commit.document) {
      alert('Upload record failed: ' + (commit.error ?? 'unknown'));
      return null;
    }
    return commit.document as ExistingDoc;
  }

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const doc = await uploadOne(f);
        if (doc) {
          setLocalDocs((prev) => {
            const next = [doc, ...prev];
            onChange?.(next);
            return next;
          });
        }
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this file?')) return;
    const res = await fetch(`/api/client/documents?id=${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) {
      setLocalDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        onChange?.(next);
        return next;
      });
    } else {
      alert('Delete failed: ' + (res.error ?? 'unknown'));
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-300">{label}</div>
      {helpText && <div className="text-xs text-gray-500">{helpText}</div>}

      {!readOnly && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
          className={`block w-full border-2 border-dashed p-6 cursor-pointer text-center transition-colors ${
            dragOver ? 'border-[#E51B23] bg-[#E51B23]/10' : 'border-[#333333] bg-black'
          }`}
        >
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.currentTarget.value = ''; }}
          />
          <div className="text-sm text-gray-400">
            {uploading ? 'Uploading…' : 'Drop files here or click to choose'}
          </div>
          <div className="text-xs text-gray-600 mt-1">Max {MAX_MB} MB per file</div>
        </label>
      )}

      {localDocs.length > 0 && (
        <ul className="divide-y divide-[#333333] border border-[#333333]">
          {localDocs.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm text-gray-200">
              <div className="truncate min-w-0 flex-1">
                <div className="truncate">{d.file_name}</div>
                <div className="text-xs text-gray-500">
                  {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="text-xs uppercase tracking-wider text-[#E51B23] hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
