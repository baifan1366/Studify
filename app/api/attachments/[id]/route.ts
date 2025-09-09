import { NextRequest, NextResponse } from 'next/server'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'

/**
 * GET /api/attachments/[id]
 * Get a specific attachment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachmentId = parseInt(id, 10)

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      )
    }

    const supabase = await createAttachmentAdminClient()
    
    const { data, error } = await supabase
      .from('course_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(data as CourseAttachment)
  } catch (error) {
    console.error('Fetch attachment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/attachments/[id]
 * Update an attachment's metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachmentId = parseInt(id, 10)

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, owner_id } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const supabase = await createAttachmentAdminClient()

    // Check if attachment exists and belongs to the owner
    const { data: existingAttachment, error: fetchError } = await supabase
      .from('course_attachments')
      .select('id, owner_id')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }
      throw new Error(`Database error: ${fetchError.message}`)
    }

    // Check ownership if owner_id is provided
    if (owner_id && existingAttachment.owner_id !== owner_id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own attachments' },
        { status: 403 }
      )
    }

    // Update the attachment
    const { data, error } = await supabase
      .from('course_attachments')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', attachmentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json(data as CourseAttachment)
  } catch (error) {
    console.error('Update attachment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/attachments/[id]
 * Soft delete an attachment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachmentId = parseInt(id, 10)

    if (isNaN(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      )
    }

    // Get owner_id from query params for authorization
    const url = new URL(request.url)
    const ownerId = url.searchParams.get('owner_id')

    const supabase = await createAttachmentAdminClient()

    // Check if attachment exists and belongs to the owner
    const { data: existingAttachment, error: fetchError } = await supabase
      .from('course_attachments')
      .select('id, owner_id')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        )
      }
      throw new Error(`Database error: ${fetchError.message}`)
    }

    // Check ownership if owner_id is provided
    if (ownerId && existingAttachment.owner_id !== parseInt(ownerId, 10)) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own attachments' },
        { status: 403 }
      )
    }

    // Soft delete the attachment
    const { data, error } = await supabase
      .from('course_attachments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', attachmentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({ message: 'Attachment deleted successfully' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
