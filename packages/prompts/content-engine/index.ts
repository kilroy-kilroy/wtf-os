/**
 * Content Engine Prompts
 * Export all prompts for the content engine
 */

// Voice Calibration
export {
  VOICE_CALIBRATION_SYSTEM,
  VOICE_CALIBRATION_USER,
  voiceInjectionPrompt,
  BRAND_COHERENCE_GUARD,
  type VoiceCalibrationParams,
  type VoiceCalibrationResponse,
} from './voice-calibration'

// Categorization
export {
  CATEGORIZE_SYSTEM,
  CATEGORIZE_USER,
  QUICK_CATEGORIZE_USER,
  type CategorizeParams,
  type CategorizeResponse,
} from './categorize'

// Repurposing
export {
  REPURPOSE_SYSTEM,
  LINKEDIN_PROMPT,
  TWITTER_THREAD_PROMPT,
  EMAIL_TEASER_PROMPT,
  PULL_QUOTES_PROMPT,
  TONE_ADJUSTMENTS,
  getRepurposeUserPrompt,
  type RepurposeParams,
  type RepurposeResponse,
  type LinkedInResponse,
  type TwitterResponse,
  type EmailResponse,
  type PullQuotesResponse,
} from './repurpose'

// Moment Detection
export {
  MOMENT_DETECTION_SYSTEM,
  MOMENT_DETECTION_USER,
  QUICK_MOMENT_DETECTION_USER,
  MOMENT_TO_SOURCE_PROMPT,
  type MomentDetectionParams,
  type MomentDetectionResponse,
} from './moment-detection'
