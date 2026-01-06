import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@repo/db/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServerClient()
    const sourceId = params.id

    // Fetch repurposes for this source with user info
    const { data: repurposes, error } = await (serviceClient as any)
      .from('repurposes')
      .select(`
        *,
        user:voice_profiles!repurposes_user_id_fkey(
          id,
          user_id,
          title,
          full_name
        )
      `)
      .eq('source_id', sourceId)
      .eq('visibility', 'team')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching repurposes:', error)
      // Fall back to simple query without user join
      const { data: simpleRepurposes, error: simpleError } = await (serviceClient as any)
        .from('repurposes')
        .select('*')
        .eq('source_id', sourceId)
        .eq('visibility', 'team')
        .order('created_at', { ascending: false })

      if (simpleError) {
        throw simpleError
      }

      return NextResponse.json({ repurposes: simpleRepurposes || [] })
    }

    return NextResponse.json({ repurposes: repurposes || [] })
  } catch (error) {
    console.error('Error in repurposes route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repurposes' },
      { status: 500 }
    )
  }
}
