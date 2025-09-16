import { NextRequest, NextResponse } from 'next/server'
import { uploadToMega } from '@/lib/mega'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { detectFileType } from '@/utils/attachment/file-type-detector'
import { authorize } from '@/utils/auth/server-guard'

/**
 * POST /api/attachments
 * Upload a new course attachment
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user first
    const authResult = await authorize('tutor')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const formData = await request.formData()
    
    const title = formData.get('title') as string
    const file = formData.get('file') as File

    // Validate required fields
    if (!title || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: title and file are required' },
        { status: 400 }
      )
    }

    // Validate file
    if (!file.size) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
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

    // Detect file type from filename and MIME type
    const fileType = detectFileType(file.name, file.type)

    // Upload file to MEGA
    const { url, size } = await uploadToMega(file)

    // Save metadata to Supabase
    
    const { data, error } = await supabase
      .from('course_attachments')
      .insert({
        owner_id: profileId,
        title,
        url,
        size,
        type: fileType
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(data as CourseAttachment, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/attachments
 * Fetch course attachments (optionally filtered by owner_id)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('owner_id')

    const supabase = await createAttachmentAdminClient()
    
    let query = supabase
      .from('course_attachments')
      .select('id, title, url, size, type, created_at, owner_id')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Filter by owner_id if provided
    if (ownerId) {
      const ownerIdNum = parseInt(ownerId, 10)
      if (isNaN(ownerIdNum)) {
        return NextResponse.json(
          { error: 'Invalid owner_id: must be a number' },
          { status: 400 }
        )
      }
      query = query.eq('owner_id', ownerIdNum)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(data as CourseAttachment[])
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    )
  }
}
