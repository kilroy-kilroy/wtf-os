/**
 * Zoom API Integration
 *
 * Uses OAuth 2.0 (General App, User-managed) to access Zoom APIs.
 * Users authorize via OAuth flow, and we store access/refresh tokens.
 *
 * This integration allows users to:
 * - List their cloud recordings
 * - Download recording transcripts
 * - Import transcripts into Call Lab Pro
 */

const ZOOM_API_BASE = 'https://api.zoom.us/v2';
const ZOOM_AUTH_BASE = 'https://zoom.us';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';

export interface ZoomRecording {
  uuid: string;
  id: number;
  topic: string;
  start_time: string;
  duration: number; // in minutes
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string; // MP4, M4A, TRANSCRIPT, CHAT, CC, etc.
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp
  token_type: string;
  scope: string;
}

export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

/**
 * Build the OAuth authorization URL to redirect users to Zoom
 */
export function getAuthorizationUrl(redirectUri: string): string {
  const clientId = process.env.ZOOM_CLIENT_ID;
  if (!clientId) throw new Error('ZOOM_CLIENT_ID not configured');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `${ZOOM_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; tokens?: ZoomTokens; error?: string }> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Zoom credentials not configured' };
  }

  try {
    const response = await fetch(ZOOM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Zoom] Token exchange failed:', error);
      return { success: false, error: error.reason || 'Failed to exchange code' };
    }

    const data = await response.json();

    return {
      success: true,
      tokens: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        token_type: data.token_type,
        scope: data.scope,
      },
    };
  } catch (error) {
    console.error('[Zoom] Token exchange error:', error);
    return { success: false, error: 'Failed to exchange authorization code' };
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ success: boolean; tokens?: ZoomTokens; error?: string }> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Zoom credentials not configured' };
  }

  try {
    const response = await fetch(ZOOM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Zoom] Token refresh failed:', error);
      return { success: false, error: error.reason || 'Failed to refresh token' };
    }

    const data = await response.json();

    return {
      success: true,
      tokens: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        token_type: data.token_type,
        scope: data.scope,
      },
    };
  } catch (error) {
    console.error('[Zoom] Token refresh error:', error);
    return { success: false, error: 'Failed to refresh access token' };
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns updated tokens if a refresh occurred.
 */
export async function getValidAccessToken(
  tokens: ZoomTokens
): Promise<{ accessToken: string; updatedTokens?: ZoomTokens; error?: string }> {
  // If token is still valid (with 5 min buffer), use it
  if (tokens.expires_at > Date.now() + 5 * 60 * 1000) {
    return { accessToken: tokens.access_token };
  }

  // Token expired, refresh it
  const result = await refreshAccessToken(tokens.refresh_token);
  if (!result.success || !result.tokens) {
    return { accessToken: '', error: result.error || 'Failed to refresh token' };
  }

  return { accessToken: result.tokens.access_token, updatedTokens: result.tokens };
}

/**
 * Make an authenticated request to the Zoom API
 */
async function zoomRequest<T>(
  accessToken: string,
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${ZOOM_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Token expired or invalid' };
      }
      const error = await response.json().catch(() => ({}));
      return { success: false, error: (error as Record<string, string>).message || `API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Zoom] API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the current user's profile
 */
export async function getZoomUser(
  accessToken: string
): Promise<{ success: boolean; user?: ZoomUser; error?: string }> {
  const result = await zoomRequest<ZoomUser>(accessToken, '/users/me');
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, user: result.data };
}

/**
 * List cloud recordings for the current user
 */
export async function listRecordings(
  accessToken: string,
  from?: string,
  to?: string
): Promise<{ success: boolean; recordings?: ZoomRecording[]; error?: string }> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('page_size', '30');

  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await zoomRequest<{ meetings: ZoomRecording[] }>(
    accessToken,
    `/users/me/recordings${query}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, recordings: result.data?.meetings || [] };
}

/**
 * Get recording files for a specific meeting
 */
export async function getRecordingFiles(
  accessToken: string,
  meetingId: string
): Promise<{ success: boolean; recording?: ZoomRecording; error?: string }> {
  const result = await zoomRequest<ZoomRecording>(
    accessToken,
    `/meetings/${encodeURIComponent(meetingId)}/recordings`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, recording: result.data };
}

/**
 * Download a recording transcript (VTT format)
 */
export async function downloadTranscript(
  accessToken: string,
  downloadUrl: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(`${downloadUrl}?access_token=${accessToken}`);

    if (!response.ok) {
      return { success: false, error: `Download failed: ${response.status}` };
    }

    const content = await response.text();
    return { success: true, content };
  } catch (error) {
    console.error('[Zoom] Transcript download failed:', error);
    return { success: false, error: 'Failed to download transcript' };
  }
}

/**
 * Parse a VTT transcript into structured format for Call Lab
 */
export function parseVttTranscript(vttContent: string): string {
  const lines = vttContent.split('\n');
  const output: string[] = [];
  let currentSpeaker = '';
  let currentTimestamp = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match timestamp lines like "00:00:01.234 --> 00:00:05.678"
    const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.\d+ -->/);
    if (timestampMatch) {
      const hours = parseInt(timestampMatch[1]);
      const minutes = parseInt(timestampMatch[2]);
      const seconds = parseInt(timestampMatch[3]);
      const totalMinutes = hours * 60 + minutes;
      currentTimestamp = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
      continue;
    }

    // Match speaker lines like "Speaker Name: text"
    const speakerMatch = line.match(/^(.+?):\s*(.+)$/);
    if (speakerMatch && currentTimestamp) {
      currentSpeaker = speakerMatch[1];
      output.push(`[${currentTimestamp}] ${currentSpeaker}: ${speakerMatch[2]}`);
      currentTimestamp = '';
    } else if (line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/) && currentTimestamp) {
      // Text line without speaker prefix
      if (currentSpeaker) {
        output.push(`[${currentTimestamp}] ${currentSpeaker}: ${line}`);
      } else {
        output.push(`[${currentTimestamp}] ${line}`);
      }
      currentTimestamp = '';
    }
  }

  return output.join('\n');
}

/**
 * Verify a Zoom webhook request using the secret token
 */
export function verifyWebhookRequest(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET;

  if (!secretToken) return false;

  const message = `v0:${timestamp}:${body}`;
  const hashForVerify = crypto
    .createHmac('sha256', secretToken)
    .update(message)
    .digest('hex');

  const expectedSignature = `v0=${hashForVerify}`;
  return signature === expectedSignature;
}

/**
 * Get recording metadata for display
 */
export function getRecordingMetadata(recording: ZoomRecording): {
  displayDate: string;
  displayDuration: string;
  hasTranscript: boolean;
} {
  const date = new Date(recording.start_time);
  const displayDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const hours = Math.floor(recording.duration / 60);
  const minutes = recording.duration % 60;
  const displayDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const hasTranscript = recording.recording_files?.some(
    (f) => f.file_type === 'TRANSCRIPT'
  ) || false;

  return { displayDate, displayDuration, hasTranscript };
}
