'use client';

import { useEffect, useRef, useState } from 'react';
import { ConsoleInput } from '@/components/console';
import { STAGES, OUTCOMES, DEAL_SIZE_BANDS } from '@/lib/call-vault/vocabularies';
import { classifyFile, MAX_FILE_BYTES, MAX_FILES_PER_CALL } from '@/lib/call-vault/validate';
import { LabeledSelect } from './CallVaultForm';

// There is no vocabulary list for file extensions (only for stage/outcome/deal
// size/etc.), so this mirrors the extension set `classifyFile` in
// lib/call-vault/validate.ts accepts — kept in sync with it by hand.
const ACCEPTED_EXTENSIONS =
  '.txt,.md,.docx,.pdf,.rtf,.csv,.vtt,.srt,.mp3,.m4a,.wav,.aac,.ogg,.flac';

/** Debounce for the fields a contributor TYPES into (label, date). A `<select>`
 * change is a discrete commit, not a keystroke, so those save immediately —
 * which also keeps the window in which an unsaved edit could be lost to a
 * Submit click down to the free-text fields, where a blur flush covers it. */
const SAVE_DEBOUNCE_MS = 600;

type UploadStatus = 'queued' | 'uploading' | 'committing' | 'done' | 'error';

/** Quiet indicator for the metadata autosave. Never gates an upload. */
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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
  label: string;
}

const EMPTY_META: CallMeta = { stage: '', outcome: '', dealSizeBand: '', label: '' };

/** Wire shape for both POST /calls and PATCH /calls/[callId]: empty string is
 * "not answered", which the server stores as NULL. */
function metaPayload(meta: CallMeta) {
  return {
    stage: meta.stage || null,
    outcome: meta.outcome || null,
    dealSizeBand: meta.dealSizeBand || null,
    label: meta.label.trim() || null,
  };
}

/** Compares what a save would send, not the raw fields — so re-blurring an
 * untouched label never fires a redundant PATCH. */
function sameMeta(a: CallMeta, b: CallMeta): boolean {
  return (
    a.stage === b.stage &&
    a.outcome === b.outcome &&
    a.dealSizeBand === b.dealSizeBand &&
    a.label.trim() === b.label.trim()
  );
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
  index,
  canRemove,
  onRemove,
  onSessionExpired,
}: {
  sessionToken: string;
  /** 1-based position, shown so five rows read as a numbered list. */
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  /** Called on any 401 from this call's requests — the parent clears the
   * stale token and moves the whole form to its expired-session state. */
  onSessionExpired: () => void;
}) {
  const [meta, setMeta] = useState<CallMeta>(EMPTY_META);
  const [callId, setCallId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [files, setFiles] = useState<FileEntry[]>([]);

  const callIdPromiseRef = useRef<Promise<string | null> | null>(null);
  // Refs, not state, because the autosave machinery runs from timers and
  // promise callbacks that would otherwise close over a stale render.
  const callIdRef = useRef<string | null>(null);
  const metaRef = useRef<CallMeta>(EMPTY_META);
  /** The last metadata the server is known to hold. Null until the row exists. */
  const savedMetaRef = useRef<CallMeta | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  // Creates the call row on the server, at most once. Called from the FIRST
  // FILE the contributor adds — never from a metadata change. A call with no
  // file is nothing to review, and creating one the moment a select moved is
  // what used to freeze the remaining dimensions at NULL forever.
  //
  // `overrides` is kept for callers that need to create with metadata that
  // hasn't landed in state yet; today the file path passes nothing and the
  // current `meta` snapshot is used.
  function ensureCallId(overrides?: Partial<CallMeta>): Promise<string | null> {
    if (callIdRef.current) return Promise.resolve(callIdRef.current);
    if (callIdPromiseRef.current) return callIdPromiseRef.current;

    const snapshot = { ...metaRef.current, ...overrides };
    const promise = (async () => {
      setCreateError(null);
      try {
        const res = await fetch('/api/call-vault/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
          body: JSON.stringify(metaPayload(snapshot)),
        });
        if (res.status === 401) {
          onSessionExpired();
          return null;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not add that call');
        callIdRef.current = data.callId as string;
        savedMetaRef.current = snapshot;
        setCallId(data.callId);
        // Anything the contributor changed while the POST was in flight is not
        // in `snapshot` — reconcile it now. No-ops when nothing changed.
        void runSave();
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

  /** PATCH the current metadata onto an existing row. Serialised against
   * itself (a save that arrives mid-flight sets `dirtyRef` and runs after)
   * so two overlapping writes can never land out of order. */
  async function runSave(): Promise<void> {
    const id = callIdRef.current;
    if (!id) return; // no row yet — creation will carry the metadata
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    const snapshot = metaRef.current;
    if (savedMetaRef.current && sameMeta(savedMetaRef.current, snapshot)) return;

    savingRef.current = true;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/call-vault/calls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-call-vault-session': sessionToken },
        body: JSON.stringify(metaPayload(snapshot)),
      });
      if (res.status === 401) {
        // Same handler as every other session-gated request on this page. Drop
        // any queued follow-up save too: the token is dead, so a retry would
        // only 401 again against a form that is already unmounting.
        dirtyRef.current = false;
        onSessionExpired();
        return;
      }
      if (!res.ok) {
        setSaveState('error');
        return;
      }
      savedMetaRef.current = snapshot;
      setSaveState('saved');
    } catch {
      // A failed metadata save is never fatal and never blocks an upload —
      // the indicator says so and the next edit retries.
      setSaveState('error');
    } finally {
      savingRef.current = false;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void runSave();
      }
    }
  }

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void runSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function flushSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void runSave();
  }

  function handleMetaChange(field: keyof CallMeta, value: string) {
    const next = { ...metaRef.current, [field]: value };
    metaRef.current = next;
    setMeta(next);
    if (!callIdRef.current) return; // nothing to PATCH until the first file
    // Selects commit once per choice; typed fields wait out the debounce so
    // the label never fires a request per keystroke.
    if (field === 'label') scheduleSave();
    else flushSave();
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
      if (signRes.status === 401) {
        onSessionExpired();
        return;
      }
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
      if (commitRes.status === 401) {
        onSessionExpired();
        return;
      }
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

  // The row exists server-side from here on. It still gates "Remove" — there
  // is no DELETE route, so dropping the card would orphan a real call (and
  // its files) that submission would then include. It does NOT gate the
  // metadata fields: those stay editable, which is the whole point of the
  // PATCH route.
  const created = !!callId;
  const atFileCap = files.filter((f) => f.status !== 'error').length >= MAX_FILES_PER_CALL;

  return (
    <div className="rounded-lg border border-[#333333] bg-[#111111] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-anton uppercase tracking-wide text-xs text-[#808080]">
          Call {index}
        </span>
        {canRemove && !created && (
          <button
            type="button"
            onClick={onRemove}
            className="font-poppins text-xs uppercase tracking-wider text-[#808080] hover:text-[#E51B23]"
          >
            Remove
          </button>
        )}
      </div>

      {/* One call per line: three selects, a label, and one compact upload
          control. Kept on a single row so five of these fit on screen without
          scrolling, which is the number we actually ask people for. */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto] lg:items-end">
        <LabeledSelect
          label="Stage"
          value={meta.stage || null}
          onChange={(v) => handleMetaChange('stage', v)}
          options={STAGES}
          placeholder="Select…"
        />
        <LabeledSelect
          label="Outcome"
          value={meta.outcome || null}
          onChange={(v) => handleMetaChange('outcome', v)}
          options={OUTCOMES}
          placeholder="Select…"
        />
        <LabeledSelect
          label="Deal size"
          value={meta.dealSizeBand || null}
          onChange={(v) => handleMetaChange('dealSizeBand', v)}
          options={DEAL_SIZE_BANDS}
          placeholder="Select…"
        />
        <ConsoleInput
          label="Label (optional)"
          value={meta.label}
          onChange={(e) => handleMetaChange('label', (e.target as HTMLInputElement).value)}
          onBlur={() => flushSave()}
          placeholder="e.g. Discovery call with Acme"
        />
        <label
          className={`flex h-[42px] items-center justify-center gap-2 rounded border px-4 font-anton text-xs uppercase tracking-wider transition-colors ${
            atFileCap
              ? 'cursor-not-allowed border-[#333333] text-[#555555]'
              : 'cursor-pointer border-[#FFDE59] text-[#FFDE59] hover:bg-[#FFDE59] hover:text-black'
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
          {files.length ? `+ Add more` : '+ Add files'}
        </label>
      </div>

      {created && saveState !== 'idle' && (
        <p
          role="status"
          className={`mt-1 font-poppins text-xs ${
            saveState === 'error' ? 'text-[#E51B23]' : 'text-[#808080]'
          }`}
        >
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved ✓'}
          {saveState === 'error' &&
            "Couldn't save those details. Your files are fine — change any field to try again."}
        </p>
      )}
      {createError && (
        <p role="alert" className="mt-2 font-poppins text-sm text-[#E51B23]">
          {createError}
        </p>
      )}


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
                  <div role="alert" className="font-poppins text-xs text-[#E51B23]">
                    {f.error}
                  </div>
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
