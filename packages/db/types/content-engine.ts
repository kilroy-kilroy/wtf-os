// Content Engine TypeScript Types
// Generated from content-engine-foundation.sql schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type OrgRole = 'owner' | 'brand_official' | 'creator' | 'distributor'
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'cancelled'
export type ComfortLevel = 'distributor' | 'creator'
export type Platform = 'linkedin' | 'twitter' | 'email' | 'pull_quotes'
export type Theme4E = 'evidence' | 'education' | 'entertainment' | 'envision'
export type ContentVisibility = 'draft' | 'team'
export type SourceType = 'article' | 'call' | 'meeting' | 'podcast' | 'original' | 'email'
export type CallProvider = 'fireflies' | 'zoom' | 'gong' | 'otter' | 'fathom' | 'google_meet'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type DigestDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

// ============================================================================
// VOICE DNA STRUCTURE
// ============================================================================

export interface VoiceDNA {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied'
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated'
  emojiFrequency: 'none' | 'rare' | 'moderate' | 'frequent'
  hookStyle: 'question' | 'statement' | 'story' | 'data' | 'contrarian'
  ctaStyle: 'soft' | 'direct' | 'question' | 'none'
  formalityLevel: 'casual' | 'professional' | 'formal'
  profanityTolerance: 'none' | 'mild' | 'moderate'
  toneDescriptors: string[]
  signaturePhrases: string[]
  avoidPatterns: string[]
}

// ============================================================================
// CONTENT MOMENT (from call extraction)
// ============================================================================

export interface ContentMoment {
  id: string
  timestamp: string // HH:MM:SS
  quote: string
  type: 'quote' | 'rant' | 'analogy' | 'framework' | 'story' | 'hot_take' | 'data_point'
  confidence: number // 0-100
  suggested4E: Theme4E
  speaker?: string
  promoted?: boolean // true if added to repository
  promotedSourceId?: string
}

// ============================================================================
// TABLE TYPES
// ============================================================================

// Content Organizations
export interface ContentOrg {
  id: string
  name: string
  slug: string
  owner_id: string
  billing_status: BillingStatus
  settings: Json
  created_at: string
  updated_at: string
}

export interface ContentOrgInsert {
  id?: string
  name: string
  slug?: string // Will be generated if not provided
  owner_id?: string
  billing_status?: BillingStatus
  settings?: Json
}

export interface ContentOrgUpdate {
  name?: string
  billing_status?: BillingStatus
  settings?: Json
}

// Org Members
export interface ContentOrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

export interface ContentOrgMemberInsert {
  id?: string
  org_id: string
  user_id: string
  role: OrgRole
  invited_by?: string | null
  accepted_at?: string | null
}

// Content Profiles
export interface ContentProfile {
  id: string
  user_id: string
  title: string | null
  department: string | null
  platforms: Platform[]
  comfort_level: ComfortLevel
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface ContentProfileInsert {
  id?: string
  user_id: string
  title?: string | null
  department?: string | null
  platforms?: Platform[]
  comfort_level?: ComfortLevel
  onboarding_completed?: boolean
}

export interface ContentProfileUpdate {
  title?: string | null
  department?: string | null
  platforms?: Platform[]
  comfort_level?: ComfortLevel
  onboarding_completed?: boolean
}

// Voice Profiles
export interface VoiceProfile {
  id: string
  user_id: string
  examples: string[]
  description: string | null
  extracted_dna: VoiceDNA | null
  is_locked: boolean
  calibration_version: number
  created_at: string
  updated_at: string
}

export interface VoiceProfileInsert {
  id?: string
  user_id: string
  examples?: string[]
  description?: string | null
  extracted_dna?: VoiceDNA | null
  is_locked?: boolean
  calibration_version?: number
}

export interface VoiceProfileUpdate {
  examples?: string[]
  description?: string | null
  extracted_dna?: VoiceDNA | null
  is_locked?: boolean
  calibration_version?: number
}

// Content Invites
export interface ContentInvite {
  id: string
  org_id: string
  email: string
  role: Exclude<OrgRole, 'owner'>
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface ContentInviteInsert {
  id?: string
  org_id: string
  email: string
  role?: Exclude<OrgRole, 'owner'>
  token: string
  invited_by?: string | null
  expires_at: string
}

// Content Sources (Repository)
export interface ContentSource {
  id: string
  org_id: string
  author_id: string | null
  title: string | null
  source_url: string | null
  source_type: SourceType | null
  raw_content: string
  synopsis: string | null
  theme_4e: Theme4E | null
  vvv_tags: string[]
  visibility: ContentVisibility
  repurpose_count: number
  created_at: string
  updated_at: string
}

export interface ContentSourceInsert {
  id?: string
  org_id: string
  author_id?: string | null
  title?: string | null
  source_url?: string | null
  source_type?: SourceType | null
  raw_content: string
  synopsis?: string | null
  theme_4e?: Theme4E | null
  vvv_tags?: string[]
  visibility?: ContentVisibility
}

export interface ContentSourceUpdate {
  title?: string | null
  source_url?: string | null
  source_type?: SourceType | null
  raw_content?: string
  synopsis?: string | null
  theme_4e?: Theme4E | null
  vvv_tags?: string[]
  visibility?: ContentVisibility
}

// Repurposes
export interface Repurpose {
  id: string
  source_id: string
  user_id: string | null
  platform: Platform
  content: string
  version: number
  voice_profile_id: string | null
  tone_adjustments: string[]
  visibility: ContentVisibility
  created_at: string
  updated_at: string
}

export interface RepurposeInsert {
  id?: string
  source_id: string
  user_id?: string | null
  platform: Platform
  content: string
  version?: number
  voice_profile_id?: string | null
  tone_adjustments?: string[]
  visibility?: ContentVisibility
}

export interface RepurposeUpdate {
  content?: string
  version?: number
  tone_adjustments?: string[]
  visibility?: ContentVisibility
}

// Call Imports
export interface ContentCallImport {
  id: string
  org_id: string
  user_id: string | null
  provider: CallProvider
  external_id: string
  external_url: string | null
  title: string | null
  participants: string[]
  duration_seconds: number | null
  call_date: string | null
  call_type: string | null
  transcript: string
  summary: string | null
  processing_status: ProcessingStatus
  extracted_moments: ContentMoment[]
  created_at: string
  updated_at: string
}

export interface ContentCallImportInsert {
  id?: string
  org_id: string
  user_id?: string | null
  provider?: CallProvider
  external_id: string
  external_url?: string | null
  title?: string | null
  participants?: string[]
  duration_seconds?: number | null
  call_date?: string | null
  call_type?: string | null
  transcript: string
  summary?: string | null
  processing_status?: ProcessingStatus
  extracted_moments?: ContentMoment[]
}

export interface ContentCallImportUpdate {
  title?: string | null
  call_type?: string | null
  processing_status?: ProcessingStatus
  extracted_moments?: ContentMoment[]
  summary?: string | null
}

// Notification Preferences
export interface ContentNotificationPrefs {
  id: string
  user_id: string
  new_content_alerts: boolean
  call_gold_alerts: boolean
  weekly_digest: boolean
  digest_day: DigestDay
  created_at: string
  updated_at: string
}

export interface ContentNotificationPrefsInsert {
  id?: string
  user_id: string
  new_content_alerts?: boolean
  call_gold_alerts?: boolean
  weekly_digest?: boolean
  digest_day?: DigestDay
}

export interface ContentNotificationPrefsUpdate {
  new_content_alerts?: boolean
  call_gold_alerts?: boolean
  weekly_digest?: boolean
  digest_day?: DigestDay
}

// ============================================================================
// COMPOSITE TYPES (for queries with joins)
// ============================================================================

export interface ContentOrgWithMembers extends ContentOrg {
  members: (ContentOrgMember & {
    user?: {
      id: string
      email: string
      first_name: string | null
      last_name: string | null
    }
    profile?: ContentProfile | null
    voice_profile?: VoiceProfile | null
  })[]
}

export interface ContentSourceWithAuthor extends ContentSource {
  author?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  } | null
  author_profile?: ContentProfile | null
}

export interface ContentSourceWithRepurposes extends ContentSource {
  repurposes: Repurpose[]
}

export interface RepurposeWithSource extends Repurpose {
  source: ContentSource
  user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  } | null
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateOrgRequest {
  name: string
}

export interface CreateOrgResponse {
  org: ContentOrg
  membership: ContentOrgMember
}

export interface InviteMemberRequest {
  email: string
  role: Exclude<OrgRole, 'owner'>
}

export interface CalibrateVoiceRequest {
  examples: string[]
  description: string
}

export interface CalibrateVoiceResponse {
  voiceProfile: VoiceProfile
  extractedDna: VoiceDNA
}

export interface RepurposeRequest {
  sourceId: string
  platforms: Platform[]
  voiceProfileId?: string
  toneAdjustments?: ('spicier' | 'shorter' | 'professional')[]
}

export interface RepurposeResponse {
  outputs: {
    platform: Platform
    content: string
    repurposeId: string
  }[]
}

export interface ContentSearchParams {
  query?: string
  theme4e?: Theme4E
  sourceType?: SourceType
  authorId?: string
  limit?: number
  offset?: number
}
