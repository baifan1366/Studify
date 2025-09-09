import { NextRequest, NextResponse } from 'next/server'
import { uploadToMega } from '@/lib/mega'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'

/**
 * POST /api/attachments
 * Upload a new course attachment
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const ownerId = formData.get('ownerId') as string
    const title = formData.get('title') as string
    const file = formData.get('file') as File

    // Validate required fields
    if (!ownerId || !title || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: ownerId, title, and file are required' },
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

    // Parse ownerId to number
    const ownerIdNum = parseInt(ownerId, 10)
    if (isNaN(ownerIdNum)) {
      return NextResponse.json(
        { error: 'Invalid ownerId: must be a number' },
        { status: 400 }
      )
    }

    // Upload file to MEGA
    const { url, size } = await uploadToMega(file)

    // Save metadata to Supabase
    const supabase = await createAttachmentAdminClient()
    
    const { data, error } = await supabase
      .from('course_attachments')
      .insert({
        owner_id: ownerIdNum,
        title,
        url,
        size
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
      .select('id, title, url, size, created_at, owner_id')
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
