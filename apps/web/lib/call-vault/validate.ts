import {
  SERVICES, REVENUE_BANDS, STAGES, OUTCOMES, DEAL_SIZE_BANDS, isValidOption,
} from './vocabularies';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_FILE_BYTES = 200 * 1024 * 1024;
export const MAX_CALLS_PER_CONTRIBUTOR = 10;
export const MAX_FILES_PER_CALL = 5;

// Transcripts and documents. PDFs are tracked as their own kind because they
// need a different extraction path than plain text later.
const TEXT_EXTENSIONS = ['txt', 'md', 'docx', 'rtf', 'csv', 'vtt', 'srt'];
const PDF_EXTENSIONS = ['pdf'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac'];

export type FileKind = 'transcript' | 'audio' | 'pdf';
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) return '';
  return fileName.slice(i + 1).toLowerCase();
}

/**
 * Decide whether a file is acceptable and what kind it is.
 *
 * Nothing is transcribed, so a video file is pure storage cost with no path to
 * value — rejected explicitly (rather than falling into "unknown") so the UI can
 * tell the contributor to export the audio instead. Both the extension and the
 * mime type are checked: a `video/*` mime wearing an audio extension is still a
 * video.
 */
export function classifyFile(
  fileName: string,
  mimeType: string,
): { ok: true; kind: FileKind } | { ok: false; error: string } {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) {
    return { ok: false, error: 'Video is not accepted. Please export the audio or the transcript.' };
  }

  const ext = extensionOf(fileName);
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv'].includes(ext)) {
    return { ok: false, error: 'Video is not accepted. Please export the audio or the transcript.' };
  }
  if (AUDIO_EXTENSIONS.includes(ext)) return { ok: true, kind: 'audio' };
  if (PDF_EXTENSIONS.includes(ext)) return { ok: true, kind: 'pdf' };
  if (TEXT_EXTENSIONS.includes(ext)) return { ok: true, kind: 'transcript' };

  return {
    ok: false,
    error: 'Unsupported file type. Accepted: txt, md, docx, pdf, rtf, csv, vtt, srt, mp3, m4a, wav, aac, ogg, flac.',
  };
}

/**
 * Guard for commit + download: the path must sit directly under this
 * contributor's own uuid prefix. Rejects traversal (`../`) and prefix collision
 * (`<id>-evil/`), which a naive `startsWith(id)` would let through.
 */
export function ownsStoragePath(storagePath: string, contributorId: string): boolean {
  if (storagePath.includes('..')) return false;
  const segments = storagePath.split('/');
  return segments.length > 1 && segments[0] === contributorId;
}

/**
 * Is an anonymous session past its expiry?
 *
 * Deliberately fails CLOSED: a null, empty, or unparseable expiry counts as
 * expired. This is the only gate on the public upload endpoints, so an
 * ambiguous value must never be read as "still valid".
 */
export function isSessionExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

export interface AboutYou {
  name: string;
  email: string;
  agencyName: string | null;
  agencyUrl: string | null;
  services: string[];
  revenueBand: string | null;
  targetClient: string | null;
}

export function validateAboutYou(payload: {
  name?: unknown; email?: unknown; agencyName?: unknown; agencyUrl?: unknown;
  services?: unknown; revenueBand?: unknown; targetClient?: unknown; termsAccepted?: unknown;
}): Result<AboutYou> {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) return { ok: false, error: 'Name is required' };

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' };

  if (payload.termsAccepted !== true) {
    return { ok: false, error: 'You must accept the terms and consent before contributing calls' };
  }

  const services = Array.isArray(payload.services) ? payload.services : [];
  if (!services.every((s) => isValidOption(SERVICES, s))) {
    return { ok: false, error: 'Unknown service selected' };
  }

  const revenueBand = typeof payload.revenueBand === 'string' && payload.revenueBand
    ? payload.revenueBand : null;
  if (revenueBand && !isValidOption(REVENUE_BANDS, revenueBand)) {
    return { ok: false, error: 'Unknown revenue band' };
  }

  const str = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s || null;
  };

  return {
    ok: true,
    value: {
      name,
      email,
      agencyName: str(payload.agencyName),
      agencyUrl: str(payload.agencyUrl),
      services: services as string[],
      revenueBand,
      targetClient: str(payload.targetClient),
    },
  };
}

export interface CallMeta {
  stage: string | null;
  outcome: string | null;
  dealSizeBand: string | null;
  callDate: string | null;
  label: string | null;
  notes: string | null;
}

export function validateCallMeta(payload: {
  stage?: unknown; outcome?: unknown; dealSizeBand?: unknown;
  callDate?: unknown; label?: unknown; notes?: unknown;
}): Result<CallMeta> {
  const pick = (options: typeof STAGES, v: unknown, name: string): Result<string | null> => {
    if (v === undefined || v === null || v === '') return { ok: true, value: null };
    if (!isValidOption(options, v)) return { ok: false, error: `Unknown ${name}` };
    return { ok: true, value: v as string };
  };

  const stage = pick(STAGES, payload.stage, 'stage');
  if (!stage.ok) return stage;
  const outcome = pick(OUTCOMES, payload.outcome, 'outcome');
  if (!outcome.ok) return outcome;
  const dealSizeBand = pick(DEAL_SIZE_BANDS, payload.dealSizeBand, 'deal size band');
  if (!dealSizeBand.ok) return dealSizeBand;

  const str = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s || null;
  };

  const callDate = str(payload.callDate);
  if (callDate && !/^\d{4}-\d{2}-\d{2}$/.test(callDate)) {
    return { ok: false, error: 'Call date must be YYYY-MM-DD' };
  }

  return {
    ok: true,
    value: {
      stage: stage.value,
      outcome: outcome.value,
      dealSizeBand: dealSizeBand.value,
      callDate,
      label: str(payload.label),
      notes: str(payload.notes),
    },
  };
}
