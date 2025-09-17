import { NextRequest, NextResponse } from 'next/server'
import { uploadToMegaClient } from '@/lib/mega-client'

/**
 * POST /api/attachments/upload-mega
 * Test endpoint for client-side MEGA upload with large files
 * This endpoint demonstrates how to handle large file uploads by bypassing Next.js limitations
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Log file information
    console.log('=== MEGA Upload Test ===')
    console.log(`File: ${file.name}`)
    console.log(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Type: ${file.type}`)
    console.log('========================')

    // Check if file exceeds Next.js typical limits (demonstrate the bypass)
    const fileSizeMB = file.size / 1024 / 1024
    if (fileSizeMB > 4) {
      console.log(`⚠️  File size ${fileSizeMB.toFixed(2)}MB exceeds typical Next.js limit (4MB)`)
      console.log('🚀 Using client-side MEGA upload to bypass limitation...')
    }

    // Attempt client-side upload to MEGA
    const uploadResult = await uploadToMegaClient(file, {
      email: email || undefined,
      password: password || undefined,
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`)
      }
    })

    console.log('✅ MEGA upload successful!')
    console.log(`Share URL: ${uploadResult.url}`)
    console.log(`File size: ${uploadResult.size} bytes`)
    console.log(`Detected type: ${uploadResult.type}`)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully to MEGA',
      data: {
        title: title.trim(),
        originalName: file.name,
        size: uploadResult.size,
        sizeMB: (uploadResult.size / 1024 / 1024).toFixed(2),
        type: uploadResult.type,
        url: uploadResult.url,
        exceedsNextJSLimit: fileSizeMB > 4,
        uploadedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ MEGA upload test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
