import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/utils/supabase/server'
import { authorize } from '@/utils/auth/server-guard'
import { cloudinaryManager } from '@/lib/cloudinary-manager'
import { v2 as cloudinary } from 'cloudinary'
import { Storage, File } from 'megajs'

const convertRequestSchema = z.object({
  attachmentId: z.string().regex(/^\d+$/, 'Invalid attachment ID'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate request parameters
    const validation = convertRequestSchema.safeParse({
      attachmentId: (await params).id,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.error.issues },
        { status: 400 }
      )
    }

    const attachmentId = parseInt((await params).id)

    // Authenticate user - allow both students and tutors to convert audio
    let authResult = await authorize('student')
    if (authResult instanceof NextResponse) {
      // Try tutor role if student authorization failed
      authResult = await authorize('tutor')
      if (authResult instanceof NextResponse) {
        return authResult
      }
    }

    const userRole = authResult.payload.role
    const supabase = await createServerClient();

    // Get user's profile ID for ownership check
    let profileId = null;
    if (userRole === 'student') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authResult.payload.sub)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }
      profileId = profile.id;
    }

    // Get attachment details - tutors can access any attachment, students only their own
    let attachmentQuery = supabase
      .from('course_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('is_deleted', false)

    // Only restrict by owner_id for students
    if (userRole === 'student' && profileId) {
      attachmentQuery = attachmentQuery.eq('owner_id', profileId)
    }

    const { data: attachment, error: attachmentError } = await attachmentQuery.single()

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found or access denied' },
        { status: 404 }
      )
    }

    // Check if attachment is a video
    if (attachment.type !== 'video') {
      return NextResponse.json(
        { error: 'Only video files can be converted to audio' },
        { status: 400 }
      )
    }

    // Check if already converted
    if (attachment.cloudinary_mp3) {
      return NextResponse.json({
        success: true,
        mp3Url: attachment.cloudinary_mp3,
        message: 'Audio already exists'
      })
    }

    // Convert video to audio using CloudinaryManager
    try {
      // Download video from MEGA first
      const email = process.env.MEGA_EMAIL
      const password = process.env.MEGA_PASSWORD

      if (!email || !password) {
        return NextResponse.json(
          { error: 'MEGA credentials not configured' },
          { status: 500 }
        )
      }

      // Create MEGA storage instance
      const storage = new Storage({
        email,
        password,
        keepalive: true,
        autologin: true
      })

      await storage.ready

      // Parse MEGA URL to get file
      const megaFile = File.fromURL(attachment.url!, {})
      await megaFile.loadAttributes()

      // Download file as buffer
      const fileBuffer = await megaFile.downloadBuffer({})

      // Get current account and configure Cloudinary
      const currentAccount = cloudinaryManager.getCurrentAccount()
      if (!currentAccount) {
        return NextResponse.json(
          { error: 'No available Cloudinary accounts' },
          { status: 503 }
        )
      }

      // Configure Cloudinary with current account
      cloudinary.config({
        cloud_name: currentAccount.cloudName,
        api_key: currentAccount.apiKey,
        api_secret: currentAccount.apiSecret,
        secure: true,
      })

      // Upload buffer to Cloudinary for conversion with timeout and retry
      const uploadWithRetry = async (retryCount = 0): Promise<any> => {
        const maxRetries = 2
        const timeout = 120000 // 2 minutes timeout
        
        return new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Cloudinary upload timeout after 2 minutes'))
          }, timeout)

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'video',
              format: 'mp3',
              folder: 'studify/audio',
              public_id: `${attachment.public_id}_audio`,
              timeout: 120000, // 2 minutes
              chunk_size: 6000000, // 6MB chunks
            },
            (error, result) => {
              clearTimeout(timeoutId)
              
              if (error) {
                console.error(`Cloudinary upload error (attempt ${retryCount + 1}):`, error)
                
                // Check if it's a retryable error
                const isRetryable = 
                  error.message?.includes('ECONNRESET') ||
                  error.message?.includes('timeout') ||
                  error.message?.includes('fetch failed') ||
                  error.http_code === 500 ||
                  error.http_code === 502 ||
                  error.http_code === 503

                if (isRetryable && retryCount < maxRetries) {
                  console.log(`Retrying upload (attempt ${retryCount + 2})...`)
                  setTimeout(() => {
                    uploadWithRetry(retryCount + 1).then(resolve).catch(reject)
                  }, 5000) // 5 second delay before retry
                } else {
                  reject(error)
                }
              } else {
                resolve(result)
              }
            }
          )

          uploadStream.end(fileBuffer)
        })
      }

      const conversionResult = await uploadWithRetry()

      const mp3Url = conversionResult.secure_url

      // Update database with MP3 URL
      const { error: updateError } = await supabase
        .from('course_attachments')
        .update({ cloudinary_mp3: mp3Url })
        .eq('id', attachmentId)

      if (updateError) {
        console.error('Failed to update database:', updateError)
        return NextResponse.json(
          { error: 'Failed to save audio URL to database' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        mp3Url,
        message: 'Video successfully converted to audio'
      })

    } catch (cloudinaryError: any) {
      console.error('Cloudinary conversion error:', cloudinaryError)
      
      // Check if it's a quota error and handle account switching
      const httpCode = cloudinaryError.http_code || cloudinaryError.error?.http_code
      if (httpCode === 420 || httpCode === 429) {
        console.warn('Cloudinary quota exceeded, but audio conversion cannot retry with different accounts automatically')
      }
      
      return NextResponse.json(
        { error: 'Failed to convert video to audio' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Convert to audio error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
