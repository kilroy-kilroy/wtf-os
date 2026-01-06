import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'
import {
  getVoiceProfile,
  upsertVoiceProfile,
} from '@repo/db/queries/content-engine'
import { runModel, parseModelJSON, retryWithBackoff } from '@repo/utils'
import {
  VOICE_CALIBRATION_SYSTEM,
  VOICE_CALIBRATION_USER,
  type VoiceCalibrationResponse,
} from '@repo/prompts/content-engine'

/**
 * POST /api/content-engine/voice/calibrate
 * Run voice calibration AI on examples to extract voice DNA
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()
    const body = await request.json()

    // Validate examples
    if (!Array.isArray(body.examples) || body.examples.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 content examples are required for calibration' },
        { status: 400 }
      )
    }

    const examples = body.examples
      .filter((e: unknown) => typeof e === 'string' && e.trim().length > 50)
      .slice(0, 5) // Max 5 examples

    if (examples.length < 3) {
      return NextResponse.json(
        { error: 'Each example must be at least 50 characters. Please provide more substantial content samples.' },
        { status: 400 }
      )
    }

    // Validate description
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a description of your writing voice (at least 10 characters)' },
        { status: 400 }
      )
    }

    // Check if voice profile is locked (Brand Official)
    const existingProfile = await getVoiceProfile(serviceClient, user.id)
    if (existingProfile?.is_locked) {
      return NextResponse.json(
        { error: 'Your voice profile is locked (Brand Official). Contact an admin to unlock.' },
        { status: 403 }
      )
    }

    // Run voice calibration AI
    let calibrationResult: VoiceCalibrationResponse

    try {
      const response = await retryWithBackoff(async () => {
        return await runModel(
          'content-engine-calibrate',
          VOICE_CALIBRATION_SYSTEM,
          VOICE_CALIBRATION_USER({ examples, selfDescription: description })
        )
      })

      calibrationResult = parseModelJSON<VoiceCalibrationResponse>(response.content)
    } catch (modelError) {
      console.error('Error running voice calibration:', modelError)
      return NextResponse.json(
        { error: 'Failed to analyze writing samples. Please try again.' },
        { status: 500 }
      )
    }

    // Extract the DNA (remove analysisNotes from stored data)
    const { analysisNotes, ...voiceDna } = calibrationResult

    // Get current calibration version
    const currentVersion = existingProfile?.calibration_version || 0

    // Save the voice profile with extracted DNA
    const voiceProfile = await upsertVoiceProfile(serviceClient, user.id, {
      examples,
      description,
      extracted_dna: voiceDna,
      calibration_version: currentVersion + 1,
    })

    return NextResponse.json({
      voiceProfile,
      extractedDna: voiceDna,
      analysisNotes,
    }, { status: 200 })
  } catch (error) {
    console.error('Error calibrating voice:', error)
    return NextResponse.json(
      { error: 'Failed to calibrate voice profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
