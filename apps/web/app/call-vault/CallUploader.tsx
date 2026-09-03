'use client';

import { useRef, useState } from 'react';
import { ConsoleInput } from '@/components/console';
import { STAGES, OUTCOMES, DEAL_SIZE_BANDS } from '@/lib/call-vault/vocabularies';
import { classifyFile, MAX_FILE_BYTES, MAX_FILES_PER_CALL } from '@/lib/call-vault/validate';
import { LabeledSelect } from './CallVaultForm';

// There is no vocabulary list for file extensions (only for stage/outcome/deal
// size/etc.), so this mirrors the extension set `classifyFile` in
// lib/call-vault/validate.ts accepts — kept in sync with it by hand.
const ACCEPTED_EXTENSIONS =
  '.txt,.md,.docx,.pdf,.rtf,.csv,.vtt,.srt,.mp3,.m4a,.wav,.aac,.ogg,.flac';

type UploadStatus = 'queued' | 'uploading' | 'committing' | 'done' | 'error';

interface FileEntry {
  localId: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  fileId?: string;
  /** A rejection decided client-side before any request was made (wrong type,
   * too large, over the per-call cap) — retrying would fail identically, so
   * only "Remove" is offered, never "Retry". */
  permanent?: boolean;
}

interface CallMeta {
  stage: string;
  outcome: string;
  dealSizeBand: string;
  callDate: string;
  label: string;
}

function makeLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** PUTs the file directly to the signed Supabase Storage URL, reporting
 * real upload progress via XHR (fetch has no upload-progress event). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    xhr.send(file);
  });
}

export default function CallUploader({
  sessionToken,
  canRemove,
  onRemove,
  onCallCreated,
}: {
  sessionToken: string;
  canRemove: boolean;
  onRemove: () => void;
  onCallCreated: () => void;
}) {
  const [meta, setMeta] = useState<CallMeta>({
    stage: '',
    outcome: '',
    dealSizeBand: '',
    callDate: '',
    label: '',
  });
  const [callId, setCallId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const callIdPromiseRef = useRef<Promise<string | null> | null>(null);

  // Lazily creates the call row on the server, at most once. `overrides`
  // carries the just-changed metadata field so a field's own onChange can
  // trigger creation without waiting for React to re-render (state set in the
  // same handler hasn't landed yet when this runs).
  function ensureCallId(overrides?: Partial<CallMeta>): Promise<string | null> {
    if (callId) return Promise.resolve(callId);
    if (callIdPromiseRef.current) return callIdPromiseRef.current;

    const snapshot = { ...meta, ...overrides };
    const promise = (async () => {
      setCreateError(null);
      try {
        const res = await fetch('/api/call-vault/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
          body: JSON.stringify({
            stage: snapshot.stage || null,
            outcome: snapshot.outcome || null,
            dealSizeBand: snapshot.dealSizeBand || null,
            callDate: snapshot.callDate || null,
            label: snapshot.label || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not add that call');
        setCallId(data.callId);
        onCallCreated();
        return data.callId as string;
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Could not add that call');
        return null;
      } finally {
        callIdPromiseRef.current = null;
      }
    })();
    callIdPromiseRef.current = promise;
    return promise;
  }

  function handleMetaChange(field: keyof CallMeta, value: string) {
    setMeta((prev) => ({ ...prev, [field]: value }));
    if (!callId && value) {
      ensureCallId({ [field]: value });
    }
  }

  function updateFile(localId: string, patch: Partial<FileEntry>) {
    setFiles((prev) => prev.map((f) => (f.localId === localId ? { ...f, ...patch } : f)));
  }

  async function startUpload(localId: string, file: File) {
    updateFile(localId, { status: 'uploading', progress: 0, error: undefined });
    try {
      const id = await ensureCallId();
      if (!id) throw new Error(createError || 'Could not add that call');

      const signRes = await fetch('/api/call-vault/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify({
          mode: 'sign',
          callId: id,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || 'Could not start that upload');

      await putWithProgress(signData.uploadUrl, file, (pct) => updateFile(localId, { progress: pct }));

      updateFile(localId, { status: 'committing', progress: 100 });
      const commitRes = await fetch('/api/call-vault/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify({
          mode: 'commit',
          callId: id,
          storagePath: signData.storagePath,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const commitData = await commitRes.json();
      if (!commitRes.ok) throw new Error(commitData.error || 'Could not save that file');

      updateFile(localId, { status: 'done', progress: 100, fileId: commitData.fileId });
    } catch (err) {
      updateFile(localId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  function addFiles(fileList: FileList) {
    const incoming = Array.from(fileList);
    let count = files.filter((f) => f.status !== 'error').length;
    const additions: FileEntry[] = [];

    for (const file of incoming) {
      const localId = makeLocalId();
      if (count >= MAX_FILES_PER_CALL) {
        additions.push({
          localId,
          file,
          status: 'error',
          progress: 0,
          error: `Up to ${MAX_FILES_PER_CALL} files per call`,
          permanent: true,
        });
        continue;
      }
      // Reject video and unknown extensions client-side, with the exact
      // wording the server would use — classifyFile is the one true source
      // of that copy, imported rather than duplicated here.
      const classified = classifyFile(file.name, file.type);
      if (!classified.ok) {
        additions.push({ localId, file, status: 'error', progress: 0, error: classified.error, permanent: true });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        additions.push({
          localId,
          file,
          status: 'error',
          progress: 0,
          error: 'That file is larger than 200MB',
          permanent: true,
        });
        continue;
      }
      count += 1;
      additions.push({ localId, file, status: 'queued', progress: 0 });
    }

    setFiles((prev) => [...prev, ...additions]);
    additions.filter((a) => a.status === 'queued').forEach((a) => startUpload(a.localId, a.file));
  }

  function retryFile(entry: FileEntry) {
    startUpload(entry.localId, entry.file);
  }

  function removeFile(localId: string) {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
  }

  const locked = !!callId;
  const atFileCap = files.filter((f) => f.status !== 'error').length >= MAX_FILES_PER_CALL;

  return (
    <div className="rounded-lg border border-[#333333] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-anton uppercase tracking-wide text-lg text-white">
          {locked ? 'Call' : 'New call'}
        </h3>
        {canRemove && !locked && (
          <button
            type="button"
            onClick={onRemove}
            className="font-poppins text-xs uppercase tracking-wider text-[#E51B23] hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LabeledSelect
          label="Stage"
          value={meta.stage || null}
          onChange={(v) => handleMetaChange('stage', v)}
          options={STAGES}
          placeholder="Select…"
          disabled={locked}
        />
        <LabeledSelect
          label="Outcome"
          value={meta.outcome || null}
          onChange={(v) => handleMetaChange('outcome', v)}
          options={OUTCOMES}
          placeholder="Select…"
          disabled={locked}
        />
        <LabeledSelect
          label="Deal size"
          value={meta.dealSizeBand || null}
          onChange={(v) => handleMetaChange('dealSizeBand', v)}
          options={DEAL_SIZE_BANDS}
          placeholder="Select…"
          disabled={locked}
        />
        <ConsoleInput
          label="Call date"
          type="date"
          value={meta.callDate}
          disabled={locked}
          onChange={(e) => handleMetaChange('callDate', (e.target as HTMLInputElement).value)}
        />
      </div>
      <div className="mt-4">
        <ConsoleInput
          label="Label (optional)"
          value={meta.label}
          disabled={locked}
          onChange={(e) => handleMetaChange('label', (e.target as HTMLInputElement).value)}
          placeholder="e.g. Discovery call with Acme"
        />
      </div>
      {locked && (
        <p className="mt-2 font-poppins text-xs text-[#808080]">
          Details are locked in now that this call has been saved.
        </p>
      )}
      {createError && <p className="mt-2 font-poppins text-sm text-[#E51B23]">{createError}</p>}

      <div className="mt-5">
        <label
          className={`flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed p-6 text-center transition-colors ${
            atFileCap
              ? 'cursor-not-allowed border-[#333333] opacity-50'
              : 'cursor-pointer border-[#333333] hover:border-[#FFDE59]'
          }`}
        >
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            disabled={atFileCap}
            onChange={(e) => {
              if (e.target.files && e.target.files.length) addFiles(e.target.files);
              e.currentTarget.value = '';
            }}
          />
          <span className="font-poppins text-sm text-[#B3B3B3]">
            {atFileCap
              ? `Up to ${MAX_FILES_PER_CALL} files per call`
              : 'Drop recordings or transcripts here, or click to choose'}
          </span>
          <span className="font-poppins text-xs text-[#808080]">
            Text or audio only &mdash; no video. Up to 200MB per file.
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((f) => (
            <li
              key={f.localId}
              className="flex items-center justify-between gap-3 rounded border border-[#333333] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-poppins text-sm text-white">{f.file.name}</div>
                {f.status === 'error' ? (
                  <div className="font-poppins text-xs text-[#E51B23]">{f.error}</div>
                ) : f.status === 'done' ? (
                  <div className="font-poppins text-xs text-[#22c55e]">Uploaded ✓</div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-full overflow-hidden rounded bg-[#333333]">
                      <div
                        className="h-full bg-[#FFDE59] transition-all"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                    <span className="font-poppins text-xs text-[#808080]">
                      {f.status === 'committing' ? 'saving…' : `${f.progress}%`}
                    </span>
                  </div>
                )}
              </div>
              {f.status === 'error' && (
                <div className="flex shrink-0 gap-3">
                  {!f.permanent && (
                    <button
                      type="button"
                      onClick={() => retryFile(f)}
                      className="font-poppins text-xs uppercase tracking-wider text-[#FFDE59] hover:underline"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(f.localId)}
                    className="font-poppins text-xs uppercase tracking-wider text-[#808080] hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
