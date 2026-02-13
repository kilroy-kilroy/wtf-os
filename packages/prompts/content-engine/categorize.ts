/**
 * Content Categorization Prompts
 * Auto-categorize content with 4E framework and generate synopsis
 */

import type { Theme4E, SourceType } from '@repo/db/types/content-engine'

export const CATEGORIZE_SYSTEM = `
You are a content strategist who categorizes content using the 4E Framework from DemandOS methodology.

## THE 4E FRAMEWORK

Each piece of content falls into one primary category:

### EVIDENCE
Content that proves expertise and builds credibility through results.
- Case studies and success stories
- Client results and metrics
- Testimonials and social proof
- Before/after transformations
- Data-backed claims
- "We did X and got Y result"

### EDUCATION
Content that teaches and builds trust through generosity.
- How-to guides and tutorials
- Frameworks and mental models
- Breakdowns and explanations
- Tips and best practices
- Industry insights
- "Here's how to think about X"

### ENTERTAINMENT
Content that builds affinity through engagement.
- Stories and anecdotes
- Hot takes and opinions
- Humor and personality
- Behind-the-scenes content
- Rants and passionate arguments
- "Let me tell you about the time..."

### ENVISION
Content that inspires action through possibility.
- Vision posts about the future
- "Imagine if..." scenarios
- Industry predictions
- Aspirational content
- Possibility thinking
- "What if we could..."

## CATEGORIZATION RULES

1. Choose the PRIMARY purpose - most content does multiple things
2. If it teaches WITH a story, it's Education (story is the vehicle)
3. If it proves WITH data, it's Evidence (proof is primary)
4. If it rants WITH a point, it's Entertainment (engagement is primary)
5. When in doubt, ask: "What does the author want the reader to DO after reading?"
   - Trust them more → Evidence
   - Learn something → Education
   - Like them more → Entertainment
   - Want what they're selling → Envision
`

export interface CategorizeParams {
  content: string
  title?: string
  sourceUrl?: string
}

export const CATEGORIZE_USER = (params: CategorizeParams) => `
Analyze this content and categorize it using the 4E Framework. Also generate a synopsis and suggest the source type.

${params.title ? `TITLE: ${params.title}` : ''}
${params.sourceUrl ? `SOURCE: ${params.sourceUrl}` : ''}

CONTENT:
${params.content}

---

Respond with this EXACT JSON structure:

{
  "theme_4e": "evidence" | "education" | "entertainment" | "envision",
  "theme_confidence": 0.85,
  "theme_reasoning": "One sentence explaining why this category fits best",
  "source_type": "article" | "call" | "meeting" | "podcast" | "original" | "email",
  "synopsis": "2-3 sentence summary that captures the key insight. Written in third person. Should make someone want to read/repurpose it.",
  "suggested_title": "A punchy title if none was provided, or improvement on existing",
  "key_quotes": ["2-3 most quotable/shareable lines from the content"],
  "vvv_tags": ["1-3 tags from: vibes, vision, values - whichever apply"]
}

Requirements:
- theme_confidence: 0-1 float indicating how clearly it fits one category
- synopsis: Should be engaging, not just descriptive. Sell the content.
- key_quotes: Extract verbatim, these are potential pull quotes
- vvv_tags: Only include if clearly applicable (vibes = culture/personality, vision = future state, values = principles/beliefs)
`

export interface CategorizeResponse {
  theme_4e: Theme4E
  theme_confidence: number
  theme_reasoning: string
  source_type: SourceType
  synopsis: string
  suggested_title: string
  key_quotes: string[]
  vvv_tags: string[]
}

/**
 * Quick categorization for bulk imports
 */
export const QUICK_CATEGORIZE_USER = (content: string) => `
Quickly categorize this content. Return ONLY a JSON object:

${content.slice(0, 2000)}${content.length > 2000 ? '...[truncated]' : ''}

---

{
  "theme_4e": "evidence" | "education" | "entertainment" | "envision",
  "synopsis": "One sentence summary",
  "source_type": "article" | "original"
}
`
