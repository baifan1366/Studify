import { NextRequest, NextResponse } from 'next/server'
import { createAttachmentAdminClient } from '@/utils/supabase/server'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import { Storage, File } from 'megajs'

/**
 * GET /api/attachments/[id]/stream
 * Stream video content from MEGA storage with range request support
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

    // Get attachment metadata from database
    const supabase = await createAttachmentAdminClient()
    
    const { data: attachment, error } = await supabase
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

    const attachmentData = attachment as CourseAttachment

    if (!attachmentData.url) {
      return NextResponse.json(
        { error: 'Attachment URL not found' },
        { status: 404 }
      )
    }

    // Check if the URL is a MEGA URL
    if (!attachmentData.url.includes('mega.nz')) {
      return NextResponse.json(
        { error: 'Only MEGA attachments are supported for streaming' },
        { status: 400 }
      )
    }

    // Get MEGA credentials
    const email = process.env.MEGA_EMAIL
    const password = process.env.MEGA_PASSWORD

    if (!email || !password) {
      return NextResponse.json(
        { error: 'MEGA credentials not configured' },
        { status: 500 }
      )
    }

    // Parse range header for video streaming
    const range = request.headers.get('range')
    
    try {
      // Create MEGA storage instance
      const storage = new Storage({
        email,
        password,
        keepalive: false,
        autologin: true
      })

      await storage.ready

      // Parse MEGA URL to get file from storage
      const file = File.fromURL(attachmentData.url)
      await file.loadAttributes()

      const fileSize = file.size || 0
      const fileName = file.name || `attachment-${attachmentId}`

      // Determine content type based on file extension
      const getContentType = (filename: string): string => {
        const ext = filename.toLowerCase().split('.').pop()
        switch (ext) {
          case 'mp4': return 'video/mp4'
          case 'webm': return 'video/webm'
          case 'ogg': return 'video/ogg'
          case 'avi': return 'video/x-msvideo'
          case 'mov': return 'video/quicktime'
          case 'wmv': return 'video/x-ms-wmv'
          case 'flv': return 'video/x-flv'
          case 'm4v': return 'video/x-m4v'
          default: return 'video/mp4'
        }
      }

      const contentType = getContentType(fileName)

      // Handle range requests for video streaming
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = (end - start) + 1

        // Download the specific range from MEGA
        const stream = file.download({ start, end: end + 1 })
        const chunks: Buffer[] = []

        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk))
        }

        const buffer = Buffer.concat(chunks)

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        })
      } else {
        // Download entire file
        const stream = file.download({})
        const chunks: Buffer[] = []

        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk))
        }

        const buffer = Buffer.concat(chunks)

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    } catch (megaError) {
      console.error('MEGA streaming error:', megaError)
      return NextResponse.json(
        { error: 'Failed to stream file from MEGA' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Stream attachment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    )
  }
}
