/**
 * Content Moment Detection Prompts
 * Extract quotable moments from call transcripts
 */

import type { ContentMoment, Theme4E } from '@repo/db/types/content-engine'

export const MOMENT_DETECTION_SYSTEM = `
You are a content gold miner. Your job is to find the moments in conversations that deserve to live beyond the call - the rants, the insights, the analogies that make people stop and think.

A 45-minute call has maybe 3 minutes of content gold. You find those 3 minutes.

## WHAT MAKES A CONTENT MOMENT

**Quotes**
- Memorable one-liners
- Bold statements
- Surprising insights
- Phrases that stick

**Rants**
- Passionate explanations (2-4 sentences)
- When someone gets on a roll
- Unfiltered opinions
- "Let me tell you what really happens..."

**Analogies**
- New ways of seeing things
- Metaphors that click
- "It's like when..."
- Teaching through comparison

**Frameworks**
- Mental models explained
- Step-by-step thinking
- "Here's how I think about..."
- Structures that organize chaos

**Stories**
- Mini case studies
- War stories
- "We had a client who..."
- Lessons from experience

**Hot Takes**
- Contrarian views
- Industry criticism
- Unpopular opinions
- "Here's what nobody wants to say..."

**Data Points**
- Specific statistics
- Surprising numbers
- Results and outcomes
- "We saw a 40% increase when..."

## WHAT TO SKIP

- Pleasantries and small talk
- Administrative discussion
- Repetitive explanations
- Context-setting that only makes sense in the call
- Anything that needs 5 minutes of setup to understand
- Private or sensitive information
- Specific client names (unless clearly OK to share)
`

export interface MomentDetectionParams {
  transcript: string
  callTitle?: string
  callType?: string
  participants?: string[]
}

export const MOMENT_DETECTION_USER = (params: MomentDetectionParams) => `
Analyze this call transcript and extract the content moments worth saving.

${params.callTitle ? `CALL: ${params.callTitle}` : ''}
${params.callType ? `TYPE: ${params.callType}` : ''}
${params.participants?.length ? `PARTICIPANTS: ${params.participants.join(', ')}` : ''}

TRANSCRIPT:
${params.transcript}

---

Return a JSON array of content moments:

[
  {
    "id": "uuid-style-unique-id",
    "timestamp": "12:34",
    "quote": "The exact words from the transcript, cleaned up for readability but faithful to the original. 2-4 sentences max.",
    "type": "quote" | "rant" | "analogy" | "framework" | "story" | "hot_take" | "data_point",
    "confidence": 87,
    "suggested4E": "evidence" | "education" | "entertainment" | "envision",
    "speaker": "Name or role of who said it"
  }
]

Requirements:
- Extract 3-7 moments (quality over quantity)
- Timestamp should be approximate based on transcript position
- Quote should be exact words, lightly cleaned for readability (remove filler words like "um", "you know")
- Confidence is 0-100, based on how strong/shareable the moment is
- suggested4E is which 4E category this moment would best fit
- speaker is optional, include if clear from transcript
- Order by quality/confidence, best first

For confidence scoring:
- 90+: This is genuinely quotable, would work as a standalone post
- 70-89: Strong insight, needs light framing to work standalone
- 50-69: Good thinking but context-dependent
- Below 50: Don't include, not worth extracting
`

export interface MomentDetectionResponse {
  moments: ContentMoment[]
}

/**
 * Quick extraction for shorter calls
 */
export const QUICK_MOMENT_DETECTION_USER = (transcript: string) => `
Find the 3 most quotable moments from this transcript. Return JSON array:

${transcript.slice(0, 8000)}${transcript.length > 8000 ? '...[truncated]' : ''}

---

[
  {
    "timestamp": "12:34",
    "quote": "Exact quote, 1-3 sentences",
    "type": "quote" | "rant" | "analogy" | "framework" | "story" | "hot_take" | "data_point",
    "confidence": 85,
    "suggested4E": "evidence" | "education" | "entertainment" | "envision"
  }
]
`

/**
 * Prompt to promote a moment to full content source
 */
export const MOMENT_TO_SOURCE_PROMPT = (moment: ContentMoment) => `
Expand this call moment into a standalone content piece suitable for the repository.

ORIGINAL MOMENT:
"${moment.quote}"
Type: ${moment.type}
Suggested 4E: ${moment.suggested4E}

---

Create a 150-300 word expansion that:
1. Sets up the context (without needing to explain the original call)
2. Delivers the insight
3. Adds a layer of meaning or implication
4. Ends with a takeaway

Keep the voice and energy of the original moment. Don't make it corporate.
`
