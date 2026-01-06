import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@repo/db/client'
import {
  getContentProfile,
  upsertContentProfile,
} from '@repo/db/queries/content-engine'
import type { Platform, ComfortLevel } from '@repo/db/types/content-engine'

/**
 * GET /api/content-engine/profile
 * Get the authenticated user's content profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getContentProfile(supabase, user.id)

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/content-engine/profile
 * Update/create the authenticated user's content profile
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

    // Validate platforms
    const validPlatforms: Platform[] = ['linkedin', 'twitter', 'email', 'pull_quotes']
    const platforms = Array.isArray(body.platforms)
      ? body.platforms.filter((p: string) => validPlatforms.includes(p as Platform))
      : undefined

    // Validate comfort level
    const validComfortLevels: ComfortLevel[] = ['distributor', 'creator']
    const comfortLevel = validComfortLevels.includes(body.comfort_level)
      ? body.comfort_level
      : undefined

    const profile = await upsertContentProfile(supabase, user.id, {
      title: body.title,
      department: body.department,
      platforms,
      comfort_level: comfortLevel,
      onboarding_completed: body.onboarding_completed,
    })

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
