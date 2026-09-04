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
 * contributor's own uuid prefix. Rejects traversal (a `..` path segment,
 * percent-encoded `%2e%2e`), prefix collision (`<id>-evil/`), and any unsafe
 * characters (backslashes, null bytes, unicode tricks). Legitimate paths are
 * constructed server-side as `<uuid>/<uuid>/<uuid>-<filename>` with sanitized
 * filenames (see `sanitizeFileName`), so all safe paths contain only
 * [A-Za-z0-9._/-].
 *
 * The traversal check matches `..` as an EXACT path segment, not as a substring
 * of the whole path: a substring test also rejects a legitimate filename that
 * happens to contain two consecutive dots (e.g. "Acme call..transcript.txt"),
 * failing a real upload for no visible reason. Splitting on `/` and comparing
 * each segment still blocks every real traversal shape (`<id>/../evil/f.mp3`,
 * `../<id>/f.mp3`) while allowing dots inside a filename segment — a segment of
 * `...` is fine, it is not a traversal token.
 *
 * An EMPTY segment is rejected for the same reason: `<id>//evil/f.mp3` and
 * `<id>/call-abc//f.mp3` are not paths this code ever constructs (every
 * legitimate path is `<uuid>/<uuid>/<uuid>-<sanitized name>`, and
 * `sanitizeFileName` can never emit a `/`), so an empty segment only ever
 * arrives from a hand-crafted client payload. It is not an escape today — the
 * path still sits under the contributor prefix — but this function is the
 * single guard on a client-supplied storage path, and how a doubled slash
 * normalizes is a property of whatever storage layer sits downstream, not of
 * anything checked here. Reject the shape rather than depend on that.
 */
export function ownsStoragePath(storagePath: string, contributorId: string): boolean {
  // Reject paths with characters outside the safe allowlist
  if (!/^[A-Za-z0-9._/-]+$/.test(storagePath)) return false;
  const segments = storagePath.split('/');
  if (segments.some((segment) => segment === '..' || segment === '')) return false;
  return segments.length > 1 && segments[0] === contributorId;
}

/**
 * Sanitize a user-supplied filename for use as a storage path segment.
 *
 * Must stay in lockstep with `ownsStoragePath`'s traversal guard: dots are
 * preserved (a filename may legitimately contain "..") but every other unsafe
 * character is stripped, including `/`, so a filename can never inject an
 * extra path segment. These two rules living apart — one only checking a
 * substring, the other only sanitizing — is what let a legitimate double-dot
 * filename get rejected as a traversal attempt; keep them tested side by side.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
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

/**
 * Should /start mint and email a fresh resume link for a known contributor?
 *
 * A resume token carries a 24h TTL. If one is already live (not used, not
 * expired) AND was minted within roughly the last hour (its expiry is more
 * than 23h out), sending another would just re-mint the token and invalidate
 * the link the contributor already has, for no benefit — so this returns
 * false only in that narrow window. This is the sole throttle on the
 * known-email branch of /start (which sits outside the per-IP rate limit,
 * since it never creates a contributor row): it bounds resume emails to
 * roughly one per contributor per hour, and stops a hammering loop from
 * permanently denying a contributor their own resume path by repeatedly
 * invalidating the token before they can use it.
 *
 * Fails toward SENDING (true) on any null/unparseable input — a contributor
 * who can't get a link is worse than one extra email.
 */
export function shouldSendResumeLink(
  accessTokenExpiresAt: string | null,
  accessTokenUsedAt: string | null,
  now = new Date(),
): boolean {
  if (accessTokenUsedAt) return true;
  if (!accessTokenExpiresAt) return true;
  const expiresAtMs = Date.parse(accessTokenExpiresAt);
  if (Number.isNaN(expiresAtMs)) return true;

  const nowMs = now.getTime();
  const isLive = expiresAtMs > nowMs;
  if (!isLive) return true;

  const mintedRecently = expiresAtMs - nowMs > 23 * 60 * 60 * 1000;
  return !mintedRecently;
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
  label: string | null;
  notes: string | null;
}

export function validateCallMeta(payload: {
  stage?: unknown; outcome?: unknown; dealSizeBand?: unknown;
  label?: unknown; notes?: unknown;
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


  return {
    ok: true,
    value: {
      stage: stage.value,
      outcome: outcome.value,
      dealSizeBand: dealSizeBand.value,
      label: str(payload.label),
      notes: str(payload.notes),
    },
  };
}
