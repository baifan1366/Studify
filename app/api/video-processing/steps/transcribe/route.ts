import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { z } from "zod";

// Validation schema for QStash job payload
const TranscribeJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  audio_url: z.string().url("Invalid audio URL"),
  timestamp: z.string().optional(),
  retry_count: z.number().int().min(0).default(0),
  is_warmup_retry: z.boolean().optional(),
});

// Configuration for retries and timeouts
const RETRY_CONFIG = {
  MAX_RETRIES: 3, // Limited to 3 by QStash quota
  WARMUP_TIMEOUT: 45000, // 增加到45秒预热超时
  PROCESSING_TIMEOUT: 600000, // 10分钟处理超时
  COLD_START_WAIT: 2000, // 减少到2秒等待时间
  RETRY_DELAYS: [15, 30, 60], // 更快的重试: 15s, 30s, 1m
};

async function downloadAudioFile(audioUrl: string): Promise<Blob> {
  console.log('Downloading audio file from:', audioUrl);
  
  
  // Supported formats: .wav, .mp3, .m4a, .mp4, .mov, .ogg, .flac, .aac, .webm, .avi
  // The Whisper API uses ffmpeg internally to convert formats as needed
  
  const response = await fetch(audioUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Studify-Transcription-Service/1.0',
      'Accept': 'audio/*, video/*, application/octet-stream, audio/wav, audio/mp3, audio/m4a, video/mp4, video/mov, audio/mpeg, audio/ogg, audio/flac, audio/aac, video/webm, video/avi',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download audio file: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();

  // Validate supported media content types
  const isValidMediaType = contentType.includes('audio/') || 
                          contentType.includes('video/') || 
                          contentType.includes('application/octet-stream') ||
                          ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/ogg', 'audio/flac', 'audio/aac',
                           'video/mp4', 'video/mov', 'video/webm', 'video/avi'].some(type => contentType.includes(type));
  
  if (!isValidMediaType) {
    console.warn(`⚠️ Unusual content type detected: ${contentType}, but continuing with processing`);
  }
  
  // Check for minimum file size (audio files are typically larger than 1KB)
  if (arrayBuffer.byteLength < 1024) {
    throw new Error(`Downloaded file is too small (${arrayBuffer.byteLength} bytes) to be a valid audio file. This might be an error page or redirect.`);
  }
  
  console.log('Audio file downloaded successfully:', {
    size: arrayBuffer.byteLength,
    contentType,
    isValidSize: arrayBuffer.byteLength >= 1024
  });

  return new Blob([arrayBuffer], { type: contentType });
}

/**
 * Warm up the Whisper server by sending a lightweight request
 * This helps wake up sleeping Hugging Face servers
 */
async function warmupWhisperServer(): Promise<boolean> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperUrl) {
    throw new Error('WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set');
  }

  console.log('🔥 Warming up Whisper server...');
  
  try {
    // Create a tiny audio blob for warmup (1 second of silence)
    const silentAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    const silentAudioBytes = Uint8Array.from(atob(silentAudioBase64), c => c.charCodeAt(0));
    const warmupBlob = new Blob([silentAudioBytes], { type: 'audio/wav' });
    
    const formData = new FormData();
    formData.append('file', warmupBlob, 'warmup.wav');
    
    const response = await fetch(`${whisperUrl}/transcribe?task=transcribe&beam_size=1`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(RETRY_CONFIG.WARMUP_TIMEOUT),
    });
    
    console.log(`✅ Warmup response status: ${response.status}`);
    
    // Even if the response is not OK, the server is now warming up
    return response.ok;
    
  } catch (error: any) {
    console.log('⚠️ Warmup failed (expected for sleeping server):', error.message);
    // Return false but don't throw - the server is now waking up
    return false;
  }
}

/**
 * Transcribe audio using Whisper API with intelligent retry logic
 */
async function transcribeWithWhisper(
  audioBlob: Blob, 
  retryCount: number = 0,
  isWarmupRetry: boolean = false
): Promise<{ text: string; language?: string }> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperUrl) {
    throw new Error('WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set');
  }

  // Map MIME types to file extensions for proper type detection
  const mimeToExtension: Record<string, string> = {
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/m4a': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
    'audio/webm': '.webm',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/webm': '.webm',
    'application/octet-stream': '.mp3', // Default fallback
  };

  // Determine file extension based on MIME type
  const blobType = audioBlob.type || 'audio/mpeg';
  const extension = mimeToExtension[blobType] || '.mp3'; // Default to .mp3 if unknown
  const filename = `media_file${extension}`;

  const formData = new FormData();
  // Include proper file extension so mimetypes.guess_type() can detect the format
  formData.append('file', audioBlob, filename);

  const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=5`;
  
  console.log(`🎯 Sending request to Whisper API (attempt ${retryCount + 1}, warmup: ${isWarmupRetry}):`, transcribeEndpoint);
  console.log('📊 Audio blob details:', {
    size: audioBlob.size,
    type: blobType,
    filename: filename
  });

  try {
    // Use shorter timeout for warmup retries, longer for regular processing
    const timeout = isWarmupRetry ? 
      RETRY_CONFIG.WARMUP_TIMEOUT : 
      RETRY_CONFIG.PROCESSING_TIMEOUT;
    
    const response = await fetch(transcribeEndpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(timeout),
    });

    console.log('📨 Whisper API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Check if it's a server wake-up issue (503, 502, 504 or connection errors)
      if (response.status === 503 || response.status === 502 || response.status === 504) {
        throw new Error(`SERVER_SLEEPING:Whisper server is sleeping (${response.status}): ${errorText}`);
      }
      
      // 429 means rate limit, should retry with delay
      if (response.status === 429) {
        throw new Error(`RATE_LIMIT:Whisper API rate limit (${response.status}): ${errorText}`);
      }
      
      throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Whisper API response received:', {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      language: result.language
    });

    if (!result.text) {
      throw new Error('No transcription text received from Whisper API');
    }

    return {
      text: result.text,
      language: result.language
    };

  } catch (error: any) {
    console.error('❌ Whisper API error:', error.message);
    
    // Check for timeout or connection errors (server sleeping)
    if (error.name === 'TimeoutError' || 
        error.name === 'AbortError' ||
        error.message.includes('timeout') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('UND_ERR_HEADERS_TIMEOUT') ||
        error.message.includes('fetch failed') ||
        error.message.includes('SERVER_SLEEPING')) {
      throw new Error(`SERVER_SLEEPING:${error.message}`);
    }
    
    // Check for rate limit
    if (error.message.includes('RATE_LIMIT')) {
      throw new Error(`RATE_LIMIT:${error.message}`);
    }
    
    throw error;
  }
}

async function queueNextStep(queueId: number, attachmentId: number, userId: string, transcriptionText: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app'
  const embedEndpoint = `${baseUrl}/api/video-processing/steps/embed`;
  
  console.log('Queueing embedding step for queue:', queueId);
  
  try {
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = userId.replace(/-/g, '').substring(0, 12);
    const queueName = `video_${userIdHash}`;
    
    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);
    
    // Enqueue the next step
    const qstashResponse = await queueManager.enqueue(
      queueName,
      embedEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        transcription_text: transcriptionText,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3 // Queue timing managed by QStash internally
      }
    );

    console.log('Embedding job queued:', qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to queue embedding:', error);
    throw error;
  }
}

async function scheduleRetry(
  queueId: number, 
  attachmentId: number, 
  userId: string, 
  audioUrl: string, 
  retryCount: number,
  isWarmupRetry: boolean = false
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app'
  const transcribeEndpoint = `${baseUrl}/api/video-processing/steps/transcribe`;
  
  // Use configured delays or exponential backoff
  const delaySeconds = isWarmupRetry ? 
    10 : // 10秒后重试（服务器预热后）
    (RETRY_CONFIG.RETRY_DELAYS[retryCount - 1] || RETRY_CONFIG.RETRY_DELAYS[RETRY_CONFIG.RETRY_DELAYS.length - 1]);
  
  console.log(`⏰ Scheduling transcription retry ${retryCount} in ${delaySeconds} seconds for queue:`, queueId);
  
  try {
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = userId.replace(/-/g, '').substring(0, 12);
    const queueName = `video_${userIdHash}`;
    
    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);
    
    // Enqueue the retry
    const qstashResponse = await queueManager.enqueue(
      queueName,
      transcribeEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        audio_url: audioUrl,
        retry_count: retryCount,
        is_warmup_retry: isWarmupRetry,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 0 // Manual retry scheduling, no additional retries
      }
    );

    console.log(`🔄 Transcription retry ${retryCount} scheduled:`, qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to schedule transcription retry:', error);
    throw error;
  }
}

async function handler(req: Request) {
  try {
    console.log('Processing transcription job...');

    // Parse and validate the QStash job payload
    const body = await req.json();
    const validation = TranscribeJobSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Invalid job payload:', validation.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid job payload", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { queue_id, attachment_id, user_id, audio_url, timestamp, retry_count, is_warmup_retry } = validation.data;
    const client = await createServerClient();
    
    console.log('🎬 Processing transcription for:', {
      queue_id,
      attachment_id,
      user_id,
      audio_url,
      timestamp,
      retry_count,
      is_warmup_retry,
    });

    // 1. Get current queue status and retry count
    const { data: queueData, error: queueError } = await client
      .from("video_processing_queue")
      .select("retry_count, max_retries, status")
      .eq("id", queue_id);

    if (queueError) {
      throw new Error(`Database error fetching queue: ${queueError.message}`);
    }
    
    if (!queueData || queueData.length === 0) {
      console.warn(`⚠️ Queue not found with ID: ${queue_id}. This may be an orphaned QStash message. Skipping processing.`);
      
      // Return success to prevent QStash from retrying this orphaned message
      return NextResponse.json({
        message: "Queue record not found - orphaned QStash message",
        queue_id,
        action: "skipped",
        reason: "Queue record may have been deleted or never existed"
      }, { status: 200 });
    }
    
    if (queueData.length > 1) {
      console.warn(`Multiple queue entries found for ID: ${queue_id}, using first one`);
    }
    
    const queueRecord = Array.isArray(queueData) ? queueData[0] : queueData;

    // 2. Update step status to processing
    await client
      .from("video_processing_steps")
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: retry_count
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "transcribe");

      // Update queue status
    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'transcribe',
        progress_percentage: 65,
        retry_count: retry_count
      })
      .eq("id", queue_id);

    // 4. Download audio file
    let audioBlob: Blob;
    try {
      audioBlob = await downloadAudioFile(audio_url);
    } catch (downloadError: any) {
      console.error('Audio download failed:', downloadError.message);
      
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'transcribe',
        error_message_param: `Audio download failed: ${downloadError.message}`,
        error_details_param: { step: 'download', error: downloadError.message }
      });

      return NextResponse.json({
        error: "Failed to download audio file",
        details: downloadError.message,
        retryable: true,
      }, { status: 500 });
    }

    // 5. Transcribe with Whisper API (with intelligent retry logic)
    let transcriptionResult: { text: string; language?: string };
    try {
      // If this is the first attempt and not a warmup retry, try to warmup the server first
      if (retry_count === 0 && !is_warmup_retry) {
        console.log('🔥 Starting server warmup in parallel with audio processing...');
        
        // 并行执行预热，不等待结果
        const warmupPromise = warmupWhisperServer().catch(() => false);
        
        // 给服务器一些时间启动，但不要等太久
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.COLD_START_WAIT));
        
        const warmupSuccess = await warmupPromise;
        
        if (!warmupSuccess) {
          console.log('🔥 Server appears to be sleeping, scheduling quick retry...');
          
          // Schedule a quick retry after warmup
          const retryMessageId = await scheduleRetry(
            queue_id, 
            attachment_id, 
            user_id, 
            audio_url, 
            1,
            true // This is a warmup retry
          );
          
          await client
            .from("video_processing_queue")
            .update({ 
              qstash_message_id: retryMessageId,
              status: 'retrying',
              error_message: 'Warming up Whisper server...',
              retry_count: 1
            })
            .eq("id", queue_id);

          return NextResponse.json({
            message: "Warming up Whisper server, will retry in 15 seconds",
            retry_count: 1,
            is_warmup_retry: true
          });
        }
        
        console.log('✅ Server warmup successful, proceeding with transcription');
      }
      
      // Try transcription
      transcriptionResult = await transcribeWithWhisper(audioBlob, retry_count, is_warmup_retry);
      
    } catch (whisperError: any) {
      console.error('❌ Whisper API failed:', whisperError.message);
      
      // Check error type and determine if we should retry
      const isServerSleeping = whisperError.message.includes('SERVER_SLEEPING');
      const isRateLimit = whisperError.message.includes('RATE_LIMIT');
      const canRetry = retry_count < RETRY_CONFIG.MAX_RETRIES;
      
      if ((isServerSleeping || isRateLimit) && canRetry) {
        const nextRetryCount = retry_count + 1;
        const retryReason = isServerSleeping ? 
          'Whisper server is sleeping, retrying...' : 
          'Rate limited by Whisper API, retrying with delay...';
        
        console.log(`🔄 ${retryReason} (${nextRetryCount}/${RETRY_CONFIG.MAX_RETRIES})`);
        
        // Update queue retry count
        await client
          .from("video_processing_queue")
          .update({
            status: 'retrying',
            retry_count: nextRetryCount,
            error_message: retryReason,
            last_error_at: new Date().toISOString()
          })
          .eq("id", queue_id);

        // Schedule retry with appropriate delay
        try {
          const retryMessageId = await scheduleRetry(
            queue_id, 
            attachment_id, 
            user_id, 
            audio_url, 
            nextRetryCount,
            false
          );
          
          await client
            .from("video_processing_queue")
            .update({ qstash_message_id: retryMessageId })
            .eq("id", queue_id);

          const delaySeconds = RETRY_CONFIG.RETRY_DELAYS[nextRetryCount - 1] || RETRY_CONFIG.RETRY_DELAYS[RETRY_CONFIG.RETRY_DELAYS.length - 1];
          
          return NextResponse.json({
            message: retryReason,
            retry_count: nextRetryCount,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
            next_retry_in_seconds: delaySeconds
          });
        } catch (retryError: any) {
          console.error('❌ Failed to schedule retry:', retryError);
          
          // Mark step as failed if we can't schedule retry
          await client.rpc('update_video_processing_step', {
            queue_id_param: queue_id,
            step_name_param: 'transcribe',
            status_param: 'failed',
            error_message_param: `Failed to schedule retry after error`,
            error_details_param: { 
              last_error: whisperError.message, 
              retry_error: retryError.message,
              retry_count 
            }
          });

          throw retryError;
        }
      } else {
        // Max retries reached or non-retryable error
        console.error(`❌ Max retries reached or non-retryable error:`, { 
          queue_id, 
          attachment_id, 
          retry_count,
          max_retries: RETRY_CONFIG.MAX_RETRIES 
        });
        
        // Mark step as failed
        await client.rpc('update_video_processing_step', {
          queue_id_param: queue_id,
          step_name_param: 'transcribe',
          status_param: 'failed',
          error_message_param: `Transcription failed after ${retry_count} attempts`,
          error_details_param: { 
            last_error: whisperError.message, 
            retry_count,
            max_retries: RETRY_CONFIG.MAX_RETRIES
          }
        });

        // Send failure notification
        await sendVideoProcessingNotification(user_id, {
          attachment_id,
          queue_id,
          attachment_title: `Video ${attachment_id}`,
          status: 'failed',
          current_step: 'transcribe',
          error_message: `Transcription failed after ${retry_count} attempts`
        });

        return NextResponse.json({
          error: "Max retries reached for transcription",
          queue_id,
          attachment_id,
          retry_count,
          max_retries: RETRY_CONFIG.MAX_RETRIES,
          last_error: whisperError.message
        }, { status: 500 });
      }
    }

    // 6. Complete the transcription step
    await client.rpc('complete_processing_step', {
      queue_id_param: queue_id,
      step_name_param: 'transcribe',
      output_data_param: {
        transcription_text: transcriptionResult!.text,
        language: transcriptionResult!.language,
        text_length: transcriptionResult!.text.length,
        audio_url: audio_url,
        retry_count,
        was_warmup_retry: is_warmup_retry
      }
    });

    // 7. Queue the next step (embedding generation)
    try {
      const nextQstashMessageId = await queueNextStep(queue_id, attachment_id, user_id, transcriptionResult!.text);
      
      // Update queue with next step's QStash message ID
      await client
        .from("video_processing_queue")
        .update({ 
          qstash_message_id: nextQstashMessageId,
          current_step: 'embed',
          progress_percentage: 80,
          retry_count: 0 // Reset retry count for next step
        })
        .eq("id", queue_id);

    } catch (queueError: any) {
      console.error('Failed to queue next step:', queueError);
      
      // Mark as failed but keep transcription result
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'embed',
        error_message_param: 'Failed to queue embedding step',
        error_details_param: { step: 'queue_next', error: queueError.message }
      });

      return NextResponse.json({
        error: "Failed to queue next processing step",
        details: queueError.message,
        transcription_text: transcriptionResult.text, // Include the text so it's not lost
        retryable: true,
      }, { status: 500 });
    }

    console.log('Transcription completed successfully:', {
      queue_id,
      attachment_id,
      text_length: transcriptionResult.text.length,
      language: transcriptionResult.language,
      retry_count
    });

    return NextResponse.json({
      message: "Transcription completed successfully",
      data: {
        queue_id,
        attachment_id,
        step: 'transcribe',
        status: 'completed',
        output: {
          text: transcriptionResult.text,
          language: transcriptionResult.language,
          text_length: transcriptionResult.text.length
        },
        next_step: 'embed',
        retry_count,
        completedAt: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in transcription processing:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      retryable: true,
    }, { status: 500 });
  }
}

// Export the handler directly (QStash signature verification handled in utils)
export const POST = handler;
