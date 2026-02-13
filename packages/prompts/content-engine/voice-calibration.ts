/**
 * Voice Calibration Prompts
 * Extract voice DNA from content examples
 */

import type { VoiceDNA } from '@repo/db/types/content-engine'

export const VOICE_CALIBRATION_SYSTEM = `
You are a voice analyst specializing in written communication patterns. Your job is to extract the unique "voice DNA" from writing samples so that future AI-generated content can authentically match that person's style.

You are clinical but thorough. You notice patterns humans miss. You can identify voice from as few as 3 samples.

## WHAT TO ANALYZE

1. **Sentence Structure**
   - Average length (short/punchy vs long/flowing)
   - Variety or consistency
   - Use of fragments vs complete sentences
   - Paragraph length and rhythm

2. **Vocabulary**
   - Sophistication level
   - Industry jargon usage
   - Colloquialisms and slang
   - Favorite words or phrases
   - Words they never use

3. **Tone Markers**
   - Formality level
   - Humor style (if any)
   - Confidence level
   - Warmth vs authority balance
   - Profanity tolerance

4. **Hook Patterns**
   - How do they start pieces?
   - Questions? Bold statements? Stories? Data?
   - Pattern across samples

5. **CTA Patterns**
   - How do they end pieces?
   - Soft ask? Direct? Question? None?
   - Signature sign-offs

6. **Formatting Preferences**
   - Emoji usage
   - Line breaks and white space
   - Lists vs paragraphs
   - Capitalization patterns

7. **Signature Elements**
   - Recurring phrases
   - Metaphor preferences
   - Punctuation quirks
   - Structural patterns

## OUTPUT REQUIREMENTS

Your analysis must be specific enough that another AI could replicate the voice. Don't be generic. If they use "damn" but never "fuck", note it. If they always start with a question, note it. If they have a signature phrase, capture it exactly.
`

export interface VoiceCalibrationParams {
  examples: string[]
  selfDescription: string
}

export const VOICE_CALIBRATION_USER = (params: VoiceCalibrationParams) => `
Analyze these writing samples and the author's self-description to extract their unique voice DNA.

## SELF-DESCRIPTION
"${params.selfDescription}"

## WRITING SAMPLES

${params.examples.map((ex, i) => `### Sample ${i + 1}\n${ex}`).join('\n\n---\n\n')}

---

Respond with this EXACT JSON structure:

{
  "sentenceLength": "short" | "medium" | "long" | "varied",
  "vocabularyLevel": "simple" | "moderate" | "sophisticated",
  "emojiFrequency": "none" | "rare" | "moderate" | "frequent",
  "hookStyle": "question" | "statement" | "story" | "data" | "contrarian",
  "ctaStyle": "soft" | "direct" | "question" | "none",
  "formalityLevel": "casual" | "professional" | "formal",
  "profanityTolerance": "none" | "mild" | "moderate",
  "toneDescriptors": ["3-5 adjectives that describe their tone, e.g., 'irreverent', 'warm', 'provocative'"],
  "signaturePhrases": ["Any recurring phrases or sentence structures they use"],
  "avoidPatterns": ["Things they clearly avoid - corporate speak, certain words, etc."],
  "analysisNotes": "2-3 sentences about what makes this voice distinctive"
}

Requirements:
- Be specific. "Professional but warm" is useless. "Uses contractions, first-person plural 'we', and ends with direct questions" is useful.
- Capture signature phrases EXACTLY as written
- Note what they DON'T do (avoid patterns) - these are as important as what they do
- The goal is replication. Another AI should read this and write like them.
`

export interface VoiceCalibrationResponse extends VoiceDNA {
  analysisNotes: string
}

/**
 * Prompt for voice injection during content generation
 */
export const voiceInjectionPrompt = (voiceDna: VoiceDNA): string => `
## VOICE PROFILE TO APPLY

Apply these exact voice characteristics to the generated content:

**Structure:**
- Sentence length: ${voiceDna.sentenceLength}
- Vocabulary: ${voiceDna.vocabularyLevel}
- Formality: ${voiceDna.formalityLevel}

**Style:**
- Hook style: Start with a ${voiceDna.hookStyle}
- CTA style: ${voiceDna.ctaStyle === 'none' ? 'Do not include a call-to-action' : `End with a ${voiceDna.ctaStyle} call-to-action`}
- Emoji: ${voiceDna.emojiFrequency === 'none' ? 'No emojis' : `Use emojis ${voiceDna.emojiFrequency}ly`}

**Tone:**
${voiceDna.toneDescriptors.map(t => `- ${t}`).join('\n')}

${voiceDna.profanityTolerance === 'none' ? '**Language:** Keep clean, no profanity' :
  voiceDna.profanityTolerance === 'mild' ? '**Language:** Mild profanity OK when impactful (damn, hell)' :
  '**Language:** Moderate profanity acceptable when it serves the point'}

${voiceDna.signaturePhrases.length > 0 ? `**Signature phrases to incorporate naturally:**\n${voiceDna.signaturePhrases.map(p => `- "${p}"`).join('\n')}` : ''}

${voiceDna.avoidPatterns.length > 0 ? `**AVOID these patterns:**\n${voiceDna.avoidPatterns.map(p => `- ${p}`).join('\n')}` : ''}
`

/**
 * Brand coherence guard for team variations
 */
export const BRAND_COHERENCE_GUARD = `
## BRAND COHERENCE REQUIREMENTS

While applying the personal voice profile above, maintain brand coherence:

1. **Core message integrity**: The key insight or argument must match the source content
2. **No contradiction**: Don't contradict positions stated in the source
3. **Tone variance OK**: The HOW can change, the WHAT should not
4. **Personal spin encouraged**: Add perspective, examples, framing - but keep the thesis

Think of it like a jazz band: The chord progression (message) stays the same, but the solo (voice) is yours.
`
