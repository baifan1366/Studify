import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/utils/supabase/server'
import { getMegaFileInfo, downloadMegaFile } from '@/lib/mega'

// File size threshold: 50MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

interface LargeFileResponse {
  url: string
  mode: 'large'
  size: number
  name: string
  mimeType: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Create Supabase client and check authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { url: '', mode: 'large', size: 0, name: 'Access Denied', mimeType: 'application/octet-stream' } as LargeFileResponse,
        { status: 401 }
      )
    }

    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Get attachment info from database
    const { data: attachment, error: attachmentError } = await supabase
      .from('course_attachments')
      .select('*')
      .eq('id', parseInt(fileId))
      .single()

    if (attachmentError || !attachment) {
      console.error('❌ Attachment not found:', attachmentError)
      return NextResponse.json(
        { url: '', mode: 'large', size: 0, name: 'Not Found', mimeType: 'application/octet-stream' } as LargeFileResponse,
        { status: 404 }
      )
    }

    // Simplified access check - any authenticated user can access
    // (since you mentioned tutors, admins, and students should all have access)

    const megaUrl = attachment.url
    if (!megaUrl || (!megaUrl.includes('mega.nz') && !megaUrl.includes('mega.co.nz'))) {
      return NextResponse.json(
        { url: '', mode: 'large', size: 0, name: 'Invalid File', mimeType: 'application/octet-stream' } as LargeFileResponse,
        { status: 400 }
      )
    }

    // Get MEGA file info first with timeout handling
    let fileInfo
    try {
      fileInfo = await Promise.race([
        getMegaFileInfo(megaUrl),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('MEGA file info timeout')), 30000)
        )
      ])
    } catch (megaError) {
      console.error('❌ MEGA file info failed:', megaError)
      // Fallback: return direct MEGA URL for large file mode
      return NextResponse.json({
        url: megaUrl,
        mode: 'large',
        size: attachment.size || 0,
        name: attachment.file_name || 'Unknown',
        mimeType: getMimeTypeFromExtension(attachment.file_name || '')
      } as LargeFileResponse)
    }
    
    if (!fileInfo.isValid) {
      console.warn('⚠️ Invalid MEGA file, falling back to direct URL')
      return NextResponse.json(
        { url: megaUrl, mode: 'large', size: attachment.size || 0, name: attachment.file_name || 'Unknown', mimeType: getMimeTypeFromExtension(attachment.file_name || '') } as LargeFileResponse,
        { status: 200 } // Changed from 400 to 200 for graceful fallback
      )
    }

    const fileSize = fileInfo.size
    const fileName = fileInfo.name || attachment.file_name || 'document'
    const mimeType = getMimeTypeFromExtension(fileName)

    // Check file size and determine strategy
    if (fileSize <= MAX_FILE_SIZE_BYTES) {
      
      try {
        // Download file as buffer with timeout
        const fileBuffer = await Promise.race([
          downloadMegaFile(megaUrl, MAX_FILE_SIZE_BYTES),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Download timeout after 45 seconds')), 45000)
          )
        ])
                
        // Return binary data directly with proper headers
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': fileBuffer.length.toString(),
            'X-Preview-Mode': 'blob',
            'X-File-Name': fileName,
            'X-File-Size': fileSize.toString(),
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        })
      } catch (downloadError) {
        console.error('❌ Download failed, falling back to large file mode:', downloadError)
        // Fallback to large file mode if download fails
      }
    }
        
    // For large files, return JSON with download info
    const response: LargeFileResponse = {
      url: megaUrl,
      mode: 'large',
      size: fileSize,
      name: fileName,
      mimeType
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Preview API error:', error)
    
    const response: LargeFileResponse = {
      url: '',
      mode: 'large',
      size: 0,
      name: 'Error',
      mimeType: 'application/octet-stream'
    }

    return NextResponse.json(response, { status: 500 })
  }
}

// Helper function to get MIME type from file extension
function getMimeTypeFromExtension(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    // Office documents
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  
  return mimeTypes[extension || ''] || 'application/octet-stream'
}
