import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { z } from "zod";

// Validation schema for QStash job payload
const TranscribeJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  audio_url: z.string().url("Invalid audio URL"),
  timestamp: z.string().optional(),
});

async function downloadAudioFile(audioUrl: string): Promise<Blob> {
  console.log('Downloading audio file from:', audioUrl);
  
  const response = await fetch(audioUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Studify-Transcription-Service/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download audio file: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();
  
  console.log('Audio file downloaded successfully:', {
    size: arrayBuffer.byteLength,
    contentType,
  });

  return new Blob([arrayBuffer], { type: contentType });
}

async function transcribeWithWhisper(audioBlob: Blob, retryCount: number = 0): Promise<{ text: string; language?: string }> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperUrl) {
    throw new Error('WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');

  const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=5`;
  
  console.log(`Sending request to Whisper API (attempt ${retryCount + 1}):`, transcribeEndpoint);
  console.log('Audio blob size:', audioBlob.size, 'bytes');

  try {
    const response = await fetch(transcribeEndpoint, {
      method: 'POST',
      body: formData,
      // Generous timeout for server wake-up and processing
      signal: AbortSignal.timeout(600000), // 10 minutes timeout
    });

    console.log('Whisper API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Check if it's a server wake-up issue (503, 502, or connection errors)
      if (response.status === 503 || response.status === 502 || response.status === 504) {
        throw new Error(`SERVER_SLEEPING:Whisper server is sleeping (${response.status}): ${errorText}`);
      }
      
      throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Whisper API response received:', {
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
    console.error('Whisper API error:', error.message);
    
    // Check for timeout or connection errors (server sleeping)
    if (error.name === 'TimeoutError' || 
        error.message.includes('timeout') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('UND_ERR_HEADERS_TIMEOUT') ||
        error.message.includes('fetch failed') ||
        error.message.includes('SERVER_SLEEPING')) {
      throw new Error(`SERVER_SLEEPING:${error.message}`);
    }
    
    throw error;
  }
}

async function queueNextStep(queueId: number, attachmentId: number, userId: string, transcriptionText: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const embedEndpoint = `${baseUrl}/api/video-processing/steps/embed`;
  
  console.log('Queueing embedding step for queue:', queueId);
  
  try {
    const qstashResponse = await qstashClient.publish({
      url: embedEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        transcription_text: transcriptionText,
        timestamp: new Date().toISOString(),
      }),
      retries: 3, // More retries for embedding API
      delay: "30s", // Longer delay for server wake-up
    });

    console.log('Embedding job queued:', qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to queue embedding:', error);
    throw error;
  }
}

async function scheduleRetry(queueId: number, attachmentId: number, userId: string, audioUrl: string, retryCount: number) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const transcribeEndpoint = `${baseUrl}/api/video-processing/steps/transcribe`;
  
  // Calculate delay: 1 minute * retry_count (1min, 2min, 3min)
  const delayMinutes = retryCount;
  const delaySeconds = delayMinutes * 60;
  
  console.log(`Scheduling transcription retry ${retryCount} in ${delayMinutes} minutes for queue:`, queueId);
  
  try {
    const qstashResponse = await qstashClient.publish({
      url: transcribeEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        audio_url: audioUrl,
        timestamp: new Date().toISOString(),
        retry_attempt: retryCount,
      }),
      delay: delaySeconds,
      retries: 0, // No additional retries, we handle it manually
    });

    console.log(`Transcription retry ${retryCount} scheduled:`, qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to schedule retry:', error);
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

    const { queue_id, attachment_id, user_id, audio_url, timestamp } = validation.data;
    const retryAttempt = (body as any).retry_attempt || 0;
    const client = await createServerClient();
    
    console.log('Processing transcription for:', {
      queue_id,
      attachment_id,
      user_id,
      audio_url,
      timestamp,
      retry_attempt: retryAttempt,
    });

    // 1. Get current queue status and retry count
    const { data: queueData, error: queueError } = await client
      .from("video_processing_queue")
      .select("retry_count, max_retries, status")
      .eq("id", queue_id)
      .single();

    if (queueError || !queueData) {
      throw new Error(`Queue not found: ${queueError?.message}`);
    }

    // 2. Update step status to processing
    await client
      .from("video_processing_steps")
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: retryAttempt
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "transcribe");

    // 3. Update queue status
    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'transcribe',
        progress_percentage: 65
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

    // 5. Transcribe with Whisper API
    let transcriptionResult: { text: string; language?: string };
    try {
      transcriptionResult = await transcribeWithWhisper(audioBlob, retryAttempt);
      
    } catch (whisperError: any) {
      console.error('Whisper API failed:', whisperError.message);
      
      // Check if it's a server sleeping issue and we can retry
      const isServerSleeping = whisperError.message.includes('SERVER_SLEEPING');
      const canRetry = queueData.retry_count < queueData.max_retries;
      
      if (isServerSleeping && canRetry) {
        console.log(`Server is sleeping, scheduling retry ${queueData.retry_count + 1}/${queueData.max_retries}`);
        
        // Update queue retry count
        await client
          .from("video_processing_queue")
          .update({
            status: 'retrying',
            retry_count: queueData.retry_count + 1,
            error_message: 'Whisper server is sleeping, retrying...',
            last_error_at: new Date().toISOString()
          })
          .eq("id", queue_id);

        // Schedule retry
        try {
          const retryMessageId = await scheduleRetry(queue_id, attachment_id, user_id, audio_url, queueData!.retry_count + 1);
          
          await client
            .from("video_processing_queue")
            .update({ qstash_message_id: retryMessageId })
            .eq("id", queue_id);

          return NextResponse.json({
            message: "Whisper server is sleeping, retry scheduled",
            retry_count: queueData!.retry_count + 1,
            max_retries: 3,
            next_retry_in_minutes: 1
          });
        } catch (retryError: any) {
          console.error('Failed to schedule retry:', retryError);
          
          // Mark step as failed
          await client.rpc('update_video_processing_step', {
            queue_id_param: queue_id,
            step_name_param: 'transcribe',
            status_param: 'failed',
            error_message_param: `Max retries (3) reached for transcription`,
            error_details_param: { last_error: whisperError.message, retry_count: queueData!.retry_count }
          });

          // Send failure notification
          await sendVideoProcessingNotification(user_id, {
            attachment_id,
            queue_id,
            attachment_title: `Video ${attachment_id}`,
            status: 'failed',
            current_step: 'transcribe',
            error_message: `Transcription failed after 3 attempts`
          });

          return NextResponse.json({
            error: "Max retries reached for transcription",
            queue_id,
            attachment_id,
            retry_count: queueData!.retry_count,
            max_retries: 3
          }, { status: 500 });
        }
      } else {
        console.error('Max retries reached for transcription:', { queue_id, attachment_id, retryAttempt });
        
        // Mark step as failed
        await client.rpc('update_video_processing_step', {
          queue_id_param: queue_id,
          step_name_param: 'transcribe',
          status_param: 'failed',
          error_message_param: `Max retries (3) reached for transcription`,
          error_details_param: { last_error: whisperError.message, retry_count: retryAttempt }
        });

        // Send failure notification
        await sendVideoProcessingNotification(user_id, {
          attachment_id,
          queue_id,
          attachment_title: `Video ${attachment_id}`,
          status: 'failed',
          current_step: 'transcribe',
          error_message: `Transcription failed after 3 attempts`
        });

        return NextResponse.json({
          error: "Max retries reached for transcription",
          queue_id,
          attachment_id,
          retry_count: retryAttempt,
          max_retries: 3
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
        retry_count: retryAttempt
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
      retry_count: retryAttempt
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
        retry_count: retryAttempt,
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
