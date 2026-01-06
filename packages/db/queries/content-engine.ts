import type { SupabaseClient } from '../client'
import type {
  ContentOrg,
  ContentOrgInsert,
  ContentOrgUpdate,
  ContentOrgMember,
  ContentOrgMemberInsert,
  ContentProfile,
  ContentProfileInsert,
  ContentProfileUpdate,
  VoiceProfile,
  VoiceProfileInsert,
  VoiceProfileUpdate,
  ContentInvite,
  ContentInviteInsert,
  ContentSource,
  ContentSourceInsert,
  ContentSourceUpdate,
  Repurpose,
  RepurposeInsert,
  RepurposeUpdate,
  ContentCallImport,
  ContentCallImportInsert,
  ContentCallImportUpdate,
  ContentNotificationPrefs,
  ContentNotificationPrefsInsert,
  ContentNotificationPrefsUpdate,
  ContentSearchParams,
  OrgRole,
  Theme4E,
} from '../types/content-engine'

// ============================================================================
// CONTENT ORGANIZATIONS
// ============================================================================

export async function createContentOrg(
  supabase: SupabaseClient,
  input: ContentOrgInsert
): Promise<ContentOrg> {
  const { data, error } = await (supabase as any)
    .from('content_orgs')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to create org: ${error.message}`)
  return data
}

export async function getContentOrgById(
  supabase: SupabaseClient,
  orgId: string
): Promise<ContentOrg | null> {
  const { data, error } = await supabase
    .from('content_orgs')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get org: ${error.message}`)
  return data as ContentOrg | null
}

export async function getContentOrgBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<ContentOrg | null> {
  const { data, error } = await supabase
    .from('content_orgs')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get org: ${error.message}`)
  return data as ContentOrg | null
}

export async function updateContentOrg(
  supabase: SupabaseClient,
  orgId: string,
  updates: ContentOrgUpdate
): Promise<ContentOrg> {
  const { data, error } = await (supabase as any)
    .from('content_orgs')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update org: ${error.message}`)
  return data
}

export async function getUserOrgs(
  supabase: SupabaseClient,
  userId: string
): Promise<(ContentOrg & { role: OrgRole })[]> {
  const { data, error } = await supabase
    .from('content_org_members')
    .select(`
      role,
      org:content_orgs(*)
    `)
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)

  if (error) throw new Error(`Failed to get user orgs: ${error.message}`)
  return (data || []).map((m: any) => ({ ...m.org, role: m.role }))
}

// ============================================================================
// ORG MEMBERS
// ============================================================================

export async function addOrgMember(
  supabase: SupabaseClient,
  input: ContentOrgMemberInsert
): Promise<ContentOrgMember> {
  const { data, error } = await (supabase as any)
    .from('content_org_members')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to add member: ${error.message}`)
  return data
}

export async function getOrgMembers(
  supabase: SupabaseClient,
  orgId: string
): Promise<ContentOrgMember[]> {
  const { data, error } = await supabase
    .from('content_org_members')
    .select('*')
    .eq('org_id', orgId)

  if (error) throw new Error(`Failed to get members: ${error.message}`)
  return data as ContentOrgMember[]
}

export async function getUserMembership(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<ContentOrgMember | null> {
  const { data, error } = await supabase
    .from('content_org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get membership: ${error.message}`)
  return data as ContentOrgMember | null
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: OrgRole
): Promise<ContentOrgMember> {
  const { data, error } = await (supabase as any)
    .from('content_org_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update member role: ${error.message}`)
  return data
}

export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('content_org_members')
    .delete()
    .eq('id', memberId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
}

// ============================================================================
// CONTENT PROFILES
// ============================================================================

export async function getContentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ContentProfile | null> {
  const { data, error } = await supabase
    .from('content_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get profile: ${error.message}`)
  return data as ContentProfile | null
}

export async function upsertContentProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Omit<ContentProfileInsert, 'user_id'>
): Promise<ContentProfile> {
  const { data, error } = await (supabase as any)
    .from('content_profiles')
    .upsert({ ...profile, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`)
  return data
}

export async function updateContentProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ContentProfileUpdate
): Promise<ContentProfile> {
  const { data, error } = await (supabase as any)
    .from('content_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
  return data
}

// ============================================================================
// VOICE PROFILES
// ============================================================================

export async function getVoiceProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<VoiceProfile | null> {
  const { data, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get voice profile: ${error.message}`)
  return data as VoiceProfile | null
}

export async function getVoiceProfileById(
  supabase: SupabaseClient,
  profileId: string
): Promise<VoiceProfile | null> {
  const { data, error } = await supabase
    .from('voice_profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get voice profile: ${error.message}`)
  return data as VoiceProfile | null
}

export async function upsertVoiceProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Omit<VoiceProfileInsert, 'user_id'>
): Promise<VoiceProfile> {
  const { data, error } = await (supabase as any)
    .from('voice_profiles')
    .upsert({ ...profile, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert voice profile: ${error.message}`)
  return data
}

export async function updateVoiceProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: VoiceProfileUpdate
): Promise<VoiceProfile> {
  const { data, error } = await (supabase as any)
    .from('voice_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update voice profile: ${error.message}`)
  return data
}

export async function lockVoiceProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<VoiceProfile> {
  return updateVoiceProfile(supabase, userId, { is_locked: true })
}

// ============================================================================
// INVITES
// ============================================================================

export async function createInvite(
  supabase: SupabaseClient,
  input: ContentInviteInsert
): Promise<ContentInvite> {
  const { data, error } = await (supabase as any)
    .from('content_invites')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to create invite: ${error.message}`)
  return data
}

export async function getInviteByToken(
  supabase: SupabaseClient,
  token: string
): Promise<ContentInvite | null> {
  const { data, error } = await supabase
    .from('content_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get invite: ${error.message}`)
  return data as ContentInvite | null
}

export async function acceptInvite(
  supabase: SupabaseClient,
  token: string,
  userId: string
): Promise<ContentOrgMember> {
  // Get the invite
  const invite = await getInviteByToken(supabase, token)
  if (!invite) throw new Error('Invite not found')
  if (invite.accepted_at) throw new Error('Invite already accepted')
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

  // Mark invite as accepted
  await (supabase as any)
    .from('content_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  // Add member to org
  return addOrgMember(supabase, {
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role,
    invited_by: invite.invited_by,
    accepted_at: new Date().toISOString(),
  })
}

export async function getOrgInvites(
  supabase: SupabaseClient,
  orgId: string
): Promise<ContentInvite[]> {
  const { data, error } = await supabase
    .from('content_invites')
    .select('*')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  if (error) throw new Error(`Failed to get invites: ${error.message}`)
  return data as ContentInvite[]
}

// ============================================================================
// CONTENT SOURCES
// ============================================================================

export async function createContentSource(
  supabase: SupabaseClient,
  input: ContentSourceInsert
): Promise<ContentSource> {
  const { data, error } = await (supabase as any)
    .from('content_sources')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to create content source: ${error.message}`)
  return data
}

export async function getContentSourceById(
  supabase: SupabaseClient,
  sourceId: string
): Promise<ContentSource | null> {
  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get content source: ${error.message}`)
  return data as ContentSource | null
}

export async function updateContentSource(
  supabase: SupabaseClient,
  sourceId: string,
  updates: ContentSourceUpdate
): Promise<ContentSource> {
  const { data, error } = await (supabase as any)
    .from('content_sources')
    .update(updates)
    .eq('id', sourceId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update content source: ${error.message}`)
  return data
}

export async function deleteContentSource(
  supabase: SupabaseClient,
  sourceId: string
): Promise<void> {
  const { error } = await supabase
    .from('content_sources')
    .delete()
    .eq('id', sourceId)

  if (error) throw new Error(`Failed to delete content source: ${error.message}`)
}

export async function searchContentSources(
  supabase: SupabaseClient,
  orgId: string,
  params: ContentSearchParams = {}
): Promise<{ sources: ContentSource[]; total: number }> {
  let query = supabase
    .from('content_sources')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('visibility', 'team')
    .order('created_at', { ascending: false })

  if (params.theme4e) {
    query = query.eq('theme_4e', params.theme4e)
  }

  if (params.sourceType) {
    query = query.eq('source_type', params.sourceType)
  }

  if (params.authorId) {
    query = query.eq('author_id', params.authorId)
  }

  if (params.query) {
    query = query.textSearch('raw_content', params.query, { type: 'websearch' })
  }

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to search content sources: ${error.message}`)
  return { sources: data as ContentSource[], total: count || 0 }
}

export async function getOrgContentStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ totalSources: number; totalRepurposes: number; byTheme: Record<Theme4E, number> }> {
  const { data: sources, error } = await supabase
    .from('content_sources')
    .select('theme_4e, repurpose_count')
    .eq('org_id', orgId)
    .eq('visibility', 'team')

  if (error) throw new Error(`Failed to get stats: ${error.message}`)

  const byTheme: Record<Theme4E, number> = {
    evidence: 0,
    education: 0,
    entertainment: 0,
    envision: 0,
  }

  let totalRepurposes = 0

  for (const source of sources || []) {
    if (source.theme_4e && source.theme_4e in byTheme) {
      byTheme[source.theme_4e as Theme4E]++
    }
    totalRepurposes += source.repurpose_count || 0
  }

  return {
    totalSources: sources?.length || 0,
    totalRepurposes,
    byTheme,
  }
}

// ============================================================================
// REPURPOSES
// ============================================================================

export async function createRepurpose(
  supabase: SupabaseClient,
  input: RepurposeInsert
): Promise<Repurpose> {
  const { data, error } = await (supabase as any)
    .from('repurposes')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to create repurpose: ${error.message}`)
  return data
}

export async function getRepurposeById(
  supabase: SupabaseClient,
  repurposeId: string
): Promise<Repurpose | null> {
  const { data, error } = await supabase
    .from('repurposes')
    .select('*')
    .eq('id', repurposeId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get repurpose: ${error.message}`)
  return data as Repurpose | null
}

export async function getSourceRepurposes(
  supabase: SupabaseClient,
  sourceId: string
): Promise<Repurpose[]> {
  const { data, error } = await supabase
    .from('repurposes')
    .select('*')
    .eq('source_id', sourceId)
    .eq('visibility', 'team')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to get repurposes: ${error.message}`)
  return data as Repurpose[]
}

export async function getUserRepurposes(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<Repurpose[]> {
  const { data, error } = await supabase
    .from('repurposes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to get user repurposes: ${error.message}`)
  return data as Repurpose[]
}

export async function updateRepurpose(
  supabase: SupabaseClient,
  repurposeId: string,
  updates: RepurposeUpdate
): Promise<Repurpose> {
  const { data, error } = await (supabase as any)
    .from('repurposes')
    .update(updates)
    .eq('id', repurposeId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update repurpose: ${error.message}`)
  return data
}

// ============================================================================
// CALL IMPORTS
// ============================================================================

export async function createCallImport(
  supabase: SupabaseClient,
  input: ContentCallImportInsert
): Promise<ContentCallImport> {
  const { data, error } = await (supabase as any)
    .from('content_call_imports')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(`Failed to create call import: ${error.message}`)
  return data
}

export async function getCallImportById(
  supabase: SupabaseClient,
  callId: string
): Promise<ContentCallImport | null> {
  const { data, error } = await supabase
    .from('content_call_imports')
    .select('*')
    .eq('id', callId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get call import: ${error.message}`)
  return data as ContentCallImport | null
}

export async function getOrgCallImports(
  supabase: SupabaseClient,
  orgId: string,
  limit = 20
): Promise<ContentCallImport[]> {
  const { data, error } = await supabase
    .from('content_call_imports')
    .select('*')
    .eq('org_id', orgId)
    .order('call_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to get call imports: ${error.message}`)
  return data as ContentCallImport[]
}

export async function updateCallImport(
  supabase: SupabaseClient,
  callId: string,
  updates: ContentCallImportUpdate
): Promise<ContentCallImport> {
  const { data, error } = await (supabase as any)
    .from('content_call_imports')
    .update(updates)
    .eq('id', callId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update call import: ${error.message}`)
  return data
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export async function getNotificationPrefs(
  supabase: SupabaseClient,
  userId: string
): Promise<ContentNotificationPrefs | null> {
  const { data, error } = await supabase
    .from('content_notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Failed to get notification prefs: ${error.message}`)
  return data as ContentNotificationPrefs | null
}

export async function upsertNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
  prefs: Omit<ContentNotificationPrefsInsert, 'user_id'>
): Promise<ContentNotificationPrefs> {
  const { data, error } = await (supabase as any)
    .from('content_notification_prefs')
    .upsert({ ...prefs, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert notification prefs: ${error.message}`)
  return data
}
