import { NextRequest, NextResponse } from 'next/server';
import { Storage } from 'megajs';
import { cloudinaryManager } from '@/lib/cloudinary-manager';
import { createAttachmentAdminClient } from '@/utils/supabase/server';
import redis from '@/utils/redis/redis';
import { z } from 'zod';

interface MegaError extends Error {
  code?: number;
}

// Zod schema for input validation
const VideoPreviewSchema = z.object({
  attachmentId: z.string().regex(/^\d+$/, 'Attachment ID must be a positive integer').transform(val => parseInt(val, 10)).optional(),
  fileId: z.string().optional(), // Legacy support
}).refine(
  (data) => data.attachmentId !== undefined || data.fileId !== undefined,
  {
    message: "Either attachmentId or fileId must be provided",
  }
);

// Processing lock configuration
const PROCESSING_LOCK_DURATION = 30 * 60; // 30 minutes in seconds

/**
 * Global MEGA storage instance with connection pooling
 * Reuse authentication to avoid 30+ second delays
 */
let globalMegaStorage: Storage | null = null;
let megaAuthTime: number = 0;
const MEGA_AUTH_TIMEOUT = 15000; // 15 seconds
const MEGA_REUSE_DURATION = 5 * 60 * 1000; // 5 minutes


/**
 * Acquire processing lock for video
 */
async function acquireProcessingLock(attachmentId: number): Promise<boolean> {
  const lockKey = `processing_lock:video:${attachmentId}`;
  const result = await redis.set(lockKey, Date.now(), { ex: PROCESSING_LOCK_DURATION, nx: true });
  return result === 'OK';
}

/**
 * Release processing lock for video
 */
async function releaseProcessingLock(attachmentId: number): Promise<void> {
  const lockKey = `processing_lock:video:${attachmentId}`;
  await redis.del(lockKey);
}

/**
 * Check if video is currently being processed
 */
async function isVideoBeingProcessed(attachmentId: number): Promise<boolean> {
  const lockKey = `processing_lock:video:${attachmentId}`;
  const result = await redis.get(lockKey);
  return result !== null;
}

/**
 * Verify attachment exists (no access control - open access)
 */
async function verifyAttachmentExists(attachmentId: number): Promise<boolean> {
  try {
    const supabase = await createAttachmentAdminClient();
    
    // Simply check if attachment exists and is not deleted
    const { data: attachment, error: attachmentError } = await supabase
      .from('course_attachments')
      .select('id')
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single();

    return !attachmentError && !!attachment;
    
  } catch (error) {
    console.error('Error verifying attachment exists:', error);
    return false;
  }
}

/**
 * Create or reuse MEGA storage instance
 */
async function getMegaStorage(): Promise<Storage> {
  const now = Date.now();
  
  // Reuse existing connection if it's still valid
  if (globalMegaStorage && (now - megaAuthTime) < MEGA_REUSE_DURATION) {
    return globalMegaStorage;
  }

  // Create new connection
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    throw new Error('MEGA credentials not found in environment variables');
  }
  
  const storage = new Storage({
    email,
    password,
    keepalive: false,
    autologin: true
  });

  // Wait for authentication with timeout
  const readyPromise = storage.ready;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('MEGA authentication timeout')), MEGA_AUTH_TIMEOUT);
  });

  await Promise.race([readyPromise, timeoutPromise]);
  
  globalMegaStorage = storage;
  megaAuthTime = now;
  
  return storage;
}

/**
 * Download video from MEGA using direct URL approach (same as streaming API)
 */
async function downloadVideoFromMega(attachmentId: number, megaUrl: string): Promise<Buffer> {
  
  try {
    // Use the same approach as the streaming API - direct file loading from URL
    const { File } = await import('megajs');
    const file = File.fromURL(megaUrl);
    await file.loadAttributes();

    const fileSize = file.size || 0;
    const fileName = file.name || `attachment-${attachmentId}`;

    // Check file size to prevent memory overflow
    const maxSize = 500 * 1024 * 1024; // 500MB limit
    if (fileSize > maxSize) {
      throw new Error(`File too large: ${fileSize} bytes (max: ${maxSize} bytes)`);
    }

    // Download file with timeout
    const downloadPromise = file.downloadBuffer({});
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MEGA download timeout after 2 minutes')), 120000);
    });

    const buffer = await Promise.race([downloadPromise, timeoutPromise]);
    
    return buffer;

  } catch (error) {
    const megaError = error as MegaError;
    console.error('MEGA download failed:', megaError.message);
    throw new Error(`Failed to download video from MEGA: ${megaError.message}`);
  }
}

/**
 * Cache video processing results in database
 */
async function getCachedVideoUrl(attachmentId: number): Promise<string | null> {
  try {
    const supabase = await createAttachmentAdminClient();
    
    const { data, error } = await supabase
      .from('course_attachments')
      .select('cloudinary_hls_url, cloudinary_processed_at')
      .eq('id', attachmentId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cached URL is still valid (within 24 hours)
    if (data.cloudinary_hls_url && data.cloudinary_processed_at) {
      const processedAt = new Date(data.cloudinary_processed_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - processedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return data.cloudinary_hls_url;
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking cached video URL:', error);
    return null;
  }
}

/**
 * Save processed video URL to database
 */
async function saveCachedVideoUrl(attachmentId: number, hlsUrl: string): Promise<void> {
  try {
    const supabase = await createAttachmentAdminClient();
    
    await supabase
      .from('course_attachments')
      .update({
        cloudinary_hls_url: hlsUrl,
        cloudinary_processed_at: new Date().toISOString(),
      })
      .eq('id', attachmentId);

  } catch (error) {
    console.error('Error saving cached video URL:', error);
    // Don't throw error, just log it
  }
}

/**
 * GET /api/video/preview
 * Process video from MEGA to Cloudinary HLS streaming
 */
export async function GET(request: NextRequest) {
  let processingLockAcquired = false;
  let attachmentIdForLock: number | null = null;
  
  try {
    // 1. Input validation
    const { searchParams } = new URL(request.url);
    const rawAttachmentId = searchParams.get('attachmentId');
    const rawFileId = searchParams.get('fileId'); // Legacy support
    
    if (!rawAttachmentId && !rawFileId) {
      return NextResponse.json(
        { error: 'Missing required parameter: attachmentId or fileId' },
        { status: 400 }
      );
    }
    
    // Validate and sanitize input
    let validatedInput;
    try {
      validatedInput = VideoPreviewSchema.parse({
        attachmentId: rawAttachmentId || undefined,
        fileId: rawFileId || undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input parameters', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // 2. Get attachment details from database
    const supabase = await createAttachmentAdminClient();
    
    let attachmentData;
    if (validatedInput.attachmentId) {
      const { data, error } = await supabase
        .from('course_attachments')
        .select('id, title, url, size')
        .eq('id', validatedInput.attachmentId)
        .eq('is_deleted', false)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        );
      }
      
      attachmentData = data;
    } else if (validatedInput.fileId) {
      // Legacy support for fileId
      const { data, error } = await supabase
        .from('course_attachments')
        .select('id, title, url, size')
        .ilike('url', `%${validatedInput.fileId}%`)
        .eq('is_deleted', false)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      
      attachmentData = data;
    } else {
      return NextResponse.json(
        { error: 'No valid attachment identifier provided' },
        { status: 400 }
      );
    }
    
    attachmentIdForLock = attachmentData.id;
    
    // 3. Verify attachment exists
    const attachmentExists = await verifyAttachmentExists(attachmentData.id);
    if (!attachmentExists) {
      return NextResponse.json(
        { error: 'Attachment not found or has been deleted' },
        { status: 404 }
      );
    }
    
    // 4. Check if video is already being processed
    const isProcessing = await isVideoBeingProcessed(attachmentData.id);
    if (isProcessing) {
      return NextResponse.json(
        { 
          error: 'Video is currently being processed by another request',
          message: 'Please try again in a few minutes',
          processing: true
        },
        { 
          status: 202,
          headers: {
            'Retry-After': '300' // 5 minutes
          }
        }
      );
    }

    // 5. Check if we have a cached processed video
    const cachedUrl = await getCachedVideoUrl(attachmentData.id);
    if (cachedUrl) {
      return NextResponse.json({
        success: true,
        hls_url: cachedUrl,
        cached: true,
        attachment: {
          id: attachmentData.id,
          title: attachmentData.title,
          size: attachmentData.size,
        }
      });
    }
    
    // 6. Acquire processing lock
    processingLockAcquired = await acquireProcessingLock(attachmentData.id);
    if (!processingLockAcquired) {
      return NextResponse.json(
        { 
          error: 'Video processing is already in progress',
          message: 'Another request is currently processing this video',
          processing: true
        },
        { 
          status: 202,
          headers: {
            'Retry-After': '300' // 5 minutes
          }
        }
      );
    }

    // Validate MEGA URL
    if (!attachmentData.url || !attachmentData.url.includes('mega.nz')) {
      return NextResponse.json(
        { error: 'Invalid or non-MEGA URL' },
        { status: 400 }
      );
    }

    try {
      // Download video from MEGA
      const videoBuffer = await downloadVideoFromMega(attachmentData.id, attachmentData.url);

      // Upload to Cloudinary with HLS processing
      const cloudinaryResult = await cloudinaryManager.uploadVideo(videoBuffer, {
        public_id: `studify_video_${attachmentData.id}_${Date.now()}`,
        folder: 'studify-videos',
        resource_type: 'video',
      });

      // Cache the result
      if (cloudinaryResult.hls_streaming_url) {
        await saveCachedVideoUrl(attachmentData.id, cloudinaryResult.hls_streaming_url);
      }
      
      // Release processing lock on success
      if (processingLockAcquired && attachmentIdForLock) {
        await releaseProcessingLock(attachmentIdForLock);
        processingLockAcquired = false;
      }

    // Get account status for monitoring
    const accountStatus = cloudinaryManager.getAccountStatus();
    const currentAccount = cloudinaryManager.getCurrentAccount();

    return NextResponse.json({
      success: true,
      hls_url: cloudinaryResult.hls_streaming_url,
      fallback_url: cloudinaryResult.secure_url,
      cached: false,
      attachment: {
        id: attachmentData.id,
        title: attachmentData.title,
        size: attachmentData.size,
      },
      cloudinary: {
        public_id: cloudinaryResult.public_id,
        duration: cloudinaryResult.duration,
        account: currentAccount?.cloudName,
        account_status: accountStatus,
      }
    });

    } catch (processingError) {
      // Release processing lock on error
      if (processingLockAcquired && attachmentIdForLock) {
        await releaseProcessingLock(attachmentIdForLock);
        processingLockAcquired = false;
      }
      throw processingError;
    }

  } catch (error) {
    console.error('Video preview processing failed:', error);
    
    // Ensure processing lock is released on any error
    if (processingLockAcquired && attachmentIdForLock) {
      try {
        await releaseProcessingLock(attachmentIdForLock);
      } catch (lockError) {
        console.error('Failed to release processing lock:', lockError);
      }
    }
    
    // Provide specific error messages
    let errorMessage = 'Video processing failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('MEGA')) {
        errorMessage = `MEGA error: ${error.message}`;
        statusCode = 502;
      } else if (error.message.includes('Cloudinary') || error.message.includes('quota')) {
        errorMessage = `Cloudinary error: ${error.message}`;
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Processing timeout - video may be too large';
        statusCode = 408;
      } else if (error.message.includes('File too large')) {
        errorMessage = error.message;
        statusCode = 413;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}

/**
 * POST /api/video/preview
 * Reset quota status for all Cloudinary accounts (admin endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset_quota') {
      cloudinaryManager.resetQuotaStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Quota status reset for all accounts',
        account_status: cloudinaryManager.getAccountStatus(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin action failed:', error);
    return NextResponse.json(
      { error: 'Admin action failed' },
      { status: 500 }
    );
  }
}
