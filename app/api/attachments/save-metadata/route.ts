import { NextRequest, NextResponse } from 'next/server'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { authorize } from '@/utils/auth/server-guard'

/**
 * POST /api/attachments/save-metadata
 * Save attachment metadata after client-side upload to MEGA
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user first
    const authResult = await authorize('tutor')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { title, url, size, type } = body

    // Validate required fields
    if (!title || !url || !size || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, url, size, and type are required' },
        { status: 400 }
      )
    }

    // Validate URL format (should be a MEGA share link)
    if (!url.includes('mega.nz') && !url.includes('mega.co.nz')) {
      return NextResponse.json(
        { error: 'Invalid URL: Must be a valid MEGA share link' },
        { status: 400 }
      )
    }

    // Validate size
    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json(
        { error: 'Invalid size: Must be a positive number' },
        { status: 400 }
      )
    }

    // Get the user's profile ID from the database
    const supabase = await createAttachmentAdminClient()
    
    console.log('Looking for profile with user_id:', authResult.payload.sub)
    
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, display_name')
      .eq('user_id', authResult.payload.sub)
      .single()

    console.log('Profile query result:', { profile, profileError })

    // If profile doesn't exist, create one
    if (profileError || !profile) {
      console.log('Profile not found, creating new profile for user:', authResult.payload.sub)
      
      // Get user info from auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(authResult.payload.sub)
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'User not found in auth system' },
          { status: 404 }
        )
      }

      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          role: authResult.payload.role || 'tutor',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0]
        })
        .select('id, user_id, display_name')
        .single()

      if (createError || !newProfile) {
        console.error('Failed to create profile:', createError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      profile = newProfile
      console.log('Created new profile:', profile)
    }

    const profileId = profile.id

    // Save metadata to Supabase
    const { data, error } = await supabase
      .from('course_attachments')
      .insert({
        owner_id: profileId,
        title: title.trim(),
        url,
        size,
        type
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(data as CourseAttachment, { status: 201 })
  } catch (error) {
    console.error('Save metadata error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save metadata failed' },
      { status: 500 }
    )
  }
}
