/**
 * Fireflies.ai API Integration
 *
 * Fireflies uses a GraphQL API for accessing transcripts.
 * Users need to provide their API key from https://app.fireflies.ai/integrations/custom/fireflies
 *
 * This integration allows users to:
 * - List their recent call transcripts
 * - Import transcripts directly into Call Lab
 */

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration: number; // in minutes
  participants: string[];
  transcript_url?: string;
  organizer_email?: string;
}

export interface FirefliesTranscriptDetail extends FirefliesTranscript {
  sentences: Array<{
    speaker_name: string;
    text: string;
    start_time: number;
    end_time: number;
  }>;
  summary?: {
    overview?: string;
    action_items?: string[];
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Make a GraphQL request to Fireflies API
 */
async function firefliesRequest<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key. Please check your Fireflies API key.' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      return { success: false, error: result.errors[0].message };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Fireflies] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a Fireflies API key is valid
 */
export async function verifyApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const query = `
    query {
      user {
        email
        name
      }
    }
  `;

  const result = await firefliesRequest<{ user: { email: string; name: string } }>(apiKey, query);

  if (!result.success) {
    return { valid: false, error: result.error };
  }

  return { valid: true };
}

/**
 * Get user info from Fireflies
 */
export async function getUserInfo(apiKey: string): Promise<{
  success: boolean;
  user?: { email: string; name: string };
  error?: string;
}> {
  const query = `
    query {
      user {
        email
        name
      }
    }
  `;

  const result = await firefliesRequest<{ user: { email: string; name: string } }>(apiKey, query);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, user: result.data?.user };
}

/**
 * List recent transcripts from Fireflies
 */
export async function listTranscripts(
  apiKey: string,
  limit: number = 20
): Promise<{
  success: boolean;
  transcripts?: FirefliesTranscript[];
  error?: string;
}> {
  const query = `
    query Transcripts($limit: Int) {
      transcripts(limit: $limit) {
        id
        title
        date
        duration
        participants
        transcript_url
        organizer_email
      }
    }
  `;

  const result = await firefliesRequest<{ transcripts: FirefliesTranscript[] }>(
    apiKey,
    query,
    { limit }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, transcripts: result.data?.transcripts || [] };
}

/**
 * Get a specific transcript with full content
 */
export async function getTranscript(
  apiKey: string,
  transcriptId: string
): Promise<{
  success: boolean;
  transcript?: FirefliesTranscriptDetail;
  error?: string;
}> {
  const query = `
    query Transcript($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        duration
        participants
        organizer_email
        sentences {
          speaker_name
          text
          start_time
          end_time
        }
        summary {
          overview
          action_items
        }
      }
    }
  `;

  const result = await firefliesRequest<{ transcript: FirefliesTranscriptDetail }>(
    apiKey,
    query,
    { id: transcriptId }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, transcript: result.data?.transcript };
}

/**
 * Convert Fireflies transcript to a plain text format for Call Lab
 */
export function formatTranscriptForCallLab(transcript: FirefliesTranscriptDetail): string {
  if (!transcript.sentences || transcript.sentences.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const sentence of transcript.sentences) {
    const minutes = Math.floor(sentence.start_time / 60);
    const seconds = Math.floor(sentence.start_time % 60);
    const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    lines.push(`[${timestamp}] ${sentence.speaker_name}: ${sentence.text}`);
  }

  return lines.join('\n');
}

/**
 * Get transcript metadata for display
 */
export function getTranscriptMetadata(transcript: FirefliesTranscript): {
  displayDate: string;
  displayDuration: string;
  participantCount: number;
} {
  const date = new Date(transcript.date);
  const displayDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const hours = Math.floor(transcript.duration / 60);
  const minutes = transcript.duration % 60;
  const displayDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    displayDate,
    displayDuration,
    participantCount: transcript.participants?.length || 0,
  };
}
