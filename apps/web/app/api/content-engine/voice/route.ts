import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'
import {
  getVoiceProfile,
  upsertVoiceProfile,
} from '@repo/db/queries/content-engine'

/**
 * GET /api/content-engine/voice
 * Get the authenticated user's voice profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const voiceProfile = await getVoiceProfile(supabase, user.id)

    return NextResponse.json({ voiceProfile }, { status: 200 })
  } catch (error) {
    console.error('Error fetching voice profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/content-engine/voice
 * Update/create the authenticated user's voice profile (without calibration)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate examples
    const examples = Array.isArray(body.examples)
      ? body.examples.filter((e: unknown) => typeof e === 'string' && e.trim().length > 0)
      : undefined

    const voiceProfile = await upsertVoiceProfile(supabase, user.id, {
      examples,
      description: typeof body.description === 'string' ? body.description : undefined,
    })

    return NextResponse.json({ voiceProfile }, { status: 200 })
  } catch (error) {
    console.error('Error updating voice profile:', error)
    return NextResponse.json(
      { error: 'Failed to update voice profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
