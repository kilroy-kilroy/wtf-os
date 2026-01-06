import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'
import {
  getContentSourceById,
  getUserMembership,
  getVoiceProfile,
  getVoiceProfileById,
  createRepurpose,
} from '@repo/db/queries/content-engine'
import { runModel, retryWithBackoff } from '@repo/utils'
import {
  REPURPOSE_SYSTEM,
  getRepurposeUserPrompt,
} from '@repo/prompts/content-engine'
import type { Platform } from '@repo/db/types/content-engine'

/**
 * POST /api/content-engine/repurpose
 * Generate repurposed content for one or more platforms
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate source_id
    if (!body.source_id) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 400 })
    }

    // Get source
    const source = await getContentSourceById(supabase, body.source_id)
    if (!source) {
      return NextResponse.json({ error: 'Content source not found' }, { status: 404 })
    }

    // Check membership
    const membership = await getUserMembership(supabase, source.org_id, user.id)
    if (!membership || !membership.accepted_at) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Validate platforms
    const validPlatforms: Platform[] = ['linkedin', 'twitter', 'email', 'pull_quotes']
    const platforms: Platform[] = Array.isArray(body.platforms)
      ? body.platforms.filter((p: string) => validPlatforms.includes(p as Platform))
      : ['linkedin'] // Default to LinkedIn

    if (platforms.length === 0) {
      return NextResponse.json({ error: 'At least one valid platform is required' }, { status: 400 })
    }

    // Get voice profile
    let voiceDna = undefined
    if (body.voice_profile_id) {
      const voiceProfile = await getVoiceProfileById(supabase, body.voice_profile_id)
      if (voiceProfile?.extracted_dna) {
        voiceDna = voiceProfile.extracted_dna
      }
    } else {
      // Use user's own voice profile if available
      const userVoiceProfile = await getVoiceProfile(supabase, user.id)
      if (userVoiceProfile?.extracted_dna) {
        voiceDna = userVoiceProfile.extracted_dna
      }
    }

    // Validate tone adjustments
    const validAdjustments = ['spicier', 'shorter', 'professional'] as const
    const toneAdjustments = Array.isArray(body.tone_adjustments)
      ? body.tone_adjustments.filter((a: string) => validAdjustments.includes(a as any))
      : []

    // Generate repurposes for each platform (in parallel)
    const results = await Promise.all(
      platforms.map(async (platform) => {
        try {
          const userPrompt = getRepurposeUserPrompt({
            sourceContent: source.raw_content,
            sourceTitle: source.title || undefined,
            platform,
            voiceDna: voiceDna || undefined,
            toneAdjustments: toneAdjustments.length > 0 ? toneAdjustments : undefined,
          })

          const response = await retryWithBackoff(async () => {
            return await runModel('content-engine-repurpose', REPURPOSE_SYSTEM, userPrompt)
          })

          // Parse response based on platform
          let content: string
          if (platform === 'twitter' || platform === 'pull_quotes') {
            // These return JSON arrays
            try {
              const parsed = JSON.parse(response.content)
              content = Array.isArray(parsed) ? parsed.join('\n\n---\n\n') : response.content
            } catch {
              // If parsing fails, use raw content
              content = response.content
            }
          } else {
            content = response.content
          }

          // Save the repurpose
          const repurpose = await createRepurpose(supabase, {
            source_id: source.id,
            user_id: user.id,
            platform,
            content,
            voice_profile_id: body.voice_profile_id || undefined,
            tone_adjustments: toneAdjustments,
            visibility: 'draft',
          })

          return {
            platform,
            content,
            repurposeId: repurpose.id,
            success: true,
          }
        } catch (platformError) {
          console.error(`Error generating ${platform} repurpose:`, platformError)
          return {
            platform,
            content: '',
            repurposeId: null,
            success: false,
            error: platformError instanceof Error ? platformError.message : 'Unknown error',
          }
        }
      })
    )

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      outputs: results,
      successCount,
      totalRequested: platforms.length,
    }, { status: successCount > 0 ? 200 : 500 })
  } catch (error) {
    console.error('Error generating repurposes:', error)
    return NextResponse.json(
      { error: 'Failed to generate repurposes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
